import OBR, { buildPath } from "@owlbear-rodeo/sdk";

const EXTENSION_ID = "com.hexcrawl.fog-control";

const FOG_CELL_KEY = `${EXTENSION_ID}/fog-cell`;
const FOG_GRID_TYPE_KEY = `${EXTENSION_ID}/fog-grid-type`;

const TOOL_ID = `${EXTENSION_ID}/tool`;
const REVEAL_MODE_ID = `${EXTENSION_ID}/reveal`;
const REVEAL_AREA_MODE_ID = `${EXTENSION_ID}/reveal-area`;
const REVEAL_LINE_MODE_ID = `${EXTENSION_ID}/reveal-line`;
const FOG_MAP_ACTION_ID = `${EXTENSION_ID}/fog-map`;

// Grid types Hexcrawl Fog Control knows how to build hexes for.
const HEX_GRID_TYPES = new Set(["HEX_HORIZONTAL", "HEX_VERTICAL"]);

const fogCellIndex = new Map();

// ============================================================
// GENERAL HELPERS
// ============================================================

function positionKey(position) {
  return `${Math.round(position.x * 1000) / 1000},${Math.round(position.y * 1000) / 1000}`;
}

/**
 * Run `mapper` over `items` with at most `limit` calls in flight at once.
 * Used to parallelize the many grid.snapPosition() round trips when
 * generating a fog map, instead of awaiting them one at a time.
 */
async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await mapper(items[current], current);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}

// ============================================================
// REVEAL LINE STATE
// ============================================================

let revealLinePoints = [];
let revealLineCellKeys = new Set();
let revealLineGeneration = 0;
let revealLineSnapQueue = Promise.resolve();
let revealLineInteraction = null;

// ============================================================
// REVEAL LINE TRAIL
// ============================================================

async function startRevealLineTrail(position) {
  const path = buildPath()
    .commands([[0, position.x, position.y]])
    .strokeColor("#ffffff")
    .strokeOpacity(1)
    .strokeWidth(5)
    .fillOpacity(0)
    .layer("POINTER")
    .locked(true)
    .build();

  revealLineInteraction = await OBR.interaction.startItemInteraction(path);
}

function updateRevealLineTrail() {
  if (!revealLineInteraction || revealLinePoints.length === 0) {
    return;
  }

  const commands = [[0, revealLinePoints[0].position.x, revealLinePoints[0].position.y]];

  for (let i = 1; i < revealLinePoints.length; i++) {
    commands.push([1, revealLinePoints[i].position.x, revealLinePoints[i].position.y]);
  }

  const [update] = revealLineInteraction;
  update((path) => {
    path.commands = commands;
  });
}

function stopRevealLineTrail() {
  if (!revealLineInteraction) {
    return;
  }

  const [, stop] = revealLineInteraction;
  stop();
  revealLineInteraction = null;
}

// ============================================================
// REVEAL LINE GEOMETRY
// ============================================================

function distanceBetween(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function addRevealLinePoint(position) {
  const key = positionKey(position);

  if (revealLineCellKeys.has(key)) {
    return false;
  }

  revealLineCellKeys.add(key);
  revealLinePoints.push({ position, key });
  return true;
}

async function addRevealLineSegment(from, to, generation) {
  if (generation !== revealLineGeneration) {
    return;
  }

  const distance = distanceBetween(from, to);
  if (distance < 0.001) {
    return;
  }

  const dpi = await OBR.scene.grid.getDpi();
  const sampleSpacing = dpi / 4;
  const sampleCount = Math.max(1, Math.ceil(distance / sampleSpacing));

  let changed = false;

  for (let i = 1; i <= sampleCount; i++) {
    if (generation !== revealLineGeneration) {
      return;
    }

    const t = i / sampleCount;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;

    const snapped = await OBR.scene.grid.snapPosition({ x, y }, 1, false, true);

    if (generation !== revealLineGeneration) {
      return;
    }

    if (addRevealLinePoint(snapped)) {
      changed = true;
    }
  }

  if (changed) {
    updateRevealLineTrail();
  }
}

function queueRevealLinePosition(pointerPosition) {
  const generation = revealLineGeneration;

  revealLineSnapQueue = revealLineSnapQueue
    .then(async () => {
      if (generation !== revealLineGeneration) {
        return;
      }

      const snapped = await OBR.scene.grid.snapPosition(pointerPosition, 1, false, true);

      if (generation !== revealLineGeneration) {
        return;
      }

      if (revealLinePoints.length === 0) {
        addRevealLinePoint(snapped);
        updateRevealLineTrail();
        return;
      }

      const lastPoint = revealLinePoints[revealLinePoints.length - 1].position;

      if (positionKey(lastPoint) !== positionKey(snapped)) {
        await addRevealLineSegment(lastPoint, snapped, generation);
      }
    })
    .catch((error) => {
      console.warn("Reveal Line pointer processing failed:", error);
    });
}

function resetRevealLine() {
  revealLineGeneration++;
  revealLinePoints = [];
  revealLineCellKeys.clear();
  revealLineSnapQueue = Promise.resolve();
}

// ============================================================
// FINISH REVEAL LINE
// ============================================================

async function finishRevealLine() {
  const generation = revealLineGeneration;
  await revealLineSnapQueue;

  if (generation !== revealLineGeneration) {
    return;
  }

  const ids = revealLinePoints
    .map((entry) => fogCellIndex.get(entry.key))
    .filter(Boolean);

  const uniqueIds = [...new Set(ids)];

  console.log(
    "Reveal Line:",
    revealLinePoints.length,
    "grid points,",
    uniqueIds.length,
    "fog cells"
  );

  if (uniqueIds.length === 0) {
    console.warn("Reveal Line: no fog cells found along path.");
    return;
  }

  await OBR.scene.items.updateItems(uniqueIds, (items) => {
    for (const item of items) {
      item.visible = !item.visible;
    }
  });
}

// ============================================================
// FOG CELL INDEX
// ============================================================

function indexFogCells(items) {
  fogCellIndex.clear();

  for (const item of items) {
    fogCellIndex.set(positionKey(item.position), item.id);
  }

  console.log("Indexed fog cells:", fogCellIndex.size);
}

function getNearbyFogCellIds(centerPosition) {
  const cells = [];

  for (const [key, id] of fogCellIndex) {
    const [x, y] = key.split(",").map(Number);
    const dx = x - centerPosition.x;
    const dy = y - centerPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0.001) {
      cells.push({ id, distance });
    }
  }

  cells.sort((a, b) => a.distance - b.distance);

  return cells.slice(0, 6).map((cell) => cell.id);
}

async function getFogCells() {
  return await OBR.scene.items.getItems((item) => item.metadata?.[FOG_CELL_KEY] === true);
}

/** Reads the grid type that a set of existing fog cells were built for, if tagged. */
function getStoredFogGridType(fogCells) {
  for (const cell of fogCells) {
    const storedType = cell.metadata?.[FOG_GRID_TYPE_KEY];
    if (storedType) {
      return storedType;
    }
  }
  return null;
}

// ============================================================
// MAP BOUNDS
// ============================================================

async function getMapBounds() {
  const mapItems = await OBR.scene.items.getItems((item) => item.layer === "MAP");

  if (mapItems.length === 0) {
    console.warn("No MAP items found.");
    return null;
  }

  const ids = mapItems.map((item) => item.id);
  const bounds = await OBR.scene.items.getItemBounds(ids);

  console.log("Map bounds:", bounds);
  return bounds;
}

// ============================================================
// FOG CELL CREATION
// ============================================================

/**
 * Base hexagon, built pointy-top (a vertex at top and bottom, flat sides
 * left/right). This matches Owlbear's "HEX_VERTICAL" grid orientation.
 * For "HEX_HORIZONTAL" grids (flat-top hexes) we rotate this same shape
 * by 30 degrees rather than maintaining a second set of coordinates.
 */
const BASE_HEX_COMMANDS = [
  [0, 0, -86.6025390625],
  [1, 75, -43.30126953125],
  [1, 75, 43.30126953125],
  [1, 0, 86.6025390625],
  [1, -75, 43.30126953125],
  [1, -75, -43.30126953125],
  [5],
];

function rotationForGridType(gridType) {
  // Flat-top hexes are the base pointy-top shape rotated by -30deg (330deg).
  // Pointy-top (HEX_VERTICAL) and anything else uses the shape as authored.
  return gridType === "HEX_HORIZONTAL" ? 330 : 0;
}

function createFogCell(position, geometryScale, gridType) {
  const commands = BASE_HEX_COMMANDS.map((command) => {
    if (command[0] === 0 || command[0] === 1) {
      return [command[0], command[1] * geometryScale, command[2] * geometryScale];
    }
    return command;
  });

  return buildPath()
    .commands(commands)
    .fillRule("nonzero")
    .fillColor("#0e0f16")
    .fillOpacity(1)
    .strokeColor("#0e0f16")
    .strokeOpacity(1)
    .strokeWidth(5 * geometryScale)
    .position(position)
    .rotation(rotationForGridType(gridType))
    .layer("FOG")
    .locked(true)
    .visible(true)
    .metadata({
      [FOG_CELL_KEY]: true,
      [FOG_GRID_TYPE_KEY]: gridType,
    })
    .build();
}

// ============================================================
// FOG MAP
// ============================================================

/**
 * Builds a fresh fog map. If `existingIds` is given, those items are
 * deleted first so the map can be rebuilt (e.g. after an orientation
 * change) instead of stacking a second layer of fog on top.
 */
async function buildFogMap({ existingIds = [] } = {}) {
  if (existingIds.length > 0) {
    console.log("Fog Map: clearing", existingIds.length, "existing fog cells before rebuild");
    await OBR.scene.items.deleteItems(existingIds);
    fogCellIndex.clear();
  }

  const bounds = await getMapBounds();

  if (!bounds) {
    console.warn("Fog Map cancelled: no map found.");
    return;
  }

  const dpi = await OBR.scene.grid.getDpi();
  const gridType = await OBR.scene.grid.getType();

  console.log("Grid type:", gridType);
  console.log("Grid DPI:", dpi);

  if (!HEX_GRID_TYPES.has(gridType)) {
    console.warn(
      `Fog Map: current grid type "${gridType}" is not a hex grid. Hexcrawl Fog Control is designed for hex grids.`
    );
  }

  const geometryScale = dpi / 150;
  const margin = dpi;
  const sampleSpacing = dpi / 3;

  const minX = bounds.min.x - margin;
  const maxX = bounds.max.x + margin;
  const minY = bounds.min.y - margin;
  const maxY = bounds.max.y + margin;

  const rawPositions = [];
  for (let y = minY; y <= maxY; y += sampleSpacing) {
    for (let x = minX; x <= maxX; x += sampleSpacing) {
      rawPositions.push({ x, y });
    }
  }

  // Snap every candidate position in parallel (bounded concurrency) rather
  // than one at a time, since each snap is a round trip to Owlbear.
  const snappedPositions = await mapWithConcurrency(rawPositions, 25, (raw) =>
    OBR.scene.grid.snapPosition(raw, 1, false, true)
  );

  const positions = new Map();
  for (const snapped of snappedPositions) {
    positions.set(positionKey(snapped), snapped);
  }

  console.log("Unique fog cells to create:", positions.size);

  const cells = [...positions.values()].map((position) =>
    createFogCell(position, geometryScale, gridType)
  );

  const batchSize = 100;
  for (let i = 0; i < cells.length; i += batchSize) {
    const batch = cells.slice(i, i + batchSize);
    console.log(`Adding fog cells ${i + 1}-${Math.min(i + batch.length, cells.length)} of ${cells.length}`);
    await OBR.scene.items.addItems(batch);
  }

  const createdFogCells = await getFogCells();
  indexFogCells(createdFogCells);

  console.log("Fog Map complete. Total cells:", createdFogCells.length);
}

/**
 * Checks any existing fog map against the scene's current grid type and
 * rebuilds it if they don't match (e.g. the GM switched from horizontal
 * to vertical hexes). Returns true if fog already exists (and has been
 * reconciled), false if there is no fog map yet.
 */
async function reconcileFogMap() {
  const existingFogCells = await getFogCells();

  if (existingFogCells.length === 0) {
    return false;
  }

  indexFogCells(existingFogCells);

  const storedGridType = getStoredFogGridType(existingFogCells);
  const liveGridType = await OBR.scene.grid.getType();

  if (storedGridType && storedGridType !== liveGridType) {
    console.log(
      `Fog Map: grid orientation changed (${storedGridType} -> ${liveGridType}). Rebuilding fog map.`
    );
    await buildFogMap({ existingIds: existingFogCells.map((cell) => cell.id) });
  }

  return true;
}

async function generateFogMap() {
  console.log("Fog Map: starting");

  const alreadyExists = await reconcileFogMap();

  if (alreadyExists) {
    console.log("Fog Map already exists — no new fog cells generated.");
    return;
  }

  await buildFogMap();
}

// ============================================================
// TOOLS
// ============================================================

async function createTools() {
  await OBR.tool.create({
    id: TOOL_ID,
    icons: [
      {
        icon: "https://vandam.ca/Hexcrawl-Fog-Control/hex.svg",
        label: "Hexcrawl Fog Control",
      },
    ],
    defaultMode: REVEAL_MODE_ID,
  });

  // ==========================================================
  // REVEAL HEX
  // ==========================================================

  await OBR.tool.createMode({
    id: REVEAL_MODE_ID,
    icons: [
      {
        icon: "https://vandam.ca/Hexcrawl-Fog-Control/toggleIcon.svg",
        label: "Reveal Hex",
        filter: {
          activeTools: [TOOL_ID],
          roles: ["GM"],
        },
      },
    ],
    onToolClick: async (_, event) => {
      console.log("Reveal click:", event.pointerPosition);

      const snapped = await OBR.scene.grid.snapPosition(event.pointerPosition, 1, false, true);
      console.log("Snapped click:", snapped);

      const key = positionKey(snapped);
      const fogCellId = fogCellIndex.get(key);

      if (!fogCellId) {
        console.warn("No fog cell found for snapped position:", snapped);
        return;
      }

      const items = await OBR.scene.items.getItems((item) => item.id === fogCellId);

      if (items.length === 0) {
        console.warn("Fog cell no longer exists:", fogCellId);
        fogCellIndex.delete(key);
        return;
      }

      const fogCell = items[0];
      console.log("Toggling fog cell:", fogCellId, "visible:", fogCell.visible, "→", !fogCell.visible);

      await OBR.scene.items.updateItems([fogCellId], (items) => {
        items[0].visible = !items[0].visible;
      });
    },
  });

  // ==========================================================
  // REVEAL AREA
  // ==========================================================

  await OBR.tool.createMode({
    id: REVEAL_AREA_MODE_ID,
    icons: [
      {
        icon: "https://vandam.ca/Hexcrawl-Fog-Control/multiToggle.svg",
        label: "Reveal Area",
        filter: {
          activeTools: [TOOL_ID],
          roles: ["GM"],
        },
      },
    ],
    onToolClick: async (_, event) => {
      console.log("Reveal Area click:", event.pointerPosition);

      const snapped = await OBR.scene.grid.snapPosition(event.pointerPosition, 1, false, true);
      console.log("Reveal Area snapped:", snapped);

      const centerKey = positionKey(snapped);
      const centerId = fogCellIndex.get(centerKey);

      if (!centerId) {
        console.warn("Reveal Area: no fog cell found for:", snapped);
        return;
      }

      const nearbyIds = getNearbyFogCellIds(snapped);
      const uniqueIds = [...new Set([centerId, ...nearbyIds])];

      console.log("Reveal Area: revealing", uniqueIds.length, "fog cells");

      await OBR.scene.items.updateItems(uniqueIds, (items) => {
        for (const item of items) {
          item.visible = false;
        }
      });
    },
  });

  // ==========================================================
  // REVEAL LINE
  // ==========================================================

  await OBR.tool.createMode({
    id: REVEAL_LINE_MODE_ID,
    icons: [
      {
        icon: "https://vandam.ca/Hexcrawl-Fog-Control/multiToggle.svg",
        label: "Reveal Line",
        filter: {
          activeTools: [TOOL_ID],
          roles: ["GM"],
        },
      },
    ],
    onToolDragStart: async (_, event) => {
      console.log("Reveal Line: drag started");
      resetRevealLine();

      const generation = revealLineGeneration;
      const snapped = await OBR.scene.grid.snapPosition(event.pointerPosition, 1, false, true);

      if (generation !== revealLineGeneration) {
        return;
      }

      addRevealLinePoint(snapped);
      console.log("Reveal Line start:", snapped);

      await startRevealLineTrail(snapped);
      // A pointer could technically move while the trail is being created.
      // Make sure the current state is reflected.
      updateRevealLineTrail();
    },

    onToolDragMove: (_, event) => {
      queueRevealLinePosition(event.pointerPosition);
    },

    onToolDragEnd: async (_, event) => {
      console.log("Reveal Line: drag ended");
      // Include the release position.
      queueRevealLinePosition(event.pointerPosition);

      await finishRevealLine();
      stopRevealLineTrail();
      resetRevealLine();
    },

    onToolDragCancel: async () => {
      console.log("Reveal Line: cancelled");
      stopRevealLineTrail();
      resetRevealLine();
    },
  });

  // ==========================================================
  // FOG MAP
  // ==========================================================

  await OBR.tool.createAction({
    id: FOG_MAP_ACTION_ID,
    icons: [
      {
        icon: "https://vandam.ca/Hexcrawl-Fog-Control/hex.svg",
        label: "Fog Map",
        filter: {
          activeTools: [TOOL_ID],
          roles: ["GM"],
        },
      },
    ],
    onClick: async () => {
      console.log("Fog Map button clicked");
      await generateFogMap();
    },
  });

  console.log("Tools ready");
}

// ============================================================
// INITIALIZATION
// ============================================================

OBR.onReady(async () => {
  console.log("OBR ON READY FIRED");

  try {
    // Tools are registered exactly once per extension load. They don't
    // need a ready scene to exist — Owlbear just won't show the toolbar
    // until a scene is open. Re-running this on every scene change used
    // to throw, since it tried to re-register the same tool/mode/action
    // IDs each time.
    await createTools();
  } catch (error) {
    console.error("Hexcrawl Fog Control: failed to register tools:", error);
  }

  // Everything below is scene-specific and safe to re-run whenever the
  // scene becomes ready (new scene opened, reconnect, etc).
  const initializeSceneState = async () => {
    console.log("SCENE READY: true");

    try {
      await reconcileFogMap();
    } catch (error) {
      console.error("Hexcrawl Fog Control: failed to initialize fog map:", error);
    }
  };

  if (await OBR.scene.isReady()) {
    await initializeSceneState();
  }

  OBR.scene.onReadyChange(async (ready) => {
    if (!ready) {
      return;
    }
    await initializeSceneState();
  });

  // Rebuild the fog map automatically if the GM changes grid orientation
  // (or any other grid setting) while the scene is open.
  OBR.scene.grid.onChange(async () => {
    if (await OBR.scene.isReady()) {
      try {
        await reconcileFogMap();
      } catch (error) {
        console.error("Hexcrawl Fog Control: failed to reconcile fog map on grid change:", error);
      }
    }
  });

  console.log("Hexcrawl Fog Control ready");
});
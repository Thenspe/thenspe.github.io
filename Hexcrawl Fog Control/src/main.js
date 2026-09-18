import OBR, { buildPath } from "@owlbear-rodeo/sdk";

const EXTENSION_ID = "com.hexcrawl.fog-control";

const FOG_CELL_KEY =
  `${EXTENSION_ID}/fog-cell`;

const TOOL_ID =
  `${EXTENSION_ID}/tool`;

const REVEAL_MODE_ID =
  `${EXTENSION_ID}/reveal`;

const REVEAL_LINE_MODE_ID =
  `${EXTENSION_ID}/reveal-line`;

const FOG_MAP_ACTION_ID =
  `${EXTENSION_ID}/fog-map`;

const fogCellIndex = new Map();


// ============================================================
// GENERAL HELPERS
// ============================================================

function positionKey(position) {
  return (
    `${Math.round(position.x * 1000) / 1000},` +
    `${Math.round(position.y * 1000) / 1000}`
  );
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
  const path =
    buildPath()
      .commands([
        [
          0,
          position.x,
          position.y,
        ],
      ])
      .strokeColor("#ffffff")
      .strokeOpacity(1)
      .strokeWidth(5)
      .fillOpacity(0)
      .layer("POINTER")
      .locked(true)
      .build();

  revealLineInteraction =
    await OBR.interaction.startItemInteraction(
      path
    );
}


function updateRevealLineTrail() {
  if (
    !revealLineInteraction
  ) {
    return;
  }

  if (
    revealLinePoints.length === 0
  ) {
    return;
  }

  const commands = [
    [
      0,
      revealLinePoints[0].position.x,
      revealLinePoints[0].position.y,
    ],
  ];

  for (
    let i = 1;
    i < revealLinePoints.length;
    i++
  ) {
    commands.push([
      1,
      revealLinePoints[i].position.x,
      revealLinePoints[i].position.y,
    ]);
  }

  const [update] =
    revealLineInteraction;

  update((path) => {
    path.commands =
      commands;
  });
}


function stopRevealLineTrail() {
  if (
    !revealLineInteraction
  ) {
    return;
  }

  const [_, stop] =
    revealLineInteraction;

  stop();

  revealLineInteraction =
    null;
}


// ============================================================
// REVEAL LINE GEOMETRY
// ============================================================

function distanceBetween(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  return Math.sqrt(
    dx * dx +
    dy * dy
  );
}


function addRevealLinePoint(position) {
  const key =
    positionKey(position);

  if (
    revealLineCellKeys.has(key)
  ) {
    return false;
  }

  revealLineCellKeys.add(key);

  revealLinePoints.push({
    position,
    key,
  });

  return true;
}


async function addRevealLineSegment(
  from,
  to,
  generation
) {
  if (
    generation !==
    revealLineGeneration
  ) {
    return;
  }

  const distance =
    distanceBetween(from, to);

  if (
    distance < 0.001
  ) {
    return;
  }

  const dpi =
    await OBR.scene.grid.getDpi();

  const sampleSpacing =
    dpi / 4;

  const sampleCount =
    Math.max(
      1,
      Math.ceil(
        distance /
          sampleSpacing
      )
    );

  let changed = false;

  for (
    let i = 1;
    i <= sampleCount;
    i++
  ) {
    if (
      generation !==
      revealLineGeneration
    ) {
      return;
    }

    const t =
      i / sampleCount;

    const x =
      from.x +
      (to.x - from.x) * t;

    const y =
      from.y +
      (to.y - from.y) * t;

    const snapped =
      await OBR.scene.grid.snapPosition(
        {
          x,
          y,
        },
        1,
        false,
        true
      );

    if (
      generation !==
      revealLineGeneration
    ) {
      return;
    }

    if (
      addRevealLinePoint(
        snapped
      )
    ) {
      changed = true;
    }
  }

  if (changed) {
    updateRevealLineTrail();
  }
}


function queueRevealLinePosition(
  pointerPosition
) {
  const generation =
    revealLineGeneration;

  revealLineSnapQueue =
    revealLineSnapQueue.then(
      async () => {

        if (
          generation !==
          revealLineGeneration
        ) {
          return;
        }

        const snapped =
          await OBR.scene.grid.snapPosition(
            pointerPosition,
            1,
            false,
            true
          );

        if (
          generation !==
          revealLineGeneration
        ) {
          return;
        }

        if (
          revealLinePoints.length === 0
        ) {
          addRevealLinePoint(
            snapped
          );

          updateRevealLineTrail();

          return;
        }

        const lastPoint =
          revealLinePoints[
            revealLinePoints.length - 1
          ].position;

        if (
          positionKey(lastPoint) !==
          positionKey(snapped)
        ) {
          await addRevealLineSegment(
            lastPoint,
            snapped,
            generation
          );
        }
      }
    ).catch((error) => {
      console.warn(
        "Reveal Line pointer processing failed:",
        error
      );
    });
}


function resetRevealLine() {
  revealLineGeneration++;

  revealLinePoints = [];

  revealLineCellKeys.clear();

  revealLineSnapQueue =
    Promise.resolve();
}


// ============================================================
// FINISH REVEAL LINE
// ============================================================

async function finishRevealLine() {
  const generation =
    revealLineGeneration;

  await revealLineSnapQueue;

  if (
    generation !==
    revealLineGeneration
  ) {
    return;
  }

  const ids = [];

  for (
    const entry of revealLinePoints
  ) {
    const id =
      fogCellIndex.get(
        entry.key
      );

    if (id) {
      ids.push(id);
    }
  }

  const uniqueIds =
    [...new Set(ids)];

  console.log(
    "Reveal Line:",
    revealLinePoints.length,
    "grid points,",
    uniqueIds.length,
    "fog cells"
  );

  if (
    uniqueIds.length === 0
  ) {
    console.warn(
      "Reveal Line: no fog cells found along path."
    );

    return;
  }

  console.log(
    "Reveal Line positions:",
    revealLinePoints.map(
      (entry) =>
        entry.position
    )
  );

  await OBR.scene.items.updateItems(
    uniqueIds,
    (items) => {
      for (
        const item of items
      ) {
        item.visible =
          !item.visible;
      }
    }
  );
}


// ============================================================
// FOG CELL INDEX
// ============================================================

function indexFogCells(items) {
  fogCellIndex.clear();

  for (
    const item of items
  ) {
    fogCellIndex.set(
      positionKey(
        item.position
      ),
      item.id
    );
  }

  console.log(
    "Indexed fog cells:",
    fogCellIndex.size
  );
}


async function getFogCells() {
  return await OBR.scene.items.getItems(
    (item) =>
      item.metadata?.[
        FOG_CELL_KEY
      ] === true
  );
}


// ============================================================
// MAP BOUNDS
// ============================================================

async function getMapBounds() {
  const mapItems =
    await OBR.scene.items.getItems(
      (item) =>
        item.layer === "MAP"
    );

  if (
    mapItems.length === 0
  ) {
    console.warn(
      "No MAP items found."
    );

    return null;
  }

  const ids =
    mapItems.map(
      (item) => item.id
    );

  const bounds =
    await OBR.scene.items.getItemBounds(
      ids
    );

  console.log(
    "Map bounds:",
    bounds
  );

  return bounds;
}


// ============================================================
// FOG CELL CREATION
// ============================================================

function createFogCell(
  position,
  geometryScale
) {
  const baseCommands = [
    [
      0,
      0,
      -86.6025390625,
    ],

    [
      1,
      75,
      -43.30126953125,
    ],

    [
      1,
      75,
      43.30126953125,
    ],

    [
      1,
      0,
      86.6025390625,
    ],

    [
      1,
      -75,
      43.30126953125,
    ],

    [
      1,
      -75,
      -43.30126953125,
    ],

    [5],
  ];

  const commands =
    baseCommands.map(
      (command) => {
        if (
          command[0] === 0 ||
          command[0] === 1
        ) {
          return [
            command[0],

            command[1] *
              geometryScale,

            command[2] *
              geometryScale,
          ];
        }

        return command;
      }
    );

  return buildPath()
    .commands(commands)
    .fillRule("nonzero")
    .fillColor("#0e0f16")
    .fillOpacity(1)
    .strokeColor("#0e0f16")
    .strokeOpacity(1)
    .strokeWidth(
      5 * geometryScale
    )
    .position(position)
    .rotation(330)
    .layer("FOG")
    .locked(true)
    .visible(true)
    .metadata({
      [FOG_CELL_KEY]: true,
    })
    .build();
}


// ============================================================
// FOG MAP
// ============================================================

async function generateFogMap() {
  console.log(
    "Fog Map: starting"
  );

  const existingFogCells =
    await getFogCells();

  console.log(
    "Existing Hexcrawl Fog Control cells:",
    existingFogCells.length
  );

  if (
    existingFogCells.length > 0
  ) {
    indexFogCells(
      existingFogCells
    );

    console.log(
      "Fog Map already exists — no new fog cells generated."
    );

    return;
  }

  const bounds =
    await getMapBounds();

  if (!bounds) {
    console.warn(
      "Fog Map cancelled: no map found."
    );

    return;
  }

  const dpi =
    await OBR.scene.grid.getDpi();

  const gridType =
    await OBR.scene.grid.getType();

  console.log(
    "Grid type:",
    gridType
  );

  console.log(
    "Grid DPI:",
    dpi
  );

  const geometryScale =
    dpi / 150;

  const margin =
    dpi;

  const sampleSpacing =
    dpi / 3;

  const minX =
    bounds.min.x -
    margin;

  const maxX =
    bounds.max.x +
    margin;

  const minY =
    bounds.min.y -
    margin;

  const maxY =
    bounds.max.y +
    margin;

  const positions =
    new Map();

  for (
    let y = minY;
    y <= maxY;
    y += sampleSpacing
  ) {
    for (
      let x = minX;
      x <= maxX;
      x += sampleSpacing
    ) {
      const snapped =
        await OBR.scene.grid.snapPosition(
          {
            x,
            y,
          },
          1,
          false,
          true
        );

      positions.set(
        positionKey(snapped),
        snapped
      );
    }
  }

  console.log(
    "Unique fog cells to create:",
    positions.size
  );

  const cells = [];

  for (
    const position of
      positions.values()
  ) {
    cells.push(
      createFogCell(
        position,
        geometryScale
      )
    );
  }

  const batchSize = 100;

  for (
    let i = 0;
    i < cells.length;
    i += batchSize
  ) {
    const batch =
      cells.slice(
        i,
        i + batchSize
      );

    console.log(
      `Adding fog cells ${i + 1}-${Math.min(
        i + batch.length,
        cells.length
      )} of ${cells.length}`
    );

    await OBR.scene.items.addItems(
      batch
    );
  }

  const createdFogCells =
    await getFogCells();

  indexFogCells(
    createdFogCells
  );

  console.log(
    "Fog Map complete. Total cells:",
    createdFogCells.length
  );
}


// ============================================================
// TOOLS
// ============================================================

async function createTools() {

  await OBR.tool.create({
    id: TOOL_ID,

    icons: [
      {
        icon: "/hex.svg",
        label:
          "Hexcrawl Fog Control",
      },
    ],

    defaultMode:
      REVEAL_MODE_ID,
  });


  // ==========================================================
  // REVEAL HEX
  // ==========================================================

  await OBR.tool.createMode({
    id: REVEAL_MODE_ID,

    icons: [
      {
        icon: "/toggleIcon.svg",
        label: "Reveal Hex",

        filter: {
          activeTools: [
            TOOL_ID,
          ],

          roles: [
            "GM",
          ],
        },
      },
    ],

    onToolClick:
      async (_, event) => {

        console.log(
          "Reveal click:",
          event.pointerPosition
        );

        const snapped =
          await OBR.scene.grid.snapPosition(
            event.pointerPosition,
            1,
            false,
            true
          );

        console.log(
          "Snapped click:",
          snapped
        );

        const key =
          positionKey(
            snapped
          );

        const fogCellId =
          fogCellIndex.get(
            key
          );

        if (!fogCellId) {
          console.warn(
            "No fog cell found for snapped position:",
            snapped
          );

          return;
        }

        const items =
          await OBR.scene.items.getItems(
            (item) =>
              item.id ===
              fogCellId
          );

        if (
          items.length === 0
        ) {
          console.warn(
            "Fog cell no longer exists:",
            fogCellId
          );

          fogCellIndex.delete(
            key
          );

          return;
        }

        const fogCell =
          items[0];

        console.log(
          "Toggling fog cell:",
          fogCellId,

          "visible:",

          fogCell.visible,

          "→",

          !fogCell.visible
        );

        await OBR.scene.items.updateItems(
          [fogCellId],

          (items) => {
            items[0].visible =
              !items[0].visible;
          }
        );
      },
  });


  // ==========================================================
  // REVEAL LINE
  // ==========================================================

  await OBR.tool.createMode({
    id: REVEAL_LINE_MODE_ID,

    icons: [
      {
        icon: "/multiToggle.svg",
        label: "Reveal Line",

        filter: {
          activeTools: [
            TOOL_ID,
          ],

          roles: [
            "GM",
          ],
        },
      },
    ],

    onToolDragStart:
      async (_, event) => {

        console.log(
          "Reveal Line: drag started"
        );

        resetRevealLine();

        const generation =
          revealLineGeneration;

        const snapped =
          await OBR.scene.grid.snapPosition(
            event.pointerPosition,
            1,
            false,
            true
          );

        if (
          generation !==
          revealLineGeneration
        ) {
          return;
        }

        addRevealLinePoint(
          snapped
        );

        console.log(
          "Reveal Line start:",
          snapped
        );

        await startRevealLineTrail(
          snapped
        );

        /*
         * A pointer could technically move
         * while the trail is being created.
         * Make sure the current state is reflected.
         */
        updateRevealLineTrail();
      },


    onToolDragMove:
      (_, event) => {

        queueRevealLinePosition(
          event.pointerPosition
        );
      },


    onToolDragEnd:
      async (_, event) => {

        console.log(
          "Reveal Line: drag ended"
        );

        /*
         * Include the release position.
         */
        queueRevealLinePosition(
          event.pointerPosition
        );

        await finishRevealLine();

        stopRevealLineTrail();

        resetRevealLine();
      },


    onToolDragCancel:
      async () => {

        console.log(
          "Reveal Line: cancelled"
        );

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
        icon: "/hex.svg",
        label: "Fog Map",

        filter: {
          activeTools: [
            TOOL_ID,
          ],

          roles: [
            "GM",
          ],
        },
      },
    ],

    onClick:
      async () => {

        console.log(
          "Fog Map button clicked"
        );

        await generateFogMap();
      },
  });

  console.log(
    "Tools ready"
  );
}


// ============================================================
// INITIALIZATION
// ============================================================

OBR.onReady(() => {

  console.log(
    "OBR ON READY FIRED"
  );

  const initialize =
    async () => {

      console.log(
        "SCENE READY: true"
      );

      console.log(
        "Indexing existing fog cells..."
      );

      const existingFogCells =
        await getFogCells();

      console.log(
        "Existing Hexcrawl Fog Control cells:",
        existingFogCells.length
      );

      if (
        existingFogCells.length > 0
      ) {
        indexFogCells(
          existingFogCells
        );
      }

      await createTools();

      console.log(
        "HEXRCRAWL FOG CONTROL READY"
      );
    };

  OBR.scene.onReadyChange(
    async (ready) => {

      if (!ready) {
        return;
      }

      await initialize();
    }
  );
});
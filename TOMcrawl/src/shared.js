import OBR, { buildShape, buildLabel } from "@owlbear-rodeo/sdk";

export const ID = "com.tomcrawl.dungeon";
export const FLOOR_KEY = `${ID}/floor`; // number[], on items
export const PERSIST_KEY = `${ID}/persist`; // true, on items shown on every floor
export const OVERRIDE_KEY = `${ID}/colorOverride`; // true = keep this item's own style, ignore floor color
export const HIDDEN_KEY = `${ID}/hiddenPassage`; // true, on a connection that shouldn't auto-reveal with its room
export const STATE_KEY = `${ID}/state`; // { activeFloor, revealArmed, definedFloors, floorColors, indicatorEnabled }
export const CURTAIN_KEY = `${ID}/curtain`; // GM-only, blocks other floors
export const ZBASE_KEY = `${ID}/zbase`; // item's original zIndex, before elevation
export const SAVED_KEY = `${ID}/saved`; // { layer, hit } while an item is parked on an inactive floor
export const REVEALED_KEY = `${ID}/revealed`; // on a room/connection item
export const INDICATOR_KEY = `${ID}/floorIndicator`; // on the player-facing floor label

// Two things happening at once, kept deliberately separate: which *floor*
// you're on needs the "elevate above a curtain" trick, because the GM must
// not see other floors' overlapping geometry either — Owlbear's native
// hidden state alone isn't enough for that (it still shows dimmed to the
// GM). But which *rooms* are revealed doesn't have that problem: the GM
// should always see unrevealed rooms clearly, and Owlbear's native
// visible=false already does exactly "invisible to players, dimmed to GM" —
// no second curtain needed, just the item's own visible flag.
const BAND = 1e15;

// An item's z-index with any elevation stripped off, however many BANDs have
// piled up on it (an unassigned item sits at 2 * BAND + base, and a
// re-assigned one used to capture that as its "original").
const baseZ = (z) => (z >= BAND ? z % BAND : z);

export const DRAWING_TYPES = new Set(["SHAPE", "LINE", "CURVE"]);
export const ROOM_TYPES = new Set(["SHAPE", "CURVE"]); // closed shapes = rooms
export const CONNECTION_TYPES = new Set(["LINE", "CURVE"]); // open curves/lines = connections

// Anything directly revealable by clicking/right-clicking: a normal room, or
// a connection explicitly marked as a hidden passage (so it doesn't tag
// along with whichever room it touches — it has to be found on its own).
export function isRevealTarget(item) {
  return ROOM_TYPES.has(item.type) || item.metadata[HIDDEN_KEY] === true;
}

async function getState() {
  const meta = await OBR.scene.getMetadata();
  return meta[STATE_KEY] ?? {};
}

async function setState(patch) {
  const state = await getState();
  await OBR.scene.setMetadata({ [STATE_KEY]: { ...state, ...patch } });
}

// An item's floor assignment is always an array, so one shape can belong to
// several floors at once (e.g. a room that spans two levels), removing the
// need for duplicate overlapping shapes per floor.
export function itemFloors(item) {
  const f = item.metadata[FLOOR_KEY];
  if (f == null) return [];
  return Array.isArray(f) ? f : [f]; // tolerate old single-number data
}

export function hasFloor(item, floor) {
  return itemFloors(item).includes(floor);
}

// Add/remove `floor` from an item's floor list; clears "all floors" since a
// specific assignment should win over the wildcard.
// Returns true if `floor` was added, false if it was removed.
export function toggleItemFloor(item, floor) {
  const floors = itemFloors(item);
  const i = floors.indexOf(floor);
  let added;
  if (i >= 0) { floors.splice(i, 1); added = false; }
  else { floors.push(floor); added = true; }
  if (floors.length) item.metadata[FLOOR_KEY] = floors;
  else delete item.metadata[FLOOR_KEY]; // no floors left = fully unassigned
  delete item.metadata[PERSIST_KEY];
  return added;
}

// Bulk-assign `floor` to every item in `items`, with "select all, click once"
// semantics: if every item already has the floor, remove it from all of
// them; otherwise add it to all of them.
export function bulkAssignFloor(items, floor) {
  const allHaveIt = items.every((item) => hasFloor(item, floor));
  for (const item of items) {
    const floors = itemFloors(item);
    const i = floors.indexOf(floor);
    if (allHaveIt) {
      if (i >= 0) floors.splice(i, 1);
    } else if (i < 0) {
      floors.push(floor);
    }
    if (floors.length) item.metadata[FLOOR_KEY] = floors;
    else delete item.metadata[FLOOR_KEY];
    delete item.metadata[PERSIST_KEY];
  }
  return !allHaveIt;
}

// Owlbear only lets you click/select a shape where it has fill — a fully
// transparent room can't be selected at all, including by Reveal mode. Give
// a room a faint, otherwise-invisible fill the moment it's first assigned a
// floor, if it doesn't have one already, so it stays clickable.
export function ensureClickableFill(item) {
  if (item.type !== "SHAPE") return;
  if ((item.style?.fillOpacity ?? 0) > 0) return;
  item.style.fillOpacity = 0.06;
}

// --- Attachments ------------------------------------------------------
// Shared traversal for "walk everything attached (transitively) to a set of
// root items." Used both to carry floor assignment onto labels/props, and
// to carry a room's reveal onto its attached contents.

async function attachmentDescendants(rootIds) {
  const items = await OBR.scene.items.getItems();
  const byId = new Map(items.map((i) => [i.id, i]));
  let frontier = new Set(rootIds);
  const seen = new Set(rootIds);
  const ownerOf = new Map(rootIds.map((id) => [id, id]));
  while (frontier.size) {
    const next = new Set();
    for (const item of items) {
      if (item.attachedTo && frontier.has(item.attachedTo) && !seen.has(item.id)) {
        ownerOf.set(item.id, ownerOf.get(item.attachedTo));
        seen.add(item.id);
        next.add(item.id);
      }
    }
    frontier = next;
  }
  return { byId, ownerOf };
}

// When a room's floor assignment changes, anything attached to it (a label,
// or anything attached to that label, etc.) should move with it rather than
// being left behind on its old floor.
export async function propagateFloorToAttachments(changedIds) {
  const { byId, ownerOf } = await attachmentDescendants(changedIds);
  const toUpdate = [...ownerOf.keys()].filter((id) => !changedIds.includes(id));
  if (!toUpdate.length) return;
  await OBR.scene.items.updateItems(toUpdate, (items) => {
    for (const item of items) {
      const source = byId.get(ownerOf.get(item.id));
      const floors = itemFloors(source);
      if (floors.length) item.metadata[FLOOR_KEY] = floors;
      else delete item.metadata[FLOOR_KEY];
      if (source.metadata[PERSIST_KEY] === true) item.metadata[PERSIST_KEY] = true;
      else delete item.metadata[PERSIST_KEY];
    }
  });
}

// Everything attached (transitively) to a room follows its reveal state too
// — a monster or treasure token attached to a room shows up once it's found.
async function cascadeRevealToAttachments(rootIds, revealed) {
  const { ownerOf } = await attachmentDescendants(rootIds);
  const ids = [...ownerOf.keys()].filter((id) => !rootIds.includes(id));
  if (!ids.length) return;
  await OBR.scene.items.updateItems(ids, (items) => {
    for (const item of items) {
      if (revealed) item.metadata[REVEALED_KEY] = true;
      else delete item.metadata[REVEALED_KEY];
    }
  });
}

// --- Active floor / reveal-armed -------------------------------------------
// activeFloor is a number, or null for "no floor" (shows only unassigned and
// all-floors items).

export async function getActiveFloor() {
  const v = (await getState()).activeFloor;
  return v === undefined ? null : v;
}

export async function setActiveFloor(floor) {
  await setState({ activeFloor: floor });
}

export async function getRevealArmed() {
  return (await getState()).revealArmed === true;
}

export async function setRevealArmed(armed) {
  await setState({ revealArmed: armed });
}

// --- Floor list --------------------------------------------------------

async function itemDerivedFloors() {
  const items = await OBR.scene.items.getItems((item) => item.metadata[FLOOR_KEY] != null);
  const all = new Set();
  for (const item of items) for (const f of itemFloors(item)) all.add(f);
  return all;
}

export async function getFloors() {
  const [fromItems, state] = await Promise.all([itemDerivedFloors(), getState()]);
  const defined = new Set(state.definedFloors ?? []);
  let changed = false;
  for (const f of fromItems) {
    if (!defined.has(f)) { defined.add(f); changed = true; }
  }
  if (changed) await setState({ definedFloors: [...defined] });
  return [...defined].sort((a, b) => a - b);
}

export async function isFloorEmpty(floor) {
  const items = await OBR.scene.items.getItems((i) => hasFloor(i, floor));
  return items.length === 0;
}

export async function addBlankFloor() {
  const floors = await getFloors();
  const next = (floors.length ? Math.max(...floors) : 0) + 1;
  await setState({ definedFloors: [...floors, next] });
  return next;
}

export async function cleanupTrailingEmptyFloors() {
  const floors = await getFloors();
  let defined = [...floors];
  while (defined.length) {
    const top = defined[defined.length - 1];
    if (await isFloorEmpty(top)) defined.pop();
    else break;
  }
  if (defined.length !== floors.length) await setState({ definedFloors: defined });
}

// --- Per-floor color -----------------------------------------------------

export async function getFloorColor(floor) {
  const state = await getState();
  return state.floorColors?.[floor] ?? null;
}

export async function setFloorColor(floor, color) {
  const state = await getState();
  await setState({ floorColors: { ...(state.floorColors ?? {}), [floor]: color } });
}

export async function clearFloorColor(floor) {
  const state = await getState();
  const floorColors = { ...(state.floorColors ?? {}) };
  delete floorColors[floor];
  await setState({ floorColors });
}

// --- Player-facing floor indicator -----------------------------------------

export async function getIndicatorEnabled() {
  return (await getState()).indicatorEnabled !== false;
}

export async function setIndicatorEnabled(enabled) {
  await setState({ indicatorEnabled: enabled });
}

// Pick black or white text, whichever reads better on the given background.
function readableTextColor(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex ?? "");
  if (!m) return "#ffffff";
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#111111" : "#ffffff";
}

async function updateFloorIndicator(active) {
  const enabled = await getIndicatorEnabled();
  const existing = await OBR.scene.items.getItems((i) => i.metadata[INDICATOR_KEY] === true);

  if (!enabled || active == null) {
    if (existing.length) {
      await OBR.scene.items.updateItems(existing.map((i) => i.id), (items) => {
        for (const item of items) item.visible = false;
      });
    }
    return;
  }

  const color = (await getFloorColor(active)) ?? { fill: "#333333", border: "#ffffff" };

  if (existing.length) {
    await OBR.scene.items.updateItems(existing.map((i) => i.id), (items) => {
      for (const item of items) {
        item.text.plainText = `Floor ${active}`;
        item.style.backgroundColor = color.fill;
        item.text.style.fillColor = readableTextColor(color.fill); // text color lives on text.style, not item.style
        item.visible = true;
      }
    });
  } else {
    const label = buildLabel()
      .plainText(`Floor ${active}`)
      .position({ x: 0, y: 0 })
      .layer("TEXT")
      .fontSize(28)
      .padding(10)
      .cornerRadius(8)
      .backgroundColor(color.fill)
      .backgroundOpacity(0.92)
      .fillColor(readableTextColor(color.fill))
      .fillOpacity(1)
      .visible(true)
      .disableHit(true)
      .metadata({ [INDICATOR_KEY]: true })
      .build();
    label.zIndex = 2 * BAND; // comfortably above any on-floor item
    await OBR.scene.items.addItems([label]);
  }
}

export async function removeFloorIndicator() {
  const existing = await OBR.scene.items.getItems((i) => i.metadata[INDICATOR_KEY] === true);
  if (existing.length) await OBR.scene.items.deleteItems(existing.map((i) => i.id));
  return existing.length;
}

// --- Curtains ------------------------------------------------------------
// Both are sized to the relevant content (with margin), not a fixed huge
// constant — an enormous item throws off Owlbear's zoom-to-fit camera badly
// enough to make real content look like it's vanished at that zoom level.

async function fitRect(itemIds, minHalf, margin) {
  let halfW = minHalf, halfH = minHalf, cx = 0, cy = 0;
  if (itemIds.length) {
    const bounds = await OBR.scene.items.getItemBounds(itemIds);
    if (bounds) {
      cx = (bounds.min.x + bounds.max.x) / 2;
      cy = (bounds.min.y + bounds.max.y) / 2;
      halfW = Math.max(minHalf, ((bounds.max.x - bounds.min.x) * margin) / 2);
      halfH = Math.max(minHalf, ((bounds.max.y - bounds.min.y) * margin) / 2);
    }
  }
  return { width: halfW * 2, height: halfH * 2, position: { x: cx - halfW, y: cy - halfH }, halfW, halfH };
}

export async function removeCurtain() {
  const existing = await OBR.scene.items.getItems((i) => i.metadata[CURTAIN_KEY] === true);
  if (existing.length) await OBR.scene.items.deleteItems(existing.map((i) => i.id));
  return existing.length;
}

// Blocks tier-0 (off-floor) items for everyone, sized to everything assigned
// to any floor anywhere (so it doesn't need resizing on every single switch).
// It's player-visible and filled with the Owlbear theme's background colour,
// so it reads as empty canvas. (A hidden curtain can't do this job: Owlbear
// draws hidden items translucently for the GM, so whatever is under it
// would show through.)
async function curtainColor() {
  try {
    return (await OBR.theme.getTheme())?.background?.default ?? "#1e1e1e";
  } catch {
    return "#1e1e1e";
  }
}

async function ensureCurtain(floorItemIds) {
  const fit = await fitRect(floorItemIds, 5000, 2);
  const bg = await curtainColor();
  const existing = await OBR.scene.items.getItems((i) => i.metadata[CURTAIN_KEY] === true);
  if (existing.length) {
    const cur = existing[0];
    const fitsAlready =
      cur.width >= fit.width && cur.height >= fit.height &&
      Math.abs(cur.position.x - fit.position.x) <= fit.halfW * 0.5 &&
      Math.abs(cur.position.y - fit.position.y) <= fit.halfH * 0.5;
    // Also converts a curtain made by an older version (hidden, fixed colour).
    const stale = cur.visible !== true || cur.style.fillColor !== bg;
    if (!fitsAlready || stale) {
      await OBR.scene.items.updateItems(existing.map((i) => i.id), (items) => {
        for (const item of items) {
          if (!fitsAlready) {
            item.width = fit.width;
            item.height = fit.height;
            item.position = fit.position;
          }
          item.style.fillColor = bg;
          item.visible = true;
        }
      });
    }
    return;
  }
  const curtain = buildShape()
    .name("TOMcrawl curtain")
    .shapeType("RECTANGLE")
    .width(fit.width)
    .height(fit.height)
    .position(fit.position)
    .layer("MAP")
    .fillColor(bg)
    .fillOpacity(1)
    .strokeOpacity(0)
    .strokeWidth(0)
    .locked(true)
    .disableHit(true)
    .disableAutoZIndex(true)
    .visible(true) // shown to players too, in the theme background colour
    .zIndex(BAND)
    .metadata({ [CURTAIN_KEY]: true })
    .build();
  await OBR.scene.items.addItems([curtain]);
}

// Owlbear lets a GM unlock and hide any item, including the curtain, which
// quietly defeats it. Called when entering Play mode so a stray manual
// hide/unlock doesn't carry over into a session.
export async function reassertCurtain() {
  const existing = await OBR.scene.items.getItems((i) => i.metadata[CURTAIN_KEY] === true);
  if (!existing.length) return;
  await OBR.scene.items.updateItems(existing.map((i) => i.id), (items) => {
    for (const item of items) item.locked = true;
    // Visibility is reasserted by the next applyFloorVisibility pass, which
    // runs right after this in setSetupOpen — no need to guess it here.
  });
}

// Park an item (hide, make unclickable, drop to the MAP layer so the curtain
// covers it) or restore it exactly as it was.
function setShown(item, show) {
  const meta = item.metadata;
  const saved = meta[SAVED_KEY];
  if (show) {
    if (saved) {
      item.layer = saved.layer;
      item.disableHit = saved.hit;
      delete meta[SAVED_KEY];
    }
    item.visible = true;
  } else {
    if (!saved) meta[SAVED_KEY] = { layer: item.layer, hit: item.disableHit === true };
    item.visible = false;
    item.disableHit = true;
    if (item.layer !== "MAP") item.layer = "MAP";
  }
}

// Mark an item as visible on every floor (restoring it if it was parked).
export function makePersistent(item) {
  item.metadata[PERSIST_KEY] = true;
  setShown(item, true);
}

// Remove an item's floor assignment entirely, restoring it first.
export function releaseItem(item) {
  setShown(item, true);
  const base = item.metadata[ZBASE_KEY];
  if (base != null) item.zIndex = 2 * BAND + baseZ(base); // stay fully visible
  delete item.metadata[FLOOR_KEY];
  delete item.metadata[PERSIST_KEY];
  delete item.metadata[ZBASE_KEY];
}

// --- Room / connection geometry -------------------------------------------
// Only used to find which connections touch a room, for cascading a reveal
// — no longer anything to do with generating fog shapes.

// Bounding box of the room, grown by `pad` so an endpoint sitting exactly on
// the edge still counts as touching.
async function roomPolygon(item, pad = 0) {
  const bounds = (await OBR.scene.items.getItemBounds([item.id])) ?? null;
  if (!bounds) return null;
  const { min, max } = bounds;
  return [
    { x: min.x - pad, y: min.y - pad }, { x: max.x + pad, y: min.y - pad },
    { x: max.x + pad, y: max.y + pad }, { x: min.x - pad, y: max.y + pad },
  ];
}

function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    const hit =
      a.y > pt.y !== b.y > pt.y &&
      pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x;
    if (hit) inside = !inside;
  }
  return inside;
}

// A connection's endpoints in scene space. LINE items store
// startPosition/endPosition; CURVE items store points. Both are local to the
// item, so apply scale -> rotation -> position to get scene coordinates.
function connectionEndpoints(item) {
  let ends;
  if (item.type === "LINE" && item.startPosition && item.endPosition) {
    ends = [item.startPosition, item.endPosition];
  } else if (item.points?.length >= 2) {
    ends = [item.points[0], item.points[item.points.length - 1]];
  } else {
    return null;
  }
  const rad = ((item.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const sx = item.scale?.x ?? 1, sy = item.scale?.y ?? 1;
  return ends.map((p) => {
    const x = p.x * sx, y = p.y * sy;
    return {
      x: item.position.x + x * cos - y * sin,
      y: item.position.y + x * sin + y * cos,
    };
  });
}

// Every ordinary (non-hidden) connection sharing a floor with the room,
// whose endpoint lands inside it. Hidden passages are deliberately excluded
// — they have to be found and revealed on their own.
export async function connectionsForRoom(room, allItems) {
  const dpi = await OBR.scene.grid.getDpi();
  const poly = await roomPolygon(room, dpi * 0.25); // quarter-cell tolerance
  if (!poly) return [];
  const roomFloors = itemFloors(room);
  const candidates = allItems.filter(
    (i) =>
      CONNECTION_TYPES.has(i.type) &&
      i.id !== room.id &&
      i.metadata[HIDDEN_KEY] !== true &&
      itemFloors(i).some((f) => roomFloors.includes(f))
  );
  const out = [];
  for (const c of candidates) {
    const ends = connectionEndpoints(c);
    console.debug("TOMcrawl connection test", c.id, c.type, ends); // remove once confirmed
    if (ends && ends.some((pt) => pointInPolygon(pt, poly))) out.push(c);
  }
  return out;
}

// --- Reveal / fog --------------------------------------------------------
// "Revealed" is just a metadata flag; whether it's actually visible is
// decided by the z-index tier in applyFloorVisibility. No shapes are
// created or deleted for this at all.

export async function revealItem(item) {
  await OBR.scene.items.updateItems([item.id], (items) => {
    items[0].metadata[REVEALED_KEY] = true;
  });
  await cascadeRevealToAttachments([item.id], true);
}

// Reveal a room, every (non-hidden) connection touching it, and anything
// attached to it (a monster, treasure, a label — all follow).
export async function revealRoom(room) {
  const allItems = await OBR.scene.items.getItems();
  await revealItem(room);
  for (const c of await connectionsForRoom(room, allItems)) await revealItem(c);
}

// Fog an entire floor: clear the revealed flag (and cascade to attachments)
// for everything on it — durable, not something the next switch undoes.
export async function fogFloor(floor) {
  const items = await OBR.scene.items.getItems();
  const ids = items
    .filter((i) => hasFloor(i, floor) && i.metadata[REVEALED_KEY] === true)
    .map((i) => i.id);
  if (!ids.length) return;
  await OBR.scene.items.updateItems(ids, (items) => {
    for (const item of items) delete item.metadata[REVEALED_KEY];
  });
  await cascadeRevealToAttachments(ids, false);
}

// Reveal every room/connection (and their attachments) on the floor outright.
export async function revealFloor(floor) {
  const items = await OBR.scene.items.getItems((i) => hasFloor(i, floor));
  if (!items.length) return;
  const ids = items.map((i) => i.id);
  await OBR.scene.items.updateItems(ids, (items) => {
    for (const item of items) item.metadata[REVEALED_KEY] = true;
  });
  await cascadeRevealToAttachments(ids, true);
}

async function doApplyFloorVisibility(active) {
  try {
    await updateFloorIndicator(active);
  } catch (e) {
    console.error("TOMcrawl floor indicator failed:", e);
  }

  const floorItems = await OBR.scene.items.getItems((item) => item.metadata[FLOOR_KEY] != null);
  if (!floorItems.length) return;

  try {
    await ensureCurtain(floorItems.map((i) => i.id));
  } catch (e) {
    console.error("TOMcrawl curtain failed:", e);
  }

  await OBR.scene.items.updateItems(
    floorItems.map((i) => i.id),
    (items) => {
      for (const item of items) {
        const meta = item.metadata;
        // Also repairs a bad value left by an older version.
        meta[ZBASE_KEY] = baseZ(meta[ZBASE_KEY] ?? item.zIndex);
        const persistent = meta[PERSIST_KEY] === true;
        const onThisFloor = active == null ? itemFloors(item).length === 0 : hasFloor(item, active);
        const show = persistent || onThisFloor;
        setShown(item, show); // floor-level: park (curtain) or restore
        if (show) {
          item.zIndex = BAND + meta[ZBASE_KEY];
          // Room-level: whether it's actually *revealed* just uses Owlbear's
          // own visible flag directly — invisible to players, dimmed for
          // the GM, exactly what's wanted, no extra shape involved.
          item.visible = persistent || meta[REVEALED_KEY] === true;
        } else {
          item.zIndex = meta[ZBASE_KEY];
        }
      }
    }
  );

  if (active != null) {
    try {
      const color = await getFloorColor(active);
      if (color) {
        const targets = floorItems.filter(
          (i) =>
            DRAWING_TYPES.has(i.type) &&
            i.layer === "MAP" &&
            itemFloors(i).includes(active) &&
            i.metadata[OVERRIDE_KEY] !== true
        );
        // LINE items have no fill, and Owlbear rejects the *whole* batch if
        // any item gets a property its type doesn't allow — so lines are
        // styled separately, with stroke properties only.
        const fillOpacity = color.opacity ?? 1;
        const lines = targets.filter((i) => i.type === "LINE");
        const filled = targets.filter((i) => i.type !== "LINE");
        if (filled.length) {
          await OBR.scene.items.updateItems(filled.map((i) => i.id), (items) => {
            for (const item of items) {
              item.style.fillColor = color.fill;
              item.style.fillOpacity = fillOpacity;
              item.style.strokeColor = color.border;
              item.style.strokeOpacity = 1;
              item.style.strokeWidth = color.width;
            }
          });
        }
        if (lines.length) {
          await OBR.scene.items.updateItems(lines.map((i) => i.id), (items) => {
            for (const item of items) {
              item.style.strokeColor = color.border;
              item.style.strokeOpacity = 1;
              item.style.strokeWidth = color.width;
            }
          });
        }
      }
    } catch (e) {
      console.error("TOMcrawl floor color failed:", e?.error?.message ?? e);
    }
  }
}

// Guards against overlapping concurrent runs (e.g. two triggers firing in
// quick succession), which previously caused a flood of API calls and hit
// Owlbear's rate limit. Any call that arrives mid-run just updates
// `pendingFloor`; the in-flight run picks it up once it finishes.
let running = null;
let pendingFloor;
let havePending = false;

export async function applyFloorVisibility(active) {
  pendingFloor = active;
  havePending = true;
  if (!running) {
    running = (async () => {
      while (havePending) {
        const floor = pendingFloor;
        havePending = false;
        try {
          await doApplyFloorVisibility(floor);
        } catch (e) {
          console.error("TOMcrawl applyFloorVisibility failed:", JSON.stringify(e, null, 2), e);
        }
      }
      running = null;
    })();
  }
  await running;
}
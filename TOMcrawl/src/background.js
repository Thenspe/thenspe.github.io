import OBR from "@owlbear-rodeo/sdk";
import {
  ID, FLOOR_KEY, PERSIST_KEY, STATE_KEY, DRAWING_TYPES,
  CURTAIN_KEY, SAVED_KEY, hasFloor, bulkAssignFloor, ensureClickableFill,
  isRevealTarget, propagateFloorToAttachments,
  getActiveFloor, getRevealArmed, applyFloorVisibility, makePersistent, revealRoom,
} from "./shared.js";

function addMenu(id, icon, label, filter, onClick) {
  OBR.contextMenu.create({
    id: `${ID}/${id}`,
    icons: [{ icon, label, filter }],
    onClick,
  });
}

OBR.onReady(async () => {
  if ((await OBR.player.getRole()) !== "GM") return;

  addMenu("assign", "/icon-assign.svg", "Toggle active floor", undefined, async (context) => {
    const floor = await getActiveFloor();
    if (floor == null) return; // "no floor" is a view, not something to assign
    const ids = context.items.map((i) => i.id);
    let added;
    await OBR.scene.items.updateItems(ids, (items) => {
      added = bulkAssignFloor(items, floor);
      for (const item of items) {
        if (added) ensureClickableFill(item);
        if (DRAWING_TYPES.has(item.type) && item.layer === "DRAWING") item.layer = "MAP";
      }
    });
    await propagateFloorToAttachments(ids);
    await applyFloorVisibility(floor);
  });

  addMenu(
    "persist-on",
    "/icon-all.svg",
    "All floors",
    { every: [{ key: ["metadata", PERSIST_KEY], value: undefined }] },
    async (context) => {
      const ids = context.items.map((i) => i.id);
      await OBR.scene.items.updateItems(ids, (items) => {
        for (const item of items) makePersistent(item);
      });
      await propagateFloorToAttachments(ids);
    }
  );

  addMenu(
    "persist-off",
    "/icon-one.svg",
    "One floor",
    { every: [{ key: ["metadata", PERSIST_KEY], value: true }] },
    async (context) => {
      const ids = context.items.map((i) => i.id);
      await OBR.scene.items.updateItems(ids, (items) => {
        for (const item of items) delete item.metadata[PERSIST_KEY];
      });
      await propagateFloorToAttachments(ids);
      await applyFloorVisibility(await getActiveFloor());
    }
  );

  addMenu(
    "reveal",
    "/icon-reveal.svg",
    "Reveal room",
    { every: [{ key: ["metadata", FLOOR_KEY], operator: "!=", value: undefined }] },
    async (context) => {
      const rooms = context.items.filter((i) => isRevealTarget(i));
      for (const room of rooms) await revealRoom(room);
      await applyFloorVisibility(await getActiveFloor());
    }
  );

  // While "Reveal mode" is armed, selecting a single room (or hidden
  // passage) reveals it right away.
  OBR.player.onChange(async (player) => {
    const selection = player.selection;
    if (selection?.length !== 1) return;
    try {
      if (!(await getRevealArmed())) return;
      const [item] = await OBR.scene.items.getItems(selection);
      if (item && isRevealTarget(item) && item.metadata[FLOOR_KEY] != null) {
        await revealRoom(item);
        await applyFloorVisibility(await getActiveFloor());
      }
    } catch (e) {
      console.error("TOMcrawl reveal-mode failed:", e);
    }
  });

  // Keep the curtain and inactive-floor items out of any selection (e.g. drag-select).
  OBR.player.onChange(async (player) => {
    const selection = player.selection;
    if (!selection?.length) return;
    try {
      if (!(await OBR.scene.isReady())) return;
      const active = await getActiveFloor();
      const items = await OBR.scene.items.getItems(selection);
      const blocked = new Set(
        items
          .filter((i) => {
            const m = i.metadata;
            return (
              m[CURTAIN_KEY] === true ||
              m[SAVED_KEY] != null ||
              (m[FLOOR_KEY] != null && m[PERSIST_KEY] !== true && !hasFloor(i, active))
            );
          })
          .map((i) => i.id)
      );
      if (blocked.size) {
        await OBR.player.select(selection.filter((id) => !blocked.has(id)), true);
      }
    } catch (e) {
      console.error("TOMcrawl selection filter failed:", e);
    }
  });

  // The curtain is filled with the theme's background colour, so re-run
  // visibility when the theme changes to keep it blended in.
  OBR.theme.onChange(async () => {
    try {
      if (await OBR.scene.isReady()) await applyFloorVisibility(await getActiveFloor());
    } catch (e) {
      console.error("TOMcrawl theme refresh failed:", e);
    }
  });

  // Switch floors whenever the active floor changes, from any source.
  let unsubscribe;
  const start = () => {
    unsubscribe?.();
    unsubscribe = OBR.scene.onMetadataChange((meta) =>
      applyFloorVisibility(meta[STATE_KEY]?.activeFloor ?? null)
    );
  };
  OBR.scene.onReadyChange((ready) => {
    if (ready) start();
    else { unsubscribe?.(); unsubscribe = undefined; }
  });
  if (await OBR.scene.isReady()) start();
});
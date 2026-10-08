import OBR from "@owlbear-rodeo/sdk";
import "./style.css";
import {
  FLOOR_KEY, PERSIST_KEY, REVEALED_KEY, OVERRIDE_KEY, HIDDEN_KEY,
  DRAWING_TYPES, isRevealTarget,
  itemFloors, bulkAssignFloor, ensureClickableFill, propagateFloorToAttachments,
  getActiveFloor, setActiveFloor, getFloors, isFloorEmpty, addBlankFloor,
  cleanupTrailingEmptyFloors, getFloorColor, setFloorColor, clearFloorColor,
  applyFloorVisibility, makePersistent, releaseItem, fogFloor, revealFloor,
  revealRoom, getRevealArmed, setRevealArmed, removeCurtain, reassertCurtain,
  getIndicatorEnabled, setIndicatorEnabled, removeFloorIndicator,
} from "./shared.js";

const app = document.querySelector("#app");
let status = "Ready.";
let setupOpen = localStorage.getItem("tomcrawl-setup-open") === "1";

// Floor-color inputs reset to that floor's saved color only when the
// *active floor itself* changes, not on every re-render, so an in-progress
// pick isn't wiped out by an unrelated refresh.
let colorFloorTracked;
let floorFill = "#3a2a4a";
let floorBorder = "#c084fc";
let floorWidth = 5;
let floorOpacity = 100; // percent; stored as 0-1 in the floor colour

// Which colour palette (if any) is expanded in the floor colour tool. Kept
// out of the DOM so it survives re-renders.
let openPicker = null; // "fill" | "border" | null
const PALETTE = [
  "#ffffff", "#9e9e9e", "#424242", "#000000",
  "#ff5252", "#ff9800", "#ffeb3b", "#8bc34a",
  "#4caf50", "#26c6da", "#2196f3", "#3f51b5",
  "#9c27b0", "#e91e63", "#795548", "#3a2a4a",
];

const PLAY_HEIGHT = 300; // title + viewing floor + fog + status
const SETUP_HEIGHT = 820; // everything

async function resizePopover() {
  try {
    await OBR.action.setHeight(setupOpen ? SETUP_HEIGHT : PLAY_HEIGHT);
  } catch (e) {
    console.error("TOMcrawl setHeight failed:", e);
  }
}

async function setSetupOpen(open) {
  setupOpen = open;
  localStorage.setItem("tomcrawl-setup-open", open ? "1" : "0");
  if (!open) {
    // Leaving setup: tidy up trailing empty floors, re-lock the curtains
    // against manual tampering, then re-run visibility so their correct
    // show/hide state (not just lock state) is restored immediately.
    await cleanupTrailingEmptyFloors();
    await reassertCurtain();
    await applyFloorVisibility(await getActiveFloor());
  }
  await resizePopover();
}

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function refresh() {
  const active = await getActiveFloor();
  const floors = await getFloors();
  const emptyFloors = new Set(
    (await Promise.all(floors.map(async (f) => [f, await isFloorEmpty(f)])))
      .filter(([, empty]) => empty)
      .map(([f]) => f)
  );
  const selection = await OBR.player.getSelection();
  const selected = selection?.length ? await OBR.scene.items.getItems(selection) : [];
  const armed = await getRevealArmed();
  const indicatorOn = await getIndicatorEnabled();

  if (active !== colorFloorTracked) {
    colorFloorTracked = active;
    openPicker = null;
    const fc = active != null ? await getFloorColor(active) : null;
    floorFill = fc?.fill ?? "#3a2a4a";
    floorBorder = fc?.border ?? "#c084fc";
    floorWidth = fc?.width ?? 5;
    floorOpacity = Math.round((fc?.opacity ?? 1) * 100);
  }

  const selectedFloors = new Set();
  let selectionHasPersistent = false;
  for (const i of selected) {
    if (i.metadata[PERSIST_KEY]) selectionHasPersistent = true;
    for (const f of itemFloors(i)) selectedFloors.add(f);
  }

  const floorButtons = (action) =>
    floors
      .map((f) => {
        const empty = action === "view" && emptyFloors.has(f);
        const lit =
          action === "view" ? f === active : selectionHasPersistent || selectedFloors.has(f);
        const cls = lit ? (action === "view" ? "active" : "assigned") : "";
        return `<button data-action="${action}" data-floor="${f}" data-empty="${empty ? "1" : "0"}" class="${cls} ${empty ? "empty" : ""}">Floor ${f}</button>`;
      })
      .join("");

  const viewingSection = `
    <div class="section">
      <div class="label">Viewing floor</div>
      <div class="button-row">
        <button data-action="view" data-floor="none" class="${active === null ? "active" : ""}">No floor</button>
        ${floorButtons("view")}
        ${setupOpen ? '<button data-action="newfloor">+ New</button>' : ""}
      </div>
    </div>`;

  const fogSection = `
    <div class="section">
      <div class="label">Fog — active floor</div>
      <div class="button-row">
        <button data-action="fogfloor">Fog all</button>
        <button data-action="unfogfloor">Unfog all</button>
        <button data-action="reveal">Reveal room</button>
      </div>
      <div class="button-row">
        <button data-action="revealmode" class="${armed ? "active" : ""}">
          Reveal mode: ${armed ? "ON (click a room)" : "OFF"}
        </button>
      </div>
    </div>`;

  const colorField = (target, name, value) => `
    <div class="style-field">
      <div class="field-name">${name}</div>
      <button type="button" class="color-trigger ${openPicker === target ? "open" : ""}" data-action="togglepicker" data-target="${target}">
        <span class="swatch-preview" id="preview-${target}" style="background:${value}"></span>
        <span class="hex" id="hex-${target}">${value.toUpperCase()}</span>
      </button>
    </div>
    ${
      openPicker === target
        ? `<div class="palette">
            ${PALETTE.map(
              (c) =>
                `<button type="button" class="swatch ${c.toLowerCase() === value.toLowerCase() ? "selected" : ""}" data-action="pickcolor" data-target="${target}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`
            ).join("")}
            <label class="swatch custom" title="Custom colour">+<input type="color" id="floorcolor-${target}-custom" value="${value}"></label>
          </div>`
        : ""
    }`;

  const floorColorSection =
    active == null
      ? ""
      : `
    <div class="section">
      <div class="label">Floor colour — Floor ${active}, unless an item overrides it</div>
      ${colorField("fill", "Fill", floorFill)}
      <div class="style-field">
        <div class="field-name">Fill opacity</div>
        <div class="width-control">
          <input type="range" id="floorcolor-opacity" min="0" max="100" step="1" value="${floorOpacity}">
          <span class="width-value" id="flooropacity-val">${floorOpacity}%</span>
        </div>
      </div>
      ${colorField("border", "Stroke", floorBorder)}
      <div class="style-field">
        <div class="field-name">Stroke width</div>
        <div class="width-control">
          <input type="range" id="floorcolor-width" min="0" max="24" step="1" value="${floorWidth}">
          <span class="width-value" id="floorwidth-val">${floorWidth}</span>
        </div>
      </div>
      <div class="button-row">
        <button data-action="setfloorcolor">Set colour</button>
        <button data-action="clearfloorcolor">Clear colour</button>
      </div>
    </div>`;

  const setupOnlySections = `
    <div class="section">
      <div class="label">Toggle floor(s) for selection — a room can belong to more than one</div>
      <div class="button-row">${floorButtons("assign")}</div>
    </div>
    <div class="section">
      <div class="label">Selection</div>
      <div class="button-row">
        <button data-action="persist">All floors</button>
        <button data-action="unassign">Unassign floor</button>
      </div>
      <div class="button-row">
        <button data-action="override">Toggle colour override</button>
        <button data-action="hidden">Toggle hidden passage</button>
      </div>
    </div>
    ${floorColorSection}
    <div class="section">
      <div class="label">Attach — select a room plus item(s), e.g. a label</div>
      <div class="button-row">
        <button data-action="attach">Attach to room</button>
        <button data-action="detach">Detach</button>
      </div>
    </div>
    <div class="section">
      <div class="label">Player-facing floor label — drag it into place once, it updates itself</div>
      <div class="button-row">
        <button data-action="toggleindicator" class="${indicatorOn ? "active" : ""}">
          Floor indicator: ${indicatorOn ? "ON" : "OFF"}
        </button>
        <button data-action="removeindicator">Remove indicator</button>
      </div>
    </div>
    <div class="section">
      <button data-action="dump" class="wide-button">Dump selection to console</button>
      <button data-action="removecurtain" class="wide-button">Remove curtain (if not needed)</button>
    </div>
    <div class="section">
      <div class="label">Selected objects</div>
      <div class="selection-info">${
        selected.length
          ? selected.map((i) => {
              const floors = itemFloors(i);
              const tag = i.metadata[PERSIST_KEY]
                ? "All floors"
                : floors.length
                ? `Floor ${floors.slice().sort((a, b) => a - b).join(", ")}`
                : "Unassigned";
              const flags = [
                i.metadata[REVEALED_KEY] ? "revealed" : null,
                i.metadata[OVERRIDE_KEY] ? "override" : null,
                i.metadata[HIDDEN_KEY] ? "hidden passage" : null,
              ].filter(Boolean);
              const flagText = flags.length ? ` · ${flags.join(" · ")}` : "";
              return `<div class="selection-item"><span>${esc(i.name || i.type)} (${i.layer})</span><span>${tag}${flagText}</span></div>`;
            }).join("")
          : `<div class="selection-item"><span>None selected</span></div>`
      }</div>
    </div>
    <div class="status">${esc(status)}</div>`;

  app.innerHTML = `
    <div class="title-row">
      <h1>TOMcrawl</h1>
      <button data-action="togglesetup" class="mode-button">
        ${setupOpen ? "▾ Setup" : "▸ Setup"}
      </button>
    </div>
    ${viewingSection}
    ${fogSection}
    ${setupOpen ? setupOnlySections : ""}`;
}

async function assign(floor) {
  const selection = await OBR.player.getSelection();
  if (!selection?.length) return (status = "Nothing selected.");
  let added;
  await OBR.scene.items.updateItems(selection, (items) => {
    added = bulkAssignFloor(items, floor);
    for (const item of items) {
      if (added) ensureClickableFill(item);
      if (DRAWING_TYPES.has(item.type) && item.layer === "DRAWING") item.layer = "MAP";
    }
  });
  await propagateFloorToAttachments(selection);
  await applyFloorVisibility(await getActiveFloor());
  status = `${added ? "Added" : "Removed"} Floor ${floor} for ${selection.length} item(s).`;
}

async function changeSelection(fn, message) {
  const selection = await OBR.player.getSelection();
  if (!selection?.length) return (status = "Nothing selected.");
  await OBR.scene.items.updateItems(selection, (items) => items.forEach(fn));
  await propagateFloorToAttachments(selection);
  status = `${message} (${selection.length} item(s)).`;
}

function toggleOverride(item) {
  if (item.metadata[OVERRIDE_KEY]) delete item.metadata[OVERRIDE_KEY];
  else item.metadata[OVERRIDE_KEY] = true;
}

function toggleHidden(item) {
  if (item.metadata[HIDDEN_KEY]) delete item.metadata[HIDDEN_KEY];
  else item.metadata[HIDDEN_KEY] = true;
}

async function reveal() {
  const selection = await OBR.player.getSelection();
  const rooms = (await OBR.scene.items.getItems(selection ?? [])).filter(
    (i) => isRevealTarget(i) && i.metadata[FLOOR_KEY] != null
  );
  if (!rooms.length) return (status = "Select a room (or hidden passage) with a floor first.");
  for (const room of rooms) await revealRoom(room);
  await applyFloorVisibility(await getActiveFloor());
  status = `Revealed ${rooms.length} item(s) and their connections.`;
}

async function attachSelected() {
  const selection = await OBR.player.getSelection();
  if (!selection || selection.length < 2) {
    return (status = "Select a room plus the item(s) to attach to it.");
  }
  const items = await OBR.scene.items.getItems(selection);
  const rooms = items.filter((i) => isRevealTarget(i));
  if (rooms.length !== 1) {
    return (status = "Select exactly one room, plus the item(s) to attach to it.");
  }
  const room = rooms[0];
  const others = items.filter((i) => i.id !== room.id).map((i) => i.id);
  await OBR.scene.items.updateItems(others, (items) => {
    for (const item of items) item.attachedTo = room.id;
  });
  await propagateFloorToAttachments([room.id]);
  status = `Attached ${others.length} item(s) to the room.`;
}

async function detachSelected() {
  const selection = await OBR.player.getSelection();
  if (!selection?.length) return (status = "Nothing selected.");
  await OBR.scene.items.updateItems(selection, (items) => {
    for (const item of items) item.attachedTo = undefined;
  });
  status = `Detached ${selection.length} item(s).`;
}

async function setFloorColorAction() {
  const active = await getActiveFloor();
  if (active == null) return;
  await setFloorColor(active, { fill: floorFill, border: floorBorder, width: floorWidth, opacity: floorOpacity / 100 });
  await applyFloorVisibility(active);
  status = `Set colour for Floor ${active}.`;
}

async function clearFloorColorAction() {
  const active = await getActiveFloor();
  if (active == null) return;
  await clearFloorColor(active);
  status = `Cleared colour for Floor ${active}.`;
}

async function dumpSelection() {
  const selection = await OBR.player.getSelection();
  if (!selection?.length) return (status = "Nothing selected.");
  const items = await OBR.scene.items.getItems(selection);
  console.log("TOMcrawl selection dump:", JSON.stringify(items, null, 2));
  status = `Dumped ${items.length} item(s) to the console (F12).`;
}

// Track color-picker inputs directly rather than through refresh(), so a
// panel re-render triggered by something else doesn't reset a color you're
// mid-picking.
app.addEventListener("input", (e) => {
  const id = e.target.id;
  if (id === "floorcolor-fill-custom" || id === "floorcolor-border-custom") {
    const target = id === "floorcolor-fill-custom" ? "fill" : "border";
    if (target === "fill") floorFill = e.target.value;
    else floorBorder = e.target.value;
    // Update the trigger in place; a re-render would close the native picker.
    const preview = document.getElementById(`preview-${target}`);
    const hex = document.getElementById(`hex-${target}`);
    if (preview) preview.style.background = e.target.value;
    if (hex) hex.textContent = e.target.value.toUpperCase();
  } else if (id === "floorcolor-opacity") {
    floorOpacity = Number(e.target.value);
    const val = document.getElementById("flooropacity-val");
    if (val) val.textContent = `${floorOpacity}%`;
  } else if (id === "floorcolor-width") {
    floorWidth = Number(e.target.value) || 0;
    const val = document.getElementById("floorwidth-val");
    if (val) val.textContent = String(floorWidth);
  }
});

app.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const floorAttr = btn.dataset.floor;
  const floor = floorAttr === "none" ? null : Number(floorAttr);
  try {
    switch (btn.dataset.action) {
      case "togglesetup": await setSetupOpen(!setupOpen); break;
      case "view": {
        // Re-check emptiness live rather than trusting the button's
        // data-empty attribute, which reflects whatever the panel's last
        // (debounced) render saw — switching floors right after assigning
        // something could otherwise read a flag that's already stale and
        // get silently blocked, never even calling setActiveFloor.
        if (floor !== null && (await isFloorEmpty(floor))) {
          status = `Floor ${floor} has nothing assigned yet — add something to it first.`;
          break;
        }
        await setActiveFloor(floor);
        break;
      }
      case "assign": await assign(floor); break;
      case "persist": await changeSelection(makePersistent, "Now shown on all floors"); break;
      case "unassign":
        await changeSelection(releaseItem, "Floor assignment removed");
        await applyFloorVisibility(await getActiveFloor());
        break;
      case "override":
        await changeSelection(toggleOverride, "Toggled colour override");
        await applyFloorVisibility(await getActiveFloor());
        break;
      case "hidden": await changeSelection(toggleHidden, "Toggled hidden passage"); break;
      case "fogfloor": {
        const active = await getActiveFloor();
        if (active == null) { status = "Select a floor first."; break; }
        await fogFloor(active);
        await applyFloorVisibility(active);
        status = "Active floor fogged.";
        break;
      }
      case "unfogfloor": {
        const active = await getActiveFloor();
        if (active == null) { status = "Select a floor first."; break; }
        await revealFloor(active);
        await applyFloorVisibility(active);
        status = "Entire active floor revealed.";
        break;
      }
      case "reveal": await reveal(); break;
      case "togglepicker":
        openPicker = openPicker === btn.dataset.target ? null : btn.dataset.target;
        break;
      case "pickcolor":
        if (btn.dataset.target === "fill") floorFill = btn.dataset.color;
        else floorBorder = btn.dataset.color;
        break;
      case "setfloorcolor": await setFloorColorAction(); break;
      case "clearfloorcolor": await clearFloorColorAction(); break;
      case "attach": await attachSelected(); break;
      case "detach": await detachSelected(); break;
      case "revealmode": await setRevealArmed(!(await getRevealArmed())); break;
      case "dump": await dumpSelection(); break;
      case "removecurtain": {
        const n = await removeCurtain();
        status = n ? "Curtain removed." : "No curtain exists right now.";
        break;
      }

      case "toggleindicator": {
        const on = await getIndicatorEnabled();
        await setIndicatorEnabled(!on);
        await applyFloorVisibility(await getActiveFloor());
        break;
      }
      case "removeindicator": {
        const n = await removeFloorIndicator();
        status = n ? "Indicator removed." : "No indicator exists right now.";
        break;
      }
      case "newfloor": {
        const next = await addBlankFloor();
        status = `Created Floor ${next}.`;
        break;
      }
    }
  } catch (err) {
    console.error("TOMcrawl action failed:", err);
    status = `Something went wrong (see console): ${err?.message ?? err}`;
  }
  safeRefresh();
});

async function safeRefresh() {
  try {
    await refresh();
  } catch (e) {
    console.error("TOMcrawl refresh failed:", e);
  }
}

// Bulk actions (like revealing a whole floor) fire many item-change events
// in quick succession; coalesce them into one refresh instead of racing
// several at once.
let refreshTimer = null;
function scheduleRefresh() {
  if (refreshTimer) return;
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    safeRefresh();
  }, 50);
}

// Match Owlbear's own panel look: a slightly transparent version of its
// current theme background, rather than our own hardcoded dark colors.
function hexToRgba(hex, alpha) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex ?? "");
  if (!m) return null;
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyTheme(theme) {
  const root = document.documentElement.style;
  const bg = hexToRgba(theme?.background?.default, 0.88);
  const paper = hexToRgba(theme?.background?.paper, 0.9);
  if (bg) root.setProperty("--bg", bg);
  if (paper) root.setProperty("--bg-paper", paper);
  if (theme?.text?.primary) root.setProperty("--text", theme.text.primary);
  if (theme?.text?.secondary) root.setProperty("--text-secondary", theme.text.secondary);
}

OBR.onReady(async () => {
  try {
    if ((await OBR.player.getRole()) !== "GM") {
      app.innerHTML = "<h1>TOMcrawl</h1><p>GM only.</p>";
      return;
    }
    if (!(await OBR.scene.isReady())) {
      app.innerHTML = "<h1>TOMcrawl</h1><p>Open a scene first.</p>";
      return;
    }
    try {
      applyTheme(await OBR.theme.getTheme());
      OBR.theme.onChange(applyTheme);
    } catch (e) {
      console.error("TOMcrawl theme setup failed:", e);
    }
    await resizePopover();
    safeRefresh();
    OBR.player.onChange(scheduleRefresh);
    OBR.scene.onMetadataChange(scheduleRefresh);
    OBR.scene.items.onChange(scheduleRefresh);
  } catch (err) {
    // A startup failure here previously left the static "Extension loaded"
    // placeholder up forever with no indication anything went wrong. Surface
    // it instead, and offer a one-click retry (e.g. for a transient
    // OBR_SCENE_IS_READY timeout under heavy load) rather than requiring a
    // full popover close/reopen.
    console.error("TOMcrawl startup failed:", err);
    app.innerHTML = `
      <h1>TOMcrawl</h1>
      <p>Startup failed: ${esc(err?.message ?? String(err))}</p>
      <p>Check the console (F12) for details.</p>
      <button id="tomcrawl-retry">Retry</button>`;
    document.getElementById("tomcrawl-retry")?.addEventListener("click", () => location.reload());
  }
});
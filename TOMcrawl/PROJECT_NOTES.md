# TOMcrawl — project notes

An Owlbear Rodeo extension for running multi-floor dungeon crawls: assign
drawn shapes to one or more floors, switch which floor is "active," and
reveal rooms/connections one at a time as players explore them.

**To resume work in a new conversation:** paste this file plus the current
contents of `src/shared.js`, `src/main.js`, `src/background.js` (the three
files that matter), then say what you want next. Also include `style.css`
if the task touches the popover UI (buttons, the floor colour tool) — it
changes more often than it used to. `manifest.json`, `index.html`,
`background.html` and `vite.config.js` rarely change. That's enough context
to continue without replaying history.

## Stack

Vite + vanilla JS, `@owlbear-rodeo/sdk`. No framework, no build step beyond
Vite. Two HTML entry points: `index.html` (the action popover, `main.js`)
and `background.html` (always-loaded background script, `background.js`).
Both import shared logic from `src/shared.js`.

## File roles

- **`shared.js`** — all the actual logic: floor assignment, visibility,
  reveal state, curtain, floor list/color/indicator management. Exports
  everything `main.js`/`background.js` use. If you're adding a feature, it
  almost certainly goes here first.
- **`main.js`** — the action popover UI (the panel the GM opens). Pure
  render-from-state + a click-delegation handler. No business logic beyond
  wiring buttons to `shared.js` functions. UI-only state that must survive
  re-renders (which floor's colour palette is open, in-progress colour
  picks) lives in module variables, not the DOM, because the whole panel
  is re-rendered on every refresh.
- **`background.js`** — runs invisibly the whole session. Owns the
  right-click context-menu entries, the "Reveal mode" click-to-reveal
  listener, the selection filter (keeps the curtain and off-floor items out
  of drag-select), the scene-metadata-change listener that re-runs
  `applyFloorVisibility` whenever the active floor changes, and a theme-
  change listener that re-runs it so the curtain colour follows the theme.

## Core model

- **Floors are arrays, not a single number.** `item.metadata[FLOOR_KEY]` is
  `number[]`. One shape can belong to several floors at once — this is how a
  stairwell/floor-spanning room works, and it's deliberate: it removes the
  need for duplicate overlapping shapes per floor, which used to corrupt
  things badly (see "History" below).
- **No native Owlbear fog is used at all.** Dropped entirely. "Revealed"
  is just a metadata flag (`REVEALED_KEY`) on a room/connection; whether
  it's actually visible is computed each time `applyFloorVisibility` runs,
  using Owlbear's own `item.visible` flag directly (see next point).
- **Two distinct hiding mechanisms, used for different reasons:**
  - **Floor-level** (is this item on the floor currently being viewed):
    uses a z-index trick — a "curtain" rectangle (`CURTAIN_KEY`) sized to
    cover all floor-assigned content. Off-floor items get dropped below it
    (zbase), on-floor items get elevated above it (`BAND + zbase`).
    Off-floor items are also parked: hidden, unclickable, moved to the MAP
    layer so the curtain covers them. The curtain is **visible to
    everyone** and filled with the Owlbear theme's `background.default`
    colour, so it reads as empty canvas. It used to be a GM-only hidden
    item, but Owlbear draws hidden items translucently to the GM, so
    off-floor geometry showed through it faintly and inconsistently.
    An opaque, player-visible curtain is the only way to fully hide other
    floors from the GM too.
  - **Room-level** (has this specific room been revealed yet): just uses
    Owlbear's own `item.visible` flag directly. No curtain, no z-index
    trick needed — native "invisible to players, dimmed to GM" is exactly
    the right behavior here, since the GM *should* see unrevealed rooms
    clearly. (An earlier version built a second curtain for this — wrong
    call, removed.)
- **z-index bookkeeping.** `zbase` stores an item's original z-index.
  Elevation is added on top (`BAND` for on-floor, `2 * BAND` for released
  items). Always read it through `baseZ()`, which strips any number of
  stacked BANDs — capturing with a plain `- BAND` once let an
  unassigned-then-reassigned item record `BAND + original` as its base,
  which put it *above* the curtain when off-floor. `applyFloorVisibility`
  re-normalizes `zbase` on every pass, so bad values heal themselves.
- **Floor registry**, not purely item-derived. `STATE_KEY.definedFloors` in
  scene metadata tracks every floor number that's ever existed, so an empty
  floor doesn't just vanish — it stays (flagged empty in the UI) until
  `cleanupTrailingEmptyFloors()` trims *trailing* empties on leaving Setup
  mode. Reading the floor list also self-registers any new floor number
  found purely from item assignment.
- **Attachments cascade** for both floor assignment and reveal state.
  Attach a label/prop to a room (`Attach to room` button) and it follows
  the room's floor and reveal status automatically.
- **Per-floor color**, not per-item styling. A floor can have a default
  fill / fill opacity / border / width; items pick it up unless
  individually marked with `OVERRIDE_KEY`. Applied in
  `doApplyFloorVisibility` to MAP-layer drawing items on the active floor.
- **Connections (corridors) reveal with their rooms.** `connectionsForRoom`
  finds non-hidden connections on a shared floor whose endpoint lands in the
  room's bounding box (padded by a quarter grid cell, so an endpoint sitting
  exactly on the edge still counts). See "Owlbear item gotchas" for how the
  endpoints are read.

## Owlbear item gotchas (learned the hard way)

- **`LINE` and `CURVE` are different shapes of data.** `LINE` stores
  `startPosition`/`endPosition`; `CURVE` stores `points`. Both are local to
  the item — apply scale, then rotation, then `position` to get scene
  coordinates (`connectionEndpoints` does this). The straight-line drawing
  tool makes `LINE` items; reading only `points` silently skipped every
  straight corridor.
- **`LINE` has no fill.** Writing `fillColor`/`fillOpacity` to a `LINE`
  fails validation, and Owlbear validates the **entire** `updateItems`
  batch, so one bad item makes the whole batch do nothing. Style `LINE`s
  in their own batch with stroke properties only. Same principle anywhere
  items of mixed types get one update.
- **Labels split their style.** Text colour is `item.text.style.fillColor`;
  `item.style` only holds the bubble (`backgroundColor`, etc.).
  The builder's `.fillColor()` puts it in the right place on creation, but
  an `updateItems` callback has to do it by hand.
- **Validation errors hide the useful part.** The console collapses
  `error.details`; log `e?.error?.message` (and `JSON.stringify` the
  details if needed) to see which field was rejected.

## Metadata key cheat sheet

All under `com.tomcrawl.dungeon/...`:

| Key | On | Meaning |
|---|---|---|
| `floor` | item | `number[]` of floors it belongs to |
| `persist` | item | `true` = shown on every floor (tokens, etc.) |
| `revealed` | item | `true` = room/connection has been found |
| `colorOverride` | item | `true` = ignore floor color, keep own style |
| `hiddenPassage` | item | `true` on a connection = don't auto-reveal with its room; it's its own reveal target |
| `curtain` | item | marks the floor-blocking rectangle (player-visible, theme background colour) |
| `zbase` | item | original zIndex, captured once, with any elevation stripped (`baseZ`) |
| `saved` | item | `{layer, hit}` while parked off-floor |
| `floorIndicator` | item | marks the player-facing floor label |
| `state` | **scene** | `{activeFloor, revealArmed, definedFloors, floorColors, indicatorEnabled}`; each `floorColors[n]` is `{fill, border, width, opacity}` (`opacity` 0–1, missing = 1) |

## Popover UI notes

- Selected-button look is one colour: both `button.active` and
  `button.assigned` share the standard purple. (`assigned` used to be a
  separate green.)
- The floor colour tool mimics Owlbear's shape styling: Fill and Stroke are
  swatch buttons that expand a 16-colour palette (`PALETTE` at the top of
  `main.js`) plus a `+` swatch opening the native colour picker; fill
  opacity and stroke width are sliders. In-progress values are updated in
  place on `input` events rather than via re-render, because a re-render
  would close the native picker.
- `SETUP_HEIGHT` is 820 to leave room for an open palette.
- The player-facing floor label picks black or white text automatically for
  contrast against the floor's fill colour (`readableTextColor`).

## Known open items / things to watch

- **Reveal-mode / context-menu reveal must call `applyFloorVisibility`
  after `revealRoom`/`fogFloor`/`revealFloor`.** Since reveal is pure
  metadata now, the visible-flag flip only happens inside
  `applyFloorVisibility`'s pass — every call site that changes
  `REVEALED_KEY` needs an explicit follow-up call. Already done in all
  current call sites as of this doc; if you add a new one, don't forget it.
- **Curtain caveats (player-visible):**
  - It covers anything on the MAP layer beneath it, including a map image.
    Fine for purely drawn dungeons; a background image would be hidden.
  - Its colour comes from the **GM's** theme. A player on a different theme
    (e.g. light mode) would see it as a visible rectangle.
  - It's sized to the floor content with a margin; panning far past it may
    show its edge if the canvas there isn't the same colour.
  - If the canvas looks a slightly different shade than the theme's
    `background.default`, the curtain will show as a faint rectangle —
    adjust `curtainColor()`.
  - Items on higher layers (characters, props, text) still draw above it.
- **Open `CURVE` connections get the floor fill colour**, which can look
  odd on an open path. Not yet special-cased (would mean skipping fill for
  open curves). `ROOM_TYPES` also includes `CURVE`, so an open curve
  corridor is click-revealable on its own like a room.
- **A leftover debug line** — `console.debug("TOMcrawl connection test", ...)`
  in `connectionsForRoom` — was added while diagnosing the corridor
  bug. Delete it if it's still there; it logs on every reveal.
- **The floor-color system and floor-wide reveal are untested together at
  scale.** Works in isolated testing; hasn't been stress-tested on a large,
  many-floor dungeon. (Next planned step: lay out a full dungeon and see
  what breaks.)
- **No GM "see through fog" preview.** Explicitly decided against — the
  asymmetry (hidden-from-players-only) that made floor-hiding need the
  curtain trick can't be reversed for an authored room-fog overlay, and
  dropping the whole custom-fog approach removed any need for one anyway.
  GM sees unrevealed rooms dimmed, same as any hidden item; can `Unfog all`
  to see everything then `Fog all` to restore.
- **Toolbar-level floor indicator was investigated and rejected** — no
  confirmed way to put live text in Owlbear's fixed toolbar. Current
  solution is a draggable `LABEL` item the GM positions once.

## History (why some things look the way they do)

Several redesigns happened over the course of this project, each correcting
a real problem:

1. **Floor assignment started as a single number**, then became an array
   once floor-spanning rooms needed support without duplicate shapes.
2. **Fog originally used Owlbear's native fog layer** (`PATH` items with
   hand-reconstructed hexagon geometry, reverse-engineered from a manually
   drawn sample). This caused a long string of bugs: wrong hex math, fog
   layer type restrictions (`SHAPE` rejected, only `PATH`/`CURVE`/etc.
   allowed), a pixel-wide reveal on connections (treating an open polyline
   as a closed fill polygon), and — the big one — overlapping cuts from
   different floors at the same location corrupting Owlbear's fog winding
   computation, since multi-floor rooms are normal in this kind of dungeon.
3. **That led to dropping native fog entirely**, replaced by the z-index
   tier system described above. Simpler, no geometry, no native-API
   dependency, and the user's own suggestion to question whether fog
   mechanics were needed at all.
4. **A "room fog" second curtain was briefly added** (to visually block
   unrevealed rooms) then removed — unnecessary, since Owlbear's native
   `visible` flag already does the right thing for that specific case.
5. **The floor curtain went from GM-only/hidden to player-visible.** A
   hidden curtain is drawn translucently to the GM, so off-floor items
   showed through it, stacked with their own hidden-item dimming, and
   looked inconsistent depending on colour. Making it opaque and filling
   it with the theme background colour fixed this.
6. **Corridor reveal bug** — straight corridors never un-hid with their
   rooms because only `CURVE` `points` were read, not `LINE`
   `startPosition`/`endPosition` (and local-to-scene transforms and edge
   tolerance were missing). Fixed in `connectionEndpoints`/
   `connectionsForRoom`.
7. **Floor colour silently did nothing** because `fillColor` was written
   to `LINE` items, which fail validation and take the whole batch down
   with them. Fixed by styling lines in a separate batch.
8. **Floor indicator stopped updating** because label text colour was
   written to `item.style` instead of `item.text.style`; later made
   readable by auto-contrast text.
9. **One room showed through the curtain** due to the stacked-BAND `zbase`
   bug described under "z-index bookkeeping."
---
name: svg-factory-architecture
description: Defines the React/TypeScript/SVG component architecture for building the isometric factory — layering, reusable primitives (IsometricBlock, Machine, Robot, Conveyor, ServerRack, PLC, HMI, Person, NetworkNode, SecurityIndicator), the object data model (id/type/position/facing/state/networkZone/interactive), the camera/zoom/level-of-detail system that lets the scene drill from factory overview down to individual machines, and rules for when SVG is no longer the right renderer. Use this skill whenever writing or restructuring ANY component that renders factory geometry, adding a new machine/building/network/security object to the scene, wiring up click/hover interaction or camera/zoom/drill-down behavior on the factory, or deciding how a new visual feature should be composed in code — not just how it should look (for the visual style itself, see industrial-visual-design). Also consult it when a scene is getting slow or an SVG file is growing very large, to evaluate whether PixiJS is warranted.
---

# SVG Factory Architecture

How the factory is built in code. Visual rules live in `industrial-visual-design`
— read that first if the question is "what should this look like." This skill
answers "how is it structured so 50 more objects don't turn into a mess."

## Stack

React + TypeScript + SVG + GSAP (see `gsap-motion-system`) is the default
renderer for the isometric factory game. Note: this repo already has `pixi.js`
and `@pixi/react` installed and in use by the existing `SecureThePlantGame`
(the light-themed board game) — that is a separate system. The new isometric
factory work described here starts on SVG regardless of what's already in
`package.json`; don't reach for Pixi for this feature just because the
dependency exists (see "When SVG stops being enough" below for the actual
trigger to reconsider).

## Golden rule: compose, don't monolith

**Never treat the factory as one giant hand-authored SVG file or one giant
component that renders the whole scene inline.** Every meaningful object is
its own component with its own boundary, props, and state. The scene is a
tree of small, typed, reusable components — not a static image with click
handlers taped on.

Conceptual component tree:

```
<Factory>
  <Floor />
  <Buildings>       {/* building shells, walls, roofs */}
  <ProductionLines>  {/* conveyors + line layout */}
  <Machines>         {/* individual machine instances */}
  <Robots />
  <People />
  <ControlSystems>  {/* PLCs, HMIs, engineering workstations */}
  <Network>          {/* switches, servers, conduits */}
  <Security>         {/* zone boundaries, indicators, scan overlays */}
  <Effects />        {/* transient: packets, pulses, particles */}
</Factory>
```

## Reusable primitives

Build every concrete object out of a small primitive set rather than drawing
bespoke SVG per instance:

- `IsometricBlock` — the base extruded box (width/depth/height in grid units →
  three shaded faces per `industrial-visual-design` §D). Nearly everything is
  one or more of these.
- `IsometricBuilding` — a larger `IsometricBlock` composition with roof/wall
  detailing, built from `IsometricBlock`, not a new drawing.
- `Machine`, `Robot`, `Conveyor`, `ServerRack`, `PLC`, `HMI`, `Person`,
  `NetworkNode`, `SecurityIndicator` — object-specific primitives, each
  composed from `IsometricBlock` + a small set of distinguishing details
  (arm, screen glyph, rack slots, antenna, silhouette). Adding a new machine
  *type* should mean composing existing primitives with new proportions, not
  writing new path data from scratch.

Before adding a new primitive, check whether an existing one can be
parameterized (a new prop/variant) instead. Duplicate SVG markup across
components is a bug, not a shortcut.

## Object contract

Every important object carries the same shape of props/data, regardless of
type:

```tsx
<Machine
  id="machine-robot-01"
  type="robot-arm"
  position={{ x: 4, y: 2, z: 0 }}
  facing="+x"
  state="normal"
  networkZone="production-line-a"
  interactive
/>
```

Backing data model (see also `industrial-game-ui` for how this feeds panels).
State values are lowercase string literals in code — this doc and the other
skills refer to them in prose as `NORMAL`/`COMPROMISED`/etc. for readability,
but it's the same seven values; don't introduce a second, differently-cased
representation:

```ts
type SecurityState =
  | "normal" | "warning" | "suspicious" | "compromised"
  | "isolated" | "recovering" | "secure"; // see industrial-visual-design §E

type Facing = "+x" | "-x" | "+y" | "-y"; // see industrial-visual-design §A

interface FactoryObject {
  id: string;                 // stable, unique, used for animation targeting too
  type: string;                // e.g. "robot-arm", "plc-cabinet", "switch"
  position: { x: number; y: number; z: number };
  facing?: Facing;              // omit for objects with no directional orientation
  state: SecurityState;
  networkZone: string;         // which security zone/conduit graph it belongs to
  vulnerabilities?: string[];
  interactive: boolean;
}
```

Keep this data in centralized game state (store/reducer — not scattered
component-local state), and let components be largely presentational: a
component reads `state` and renders the corresponding visual treatment; it
does not decide game logic. This mirrors the existing `src/game/state/
gameStore.ts` pattern already in the repo — reuse that convention rather than
inventing a second state mechanism.

The same store also owns **which object is currently selected** (a single
`selectedId: string | null`) and the **camera state** (see Camera &
Level-of-Detail below). Both are cross-cutting — the Layer-8 highlight, the
contextual panel (`industrial-game-ui`), and any camera-driven rendering all
need to agree on the same value — so neither belongs in component-local
state. A component never decides "am I selected" locally; it reads
`selectedId === this.id` from the store.

Note there's no `animations` field on this model: which animation is
currently playing is runtime state owned by `gsap-motion-system`'s
channel registry, not game data. Deriving "what should be playing" from
`state` (plus hover/selection, which are separate) is exactly what keeps
that registry the single source of truth instead of two systems drifting
out of sync.

## Layering (z-order, back to front)

Fixed, non-negotiable draw order so occlusion is always correct on the
isometric grid:

```
Layer 0  background
Layer 1  floor
Layer 2  buildings
Layer 3  machines
Layer 4  people
Layer 5  network
Layer 6  security overlays
Layer 7  effects            (packets, pulses, particles — transient)
Layer 8  interaction/highlight  (hover/selection rings, always on top)
```

Implement as ordered `<g>` groups (or ordered sibling `<Layer>` components) in
the `Factory` tree — never rely on SVG source order alone inside a single
flat markup blob; make the layer explicit so a new object type has an obvious
home. Within a layer, order objects by isometric depth (`x + y`, back-to-front)
so overlapping objects occlude correctly — compute this once centrally, not
per component.

## Camera & Level of Detail

This is the piece that makes "overview → factory level → production area →
individual machines → OT network → security events → gameplay" a matter of
*navigating one scene* instead of a rewrite at every milestone. Get this in
place while the component tree is still small — retrofitting it after dozens
of components assume they're always fully rendered is exactly the kind of
rework this skill exists to avoid.

**Camera state, centralized.** The camera is `{ x, y, zoom, focus }` (`focus`
is the currently drilled-into object/zone id, or `null` at full overview),
owned by the same central store as everything else in "Object contract"
above — never component-local state. `Factory` renders one outer `<svg>`
with a fixed `viewBox` representing world space, wrapping the entire
component tree in a single camera group:

```tsx
<svg viewBox="0 0 WORLD_W WORLD_H">
  <g transform={`translate(${camX},${camY}) scale(${camZoom})`}>
    {/* Floor, Buildings, Machines, ...Effects, interaction highlight */}
  </g>
</svg>
```

Individual object components never read or apply camera transforms
themselves — they're authored once in world-space grid coordinates via
`isoToScreen()` and stay that way. Only this one group's transform changes,
animated by `gsap-motion-system`'s `cameraTransition` preset. This is also
why `vector-effect="non-scaling-stroke"` (see SVG technical notes below)
matters: without it, zooming this group would visibly thicken/thin every
stroke in the scene.

**Level of detail (LOD), tied to `focus`/`zoom`, not a separate system.**
Three tiers, and every object component that has meaningfully different
detail at different distances should support them via one `detail` prop
(`"overview" | "zone" | "detail"`), derived from the camera state by the
`Factory`/layer components and passed down — not recomputed ad hoc per leaf:

- `overview` — whole-plant view. Buildings/zones render as simplified blocks
  (no per-machine internals); machines inside an unfocused zone don't mount
  individually at all — the zone renders one aggregate representation (a
  building shape + a zone-level status dot using the state colors in
  `industrial-visual-design` §E, taking the worst state among its contents).
  This is also the answer to "does everything really idle-animate all the
  time": at `overview`, liveliness reads at the zone/aggregate level (a
  handful of zone indicators, not hundreds of machines), not per-object — see
  `gsap-motion-system` principle 1.
- `zone` — a selected building/production area expands: its machines,
  conveyors, and control systems mount individually and render full
  structural detail, but only *within that zone*; other zones stay at
  `overview` detail (or can unmount entirely if off-screen — see below).
- `detail` — a single machine/control system is focused: its own interactive
  sub-elements (e.g. a PLC's port list, a robot arm's joints) may mount,
  matching the level of interaction the gameplay needs there.

**Mounting, not just styling.** Prefer not mounting the subtree for zones
outside the current focus path at all, rather than mounting everything and
hiding it with CSS/opacity — this is what keeps DOM node count bounded as
more zones are added over time (see "When SVG stops being enough"). A zone
just outside the current focus (adjacent, likely to be clicked next) is a
reasonable exception to keep mounted for a snappier transition; the whole
plant does not need to be.

**Click semantics depend on depth.** At `overview`/`zone` detail, clicking an
unfocused zone or machine drills in — it triggers a `cameraTransition` (see
`gsap-motion-system`) that moves `focus`/`zoom`, it does not open the
contextual inspection panel. Only once an object is at `detail` level (i.e.
it's already the focus, or the scene is already zoomed to its zone) does a
click open the `industrial-game-ui` contextual panel. Don't wire both
behaviors onto the same click handler with a heuristic — branch explicitly on
whether the target is already inside the focused subtree.

## Interaction

Objects are clickable/hoverable via their own component boundary — never by
attaching a global click handler that parses coordinates out of raw SVG.
Each primitive accepts standard interaction props (`onClick`, `onHover`) and
renders its own hit target (usually the full silhouette, sized generously
enough for touch). What a click does depends on camera depth — see Camera &
Level of Detail above.

Visual feedback for hover/selection lives in Layer 8 (a highlight ring drawn
around the target's bounding box), not by mutating the object's own fill —
this keeps interaction state and security `state` visually distinct and
composable (an object can be both `COMPROMISED` and currently hovered) and
gives hover/selection their own GSAP animation channel, independent of the
object's `state` channel and idle channel (see `gsap-motion-system`).

State drives appearance; interaction never requires rewriting a visual
component. If you find yourself branching a component's JSX by "am I
selected," refactor so selection is a Layer-8 overlay reading the shared
`selectedId` (see Object contract) instead of component-local state.

## When SVG stops being enough

SVG is the default and should stay the default through normal growth (dozens
of machines, a handful of production lines, moderate concurrent animation) —
which, with LOD in place above, covers a much larger plant than it would
without LOD, since most objects at any given moment aren't mounted at full
detail. Before reaching for a second renderer, exhaust SVG-native scaling
techniques, roughly in this order:

1. **LOD** (above) — don't render/animate what isn't in focus.
2. **`<symbol>`/`<use>`** for exactly-repeated shapes (identical conveyor
   segments, identical rack units, repeated LED glyphs) instead of inlining
   the same path data at every instance — cuts DOM/markup size directly, and
   is the concrete fix when "duplicate SVG markup" (see Reusable primitives)
   is unavoidable because the shape is truly identical, not just similar.
3. **Capped concurrent effects** — e.g. a maximum number of simultaneously
   rendered `networkPacket` instances per conduit, per
   `gsap-motion-system` principle 8, rather than one per logical event.

Only after those are in place and you still hit an actual, observed problem
— not speculatively — re-evaluate:

- Hundreds to low thousands of independently-animated objects on screen at
  once causing measurable frame drops, *despite* LOD keeping off-focus
  objects unmounted/simplified.
- DOM node count in the scene growing large enough that layout/paint becomes
  the bottleneck (check with the browser profiler — see `visual-qa`).

If you hit one of these, evaluate **PixiJS** (already a dependency in this
repo) as a rendering layer for the high-count sublayer (e.g., render
`Effects`/particle traffic in Pixi while keeping structural geometry in SVG),
rather than rewriting the whole factory. **Do not introduce PixiJS
preemptively** — adding a second renderer doubles the primitive/animation
system that `gsap-motion-system` and `industrial-visual-design` must cover,
and most of this game's scale (tens of machines, not thousands, visible at
once thanks to LOD) never needs it.

## SVG technical notes

- Use `vector-effect="non-scaling-stroke"` on all strokes so line weight stays
  consistent at any zoom/pan level — required, not optional, given the
  camera group scales the whole scene (see Camera & Level of Detail).
- Author geometry through the shared `isoToScreen()` projection helper (see
  `industrial-visual-design` §A) — never inline ad-hoc coordinate math in a
  component.
- Use `<symbol>`/`<use>` for shapes repeated verbatim across many instances
  (see "When SVG stops being enough") rather than inlining identical path
  data at every call site.
- Keep `id`s stable and human-readable (`machine-robot-01`, not array
  indices) — `gsap-motion-system` and `visual-qa` both target elements by id.

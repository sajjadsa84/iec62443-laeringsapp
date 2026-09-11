---
name: svg-factory-architecture
description: Defines the React/TypeScript/SVG component architecture for building the isometric factory — layering, reusable primitives (IsometricBlock, Machine, Robot, Conveyor, ServerRack, PLC, HMI, Person, NetworkNode, SecurityIndicator), the object data model (id/type/position/state/networkZone/interactive), and rules for when SVG is no longer the right renderer. Use this skill whenever writing or restructuring ANY component that renders factory geometry, adding a new machine/building/network/security object to the scene, wiring up click/hover interaction on a factory object, or deciding how a new visual feature should be composed in code — not just how it should look (for the visual style itself, see industrial-visual-design). Also consult it when a scene is getting slow or an SVG file is growing very large, to evaluate whether PixiJS is warranted.
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
  state="normal"
  networkZone="production-line-a"
  interactive
/>
```

Backing data model (see also `industrial-game-ui` for how this feeds panels):

```ts
interface FactoryObject {
  id: string;                 // stable, unique, used for animation targeting too
  type: string;                // e.g. "robot-arm", "plc-cabinet", "switch"
  position: { x: number; y: number; z: number };
  state: SecurityState;        // NORMAL | WARNING | SUSPICIOUS | COMPROMISED
                                // | ISOLATED | RECOVERING | SECURE — see
                                // industrial-visual-design §E
  networkZone: string;         // which security zone/conduit graph it belongs to
  vulnerabilities?: string[];
  animations?: string[];       // active preset names, see gsap-motion-system
  interactive: boolean;
}
```

Keep this data in centralized game state (store/reducer — not scattered
component-local state), and let components be largely presentational: a
component reads `state` and renders the corresponding visual treatment; it
does not decide game logic. This mirrors the existing `src/game/state/
gameStore.ts` pattern already in the repo — reuse that convention rather than
inventing a second state mechanism.

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

## Interaction

Objects are clickable/hoverable via their own component boundary — never by
attaching a global click handler that parses coordinates out of raw SVG.
Each primitive accepts standard interaction props (`onClick`, `onHover`) and
renders its own hit target (usually the full silhouette, sized generously
enough for touch). Visual feedback for hover/selection lives in Layer 8
(a highlight ring drawn around the target's bounding box), not by mutating
the object's own fill — this keeps interaction state and security `state`
visually distinct and composable (an object can be both `COMPROMISED` and
currently hovered).

State drives appearance; interaction never requires rewriting a visual
component. If you find yourself branching a component's JSX by "am I
selected," refactor so selection is a Layer-8 overlay instead.

## When SVG stops being enough

SVG is the default and should stay the default through normal growth (dozens
of machines, a handful of production lines, moderate concurrent animation).
Re-evaluate only when you hit an actual, observed problem — not
speculatively:

- Hundreds to low thousands of independently-animated objects on screen at
  once (e.g., a full plant view with continuous per-unit idle motion across
  every machine, every packet, every person) causing measurable frame drops.
- DOM node count in the scene growing large enough that layout/paint becomes
  the bottleneck (check with the browser profiler — see `visual-qa`).

If you hit one of these, evaluate **PixiJS** (already a dependency in this
repo) as a rendering layer for the high-count sublayer (e.g., render
`Effects`/particle traffic in Pixi while keeping structural geometry in SVG),
rather than rewriting the whole factory. **Do not introduce PixiJS
preemptively** — adding a second renderer doubles the primitive/animation
system that `gsap-motion-system` and `industrial-visual-design` must cover,
and most of this game's scale (tens of machines, not thousands) never needs
it.

## SVG technical notes

- Use `vector-effect="non-scaling-stroke"` on all strokes so line weight stays
  consistent at any zoom/pan level.
- Author geometry through the shared `isoToScreen()` projection helper (see
  `industrial-visual-design` §A) — never inline ad-hoc coordinate math in a
  component.
- Keep `id`s stable and human-readable (`machine-robot-01`, not array
  indices) — `gsap-motion-system` and `visual-qa` both target elements by id.

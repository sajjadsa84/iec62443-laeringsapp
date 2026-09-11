---
name: industrial-visual-design
description: Defines the visual language for the OT cybersecurity factory game — isometric projection rules, color system, industrial object vocabulary, and the seven security states (NORMAL/WARNING/SUSPICIOUS/COMPROMISED/ISOLATED/RECOVERING/SECURE). Use this skill BEFORE drawing, styling, or designing ANY factory object, machine, building, network element, security indicator, or character in this project — new SVG art, color choices, new component "look", or icon/asset work should always start here. Also use it when reviewing whether a new visual element matches the established style. This is the design foundation the svg-factory-architecture, gsap-motion-system, industrial-game-ui, and visual-qa skills all build on — consult it first whenever a task is visual/artistic rather than purely logical.
---

# Industrial Visual Design

This is the design system for the isometric OT-security factory game (distinct from
the existing light-themed "Secure the Plant" board in `src/game/boardTheme.ts` —
do not retrofit that board with this system unless explicitly asked; this skill
governs new work on the dark, cinematic isometric factory experience).

The visual goal: **an interactive animated technical illustration that has become
a game** — not a 3D game, not a SaaS dashboard, not a photoreal render. Think
motion-graphics explainer video crossed with a control-room HMI.

Before creating any new visual element, do two things:
1. Read this file.
2. Look at existing components (`src/game/**`, and once built, the factory
   component tree — see `svg-factory-architecture`) for dimensions, stroke
   widths, colors, and shading already in use. Reuse before inventing.

## A. Perspective — one coordinate system, always

Use a fixed **2:1 dimetric ("video-game isometric") projection**, not true 3D and
not CSS `rotateX/rotateY`. CSS 3D transforms distort stroke widths and text and
make objects drift out of grid alignment — never use them for factory geometry.

- All factory geometry is authored in a shared 3D grid space `(x, y, z)` — x/y are
  floor-plane axes, z is height — and converted to 2D screen coordinates through
  **one shared projection function**, e.g. `isoToScreen(x, y, z)`. Never hand-roll
  a one-off transform in a single component.
- Standard projection, exact formula (1 grid unit = 32 screen px at default
  zoom, matching `svg-factory-architecture`'s grid — this is the concrete
  spec `isoToScreen` implements, not a value to re-derive per component):
  ```
  screenX = (x - y) * 16   // half of 32: one grid step along x or y moves 16px horizontally
  screenY = (x + y) * 8 - z * 32  // 8 = quarter of 32 (2:1 ratio); z moves straight up
  ```
  All object sizes and positions are expressed in grid units, not raw pixels,
  so everything stays proportionate when the scene scales or the camera zooms
  (see `svg-factory-architecture` → Camera & Level of Detail).
- Every object sits on the same floor grid and is drawn with the same three
  visible faces (top, left/front, right/side per §D) — never skewed or drawn
  at a custom angle. **Objects do not arbitrarily rotate or tilt.** They may,
  however, take one of a small set of discrete **facings** where the object
  type calls for it (a conveyor turning a corner, a robot arm oriented toward
  a machine, a building entrance on a given side): pick from the grid's four
  cardinal facings (`+x`, `-x`, `+y`, `-y`) by mirroring/selecting a
  pre-authored variant of the same primitive, never by rotating or skewing
  the shape freely. A `facing` prop with those four literal values is the
  correct implementation; a free-form rotation value in degrees is not.
- Fixed light source: top-left. Apply it consistently via face shading (see D)
  — face shading is relative to the *screen*, not the object's facing, so a
  mirrored object still shades top-lightest/right-darkest exactly like its
  unmirrored counterpart.

## B. Geometry rules

Prefer:
- Simple primitives — boxes, extruded rectangles, cylinders reduced to
  rectangles+arcs, chamfered corners.
- Rectangular/modular industrial structures built from a small set of reusable
  block primitives (see `svg-factory-architecture`'s `IsometricBlock`).
- Repeated modular components (identical conveyor segments, repeated server
  units, identical PLC cabinet rows) rather than one-off bespoke shapes.
- Consistent bevels: a 1.5–2px lighter inset stroke along the top-facing edge
  of any raised block, nothing more elaborate.
- Subtle depth via **flat face-shading**, not gradients or ambient occlusion
  blur.
- Controlled drop shadows: one soft, low-opacity ellipse or offset shape per
  standing object, consistent blur radius and opacity across all objects.

Avoid:
- Photorealism, textures, photo-sourced materials.
- Gradients beyond a simple two-stop fill used for glow/energy effects (network
  packets, scan pulses, screens) — never for structural surfaces.
- Random per-object rotation or skew.
- Fine surface detail (rivets, dirt, wear) — the style is clean, not gritty.
- Visual noise: every extra line must encode information (a seam, a panel
  edge, a state) or it doesn't belong.

## C. Color system

Two families, kept strictly separate so the eye can tell "structure" from
"signal" at a glance:

**Structural palette (industrial, purple/blue, low-saturation)** — buildings,
floors, machines, static equipment:
- Background / void: `#0B1220` – `#0D1524` (near-black slate)
- Floor / base structure: `#1A2438`, `#212D45`
- Primary structure (buildings, cabinets, machine bodies): `#2E3A5C` – `#3B4A78`
- Structure highlight (top faces / bevels): lighten base 12–18%
- Structure shadow (side faces): darken base 15–30%
- Neutral metal/detail accents: `#5B6B8C`

**Signal palette (cyan/teal, high-saturation, reserved for meaning)** — network
paths, data packets, scanners, security overlays, active/selected states:
- Core signal cyan: `#22D3EE`
- Secure teal: `#2DD4BF` / `#34D399`
- Never use signal cyan/teal on static structural geometry — if it glows or
  moves, it's signal; if it's a wall, floor, or housing, it's structure.

State colors (see E) sit outside both families and always win visually:
warning amber `#FBBF24`, suspicious orange `#FB923C`, compromised red `#EF4444`,
isolated violet-gray `#8B93B8` (desaturated, muted — isolation reads as "removed
from the living system"), recovering cyan ramping toward teal, secure `#34D399`.

Rule: a scene should read correctly in grayscale by shape/contrast alone; color
is reinforcement, not the only signal (see F and `visual-qa` for
colorblind/contrast checks).

## D. Face shading (the bevel/lighting language)

Every extruded block has exactly three visible faces, shaded relative to one
base color, from a fixed top-left light:
- Top face: base color, unmodified (lightest).
- Left/front face: base darkened ~15%.
- Right/side face: base darkened ~30%.
- Standard 1.5px lighter stroke on the top-front edge (the bevel highlight) —
  this is part of the base treatment for every raised block, not an optional
  extra a component can skip.

Apply this identically to every block-based object — machines, buildings,
crates, cabinets. Do not invent alternate lighting angles per object.

This shading is on the object's **static base geometry** only — it never
animates. Anything that needs to move or pulse (a state glow, a hover
highlight) is a separate overlay element on top of the shaded base, per §E —
GSAP never tweens the base fill/stroke colors directly (see
`gsap-motion-system`, which depends on this separation to avoid state and
idle/interaction animations fighting over the same element).

## E. State representation

Every interactive/major object (machine, PLC, HMI, server, network node,
security zone) supports exactly these seven states, each with one consistent
treatment reused everywhere — never invent a per-object variant:

| State | Color | Visual treatment |
|---|---|---|
| `NORMAL` | structural base color | steady, no glow, subtle idle motion only |
| `WARNING` | amber `#FBBF24` | slow pulse (see `gsap-motion-system` → `warning` preset), amber outline glow |
| `SUSPICIOUS` | orange `#FB923C` | faster pulse, dashed/scanning outline, small pulsing marker icon |
| `COMPROMISED` | red `#EF4444` | hard pulse + short glitch/jitter, red outline, red particle/leak effect toward network |
| `ISOLATED` | violet-gray `#8B93B8` | desaturated fill, dashed boundary ring around the object, motion frozen except the boundary ring |
| `RECOVERING` | cyan → teal ramp | scanning sweep animation, progress-style fill returning color |
| `SECURE` | teal/emerald `#34D399` | steady soft glow, calm idle motion, occasional confirming pulse on state entry only |

Implementation contract (see `svg-factory-architecture` for the data model and
its Camera & Level-of-Detail section): `state` is a single prop driving which
of the above treatments renders and which animation preset plays (see
`gsap-motion-system`) — never hard-code a color or animation choice per
component instance.

Critically, state is rendered as a **separate overlay** (outline, glow, badge,
particle layer) drawn on top of the object's unchanged structural geometry
(§D) — never by mutating the base shape's own fill/stroke. This keeps two
concerns independently animatable without collision: the base geometry never
animates its own color, and the state overlay owns exactly one GSAP animation
channel (`state`, see `gsap-motion-system`) that a state change replaces
wholesale, without touching the object's separate idle-motion or
hover/selection channels.

## F. Cybersecurity visualization vocabulary

Communicate security concepts visually, with minimal text:
- **Status indicators**: small LED-style dot or ring on the object, colored per
  state table above.
- **Network paths**: thin cyan lines/conduits between nodes, always following
  the isometric grid (no arbitrary diagonals off-grid).
- **Data packets**: small glowing shapes traveling along a path (see
  `gsap-motion-system` → `networkPacket`/`networkFlow`).
- **Scanning pulses**: expanding ring or sweeping line, cyan, used for both
  "player is scanning" and "attacker is probing" (differentiate by color —
  cyan for player/defensive, orange/red for hostile).
- **Warning/attack markers**: a small icon badge (triangle for warning, skull
  or bolt for active attack) anchored to the object's top-right corner, never
  covering the object body.
- **Attack paths**: a red/orange traveling pulse tracing the same conduit
  lines used for legitimate traffic — the path itself doesn't change shape,
  only the color/motion of what travels on it, reinforcing that attackers use
  the same network.
- **Isolation zones**: a dashed violet-gray boundary shape (see `SecurityIndicator`
  primitive in `svg-factory-architecture`) drawn around the isolated
  object/segment.
- **Firewall/security boundaries**: a translucent teal vertical plane or gate
  glyph at a conduit crossing point, always at the same visual weight.
- **Compromised/recovery**: per state table above.

Prefer showing state through these visual primitives over labels. Text
(tooltips, panels) supplements — see `industrial-game-ui` — it never
substitutes for the visual read.

## G. Visual consistency discipline

Never introduce a new stroke width, corner radius, shadow style, gradient, or
lighting angle for a single component. If a new object type is needed:
1. Check existing primitives/components first (`svg-factory-architecture`).
2. Reuse existing dimensions (grid units), stroke widths (1.5px default),
   corner treatment (small chamfer, not rounded unless the whole system moves
   to rounded), shadow (single soft ellipse, same opacity/blur as siblings),
   and animation language (`gsap-motion-system` presets only).
3. If a genuinely new visual pattern is required (e.g., a wholly new state or
   object category), update this file's tables so the pattern becomes the
   documented system, not a one-off.

If you're about to write a hex color, stroke-width, or shadow value that
isn't in this document, stop and check whether an existing value already
covers the case before adding a new one.

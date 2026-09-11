---
name: visual-qa
description: The repeatable visual quality-assurance workflow for the OT factory game — using browser automation (Playwright) to check isometric alignment, visual consistency, layering, animation smoothness/cleanup, interaction/hover targets, responsive behavior, performance (DOM/SVG complexity, leaked animation loops), accessibility, and gameplay readability. Use this skill after ANY change to factory visuals, animations, or UI — a component or animation is never "done" just because it compiles or type-checks. Also use it whenever the user reports something looking wrong, janky, misaligned, unclickable, or confusing, or asks to "check"/"verify"/"test" the visuals.
---

# Visual QA

A change to factory geometry, motion, or UI is not complete when the code
compiles or the type checker is clean — it's complete when it's been looked
at running in a real browser and checked against the categories below. This
skill is the enforcement mechanism for that: code correctness and visual
correctness are different things, and only the second one is what the player
experiences.

## Workflow

```
BUILD → RUN → OPEN IN BROWSER → INSPECT → TEST INTERACTION
      → TEST ANIMATION → SCREENSHOT → IDENTIFY PROBLEMS → FIX → RECHECK
```

Run this after any non-trivial change to: factory geometry/components
(`svg-factory-architecture`), colors/state treatments
(`industrial-visual-design`), animation (`gsap-motion-system`), or UI panels
(`industrial-game-ui`). Skip it only for changes with no visual/behavioral
surface at all (e.g. pure data/type refactors with no rendering change).

Use the project's own dev workflow to build/run (check `package.json` — this
repo uses `npm run dev` via Vite; see the `run` skill if one is available for
launching and screenshotting the app). Drive the browser with Playwright
(pre-installed in this environment — do not run `playwright install`).

## Validation categories

### 1. Perspective
- Do all isometric objects share the same projection (`industrial-visual-design`
  §A)? Screenshot the scene and check that floor tiles, building edges, and
  machine bases align to the same grid — no object should look rotated or
  tilted relative to its neighbors.
- Are new objects sized in consistent grid units, not arbitrary pixel values
  that break alignment at different zoom levels?

### 2. Visual consistency
- Does a new object reuse existing stroke widths, corner treatment, shadow
  style, and face-shading (`industrial-visual-design` §D) rather than
  introducing a new look? Compare a screenshot of the new object against an
  existing sibling of the same rough category.
- Do state colors match the table in `industrial-visual-design` §E exactly —
  no ad-hoc reds/ambers introduced elsewhere in the scene?

### 3. Layering
- Screenshot scenes with overlapping objects and confirm draw order matches
  `svg-factory-architecture`'s fixed layer list (floor → buildings → machines
  → people → network → security overlays → effects → interaction highlight).
  A person should never render behind a floor tile; a hover highlight should
  never be hidden behind another object.

### 4. Animation
- Are idle animations (`machineIdle`, `robotIdle`, `conveyorMovement`, LED
  blink) actually running on `NORMAL`/`SECURE` objects, per
  `gsap-motion-system` principle 1? A static-looking "alive" object is a bug.
- Do simultaneous animations conflict — e.g. does a state transition leave
  two competing tweens fighting over the same property instead of the old
  one being killed first (`gsap-motion-system` principle 6)?
- Do event-driven sequences (attack → isolation → recovery) play in the
  correct order and reach a stable end state, not get stuck mid-timeline?
- Do animations actually stop when they should — navigate away from/unmount
  a component and confirm (via the browser's performance/animation
  inspector, or a quick `getAnimations()` check) that no orphaned GSAP
  tween keeps running against a detached element.
- With `prefers-reduced-motion` simulated on, confirm the scene is still
  fully legible and playable (states readable by color/shape alone,
  sequences resolve instantly or near-instantly).

### 5. Interaction
- Can every object documented as `interactive` actually be clicked and
  hovered? Click-test a representative sample across object types (machine,
  PLC, network node, security zone), not just the first one built.
- Do hover states appear (Layer 8 highlight) and clear correctly on
  mouse-leave, including when the pointer moves quickly between adjacent
  objects?
- Are clickable areas reasonably sized — not a 2px stroke line as the only
  hit target? Check especially on smaller/denser objects.
- Does the contextual panel flow (`industrial-game-ui` Rule 2) appear
  correctly anchored and dismiss correctly on outside click/Escape?

### 6. Responsive behavior
- Resize the viewport (at minimum: a small laptop width, a wide desktop
  width, and a tablet-ish width) and confirm the factory scene remains
  usable — scales/pans sensibly rather than clipping critical objects or
  UI panels off-screen.
- Confirm contextual panels reposition instead of clipping at viewport edges.

### 7. Performance
Check via the browser devtools/Playwright's CDP access:
- DOM node count for the scene — flag surprising growth after adding a
  small number of objects (a sign markup is being duplicated instead of
  reused, contrary to `svg-factory-architecture`).
- SVG complexity — excessive path point counts or filter usage on frequently
  animated elements.
- Animation loops that never terminate/pause when off-screen or when the
  tab is backgrounded.
- Memory growth over time in a scene with repeated state transitions (open →
  trigger several attack/recovery cycles → check heap doesn't climb
  unbounded, which indicates a GSAP/animation cleanup leak per
  `gsap-motion-system` principle 6).
- Unnecessary re-renders — a state change on one object shouldn't cause the
  whole factory tree to re-render (React profiler / obvious visual "flash"
  across unrelated objects is a tell).

### 8. Accessibility
- Keyboard navigation where relevant (can key actions/menus be reached
  without a mouse where the game intends them to be).
- Visible focus indicator on focusable/interactive elements.
- `prefers-reduced-motion` respected (cross-check with §4).
- Color contrast of text/status readouts against panel backgrounds meets
  reasonable legibility (not necessarily formal WCAG AA for every game
  surface, but nothing illegible).
- State is never color-only where it matters for comprehension — confirm
  shape/icon/position differences back up the state colors from
  `industrial-visual-design` §E (helps colorblind players and satisfies
  this check simultaneously).
- Labels/tooltips are meaningful, not generic ("PLC-CAB-07: Isolated" not
  "Object 12").

### 9. Gameplay readability
The real test — after interacting with the scene, can you answer:
- What is happening right now? (state/activity legible at a glance)
- Where is the problem? (compromised/suspicious objects visually stand out
  from normal ones without hunting)
- What can I interact with? (interactive objects read as clickable —
  affordance is visible, not just technically present)
- What just changed? (a state transition is noticeable, not a silent value
  flip)
- What should I do next? (available actions/objective are discoverable from
  the contextual panel and mission panel)

If any of these isn't obviously answerable from screenshots alone, the
feature isn't done — go back to the relevant skill (`industrial-visual-design`
for legibility/state clarity, `gsap-motion-system` for change-signaling
motion, `industrial-game-ui` for action discoverability) and fix it before
calling the work complete.

## Screenshots as evidence

Take before/after screenshots for any visual change and keep them alongside
the review (or attach them when reporting the change) — a description of a
visual fix without a screenshot showing it is not sufficient evidence the fix
worked. When checking animation, prefer a short sequence of screenshots (or
noting frame-by-frame behavior) over a single static shot, since the defect
is often in motion, not in any single frame.

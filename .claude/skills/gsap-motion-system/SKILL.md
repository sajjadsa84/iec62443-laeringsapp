---
name: gsap-motion-system
description: The animation system for the OT factory game — centralized GSAP presets (hover, pulse, glow, warning, criticalAlert, networkPacket, scanning, attack, isolation, recovery, cameraTransition, machineIdle, robotIdle, conveyorMovement, etc.), the motion timing scale, easing rules, event-driven timeline patterns, lifecycle/cleanup rules, and reduced-motion/performance requirements. THIS IS THE MOST IMPORTANT SKILL IN THE PROJECT — animation is core to this game, not decoration. Use it whenever writing ANY animation, transition, hover effect, idle motion, state-change effect, or camera movement in this codebase, and whenever you're about to reach for gsap.to()/gsap.timeline() directly in a component instead of a shared preset. Also use it when a component unmounts (to check cleanup) or when the user mentions choppy/janky/conflicting animations, reduced motion, or performance issues with animation.
---

# GSAP Motion System

Animation is core to this game's identity — the factory must feel *alive and
interactive*, not like a static illustration with occasional CSS transitions.
GSAP is the single animation engine for the project. This skill exists so
that "alive" doesn't turn into forty components each inventing their own
timing, easing, and cleanup logic.

## The rule that matters most

**No component invents its own animation timing or GSAP call inline for
anything that recurs across object types.** If two or more object types need
similar motion (a glow, a pulse, a fade), it belongs in the shared preset
library, not copy-pasted `gsap.to()` calls. Before writing a new animation,
check whether a preset below already covers it. If it doesn't, add the
preset to the shared library rather than one-offing it in the component —
that's how this list stays authoritative instead of aspirational.

## Architecture: centralized animation module

Keep a single animation module (e.g. `src/game/motion/` — mirror the
`svg-factory-architecture` component tree's centralization principle) that
exports:

1. **Presets** — small functions that take a target (element ref, selector,
   or id) and return a GSAP tween/timeline. Presets own their own duration
   and easing defaults from the scale below; callers can override only when
   there's a real reason.
2. **A channel-keyed registry**, not a flat per-object one. A single object
   legitimately runs *several* animations at once that must not interrupt
   each other — a `machineIdle` loop, a `state` overlay pulse, and a hover
   highlight are three different concerns on the same object (see
   `industrial-visual-design` §D/§E: base geometry, state overlay, and
   interaction highlight are separate elements precisely so their animations
   don't collide). Key the registry by `` `${id}:${channel}` ``, with a fixed
   channel set:
   - `idle` — ambient motion (`machineIdle`, `robotIdle`, `conveyorMovement`,
     LED blink). Runs continuously while the object is mounted at a detail
     level that renders it individually (see `svg-factory-architecture` →
     Camera & Level of Detail) — not touched by state or interaction changes.
   - `state` — the state-overlay animation (`warning`, `criticalAlert`,
     `isolation`, `recovery`, `glow`/`secure` pulse). A state change kills
     and replaces **only this channel**, never `idle` or `interaction`.
   - `interaction` — `hover`/`selection`. Independent of both of the above;
     an object stays mid-`criticalAlert` while also showing a hover ring.
   - `sequence` — a multi-step event timeline (see "Event-driven animation"),
     usually spanning several objects' `state` channels rather than living on
     one object alone.

   Route every play through one small helper rather than calling
   `gsap.to`/`gsap.timeline` directly in a component:

   ```ts
   // src/game/motion/registry.ts
   const active = new Map<string, gsap.core.Timeline>();

   export function playOnChannel(
     id: string,
     channel: "idle" | "state" | "interaction" | "sequence",
     build: () => gsap.core.Timeline,
   ) {
     const key = `${id}:${channel}`;
     active.get(key)?.kill();
     const tl = build();
     active.set(key, tl);
     return tl;
   }
   ```

   This single function is what makes presets/timeline builders "restartable
   and composable" (principle 6) without every call site reimplementing
   kill-then-play.
3. **Timeline builders** for multi-step sequences (see "Event-driven
   animation" below).
4. **Plugin registration, once.** Register any non-core GSAP plugins used
   (e.g. `MotionPathPlugin` for `networkPacket`) at module init in this same
   file, via `gsap.registerPlugin(...)` — never scattered per-component
   `registerPlugin` calls, which are easy to duplicate or forget.

Example preset shape (illustrative, adapt to the actual codebase's
conventions when implementing). Note it animates `opacity`/`scale` on a
pre-existing glow overlay element, not the `filter` property — animating
`filter` is expensive (it's not a compositor-only property) and directly
violates principle 8 below; a cheap glow is a duplicate, blurred shape
(via a static SVG `<filter>` applied once, not animated) whose *opacity* or
*scale* is what GSAP tweens:

```ts
// src/game/motion/presets.ts
export function pulse(id: string, glowTarget: gsap.TweenTarget) {
  return playOnChannel(id, "state", () =>
    gsap.timeline().to(glowTarget, {
      opacity: 1,
      scale: 1.08,
      duration: MOTION.small / 1000,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      transformOrigin: "center",
    }),
  );
}
```

## Preset catalog

Every object/effect type reaches for one of these — extend the catalog
rather than bypassing it:

**Interaction**
- `hover` — micro-scale/highlight on pointer enter, instant feel (Micro/Small).
- `selection` — persistent highlight ring (Layer 8, see `svg-factory-architecture`),
  small scale-in + glow, stays until deselected.

**Ambient / idle (the "alive" layer — see principle 1 below)**
- `machineIdle`, `robotIdle` — small-amplitude looping motion (a piston
  breathing, an arm micro-adjusting), always running at `NORMAL`/`SECURE`
  state, low CPU cost.
- `conveyorMovement` — looping belt-pattern scroll or repeating segment
  offset.
- LED/status blink — short opacity pulse loop, part of the state treatment
  in `industrial-visual-design` §E.

**State / alert**
- `glow`, `fadeIn`, `fadeOut`, `slideIn`, `scaleIn` — general-purpose UI/object
  entrance-exit primitives.
- `warning` — slow amber pulse (see `industrial-visual-design` §E table).
- `criticalAlert` — fast red pulse + short jitter/glitch, reserved for
  `COMPROMISED`.
- `isolation` — boundary-ring draw-on animation, then motion freezes except
  the ring (dashed ring using a stroke-dashoffset animation reads as
  "actively sealed off").
- `recovery` — scanning sweep + fill ramping from cyan to teal as progress
  increases; drive its progress from real state (e.g., patch/scan percentage),
  don't just loop it decoratively.

**Network / security**
- `networkPacket` — a single glowing dot traveling along a conduit path
  (`motionPath` along the same geometry used for the static conduit line —
  never a separately-authored path).
- `networkFlow` — continuous stream variant of `networkPacket` (staggered
  repeats).
- `scanning` — expanding ring or sweep line, reused for both defensive scans
  (cyan) and hostile probing (orange/red) — same preset, different color arg.
- `attack` — traveling pulse along a conduit in attack coloring, typically
  the opening beat of the event-driven sequence below.

**Camera / scene**
- `cameraTransition` — pan/zoom the scene root between overview and a
  selected level (see principle 5).
- `levelTransition` — the detail-scene reveal that follows a `cameraTransition`.

## Motion principles

### 1. Subtle idle motion — the factory is alive by default

Every persistent, visible object plays a low-amplitude idle animation on its
`idle` channel as soon as it mounts in `NORMAL`/`SECURE` state: conveyors
move, robots idle-cycle, LEDs blink, network packets travel, scanners sweep
on their own cadence, people have a subtle idle sway/blink. This is not
optional polish — a factory with static geometry and only reactive animation
fails the game's core premise. Keep idle motion cheap (transform/opacity
only, long loop periods) so dozens of simultaneous idles don't cost
performance — see principle 8.

"Every object" means every object actually *mounted as an individual
component* — which, per `svg-factory-architecture`'s Camera & Level of
Detail system, is only the objects inside the current focus/zone, not the
whole plant. An unfocused zone renders as one aggregate shape with one
zone-level status indicator, not dozens of individually idling machines
off-camera — that aggregate indicator is what "idle" means at `overview`
detail. This is what keeps principle 1 from contradicting the "don't run
hundreds of simultaneous animations" guidance in principle 8 and in
`svg-factory-architecture`'s PixiJS-evaluation triggers: idle motion scales
with what's currently in focus, not with total plant size.

### 2. Event-driven animation — build timelines for sequences

Security events are multi-step and should be authored as one GSAP timeline,
not a chain of independently-triggered tweens racing each other:

```
NORMAL → suspicious traffic → warning → attack → player response
       → isolation → recovery → secure
```

Build a timeline builder per meaningful sequence (e.g.
`buildAttackSequence(targetId, path)`), composed from the presets above as
timeline children with explicit `position` offsets, so the whole sequence is
one controllable, killable unit. A component reacting to a state change
should call into the timeline builder, not orchestrate raw tweens itself.

### 3. Timing scale

Use as the default vocabulary; these are guidelines to keep the whole game
feeling like one system, not hard limits:

| Name | Range | Typical use |
|---|---|---|
| Micro | 100–200ms | hover feedback, button press |
| Small | 200–350ms | selection ring, small UI reveal |
| Medium | 350–700ms | panel open, state-change flash, packet hop |
| Large | 700–1200ms | isolation boundary draw-on, alert entrance |
| Cinematic | 1200–2500ms | camera transitions, level transitions |

If a duration falls outside these bands, there should be a specific reason
(e.g., a looping idle animation's period isn't bound by this scale the same
way a one-shot transition is) — don't default to arbitrary numbers.

### 4. Easing — pick by motion type, not by feel

- UI reveals/panels: smooth ease, `power2.out` / `power2.inOut`.
- Object/camera movement: `power1.inOut` or `power2.inOut` — avoid linear,
  which reads as mechanical/robotic for anything except literal machine
  motion (conveyors, robot joints) where linear or a stepped ease is
  actually correct.
- Alert pulses: a controlled `sine.inOut` yoyo loop — not an elastic bounce.
- Elastic/bounce (`elastic.out`, `back.out`): reserve for deliberate emphasis
  moments only (e.g., a "secure" confirmation pop) — never for idle or
  routine transitions, or the whole game starts to feel bouncy/toylike
  instead of industrial.

### 5. Camera movement

Factory navigation is a `cameraTransition` (Cinematic band) that tweens
**one thing**: the camera group's transform (`x`, `y`, `zoom` — see
`svg-factory-architecture`'s Camera & Level of Detail section), not
individual objects' positions. Objects mount/unmount or swap LOD tier in
response to the camera state settling on a new `focus`, sequenced with a
`levelTransition` for the revealed detail scene:

```
Overview → cameraTransition (zoom toward selected level)
        → levelTransition (detail scene content fades/scales in)
```
Reverse the same timeline (or a mirrored one) when returning to overview —
don't author the return trip as an unrelated animation; it should feel like
rewinding the same motion.

### 6. Lifecycle — no leaks, no orphaned timelines

- Every component that starts a GSAP tween/timeline on mount must kill it on
  unmount (`useEffect` cleanup calling `.kill()`, or `gsap.context()` scoped
  to the component and reverted on cleanup — prefer `gsap.context()` for
  anything with multiple targets). This applies per channel: an object
  unmounting (e.g. its zone leaves LOD `zone`/`detail` and collapses back to
  an `overview` aggregate) must kill all of its channels' timelines, not just
  the one that happened to be running when the code was written.
- Animations must be **restartable and composable**: always go through
  `playOnChannel` (see architecture above) so a new animation on a given
  channel kills the previous one for that object+channel before starting the
  next, rather than layering tweens on the same property. Two different
  channels on the same object are expected to run simultaneously — that's
  the point of channels, not a bug to guard against.
- State-aware: a preset/timeline should read the object's current `state`
  (from the data model in `svg-factory-architecture`) to decide whether to
  even play — don't let a stale timeline fire after state has moved on.

### 7. Reduced motion

Respect `prefers-reduced-motion`. Use GSAP's own `gsap.matchMedia()` to gate
presets/timelines centrally in the motion module (in the same file as the
registry) rather than building a bespoke reduced-motion hook and threading it
through every component — GSAP already ties `matchMedia` queries into its
context/cleanup lifecycle, which is one less hand-rolled abstraction to keep
in sync with principle 6. When the reduced-motion query is active:
- Kill/skip idle and ambient loops (conveyors, LED blinks, idle sway) or
  drop them to a near-static single state — the scene must still visually
  communicate state via color/shape per `industrial-visual-design` (state
  color and iconography are never animation-dependent).
- Collapse event-driven sequences to their end state instantly, or use much
  shorter durations — the game must remain fully understandable and playable
  with motion reduced, never broken or missing information.

### 8. Performance

- Animate `transform` (translate/scale/rotate via GSAP's transform handling)
  and `opacity` wherever possible; these are cheap. Avoid animating layout-
  triggering SVG attributes (`width`, `height`, path `d` recomputation) in
  loops — prefer pre-authored path variants or `motionPath` along a static
  path.
- Don't run independent GSAP instances for large repeated effects (e.g., 50
  simultaneous network packets) — use staggered timelines or a single
  timeline driving many targets so GSAP batches the work, and consider
  whether the effect belongs in the `Effects` layer with a capped concurrent
  count rather than one tween per logical event.
- If idle-animation count grows large enough to matter, this is one of the
  triggers `svg-factory-architecture` names for evaluating PixiJS for that
  sublayer — don't try to solve it by cutting corners on the motion
  language itself (e.g., don't silently drop idle motion; that breaks
  principle 1).

Validate animation smoothness and cleanup as part of `visual-qa`'s workflow
after any motion change.

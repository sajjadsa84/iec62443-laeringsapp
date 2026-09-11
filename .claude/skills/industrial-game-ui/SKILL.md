---
name: industrial-game-ui
description: Defines the UI layer for the OT cybersecurity game — mission panel, security/factory/network status, threat indicators, event log, objectives, risk level, contextual actions (Inspect/Scan/Isolate/Patch/Restore/Monitor), tooltips, and context menus, styled as an industrial-control-room + SOC dashboard, not a generic SaaS app. Use this skill whenever building or changing any panel, HUD element, tooltip, context menu, alert banner, or button/action surface in this game, or whenever deciding how much screen real estate UI should take relative to the factory scene. The core rule: the factory itself is the primary interface — use this skill to keep UI contextual and minimal instead of covering the screen.
---

# Industrial Game UI

The factory scene (built per `svg-factory-architecture`, styled per
`industrial-visual-design`, animated per `gsap-motion-system`) is the primary
interface. UI is a supporting layer that surfaces information *about* the
scene on demand — it never competes with it for attention or space.

## Identity: control room + SOC, not SaaS dashboard

The UI should read as a blend of an industrial control system (HMI screens,
alarm panels, status boards) and a cybersecurity operations center dashboard
(threat feed, event log, risk posture) — filtered through modern game UI
conventions (contextual, minimal chrome, clear affordances). It should not
look like a generic admin/analytics dashboard: avoid card-grid layouts,
generic sans-serif data tables, and SaaS-style soft-shadow panels. Prefer:
- Dark panel backgrounds matching the scene's structural palette
  (`industrial-visual-design` §C), with signal-cyan/teal accents for live
  data, never the reverse.
- Sharp/chamfered panel corners consistent with the scene's corner treatment,
  not soft rounded cards.
- Monospace or technical-feeling type for status readouts/values; a clean
  sans for labels/body — reserve display/decorative type for nothing, this
  is a working interface.
- Iconography that reuses the same primitive language as the factory objects
  (see `svg-factory-architecture`'s primitives) rather than a generic icon
  pack — an object's UI icon should be recognizably the same visual as the
  object itself.

## Rule 1: contextual over persistent

Default to UI that appears in response to the player's focus, not a
permanent surrounding frame. Persistent chrome should be limited to what the
player needs at a glance at all times — nothing else.

**Always-on (minimal footprint, edges of screen only):**
- Mission panel (current objective, collapsed by default, expandable)
- Overall risk level indicator
- Factory status summary (aggregate, e.g. a small strip of zone health dots)
- Event log access point (badge/counter, log itself opens on demand)

**Contextual (appears only when relevant, anchored to the object):**
- Object inspection panel (click a PLC → panel appears near it)
- Tooltips (hover)
- Context menu / action list
- Alert panels for a specific event, anchored to the object or zone involved

## Rule 2: the click → contextual panel flow

This is the canonical interaction pattern — implement new object types
against this flow rather than inventing a new UI pattern per object:

```
Player clicks an object (e.g. a PLC)
  → object highlights (Layer 8 per svg-factory-architecture)
  → a small contextual panel appears near the object
      - object identity/type
      - current state (industrial-visual-design §E)
      - vulnerabilities (if any)
      - available actions
  → panel is dismissed by clicking elsewhere / pressing Escape / re-clicking
```

The panel appearance/dismissal uses the `fadeIn`/`fadeOut`/`scaleIn` presets
from `gsap-motion-system` (Small/Medium band) — never a hard cut, never a
custom transition invented per panel.

Panel placement: anchor near the object in screen space, and keep it clear of
the object itself (don't cover the thing the player is inspecting). Flip
placement (left/right/above/below) based on available viewport space rather
than always defaulting to one side and clipping at screen edges.

## Rule 3: actions are a short, consistent verb set

Player actions on an object come from a small shared vocabulary, not a
custom action list invented per object type:

- **Inspect** — reveal detail (always available, no cost/risk)
- **Scan** — actively probe for vulnerabilities (triggers `scanning` preset
  on the object, see `gsap-motion-system`)
- **Isolate** — cut the object off from its network zone (triggers
  `isolation` sequence)
- **Patch** — remediate a known vulnerability
- **Restore** — recover a `COMPROMISED`/`ISOLATED` object to `RECOVERING`
  → `SECURE` (triggers `recovery` sequence)
- **Monitor** — flag for ongoing attention in the event log without taking
  action

Not every action applies to every object/state (e.g. `Restore` only makes
sense on a compromised/isolated object) — show only valid actions for the
object's current state rather than showing all six and disabling most of
them; a short relevant list reads faster than a long list of greyed-out
buttons.

## Components

- **Mission panel** — objective text, minimal, collapsible, top or side edge.
- **Security status** — aggregate risk/posture, small always-visible readout;
  detail on demand.
- **Factory status** — zone-by-zone health, small dot/strip indicators using
  state colors (`industrial-visual-design` §E) — this is the "read the whole
  plant at a glance" surface.
- **Network status** — active conduits, current traffic/attack activity;
  mirror the scene's `Network`/`Security` layers rather than a separate
  abstract diagram, so the player doesn't have to translate between two
  representations of the same thing.
- **Threat indicators** — surfaced both on-object (badge, per
  `industrial-visual-design` §F) and aggregated in the always-on status strip.
- **Equipment information** — the contextual inspection panel (Rule 2).
- **Event log** — chronological feed of state changes/actions, collapsed to a
  badge by default, opens as an overlay panel, not permanently docked
  full-height.
- **Objectives / risk level** — part of the mission panel; risk level uses
  state-table colors for consistency, not a separate color scale.
- **Player actions** — the Rule 3 verb set, shown in the contextual panel.
- **Tooltips** — single-line, appear on hover after a short delay (avoid
  flicker on fast mouse movement), dismiss immediately on mouse-leave; no
  animation beyond a fast `fadeIn` (Micro band).
- **Context menus** — used sparingly, for secondary actions only; primary
  actions live in the contextual panel, not buried in a right-click menu.
- **Alert panels** — for events needing player attention (an active attack),
  anchored near the affected object/zone, using `criticalAlert`/`warning`
  presets on entrance; must be dismissible and must never block the view of
  the object they're alerting about.

## Rule 4: don't cover the factory

Before adding a new persistent panel, ask whether it can instead be: (a)
collapsed by default, (b) contextual/on-demand, or (c) folded into an
existing status strip. A UI change that reduces the visible factory area
needs a real reason — the scene is the primary interface, and the UI's job
is to explain what the player is already looking at, not to replace it with
text and numbers.

Validate real screen usage (not just component code) against this rule using
`visual-qa`'s interaction/readability checks after any UI change.

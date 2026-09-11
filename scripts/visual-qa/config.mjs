// Scenario/viewport config for the visual-qa runner (scripts/visual-qa/run.mjs).
// Edit this file as the isometric factory game grows — add one entry per
// route/scene you want checked. See .claude/skills/visual-qa/SKILL.md for
// what each check is actually verifying.

export const DEFAULT_URL = process.env.VISUAL_QA_URL ?? "http://localhost:5173";

// Common laptop / wide desktop / tablet widths — per visual-qa skill §7
// (Responsive behavior), check at least these three.
export const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "tablet", width: 834, height: 1112 },
];

export const SCENARIOS = [
  {
    name: "home",
    path: "/",
    waitForSelector: "h1",
  },
  {
    name: "secure-the-plant",
    path: "/game",
    // The existing Pixi-based board game — light Siemens-themed, not the
    // isometric factory this project's skills target. Kept here as a
    // baseline scenario so the runner has more than one page to exercise.
    waitForSelector: "canvas, svg",
  },

  // Add the new isometric factory scene here once it has a route, e.g.:
  // {
  //   name: "factory-overview",
  //   path: "/factory",
  //   waitForSelector: "[data-factory-root]",
  //   // Elements the interaction pass should hover+click (see svg-factory-
  //   // architecture's Object contract — every interactive object should
  //   // carry a stable id, so target that rather than a fragile CSS path):
  //   interactiveSelector: "[data-interactive='true']",
  // },
];

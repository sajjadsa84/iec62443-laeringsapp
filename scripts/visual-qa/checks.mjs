// Reusable per-page check helpers used by run.mjs. Kept dependency-free
// (no pixelmatch/axe/etc.) — see the note at the bottom of run.mjs for why.

import crypto from "node:crypto";

/** Attach console/page-error capture. Call before navigating. */
export function captureConsole(page) {
  const errors = [];
  const warnings = [];
  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error") errors.push(msg.text());
    else if (type === "warning") warnings.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return { errors, warnings };
}

/** DOM/SVG node counts + horizontal-scroll check (visual-qa §7 and §8). */
export async function domStats(page) {
  return page.evaluate(() => {
    const all = document.querySelectorAll("*");
    const svgEls = document.querySelectorAll("svg *");
    return {
      totalElements: all.length,
      svgElements: svgEls.length,
      hasHorizontalScroll:
        document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
}

/**
 * Crude, dependency-free "is anything animating" signal (visual-qa §4,
 * idle-motion check): take N screenshots spaced apart and hash each one.
 * If every hash is identical, nothing visibly changed across the sample
 * window — a red flag for an object whose idle animation should be
 * running. This can't tell you *what* moved, only whether the frame as a
 * whole was static — treat it as a prompt to look at the screenshots, not
 * a substitute for looking at them.
 */
export async function sampleMotion(page, { frames = 4, intervalMs = 180 } = {}) {
  const hashes = [];
  for (let i = 0; i < frames; i++) {
    const buf = await page.screenshot();
    hashes.push(crypto.createHash("sha1").update(buf).digest("hex"));
    if (i < frames - 1) await page.waitForTimeout(intervalMs);
  }
  const distinct = new Set(hashes).size;
  return { frames, distinctFrames: distinct, likelyAnimating: distinct > 1 };
}

/**
 * Reduced-motion pass (visual-qa §4/§9): emulate prefers-reduced-motion
 * and grab a screenshot so it can be compared by eye against the normal
 * pass — the scene must stay legible, not just "not crash".
 */
export async function reducedMotionScreenshot(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const buf = await page.screenshot({ fullPage: true });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  return buf;
}

/**
 * Very coarse focus-visibility check (visual-qa §9): tab a few times and
 * report whether the focused element has any visible focus styling
 * (outline or box-shadow). Doesn't validate contrast/size — just presence.
 */
export async function focusVisibilityCheck(page, tabs = 5) {
  const results = [];
  for (let i = 0; i < tabs; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const hasOutline = cs.outlineStyle !== "none" && cs.outlineWidth !== "0px";
      const hasShadow = cs.boxShadow !== "none";
      return {
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role"),
        ariaLabel: el.getAttribute("aria-label"),
        visibleFocus: hasOutline || hasShadow,
      };
    });
    if (info) results.push(info);
  }
  return results;
}

/** JS heap size via CDP (visual-qa §8, memory-growth leak check). */
export async function heapSize(page) {
  const client = await page.context().newCDPSession(page);
  await client.send("Performance.enable");
  const { metrics } = await client.send("Performance.getMetrics");
  return metrics.find((m) => m.name === "JSHeapUsedSize")?.value ?? null;
}

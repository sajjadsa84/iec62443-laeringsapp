#!/usr/bin/env node
// Visual QA runner for the visual-qa skill (.claude/skills/visual-qa/SKILL.md).
//
// Drives the app in the pre-installed Chromium via Playwright and produces,
// per scenario in config.mjs: console-error capture, DOM/SVG node counts,
// screenshots at several viewports, a reduced-motion screenshot, a crude
// "is anything animating" signal, a focus-visibility pass, an optional
// hover/click interaction pass, and a JS heap sample.
//
// This automates what's mechanically checkable. Perspective/visual-
// consistency/layering/gameplay-readability (visual-qa §1-3, §6, §10) are
// inherently a matter of looking at the screenshots this produces — the
// script's job is to gather that evidence cheaply and repeatably, not to
// replace the look.
//
// Usage:
//   npm run visual-qa                       # all scenarios, default viewports
//   npm run visual-qa -- --scenario=home    # one scenario
//   npm run visual-qa -- --url=http://localhost:5173 --keep-server
//
// If nothing is listening at --url yet, this starts `vite` itself (using
// the project's own dev server) and shuts it down when done.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  captureConsole,
  domStats,
  sampleMotion,
  reducedMotionScreenshot,
  focusVisibilityCheck,
  heapSize,
} from "./checks.mjs";
import { DEFAULT_URL, VIEWPORTS, SCENARIOS } from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

function parseArgs(argv) {
  const args = { url: DEFAULT_URL, scenario: null, keepServer: false, headed: false };
  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, "").split(/=(.*)/s);
    if (key === "url") args.url = value;
    else if (key === "scenario") args.scenario = value;
    else if (key === "out") args.out = value;
    else if (key === "keep-server") args.keepServer = true;
    else if (key === "headed") args.headed = true;
  }
  return args;
}

async function isServerUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function ensureServer(url) {
  if (await isServerUp(url)) return { started: false, proc: null };

  const port = new URL(url).port || "5173";
  console.log(`[visual-qa] No server at ${url} — starting vite on port ${port}...`);
  const proc = spawn(
    "./node_modules/.bin/vite",
    ["--port", port, "--strictPort"],
    { cwd: REPO_ROOT, stdio: "pipe" },
  );
  proc.stderr.on("data", (d) => process.stderr.write(`[vite] ${d}`));

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await isServerUp(url)) return { started: true, proc };
    await new Promise((r) => setTimeout(r, 300));
  }
  proc.kill();
  throw new Error(`vite dev server did not come up at ${url} within 30s`);
}

async function runScenario(browser, scenario, outDir, args) {
  const result = { name: scenario.name, path: scenario.path, viewports: {}, issues: [] };
  const scenarioDir = path.join(outDir, scenario.name);
  await mkdir(scenarioDir, { recursive: true });

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const console_ = captureConsole(page);

    const url = new URL(scenario.path, args.url).toString();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    if (scenario.waitForSelector) {
      await page.waitForSelector(scenario.waitForSelector, { timeout: 10_000 }).catch(() => {
        result.issues.push(`[${vp.name}] waitForSelector "${scenario.waitForSelector}" timed out`);
      });
    }
    await page.waitForTimeout(300); // let initial mount/idle animations settle in

    const stats = await domStats(page);
    if (stats.hasHorizontalScroll) {
      result.issues.push(`[${vp.name}] unexpected horizontal scroll (viewport ${vp.width}px)`);
    }

    const screenshotPath = path.join(scenarioDir, `${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const vpResult = { stats, screenshot: path.relative(outDir, screenshotPath) };

    // Deeper, slower checks only on the first (desktop) viewport — no need
    // to repeat animation/heap/focus sampling per breakpoint.
    if (vp === VIEWPORTS[0]) {
      vpResult.motion = await sampleMotion(page);
      if (!vpResult.motion.likelyAnimating) {
        result.issues.push(
          `[${vp.name}] no visible frame-to-frame change detected over ${vpResult.motion.frames} frames — ` +
            `check whether idle motion (gsap-motion-system principle 1) is actually running`,
        );
      }

      const reducedBuf = await reducedMotionScreenshot(page);
      const reducedPath = path.join(scenarioDir, `${vp.name}-reduced-motion.png`);
      await writeFile(reducedPath, reducedBuf);
      vpResult.reducedMotionScreenshot = path.relative(outDir, reducedPath);

      vpResult.focus = await focusVisibilityCheck(page);
      const noFocusRing = vpResult.focus.filter((f) => !f.visibleFocus);
      if (noFocusRing.length > 0) {
        result.issues.push(
          `[${vp.name}] ${noFocusRing.length}/${vpResult.focus.length} tabbed-to elements had no visible focus styling`,
        );
      }

      const heapBefore = await heapSize(page);
      if (scenario.interactiveSelector) {
        vpResult.interaction = await runInteractionPass(page, scenario, scenarioDir, vp.name);
      }
      const heapAfter = await heapSize(page);
      vpResult.heap = { before: heapBefore, after: heapAfter };
    }

    vpResult.consoleErrors = console_.errors;
    vpResult.consoleWarnings = console_.warnings;
    if (console_.errors.length > 0) {
      result.issues.push(`[${vp.name}] ${console_.errors.length} console error(s) — see report.json`);
    }

    result.viewports[vp.name] = vpResult;
    await context.close();
  }

  return result;
}

async function runInteractionPass(page, scenario, scenarioDir, vpName) {
  const targets = await page.locator(scenario.interactiveSelector).all();
  const sample = targets.slice(0, 3);
  const outcomes = [];

  for (let i = 0; i < sample.length; i++) {
    const el = sample[i];
    const before = path.join(scenarioDir, `${vpName}-interact-${i}-hover.png`);
    const after = path.join(scenarioDir, `${vpName}-interact-${i}-click.png`);
    try {
      await el.hover();
      await page.waitForTimeout(150);
      await page.screenshot({ path: before });
      await el.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: after });
      outcomes.push({ index: i, ok: true, hover: path.basename(before), click: path.basename(after) });
    } catch (err) {
      outcomes.push({ index: i, ok: false, error: String(err) });
    }
  }
  return { targetsFound: targets.length, sampled: outcomes };
}

function toMarkdown(results, args) {
  const lines = [`# Visual QA report`, ``, `Base URL: \`${args.url}\``, ``];
  for (const r of results) {
    lines.push(`## ${r.name} (\`${r.path}\`)`, ``);
    if (r.issues.length === 0) {
      lines.push(`No automated issues flagged.`, ``);
    } else {
      lines.push(`**Flagged:**`);
      for (const issue of r.issues) lines.push(`- ${issue}`);
      lines.push(``);
    }
    for (const [vpName, vp] of Object.entries(r.viewports)) {
      lines.push(
        `- **${vpName}**: ${vp.stats.totalElements} elements (${vp.stats.svgElements} in SVG)` +
          `${vp.stats.hasHorizontalScroll ? " — ⚠️ horizontal scroll" : ""} — [screenshot](${vp.screenshot})`,
      );
      if (vp.motion) {
        lines.push(
          `  - motion sample: ${vp.motion.distinctFrames}/${vp.motion.frames} distinct frames` +
            (vp.motion.likelyAnimating ? "" : " — ⚠️ looks static"),
        );
      }
      if (vp.reducedMotionScreenshot) {
        lines.push(`  - [reduced-motion screenshot](${vp.reducedMotionScreenshot})`);
      }
      if (vp.heap) {
        lines.push(`  - JS heap: ${vp.heap.before ?? "?"} → ${vp.heap.after ?? "?"} bytes`);
      }
      if (vp.interaction) {
        lines.push(
          `  - interaction pass: ${vp.interaction.targetsFound} target(s) matched, ` +
            `${vp.interaction.sampled.filter((s) => s.ok).length}/${vp.interaction.sampled.length} sampled clicks succeeded`,
        );
      }
    }
    lines.push(``);
  }
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve(REPO_ROOT, args.out ?? `scripts/visual-qa/out/${timestamp}`);
  await mkdir(outDir, { recursive: true });

  const scenarios = args.scenario
    ? SCENARIOS.filter((s) => s.name === args.scenario)
    : SCENARIOS;
  if (scenarios.length === 0) {
    console.error(`No scenario named "${args.scenario}" in config.mjs`);
    process.exit(1);
  }

  const server = await ensureServer(args.url);
  const browser = await chromium.launch({ headless: !args.headed });

  try {
    const results = [];
    for (const scenario of scenarios) {
      console.log(`[visual-qa] running scenario: ${scenario.name}`);
      results.push(await runScenario(browser, scenario, outDir, args));
    }

    await writeFile(path.join(outDir, "report.json"), JSON.stringify(results, null, 2));
    await writeFile(path.join(outDir, "report.md"), toMarkdown(results, args));

    const totalIssues = results.reduce((n, r) => n + r.issues.length, 0);
    console.log(`\n[visual-qa] done. ${totalIssues} issue(s) flagged. Report: ${outDir}/report.md`);
    process.exitCode = totalIssues > 0 ? 1 : 0;
  } finally {
    await browser.close();
    if (server.started && !args.keepServer) {
      server.proc.kill();
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

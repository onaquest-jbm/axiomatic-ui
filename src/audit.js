'use strict';
// Verifier: renders each scenario in a real Chromium, at each width and theme, takes
// screenshots, runs the in-page probe, tabs through focus, performs the scenario's steps and
// measures click-to-paint, layout shift, long tasks and how long the resulting motion runs.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { launch, openPage } = require('./cdp');
const { probe } = require('./probe');
const { derive } = require('./derive');

const OBSERVERS = `
(() => {
  const s = window.__unslop = { cls: 0, shifts: [], longTasks: [], events: [] };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { s.cls += e.value; s.shifts.push(e.value); } }).observe({ type: 'layout-shift', buffered: true }); } catch (_) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) s.longTasks.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); } catch (_) {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) s.events.push({ name: e.name, duration: e.duration, start: e.startTime, processing: e.processingEnd - e.processingStart }); }).observe({ type: 'event', durationThreshold: 16, buffered: true }); } catch (_) {}
})();
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function resolveUrl(url, baseDir) {
  if (/^(https?|file|data):/.test(url)) return url;
  return pathToFileURL(path.resolve(baseDir, url)).href;
}

async function centerOf(page, selector) {
  return page.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.scrollIntoView({block: 'center'}); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
}

async function click(page, selector) {
  const pt = await centerOf(page, selector);
  if (!pt) throw new Error(`Step selector not found: ${selector}`);
  await page.evaluate('window.__unslop.events = []; window.__unslopMark = performance.now(); 0');
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pt.x, y: pt.y });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  // Sample the animations the click started, while they run.
  await sleep(40);
  const motion = await page.evaluate(`(() => {
    const anims = document.getAnimations ? document.getAnimations() : [];
    let longest = 0;
    for (const a of anims) {
      const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
      if (t && isFinite(t.endTime)) longest = Math.max(longest, t.endTime);
    }
    return { running: anims.length, longestMs: Math.round(longest) };
  })()`);
  await sleep(Math.max(250, Math.min(motion.longestMs + 120, 1500)));
  const timing = await page.evaluate(`(() => {
    const ev = window.__unslop.events.filter((e) => /click|pointerup|pointerdown|mouseup|mousedown/.test(e.name));
    return { clickToPaintMs: ev.length ? Math.round(Math.max(...ev.map((e) => e.duration))) : null, handlerMs: ev.length ? Math.round(Math.max(...ev.map((e) => e.processing))) : null };
  })()`);
  return Object.assign({}, timing, { motionMs: motion.longestMs, animations: motion.running });
}

async function focusAudit(page, maxTabs = 12) {
  await page.evaluate(`(() => {
    const keys = ['outlineStyle','outlineWidth','outlineColor','boxShadow','backgroundColor','borderColor','textDecorationLine'];
    window.__unslopFocusKeys = keys;
    window.__unslopBase = new Map();
    // Focus may be shown on the element or on a wrapper via :focus-within, so snapshot two ancestors too.
    window.__unslopSig = (el) => [el, el.parentElement, el.parentElement && el.parentElement.parentElement]
      .filter(Boolean).map((n) => { const cs = getComputedStyle(n); return keys.map((k) => cs[k]).join('|'); }).join('||');
    for (const el of document.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')) {
      window.__unslopBase.set(el, window.__unslopSig(el));
    }
    if (document.activeElement) document.activeElement.blur();
    return 0;
  })()`);
  const invisible = [];
  let reached = 0;
  for (let i = 0; i < maxTabs; i++) {
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await sleep(30);
    const r = await page.evaluate(`(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const now = window.__unslopSig(el);
      const base = window.__unslopBase.get(el);
      const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
      const r = el.getBoundingClientRect();
      return { changed: base !== undefined ? base !== now : true, outline, label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40), rect: { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) } };
    })()`);
    if (!r) break;
    reached++;
    if (!r.changed && !r.outline) invisible.push(r);
  }
  return { reached, invisible };
}

async function screenshot(page, file, width) {
  const m = await page.send('Page.getLayoutMetrics');
  const h = Math.min(Math.ceil((m.cssContentSize || m.contentSize).height), 2600);
  const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: h, scale: 1 } });
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  return { file: path.basename(file), height: h };
}


async function audit(scenarioFile, outDir, opts = {}) {
  const cfg = JSON.parse(fs.readFileSync(scenarioFile, 'utf8'));
  const baseDir = path.dirname(path.resolve(scenarioFile));
  const model = JSON.parse(fs.readFileSync(path.resolve(baseDir, cfg.model), 'utf8'));
  const d = derive(model);
  const widths = cfg.widths || [1280, 390];
  const themes = cfg.themes || ['light'];
  fs.mkdirSync(outDir, { recursive: true });
  const { browser, close, exe } = await launch({ headless: !opts.headed });
  const results = [];
  try {
    for (const sc of cfg.scenarios) {
      const screen = (model.screens || []).find((s) => s.id === sc.screen) || {};
      const plan = sc.plan || screen.plan || {};
      for (const theme of (sc.themes || themes)) {
        for (const width of (sc.widths || widths)) {
          const page = await openPage(browser);
          await page.send('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVERS });
          await page.send('Emulation.setDeviceMetricsOverride', { width, height: width < 600 ? 844 : 860, deviceScaleFactor: 1, mobile: width < 600 });
          await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
          const loaded = page.waitFor('Page.loadEventFired');
          await page.send('Page.navigate', { url: resolveUrl(sc.url, baseDir) });
          await loaded;
          await page.evaluate('document.fonts ? document.fonts.ready.then(() => 0) : 0');
          await sleep(sc.settleMs || 400);
          // Long tasks during load are dominated by headless browser warm-up; measure interaction only.
          await page.evaluate('window.__unslop.longTasks = []; 0');
          const slug = `${sc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${theme}-${width}`;
          const shot = await screenshot(page, path.join(outDir, `${slug}.png`), width);
          const palette = d.color[theme] ? Object.values(d.color[theme]) : [];
          const probeOpts = {
            budgets: d.budget, plan, sizes: Object.values(d.type.sizes), space: Object.values(d.space),
            palette: palette.map((h) => { const p = require('./color').parseColor(h); return `rgb(${Math.round(p.r)}, ${Math.round(p.g)}, ${Math.round(p.b)})`; }),
            accent: (() => { const p = require('./color').parseColor(d.color[theme] ? d.color[theme].accent : '#000'); return `rgb(${Math.round(p.r)}, ${Math.round(p.g)}, ${Math.round(p.b)})`; })(),
            minTarget: width < 600 ? d.target.touch : d.target.min, maxMotion: d.motion.region,
          };
          const measured = await page.evaluate(`(${probe.toString()})(${JSON.stringify(probeOpts)})`);
          const findings = measured.findings;
          const focus = await focusAudit(page);
          for (const f of focus.invisible) findings.push({ rule: 'invisible-focus', tier: 'floor', principle: 'legibility', message: `No visible focus on "${f.label}".`, rect: f.rect });
          const steps = [];
          for (const step of sc.steps || []) {
            if (step.click) {
              const r = await click(page, step.click);
              steps.push(Object.assign({ name: step.name || step.click }, r));
              if (r.clickToPaintMs !== null && r.clickToPaintMs > d.response.feedbackMs) findings.push({ rule: 'slow-response', tier: 'floor', principle: 'response', message: `"${step.name || step.click}" took ${r.clickToPaintMs}ms to show a result; people stop feeling the click caused it past ${d.response.feedbackMs}ms.` });
              if (r.motionMs > d.motion.region + 20) findings.push({ rule: 'slow-motion', tier: 'floor', principle: 'response', message: `"${step.name || step.click}" started ${r.motionMs}ms of motion; the derived maximum is ${d.motion.region}ms.` });
            } else if (step.wait) {
              await sleep(step.wait);
            }
            if (step.screenshot) {
              const s2 = await screenshot(page, path.join(outDir, `${slug}-after-${steps.length}.png`), width);
              steps[steps.length - 1].screenshot = s2.file;
            }
          }
          const perf = await page.evaluate('({ cls: Math.round(window.__unslop.cls * 1000) / 1000, longTasks: window.__unslop.longTasks })');
          if (perf.cls > 0.02) findings.push({ rule: 'layout-shift', tier: 'meaning', principle: 'motion', message: `Content moved by itself after load (shift ${perf.cls}): motion that reports no change.` });
          if (perf.longTasks.length) findings.push({ rule: 'long-task', tier: 'floor', principle: 'response', message: `${perf.longTasks.length} long main-thread task(s): ${perf.longTasks.join(', ')}ms.` });
          await browser.send('Target.closeTarget', { targetId: page.targetId });
          const counts = { floor: 0, meaning: 0, derivation: 0, finish: 0 };
          for (const f of findings) counts[f.tier]++;
          results.push({ scenario: sc.name, url: sc.url, theme, width, screenshot: shot, metrics: measured.metrics, focus: { reached: focus.reached, invisible: focus.invisible.length }, steps, perf, findings, counts });
          if (!opts.quiet) process.stdout.write(`  ${sc.name} [${theme} ${width}px] floor ${counts.floor}  meaning ${counts.meaning}  derivation ${counts.derivation}\n`);
        }
      }
    }
  } finally {
    await close();
  }
  const report = { generatedAt: new Date().toISOString(), browser: path.basename(exe), product: model.product, derivation: d, results };
  fs.writeFileSync(path.join(outDir, 'audit.json'), JSON.stringify(report, null, 2));
  return report;
}

module.exports = { audit };

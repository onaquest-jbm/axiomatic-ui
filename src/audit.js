'use strict';
// Verifier: renders each scenario in a real Chromium, at each width and theme, takes
// screenshots, runs the in-page probe, tabs through focus, performs the scenario's steps and
// measures click-to-paint, layout shift, long tasks and how long the resulting motion runs.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { launch, attach, existingPage, openPage } = require('./cdp');
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
// AXIOMATIC_DEBUG=1 traces each stage to stderr (for finding where an attached app stalls).
const dbg = process.env.AXIOMATIC_DEBUG ? (...a) => process.stderr.write(`[verify ${new Date().toISOString().slice(11, 23)}] ${a.join(' ')}
`) : () => {};

// Surfaces: what a click makes visible (a menu, dialog, popover, panel or new view). Before a
// click the visible elements are remembered; after it, the newly visible ones are the surface,
// and the probe runs again scoped to them.
const VISIBLE_SET = `(() => { const s = new Set(); for (const el of document.body.querySelectorAll('*')) {
  if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue;
  const r = el.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) continue;
  if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
  s.add(el); } return s; })()`;
const REMEMBER = `(() => { window.__axSeen = ${VISIBLE_SET}; return window.__axSeen.size; })()`;
const SCOPE = `(() => { const seen = window.__axSeen || new Set(), now = ${VISIBLE_SET}, s = new Set();
  for (const el of now) if (!seen.has(el)) s.add(el); window.__axScope = s; return s.size; })()`;

// An attached Electron window that nobody is looking at can stop producing frames: transitions
// then freeze at their first frame (a dialog stays at opacity 0) and captures wait forever. While
// verify is attached, an unused custom property changes every 30ms so frames keep coming.
const FRAMES_ON = `(() => { clearInterval(window.__axFrames); window.__axFrames = setInterval(() => document.documentElement.style.setProperty('--axiomatic-frame', String(Math.random())), 30); return 0; })()`;
const FRAMES_OFF = `(() => { clearInterval(window.__axFrames); document.documentElement.style.removeProperty('--axiomatic-frame'); return 0; })()`;

// Closes open dialogs and popovers, so an attached app (never reloaded) starts each surface clean.
const CLOSE_SURFACES = `(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); try { for (const p of document.querySelectorAll(':popover-open')) p.hidePopover(); } catch (_) {} return 0; })()`;

// Openers: controls that probably reveal a surface. Destructive or committing actions are left
// alone; explore mode clicks the rest one at a time, each on a freshly loaded page.
// `skip` is a list of extra label patterns never to click (from the scenario's exploreSkip).
const OPENERS = (skip = []) => `(() => {
  const skip = ${JSON.stringify(skip)}.map((s) => new RegExp(s, 'i'));
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (!el.checkVisibility || el.checkVisibility({ opacityProperty: true, visibilityProperty: true })); };
  const label = (el) => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40) || el.tagName.toLowerCase();
  const risky = /delete|trash|remove|discard|unsubscribe|block|leave|destroy|sign ?out|log ?out|pay|purchase|buy|send|submit|deploy|publish|reset|stop|kill|archive|deny|reject|approve|confirm/i;
  const strong = '[aria-haspopup]:not([aria-haspopup="false"]), [aria-expanded], [aria-controls], [popovertarget], summary, [data-bs-toggle], [data-toggle]';
  const seen = new Set(), shapes = new Set(), out = [];
  // Repeated controls (a star on every row) are one kind of opener: try the first of each shape.
  const shape = (el) => [el.tagName, el.getAttribute('role') || '', (el.getAttribute('class') || '').split(/\\s+/).sort().join('.'), el.getAttribute('aria-haspopup') || '', el.parentElement ? el.parentElement.tagName + '.' + (el.parentElement.getAttribute('class') || '') : ''].join('|');
  const push = (el, kind) => {
    if (seen.has(el) || !vis(el) || el.disabled || el.closest('form [type=submit]') === el) return;
    seen.add(el); const l = label(el); if (risky.test(l) || skip.some((re) => re.test(l))) return;
    const sh = shape(el); if (shapes.has(sh)) return; shapes.add(sh);
    out.push({ el, kind, label: l });
  };
  for (const el of document.querySelectorAll(strong)) push(el, 'declared');
  for (const el of document.querySelectorAll('button, [role=button], [role=tab], a[href^="#"]')) push(el, 'button');
  window.__axOpeners = out.map((o) => o.el);
  return out.map((o, i) => ({ i, kind: o.kind, label: o.label }));
})()`;

function resolveUrl(url, baseDir) {
  if (/^(https?|file|data):/.test(url)) return url;
  return pathToFileURL(path.resolve(baseDir, url)).href;
}

async function centerOf(page, selector) {
  return page.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.scrollIntoView({block: 'center'}); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, rect: { x: r.x, y: r.y, w: r.width, h: r.height } }; })()`);
}

async function click(page, selector, pt) {
  pt = pt || await centerOf(page, selector);
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

async function screenshot(page, file, width, native) {
  // An attached Electron app hangs on clipped or beyond-viewport captures: take the window as it is.
  // An idle Electron window may produce no new frame, and a capture waits for one: keep changing
  // an unused custom property (nothing is drawn) until the capture returns.
  if (native) {
    const nudge = `(() => { document.documentElement.style.setProperty('--axiomatic-frame', String(Math.random())); return 0; })()`;
    const tick = setInterval(() => { page.evaluate(nudge).catch(() => {}); }, 100);
    let shot;
    try {
      await page.evaluate(nudge);
      // Electron can leave one capture hanging while the next returns at once: retry after 1.5 s.
      for (let i = 0; i < 8 && !shot; i++) shot = await Promise.race([page.send('Page.captureScreenshot', { format: 'png' }), sleep(1500).then(() => null)]);
    } finally { clearInterval(tick); await page.evaluate(`(() => { document.documentElement.style.removeProperty('--axiomatic-frame'); return 0; })()`).catch(() => {}); }
    if (!shot) return { file: null, height: null, error: 'capture timed out' };
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    return { file: path.basename(file), height: null };
  }
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
  // --attach: check an app that is already running (an Electron app, a signed-in browser)
  // instead of launching a browser. Its page is reloaded between surfaces when there is no URL.
  const attachTo = opts.attach || cfg.attach;
  const { browser, close, exe } = attachTo ? await attach(attachTo) : await launch({ headless: !opts.headed });
  const results = [];
  try {
    for (const sc of cfg.scenarios) {
      const screen = (model.screens || []).find((s) => s.id === sc.screen) || {};
      const plan = sc.plan || screen.plan || {};
      // An attached app is checked once, at its real window size and theme: emulating either one
      // stops Electron from painting screenshots. Restart the app at another size for other widths.
      for (const t of (attachTo ? ['native'] : (sc.themes || themes))) {
        for (const w of (attachTo ? [0] : (sc.widths || widths))) {
          let theme = t, width = w;
          const page = attachTo ? await existingPage(browser, sc.match || cfg.match) : await openPage(browser);
          const { identifier: observerScript } = await page.send('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVERS });
          const go = async (again) => {
            if (attachTo && !sc.url) {
              // An attached app is never reloaded (a reload can stop Electron painting): start from
              // the window as it is, and between surfaces close what opened with Escape.
              if (again) { for (let i = 0; i < 2; i++) { await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await sleep(150); } }
              else { await page.evaluate(OBSERVERS); await page.evaluate(FRAMES_ON); await page.evaluate(CLOSE_SURFACES); await sleep(300); }
              return;
            }
            const loaded = page.waitFor('Page.loadEventFired');
            if (sc.url) await page.send('Page.navigate', { url: resolveUrl(sc.url, baseDir) }); else await page.send('Page.reload', {});
            await loaded;
          };
          if (!attachTo) {
            await page.send('Emulation.setDeviceMetricsOverride', { width, height: width < 600 ? 844 : 860, deviceScaleFactor: 1, mobile: width < 600 });
            await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
          }
          dbg('load', sc.name);
          await go();
          dbg('loaded');
          if (attachTo) { width = await page.evaluate('innerWidth'); theme = (await page.evaluate(`(() => { const cs = getComputedStyle(document.documentElement).colorScheme || ''; return cs.trim() === 'dark' || (/dark/.test(cs) && matchMedia('(prefers-color-scheme: dark)').matches); })()`)) ? 'dark' : 'light'; }
          await page.evaluate('document.fonts ? document.fonts.ready.then(() => 0) : 0');
          await sleep(sc.settleMs || 400);
          // Long tasks during load are dominated by headless browser warm-up; measure interaction only.
          await page.evaluate('window.__unslop.longTasks = []; 0');
          const slug = `${sc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${theme}-${width}`;
          dbg('screenshot', slug);
          const shot = await screenshot(page, path.join(outDir, `${slug}.png`), width, !!attachTo);
          dbg('probe');
          const palette = d.color[theme] ? Object.values(d.color[theme]) : [];
          const probeOpts = {
            budgets: d.budget, plan, sizes: Object.values(d.type.sizes), space: Object.values(d.space),
            palette: palette.map((h) => { const p = require('./color').parseColor(h); return `rgb(${Math.round(p.r)}, ${Math.round(p.g)}, ${Math.round(p.b)})`; }),
            accent: (() => { const p = require('./color').parseColor(d.color[theme] ? d.color[theme].accent : '#000'); return `rgb(${Math.round(p.r)}, ${Math.round(p.g)}, ${Math.round(p.b)})`; })(),
            minTarget: width < 600 ? d.target.touch : d.target.min, maxMotion: d.motion.region,
          };
          const measured = await page.evaluate(`(${probe.toString()})(${JSON.stringify(probeOpts)})`);
          const findings = measured.findings;
          const openers = await page.evaluate(OPENERS(sc.exploreSkip || cfg.exploreSkip));
          dbg('openers', openers.length, '; focus');
          const stepClicks = (sc.steps || []).filter((s) => s.click).map((s) => s.click);
          const stepHits = await page.evaluate(`(() => { const out = []; for (const s of ${JSON.stringify(stepClicks)}) { let el = null; try { el = document.querySelector(s); } catch (_) {} const i = window.__axOpeners.indexOf(el); if (i >= 0) out.push(i); } return out; })()`);
          const focus = await focusAudit(page);
          for (const f of focus.invisible) findings.push({ rule: 'invisible-focus', tier: 'floor', principle: 'legibility', message: `No visible focus on "${f.label}".`, rect: f.rect });
          const key = (f) => `${f.rule}|${f.selector || ''}|${f.message}`;
          const known = new Set(findings.map(key));
          const surfaces = [];
          // Probe what the last action revealed; report only findings not already on the page.
          const probeSurface = async (name, how, trigger) => {
            // In an attached app the animation clock may not advance (see FRAMES_ON): finish the
            // finite animations the click started so the surface is measured as people see it.
            if (attachTo) await page.evaluate(`(() => { for (const an of document.getAnimations()) { try { const t = an.effect && an.effect.getComputedTiming(); if (t && isFinite(t.endTime)) an.finish(); } catch (_) {} } return 0; })()`);
            const n = await page.evaluate(SCOPE);
            if (!n) { surfaces.push({ name, how, newElements: 0, findings: 0 }); return; }
            const m = await page.evaluate(`(${probe.toString()})(${JSON.stringify(Object.assign({}, probeOpts, { scoped: true, plan: {}, trigger: trigger || null }))})`);
            let added = 0;
            for (const f of m.findings) { const k = key(f); if (known.has(k)) continue; known.add(k); added++; findings.push(Object.assign(f, { surface: name })); }
            const shot = opts.surfaceShots === false ? null : await screenshot(page, path.join(outDir, `${slug}-surface-${surfaces.length + 1}.png`), width, !!attachTo);
            surfaces.push({ name, how, newElements: n, findings: added, screenshot: shot && shot.file });
          };
          const steps = [];
          for (const step of sc.steps || []) {
            if (step.click) {
              await page.evaluate(REMEMBER);
              // A control that isn't on screen at this size (a desktop-only button on a phone)
              // is reported, not fatal: the rest of the scenario still runs.
              const there = await page.evaluate(`(() => { try { const el = document.querySelector(${JSON.stringify(step.click)}); return !!el && el.getClientRects().length > 0; } catch (_) { return false; } })()`);
              if (!there) { steps.push({ name: step.name || step.click, missing: true }); surfaces.push({ name: step.name || step.click, how: 'step', missing: true, newElements: 0, findings: 0 }); continue; }
              const pt = await centerOf(page, step.click);
              const r = await click(page, step.click, pt);
              if (step.probe !== false) await probeSurface(step.name || step.click, 'step', pt && pt.rect);
              steps.push(Object.assign({ name: step.name || step.click }, r));
              if (r.clickToPaintMs !== null && r.clickToPaintMs > d.response.feedbackMs) findings.push({ rule: 'slow-response', tier: 'floor', principle: 'response', message: `"${step.name || step.click}" took ${r.clickToPaintMs}ms to show a result; people stop feeling the click caused it past ${d.response.feedbackMs}ms.` });
              if (r.motionMs > d.motion.region + 20) findings.push({ rule: 'slow-motion', tier: 'floor', principle: 'response', message: `"${step.name || step.click}" started ${r.motionMs}ms of motion; the derived maximum is ${d.motion.region}ms.` });
            } else if (step.wait) {
              await sleep(step.wait);
            }
            if (step.screenshot) {
              const s2 = await screenshot(page, path.join(outDir, `${slug}-after-${steps.length}.png`), width, !!attachTo);
              steps[steps.length - 1].screenshot = s2.file;
            }
          }
          dbg('steps done');
          const perf = await page.evaluate('({ cls: Math.round(window.__unslop.cls * 1000) / 1000, longTasks: window.__unslop.longTasks })');
          if (perf.cls > 0.02) findings.push({ rule: 'layout-shift', tier: 'meaning', principle: 'motion', message: `Content moved by itself after load (shift ${perf.cls}): motion that reports no change.` });
          if (perf.longTasks.length) findings.push({ rule: 'long-task', tier: 'floor', principle: 'response', message: `${perf.longTasks.length} long main-thread task(s): ${perf.longTasks.join(', ')}ms.` });

          // Coverage: which likely openers the steps exercised. Explore mode clicks the rest,
          // each on a freshly loaded page so one surface can't hide or change another.
          const stepped = new Set(stepHits);
          const explore = sc.explore !== undefined ? sc.explore : (opts.explore !== undefined ? opts.explore : cfg.explore);
          const max = (typeof explore === 'number' ? explore : 0) || 20;
          if (explore) {
            for (const o of openers.filter((x) => !stepped.has(x.i)).slice(0, max)) {
              await go(true);
              await sleep(sc.settleMs || 400);
              const list = await page.evaluate(OPENERS(sc.exploreSkip || cfg.exploreSkip));
              const same = list[o.i] && list[o.i].label === o.label ? o.i : (list.find((x) => x.label === o.label) || {}).i;
              if (same === undefined) continue;
              const pt = await page.evaluate(`(() => { const el = window.__axOpeners[${same}]; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, rect: { x: r.x, y: r.y, w: r.width, h: r.height } }; })()`);
              await page.evaluate(REMEMBER);
              await click(page, null, pt);
              await probeSurface(`explore: ${o.label}`, 'explore', pt.rect);
              dbg('explored', o.label);
              if (attachTo && !sc.url) {
                // No reload to undo the click: close what opened, and flip a toggle back if its
                // label changed (Hide sidebar -> Show sidebar).
                await page.evaluate(CLOSE_SURFACES);
                await go(true);
                const now = await page.evaluate(`(() => { const el = window.__axOpeners[${same}]; if (!el || !el.isConnected || !el.getClientRects().length) return null; return (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40); })()`);
                if (now && now !== o.label) {
                  const back = await page.evaluate(`(() => { const r = window.__axOpeners[${same}].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
                  await click(page, null, back);
                  await page.evaluate(CLOSE_SURFACES);
                }
              }
              stepped.add(o.i);
            }
          }
          const coverage = { openers: openers.length, exercised: stepped.size, unexercised: openers.filter((o) => !stepped.has(o.i)).map((o) => o.label) };
          if (attachTo) {
            // Leave the app as it was found: no injected observer or frame nudging, still running.
            await page.evaluate(FRAMES_OFF).catch(() => {});
            await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: observerScript }).catch(() => {});
            await browser.send('Target.detachFromTarget', { sessionId: page.sessionId }).catch(() => {});
          } else await browser.send('Target.closeTarget', { targetId: page.targetId });
          const counts = { floor: 0, meaning: 0, derivation: 0, finish: 0 };
          for (const f of findings) counts[f.tier]++;
          results.push({ scenario: sc.name, url: sc.url, theme, width, screenshot: shot, metrics: measured.metrics, focus: { reached: focus.reached, invisible: focus.invisible.length }, steps, surfaces, coverage, perf, findings, counts });
          if (!opts.quiet) process.stdout.write(`  ${sc.name} [${theme} ${width}px] floor ${counts.floor}  meaning ${counts.meaning}  derivation ${counts.derivation}  surfaces ${surfaces.filter((s) => s.newElements).length}  openers exercised ${coverage.exercised}/${coverage.openers}\n`);
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

#!/usr/bin/env node
'use strict';
// Screenshots only (no checks): each site's page and each listed surface opened, at desktop
// light, desktop dark and phone light. Used to give independent reviewers something to look at
// when writing ground truth, without exposing what the tools find.
//   node benchmark/shots.js [site ...]

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { launch, openPage } = require('../src/cdp');

const SITES = path.join(__dirname, 'sites');
const OUT = path.join(__dirname, 'build', 'shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const VIEWS = [{ w: 1280, theme: 'light' }, { w: 1280, theme: 'dark' }, { w: 390, theme: 'light' }];

function measureRects(selectors) {
  const { width, height } = window.visualViewport;
  return Object.fromEntries(selectors.map((selector) => {
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (const el of document.querySelectorAll(selector)) {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height || getComputedStyle(el).visibility !== 'visible') continue;
      left = Math.min(left, rect.left);
      top = Math.min(top, rect.top);
      right = Math.max(right, rect.right);
      bottom = Math.max(bottom, rect.bottom);
    }
    left = Math.max(0, left);
    top = Math.max(0, top);
    right = Math.min(width, right);
    bottom = Math.min(height, bottom);
    return [selector, right > left && bottom > top ? [left, top, right - left, bottom - top] : null];
  }));
}

async function main() {
  const only = process.argv.slice(2);
  const sites = fs.readdirSync(SITES).filter((s) => fs.existsSync(path.join(SITES, s, 'truth.json')) && (!only.length || only.includes(s)));
  const { browser, close } = await launch({ headless: true });
  const missing = [];
  try {
    for (const s of sites) {
      const truth = JSON.parse(fs.readFileSync(path.join(SITES, s, 'truth.json'), 'utf8'));
      const dir = path.join(OUT, s);
      fs.mkdirSync(dir, { recursive: true });
      const targets = [{ name: 'page' }, ...(truth.surfaces || [])];
      for (const t of targets) for (const v of VIEWS) {
        const page = await openPage(browser);
        await page.send('Emulation.setDeviceMetricsOverride', { width: v.w, height: v.w < 600 ? 844 : 860, deviceScaleFactor: 1, mobile: v.w < 600 });
        await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: v.theme }] });
        const loaded = page.waitFor('Page.loadEventFired');
        await page.send('Page.navigate', { url: pathToFileURL(path.join(SITES, s, 'index.html')).href });
        await loaded;
        await sleep(500);
        let note = '';
        if (t.opener) {
          note = await page.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(t.opener)}); if (!el) return 'opener missing'; el.scrollIntoView({ block: 'center' }); el.dispatchEvent(new MouseEvent(${JSON.stringify(t.event || 'click')}, { bubbles: true, cancelable: true, clientX: 200, clientY: 200 })); return ''; })()`);
          await sleep(600);
        }
        const shot = await page.send('Page.captureScreenshot', { format: 'png' });
        const file = path.join(dir, `${t.name.replace(/[^a-z0-9]+/gi, '-')}-${v.w}-${v.theme}.png`);
        fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
        const selectors = [...new Set((truth.defects || []).filter((d) => d.surface === t.name && d.selector).map((d) => d.selector))];
        const rects = await page.evaluate(`(${measureRects})(${JSON.stringify(selectors)})`);
        fs.writeFileSync(file.replace(/\.png$/, '.rects.json'), JSON.stringify(rects, null, 2) + '\n');
        if (v.w === 1280 && v.theme === 'light') {
          for (const selector of selectors) if (rects[selector] === null) missing.push(`${s} / ${t.name}: ${selector}`);
        }
        if (note) process.stdout.write(`${s} / ${t.name}: ${note}\n`);
        await browser.send('Target.closeTarget', { targetId: page.targetId });
      }
      process.stdout.write(`${s}: ${targets.length * VIEWS.length} shots\n`);
    }
  } finally { await close(); }
  console.log(`1280-light: ${missing.length} selectors without a visible rectangle`);
  for (const item of missing) console.log(`  ${item}`);
}
main().catch((e) => { console.error(e.stack || e.message); process.exit(2); });

#!/usr/bin/env node
'use strict';
// Benchmark runner: builds every planted case from the clean base page, runs `lint` and
// `verify` exactly as they ship (no changes to src/), diffs findings against the matching
// clean control, and scores each defect against the ground truth written in cases.js.
//
//   node benchmark/run.js            build + lint + verify (with plan, and without a plan)
//   node benchmark/run.js --no-verify   lint only (no browser)
//
// Output: benchmark/results/planted.json and benchmark/results/planted.md.
// Generated pages and screenshots go to benchmark/build/ (not committed).

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { derive } = require(path.join(ROOT, 'src/derive'));
const { lintPaths } = require(path.join(ROOT, 'src/lint'));
const { audit } = require(path.join(ROOT, 'src/audit'));
const { CASES, CONTROLS } = require('./cases');

const BUILD = path.join(__dirname, 'build', 'planted');
const RESULTS = path.join(__dirname, 'results');
const MODEL = path.join(ROOT, 'demo/model.json');
const model = JSON.parse(fs.readFileSync(MODEL, 'utf8'));
const d = derive(model);

// ---------- the clean base: demo/after.html plus a clean menu and a clean settings dialog ----------
const MENU = `<div class="more">
        <button class="btn text" type="button" id="more-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="more-menu">More</button>
        <div class="menu" id="more-menu" role="menu">
          <button type="button" role="menuitem">Rename chat</button>
          <button type="button" role="menuitem">Copy link</button>
          <button type="button" role="menuitem">Export transcript</button>
          <hr>
          <button type="button" role="menuitem" class="danger">Delete chat…</button>
        </div>
      </div>`;
const DIALOG = `<div class="sheet" id="settings" role="dialog" aria-modal="true" aria-labelledby="settings-title">
  <div class="sheet-panel">
    <h2 id="settings-title">Settings</h2>
    <div class="field"><label for="set-name">Display name</label><input id="set-name" value="Sam Rivera"></div>
    <div class="field"><label for="set-branch">Branch prefix</label><input id="set-branch" value="agent/"></div>
    <div class="sheet-actions"><button class="btn" type="button" id="settings-reset">Reset to defaults</button><span class="grow"></span><button class="btn text" type="button" id="settings-cancel">Cancel</button><button class="btn primary" type="button">Save</button></div>
  </div>
</div>`;
const SURFACE_CSS = `
  /* Rare surfaces: a menu and a dialog, built from the same tokens as everything else. */
  .more { position: relative; }
  .menu { position: absolute; right: 0; top: 100%; margin-top: var(--gap-control); min-width: 13rem; display: none; flex-direction: column; padding: var(--gap-control); background: var(--surface-base); border: 1px solid var(--edge-control); border-radius: var(--radius-container); box-shadow: var(--elevation-overlay); z-index: var(--layer-overlay); }
  .menu.open { display: flex; }
  .menu button { min-height: var(--control-height); padding: 0 var(--gap-related); border: 0; border-radius: var(--radius-control); background: none; color: var(--ink-primary); font: inherit; text-align: left; cursor: pointer; }
  .menu button:hover { background: var(--surface-canvas); }
  .menu hr { border: 0; border-top: 1px solid var(--edge-separator); margin: var(--gap-control) 0; }
  .menu .danger { color: var(--state-error); }
  .sidebar-foot { margin-top: auto; }
  .sheet { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; padding: var(--gap-group); z-index: var(--layer-modal); }
  .sheet.open { display: flex; }
  .sheet-panel { width: 100%; max-width: 28rem; display: flex; flex-direction: column; gap: var(--gap-section); padding: var(--gap-section); background: var(--surface-base); border: 1px solid var(--edge-control); border-radius: var(--radius-container); box-shadow: var(--elevation-overlay); }
  .sheet-panel h2 { margin: 0; font-size: var(--text-heading); line-height: var(--leading-heading); font-weight: var(--weight-strong); }
  .field { display: flex; flex-direction: column; gap: var(--gap-control); }
  .field input { min-height: var(--control-height); padding: 0 var(--gap-related); border: 1px solid var(--edge-control); border-radius: var(--radius-control); background: var(--surface-base); color: var(--ink-primary); font: inherit; }
  .sheet-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--gap-related); }
  @media (max-width: 720px), (pointer: coarse) { .menu button, .field input { min-height: var(--target-touch); } }
`;
const SURFACE_JS = `
  const pairs = { 'more-btn': 'more-menu', 'settings-btn': 'settings', 'tip-btn': 'tip', 'toast-btn': 'toast' };
  for (const [a, b] of Object.entries(pairs)) {
    const btn = document.getElementById(a), el = document.getElementById(b);
    if (!btn || !el) continue;
    btn.addEventListener('click', () => { const open = !el.classList.contains('open'); el.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); });
  }
  const cancel = document.getElementById('settings-cancel');
  if (cancel) cancel.addEventListener('click', () => document.getElementById('settings').classList.remove('open'));
`;

function must(html, from, to, where) {
  if (!html.includes(from)) throw new Error(`${where}: replacement did not match: ${JSON.stringify(from.slice(0, 80))}`);
  return html.split(from).join(to);
}

function buildBase() {
  let h = fs.readFileSync(path.join(ROOT, 'demo/after.html'), 'utf8').replace(/\r\n/g, '\n');
  h = must(h, 'href="design/', 'href="../../../demo/design/', 'base');
  h = must(h, '\n    </header>', '\n      ' + MENU + '\n    </header>', 'base');
  h = must(h, '  </nav>', '    <div class="sidebar-foot"><button class="btn text" type="button" id="settings-btn" aria-haspopup="dialog" aria-controls="settings">Settings</button></div>\n  </nav>', 'base');
  h = must(h, '</style>', SURFACE_CSS + '</style>', 'base');
  h = must(h, '<script>', DIALOG + '\n<script>', 'base');
  h = must(h, '</script>\n</body>', SURFACE_JS + '</script>\n</body>', 'base');
  return h;
}

function apply(base, c, variant) {
  let h = base;
  for (const [from, to] of c.replace || []) h = must(h, from, to, c.id);
  if (c.css) h = must(h, '</style>', `  /* planted: ${c.id} */\n  ${c.css}\n</style>`, c.id);
  if (c.html) h = must(h, '</body>', c.html + '\n</body>', c.id);
  if (variant === 'open') h = must(h, '</body>', `<script>document.querySelector(${JSON.stringify(c.surface.target)}).classList.add('open'); const _t = document.querySelector(${JSON.stringify(c.surface.trigger)}); if (_t) _t.setAttribute('aria-expanded', 'true');</script>\n</body>`, c.id);
  return h;
}

// One entry per page to render. Surface cases are built twice.
function pages() {
  const out = [];
  const add = (c, kind, variant) => out.push({ c, kind, variant, slug: c.id + (variant === 'base' ? '' : `--${variant}`) });
  for (const c of CONTROLS) add(c, 'control', c.openOnly ? 'open' : 'base');
  for (const c of CASES) {
    if (c.surface) { add(c, 'case', 'step'); add(c, 'case', 'open'); } else add(c, 'case', 'base');
  }
  return out;
}

// Which control a page is diffed against: open surfaces against the same surface open and clean.
function controlFor(p) {
  if (p.kind === 'control') return p.slug === 'ctl-base' ? null : 'ctl-base';
  if (p.variant !== 'open') return 'ctl-base';
  return p.c.surface.target === '#settings' ? 'ctl-dialog-open--open' : 'ctl-menu-open--open';
}

function scenarioFor(p, mode) {
  const steps = [{ name: 'Show command details', click: '#why-toggle' }];
  if (p.variant === 'step') steps.push({ name: `Open ${p.c.surface.target}`, click: p.c.surface.trigger });
  const s = { name: `${p.slug}@${mode}`, url: `${p.slug}.html`, steps };
  if (mode === 'plan') s.screen = 'session'; else s.plan = {};
  // Controls render everything; cases render what they declare, against controls rendered the same way.
  if (p.c.themes) s.themes = p.c.themes; else s.themes = ['light', 'dark'];
  if (p.c.widths) s.widths = p.c.widths;
  return s;
}

const rulesOf = (findings) => { const m = {}; for (const f of findings) m[f.rule] = (m[f.rule] || 0) + 1; return m; };
const newRules = (mine, base) => Object.keys(mine).filter((r) => mine[r] > ((base || {})[r] || 0));

async function main() {
  const noVerify = process.argv.includes('--no-verify');
  fs.rmSync(BUILD, { recursive: true, force: true });
  fs.mkdirSync(BUILD, { recursive: true });
  fs.mkdirSync(RESULTS, { recursive: true });
  const base = buildBase();
  const P = pages();
  for (const p of P) fs.writeFileSync(path.join(BUILD, `${p.slug}.html`), apply(base, p.c, p.variant));

  // ---- lint: one file at a time, so findings are per page ----
  const lint = {};
  for (const p of P) lint[p.slug] = rulesOf(lintPaths([path.join(BUILD, `${p.slug}.html`)], d).findings);

  // ---- verify: with the screen plan, and with no plan (what an arbitrary page gets) ----
  const verify = { plan: {}, noplan: {} };
  if (!noVerify) {
    for (const mode of ['plan', 'noplan']) {
      const scen = { model: path.relative(BUILD, MODEL).split(path.sep).join('/'), widths: [1280, 390], scenarios: P.map((p) => scenarioFor(p, mode)) };
      const f = path.join(BUILD, `scenarios-${mode}.json`);
      fs.writeFileSync(f, JSON.stringify(scen, null, 2));
      process.stdout.write(`verify (${mode}): ${scen.scenarios.length} pages…\n`);
      const rep = await audit(f, path.join(BUILD, `report-${mode}`), { quiet: true });
      for (const r of rep.results) {
        const slug = r.scenario.replace(/@.*$/, '');
        (verify[mode][slug] = verify[mode][slug] || {})[`${r.theme}-${r.width}`] = rulesOf(r.findings);
      }
    }
  }

  // ---- score ----
  const bySlug = Object.fromEntries(P.map((p) => [p.slug, p]));
  const verifyNew = (mode, slug) => {
    const ctl = controlFor(bySlug[slug]);
    const mine = verify[mode][slug] || {};
    const set = new Set();
    for (const [k, rules] of Object.entries(mine)) for (const r of newRules(rules, ctl ? (verify[mode][ctl] || {})[k] : {})) set.add(r);
    return [...set];
  };
  const lintNew = (slug) => { const ctl = controlFor(bySlug[slug]); return newRules(lint[slug], ctl ? lint[ctl] : {}); };

  const controls = P.filter((p) => p.kind === 'control').map((p) => ({
    id: p.slug, title: p.c.title,
    lint: p.slug === 'ctl-base' ? Object.keys(lint[p.slug]) : lintNew(p.slug),
    verifyPlan: p.slug === 'ctl-base' ? [...new Set(Object.values(verify.plan[p.slug] || {}).flatMap(Object.keys))] : verifyNew('plan', p.slug),
    verifyNoplan: p.slug === 'ctl-base' ? [...new Set(Object.values(verify.noplan[p.slug] || {}).flatMap(Object.keys))] : verifyNew('noplan', p.slug),
  }));

  const rows = [];
  for (const p of P.filter((x) => x.kind === 'case')) {
    const ln = lintNew(p.slug), vp = verifyNew('plan', p.slug), vn = verifyNew('noplan', p.slug);
    p.c.defects.forEach((df, i) => {
      const hit = (arr) => arr.filter((r) => df.expect.includes(r));
      const status = (arr) => (!df.expect.length ? (arr.length ? 'no-rule, incidental signal' : 'no-rule') : hit(arr).length ? 'caught' : arr.length ? 'other signal' : 'silent');
      rows.push({
        case: p.c.id, variant: p.variant, defect: i, level: p.c.level, principle: df.principle, layer: df.layer, what: df.what, expect: df.expect,
        surface: p.c.surface ? p.c.surface.target : 'page',
        lint: { fired: ln, caught: hit(ln) }, verifyPlan: { fired: vp, caught: hit(vp) }, verifyNoplan: { fired: vn, caught: hit(vn) },
        status: status([...new Set([...ln, ...vp])]), statusNoPlan: status([...new Set([...ln, ...vn])]),
      });
    });
  }

  const out = { generatedAt: new Date().toISOString(), verified: !noVerify, model: 'demo/model.json', controls, rows };
  fs.writeFileSync(path.join(RESULTS, 'planted.json'), JSON.stringify(out, null, 2) + '\n');
  fs.writeFileSync(path.join(RESULTS, 'planted.md'), summarize(out));
  process.stdout.write(summarize(out).split('\n').slice(0, 40).join('\n') + '\n…\nWrote benchmark/results/planted.{json,md}\n');
}

function summarize(o) {
  const L = ['# Planted-defect results', '', `Generated ${o.generatedAt.slice(0, 10)} against \`${o.model}\`. ${o.verified ? 'lint + verify.' : 'lint only (verify skipped).'}`, ''];
  L.push('Status per defect: **caught** = an expected rule fired; **other signal** = some new finding, not one meant for this; **silent** = nothing new; **no-rule** = no rule exists for it (ground truth says so).', '');
  const tab = (title, keyFn, rows, statusKey = 'status') => {
    const groups = {};
    for (const r of rows) { const k = keyFn(r); (groups[k] = groups[k] || []).push(r); }
    L.push(`## ${title}`, '', '| | defects | caught | other signal | silent | no rule |', '|---|---|---|---|---|---|');
    for (const [k, g] of Object.entries(groups).sort()) {
      const n = (s) => g.filter((r) => r[statusKey].startsWith(s)).length;
      L.push(`| ${k} | ${g.length} | ${n('caught')} | ${n('other')} | ${n('silent')} | ${n('no-rule')} |`);
    }
    L.push('');
  };
  const page = o.rows.filter((r) => r.variant !== 'open');
  tab('By principle (with plan; surface cases counted as opened by a click)', (r) => r.principle, page);
  tab('By detection layer the defect needs', (r) => r.layer, page);
  tab('By level (1 obvious, 2 subtle, 3 compound, 4 rare surface)', (r) => `L${r.level}`, page);
  tab('Rare surfaces: opened by a click vs already open at load', (r) => `${r.surface} · ${r.variant}`, o.rows.filter((r) => r.surface !== 'page'));
  tab('Without a screen plan (what an arbitrary page gets)', (r) => r.principle, page, 'statusNoPlan');
  L.push('## False alarms on clean controls', '', '| control | lint | verify (plan) | verify (no plan) |', '|---|---|---|---|');
  for (const c of o.controls) L.push(`| ${c.title} | ${c.lint.join(', ') || '0'} | ${c.verifyPlan.join(', ') || '0'} | ${c.verifyNoplan.join(', ') || '0'} |`);
  L.push('', '## Every defect', '', '| case | variant | principle | layer | defect | expected | lint | verify | status |', '|---|---|---|---|---|---|---|---|---|');
  for (const r of o.rows) L.push(`| ${r.case} | ${r.variant} | ${r.principle} | ${r.layer} | ${r.what} | ${r.expect.join(', ') || '(none)'} | ${r.lint.fired.join(', ') || '·'} | ${r.verifyPlan.fired.join(', ') || '·'} | ${r.status} |`);
  return L.join('\n') + '\n';
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(2); });

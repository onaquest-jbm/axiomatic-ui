#!/usr/bin/env node
'use strict';
// Generated-site benchmark: pages built by other models from ordinary product briefs (they
// were not told what the pages were for). Ground truth is benchmark/sites/<site>/truth.json,
// written from an independent review BEFORE these checks ran; each defect names the surface
// it lives on (the page, or the selector that opens a menu/dialog) and the rules that would
// count as catching it.
//
// Each site renders as: the page at load, and once per surface with that surface opened at
// load (a script clicks its opener). Findings on a surface are diffed against the page.
// There is no model.json for these products, so verify runs against demo/model.json with no
// screen plan: only floor and meaning checks are fair; derivation findings are counted apart.
//
//   node benchmark/run-sites.js

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { derive } = require(path.join(ROOT, 'src/derive'));
const { lintPaths } = require(path.join(ROOT, 'src/lint'));
const { audit } = require(path.join(ROOT, 'src/audit'));

const SITES = path.join(__dirname, 'sites');
const BUILD = path.join(__dirname, 'build', 'sites');
const RESULTS = path.join(__dirname, 'results');
const MODEL = path.join(ROOT, 'demo/model.json');
const d = derive(JSON.parse(fs.readFileSync(MODEL, 'utf8')));
const FAIR = new Set(['floor', 'meaning']);

const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
const rulesOf = (fs_) => { const m = {}; for (const f of fs_) m[f.rule] = (m[f.rule] || 0) + 1; return m; };

const OPEN_AT_LOAD = process.argv.includes('--open-at-load');
// --infer-plan: give verify a plan drafted from each page (src/infer.js) instead of none;
// results go to sites-infer.{json,md} so both can be compared.
const INFER = process.argv.includes('--infer-plan');
const OUT = INFER ? 'sites-infer' : 'sites';

async function main() {
  fs.rmSync(BUILD, { recursive: true, force: true });
  fs.mkdirSync(BUILD, { recursive: true });
  const sites = fs.readdirSync(SITES).filter((s) => fs.existsSync(path.join(SITES, s, 'truth.json')));
  const pages = [];
  for (const s of sites) {
    const html = fs.readFileSync(path.join(SITES, s, 'index.html'), 'utf8');
    const truth = JSON.parse(fs.readFileSync(path.join(SITES, s, 'truth.json'), 'utf8'));
    fs.mkdirSync(path.join(BUILD, s), { recursive: true });
    fs.writeFileSync(path.join(BUILD, s, 'page.html'), html);
    pages.push({ site: s, surface: 'page', file: `${s}/page.html` });
    for (const sf of truth.surfaces || []) {
      // By default a surface is opened the way a person opens it: verify clicks its opener and
      // probes what appears. --open-at-load restores the old way (a script opens it before the
      // probe), and non-click openers (a right-click) still use it.
      if (!OPEN_AT_LOAD && (sf.event || 'click') === 'click') {
        pages.push({ site: s, surface: sf.name, file: `${s}/page.html`, opener: sf.opener, steps: [{ name: sf.name, click: sf.opener }] });
        continue;
      }
      const opener = `<script>addEventListener('load', () => setTimeout(() => { const el = document.querySelector(${JSON.stringify(sf.opener)}); if (el) { el.dispatchEvent(new MouseEvent(${JSON.stringify(sf.event || 'click')}, { bubbles: true, cancelable: true, clientX: 200, clientY: 200 })); } else { document.title = 'OPENER MISSING'; } }, 50));</script>`;
      const f = `${s}/${slug(sf.name)}.html`;
      fs.writeFileSync(path.join(BUILD, f), html.includes('</body>') ? html.replace(/<\/body>(?![\s\S]*<\/body>)/, opener + '</body>') : html + opener);
      pages.push({ site: s, surface: sf.name, file: f, opener: sf.opener });
    }
  }

  const scen = { model: path.relative(BUILD, MODEL).split(path.sep).join('/'), widths: [1280, 390], themes: ['light', 'dark'],
    scenarios: pages.map((p) => ({ name: `${p.site}|${p.surface}`, url: p.file, plan: INFER ? 'infer' : {}, settleMs: 700, steps: p.steps })) };
  const sf = path.join(BUILD, 'scenarios.json');
  fs.writeFileSync(sf, JSON.stringify(scen, null, 2));
  process.stdout.write(`verify: ${pages.length} pages (${sites.length} sites)…\n`);
  const rep = await audit(sf, path.join(BUILD, 'report'), { quiet: true });

  // rules per (site, surface), fair tiers only, union over widths/themes; surfaces diffed against the page
  const V = {};
  const tierCount = {};
  for (const r of rep.results) {
    const [site, surface] = r.scenario.split('|');
    const key = `${r.theme}-${r.width}`;
    ((V[site] = V[site] || {})[surface] = V[site][surface] || {})[key] = rulesOf(r.findings.filter((f) => FAIR.has(f.tier)));
    const t = (tierCount[site] = tierCount[site] || { floor: 0, meaning: 0, derivation: 0 });
    if (surface === 'page') for (const f of r.findings) t[f.tier] = (t[f.tier] || 0) + 1;
  }
  const fired = (site, surface) => {
    const set = new Set();
    for (const [k, rules] of Object.entries((V[site] || {})[surface] || {})) {
      const base = surface === 'page' ? {} : ((V[site] || {}).page || {})[k] || {};
      for (const r of Object.keys(rules)) if (rules[r] > (base[r] || 0) || surface === 'page') set.add(r);
    }
    return [...set];
  };

  const rows = [];
  const siteSummaries = [];
  for (const s of sites) {
    const truth = JSON.parse(fs.readFileSync(path.join(SITES, s, 'truth.json'), 'utf8'));
    const lint = lintPaths([path.join(SITES, s, 'index.html')], d);
    const lintFair = [...new Set(lint.findings.filter((f) => FAIR.has(f.tier)).map((f) => f.rule))];
    siteSummaries.push({ site: s, builder: truth.builder, lint: lint.counts, verifyPage: tierCount[s] || {}, lintFairRules: lintFair });
    for (const df of truth.defects) {
      const surf = df.surface || 'page';
      const v = fired(s, surf);
      const both = [...new Set([...v, ...lintFair])];
      const hit = both.filter((r) => (df.expect || []).includes(r));
      rows.push({ site: s, surface: surf, principle: df.principle, layer: df.layer, what: df.what, expect: df.expect || [],
        verifyFired: v, caught: hit,
        status: !(df.expect || []).length ? 'no-rule' : hit.length ? 'caught' : 'silent' });
    }
  }
  const out = { generatedAt: new Date().toISOString(), sites: siteSummaries, rows };
  fs.writeFileSync(path.join(RESULTS, `${OUT}.json`), JSON.stringify(out, null, 2) + '\n');
  fs.writeFileSync(path.join(RESULTS, `${OUT}.md`), summarize(out));
  process.stdout.write(summarize(out).split('\n').slice(0, 45).join('\n') + '\n…\nWrote benchmark/results/sites.{json,md}\n');
}

function summarize(o) {
  const L = ['# Generated-site results', '', `Generated ${o.generatedAt.slice(0, 10)}. lint + verify (no screen plan; demo model; floor and meaning tiers only).`, ''];
  L.push('## Per site', '', '| site | built by | defects | caught | silent | no rule | lint floor/meaning/derivation | verify page floor/meaning/derivation |', '|---|---|---|---|---|---|---|---|');
  for (const s of o.sites) {
    const g = o.rows.filter((r) => r.site === s.site), n = (x) => g.filter((r) => r.status === x).length;
    L.push(`| ${s.site} | ${s.builder} | ${g.length} | ${n('caught')} | ${n('silent')} | ${n('no-rule')} | ${s.lint.floor}/${s.lint.meaning}/${s.lint.derivation} | ${s.verifyPage.floor || 0}/${s.verifyPage.meaning || 0}/${s.verifyPage.derivation || 0} |`);
  }
  const tab = (title, key) => {
    const G = {};
    for (const r of o.rows) (G[r[key]] = G[r[key]] || []).push(r);
    L.push('', `## By ${title}`, '', '| | defects | caught | silent | no rule |', '|---|---|---|---|---|');
    for (const [k, g] of Object.entries(G).sort()) { const n = (x) => g.filter((r) => r.status === x).length; L.push(`| ${k} | ${g.length} | ${n('caught')} | ${n('silent')} | ${n('no-rule')} |`); }
  };
  tab('principle', 'principle');
  tab('layer', 'layer');
  const surf = o.rows.map((r) => Object.assign({}, r, { where: r.surface === 'page' ? 'page' : 'menu/dialog/etc.' }));
  const G = { page: surf.filter((r) => r.where === 'page'), surfaces: surf.filter((r) => r.where !== 'page') };
  L.push('', '## Page vs rare surfaces', '', '| | defects | caught | silent | no rule |', '|---|---|---|---|---|');
  for (const [k, g] of Object.entries(G)) { const n = (x) => g.filter((r) => r.status === x).length; L.push(`| ${k} | ${g.length} | ${n('caught')} | ${n('silent')} | ${n('no-rule')} |`); }
  L.push('', '## Every defect', '', '| site | surface | principle | layer | defect | expected | caught by |', '|---|---|---|---|---|---|---|');
  for (const r of o.rows) L.push(`| ${r.site} | ${r.surface} | ${r.principle} | ${r.layer} | ${r.what.replace(/\|/g, '/')} | ${r.expect.join(', ') || '(none)'} | ${r.caught.join(', ') || (r.status === 'no-rule' ? 'no rule' : '—')} |`);
  return L.join('\n') + '\n';
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(2); });

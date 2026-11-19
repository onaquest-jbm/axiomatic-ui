#!/usr/bin/env node
'use strict';
// Prompt sweep: the same product (a web app for supervising AI coding agents) built many ways,
// to see which ways of asking produce worse interfaces. Each folder in benchmark/sweep/ is one
// cell of the grid, named <builder>-<brief>-<process>:
//   builder  s = Claude Sonnet 5.5, c = gpt-6.2-sol (Codex CLI)
//   brief    terse (one line) / det (a detailed spec) / stun ("modern, stunning, premium")
//   process  one (everything asked for at once) / iter (a base, then six "now add X" requests,
//            each in a fresh session that saw only the file; rounds/r0..r6.html keep each step)
// The builders were asked for an ordinary app and not told it would be measured.
//
// There is no ground truth here: this measures what lint and verify (with --explore, so every
// menu, dialog and view a click opens is checked) report, floor and meaning tiers only, since
// these products have no model.json. Blind reviews of a few cells are the independent check.
//
//   node benchmark/run-sweep.js            finals at 1280/390, light and dark
//   node benchmark/run-sweep.js --rounds   also every round of the iter cells (1280 light)

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { derive } = require(path.join(ROOT, 'src/derive'));
const { lintPaths } = require(path.join(ROOT, 'src/lint'));
const { audit } = require(path.join(ROOT, 'src/audit'));

const SWEEP = path.join(__dirname, 'sweep');
const BUILD = path.join(__dirname, 'build', 'sweep');
const RESULTS = path.join(__dirname, 'results');
const MODEL = path.join(ROOT, 'demo/model.json');
const d = derive(JSON.parse(fs.readFileSync(MODEL, 'utf8')));
const FAIR = new Set(['floor', 'meaning']);
const ROUNDS = process.argv.includes('--rounds');

const cellInfo = (c) => { const [b, brief, proc] = c.split('-'); return { builder: b === 's' ? 'Sonnet 5.5' : 'gpt-6.2-sol', brief, process: proc }; };

async function main() {
  fs.rmSync(BUILD, { recursive: true, force: true });
  fs.mkdirSync(BUILD, { recursive: true });
  const cells = fs.readdirSync(SWEEP).filter((c) => fs.existsSync(path.join(SWEEP, c, 'index.html'))).sort();
  const pages = [];
  for (const c of cells) {
    pages.push({ cell: c, round: 'final', file: path.join(SWEEP, c, 'index.html') });
    const rd = path.join(SWEEP, c, 'rounds');
    if (ROUNDS && fs.existsSync(rd)) for (const f of fs.readdirSync(rd).filter((x) => /^r\d+\.html$/.test(x)).sort()) pages.push({ cell: c, round: f.replace('.html', ''), file: path.join(rd, f) });
  }

  const rel = (f) => path.relative(BUILD, f).split(path.sep).join('/');
  const scen = { model: rel(MODEL), explore: 15, scenarios: pages.map((p) => ({
    name: `${p.cell}|${p.round}`, url: rel(p.file), plan: {}, settleMs: 700,
    widths: p.round === 'final' ? [1280, 390] : [1280], themes: p.round === 'final' ? ['light', 'dark'] : ['light'] })) };
  const sf = path.join(BUILD, 'scenarios.json');
  fs.writeFileSync(sf, JSON.stringify(scen, null, 2));
  process.stdout.write(`verify --explore: ${pages.length} pages (${cells.length} cells)…\n`);
  const rep = await audit(sf, path.join(BUILD, 'report'), { quiet: true, surfaceShots: false });

  const out = { generatedAt: new Date().toISOString(), model: 'demo/model.json', cells: {} };
  for (const p of pages) {
    const rs = rep.results.filter((r) => r.scenario === `${p.cell}|${p.round}`);
    const fair = rs.flatMap((r) => r.findings.filter((f) => FAIR.has(f.tier)).map((f) => Object.assign({ view: `${r.theme}-${r.width}` }, f)));
    // Distinct problems: the same rule on the same element counts once across widths and themes.
    const distinct = new Map();
    for (const f of fair) { const k = `${f.rule}|${f.selector || f.message}`; if (!distinct.has(k)) distinct.set(k, f); }
    const rules = {};
    for (const f of distinct.values()) rules[f.rule] = (rules[f.rule] || 0) + 1;
    const lint = lintPaths([p.file], d);
    const html = fs.readFileSync(p.file, 'utf8');
    const entry = {
      bytes: html.length, lines: html.split('\n').length,
      distinct: distinct.size, onSurfaces: [...distinct.values()].filter((f) => f.surface).length,
      surfaces: Math.max(0, ...rs.map((r) => (r.surfaces || []).filter((s) => s.newElements).length)),
      openers: Math.max(0, ...rs.map((r) => (r.coverage || {}).openers || 0)),
      rules, lint: lint.counts, lintRules: [...new Set(lint.findings.map((f) => f.rule))],
    };
    const cell = (out.cells[p.cell] = out.cells[p.cell] || Object.assign(cellInfo(p.cell), { rounds: {} }));
    if (p.round === 'final') Object.assign(cell, entry); else cell.rounds[p.round] = entry;
  }
  fs.mkdirSync(RESULTS, { recursive: true });
  fs.writeFileSync(path.join(RESULTS, 'sweep.json'), JSON.stringify(out, null, 2) + '\n');
  fs.writeFileSync(path.join(RESULTS, 'sweep.md'), summarize(out));
  process.stdout.write(summarize(out) + '\nWrote benchmark/results/sweep.{json,md}\n');
}

function summarize(o) {
  const L = ['# Prompt sweep', '', `Generated ${o.generatedAt}. "problems" are floor and meaning findings from verify --explore, distinct by rule and element; "surfaces" is surfaces found / openers seen. Per 10 kB normalises for size.`, '',
    '| cell | builder | brief | process | kB | surfaces | problems | on surfaces | per 10 kB | lint (floor/meaning) | top rules |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  const cells = Object.entries(o.cells).sort((a, b) => b[1].distinct - a[1].distinct);
  for (const [c, x] of cells) {
    const top = Object.entries(x.rules).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([r, n]) => `${r} ${n}`).join(', ');
    L.push(`| ${c} | ${x.builder} | ${x.brief} | ${x.process} | ${Math.round(x.bytes / 1000)} | ${x.surfaces}/${x.openers} | ${x.distinct} | ${x.onSurfaces} | ${(x.distinct / (x.bytes / 10000)).toFixed(1)} | ${x.lint.floor || 0}/${x.lint.meaning || 0} | ${top} |`);
  }
  const group = (key) => {
    const g = {};
    for (const [, x] of cells) { const k = x[key]; (g[k] = g[k] || []).push(x.distinct); }
    return Object.entries(g).map(([k, v]) => `${k} ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)} (n=${v.length})`).join(' · ');
  };
  L.push('', '## Mean problems by factor', '', `- builder: ${group('builder')}`, `- brief: ${group('brief')}`, `- process: ${group('process')}`);
  const withRounds = cells.filter(([, x]) => Object.keys(x.rounds).length);
  if (withRounds.length) {
    L.push('', '## Iterative cells, round by round (1280 light)', '', '| cell | ' + [0, 1, 2, 3, 4, 5, 6].map((i) => `r${i}`).join(' | ') + ' |', '|---|' + '---|'.repeat(7));
    for (const [c, x] of withRounds) L.push(`| ${c} | ` + [0, 1, 2, 3, 4, 5, 6].map((i) => { const r = x.rounds[`r${i}`]; return r ? `${r.distinct} (${Math.round(r.bytes / 1000)} kB)` : '—'; }).join(' | ') + ' |');
  }
  return L.join('\n') + '\n';
}

main().catch((e) => { console.error(e); process.exit(1); });

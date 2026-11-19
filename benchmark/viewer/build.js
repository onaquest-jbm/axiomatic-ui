#!/usr/bin/env node
'use strict';
// Scan benchmark/runs/*/run.json and write benchmark/viewer/data.js (window.BENCH = {...}).
// Also adds "original": the generated sites as they were built, with the problems the blind
// review found and no tool results, so any run (or a later fixed version of a page) can be
// compared against the unmodified sites.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BENCH = path.join(__dirname, '..');
const RUNS = path.join(BENCH, 'runs');
const SITES = path.join(BENCH, 'sites');
const readJSON = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
const hash = (f) => crypto.createHash('sha1').update(fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')).digest('hex');

const runs = [];
if (fs.existsSync(RUNS)) for (const d of fs.readdirSync(RUNS)) {
  const dir = path.join(RUNS, d), meta = readJSON(path.join(dir, 'run.json'));
  if (!meta) continue;
  const truth = {}, shots = {};
  const td = path.join(dir, 'truth');
  if (fs.existsSync(td)) for (const f of fs.readdirSync(td)) if (f.endsWith('.json')) truth[f.slice(0, -5)] = readJSON(path.join(td, f));
  const sd = path.join(dir, 'shots');
  if (fs.existsSync(sd)) for (const s of fs.readdirSync(sd)) shots[s] = fs.readdirSync(path.join(sd, s)).filter((f) => f.endsWith('.png'));
  runs.push(Object.assign({}, meta, { slug: d, planted: readJSON(path.join(dir, 'planted.json')), sites: readJSON(path.join(dir, 'sites.json')), truth, shots }));
}
runs.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

// The unmodified sites: truth from sites/, screenshots from the earliest run that has the same page.
const original = { slug: 'original', label: 'Unmodified sites', original: true, note: 'The sites as the models built them, with the problems the blind review found. No tool results.', siteVersions: {}, truth: {}, shots: {}, shotsFrom: {} };
if (fs.existsSync(SITES)) for (const s of fs.readdirSync(SITES)) {
  const idx = path.join(SITES, s, 'index.html'), t = readJSON(path.join(SITES, s, 'truth.json'));
  if (!fs.existsSync(idx) || !t) continue;
  original.siteVersions[s] = hash(idx);
  original.truth[s] = t;
  const from = runs.find((r) => r.siteVersions && r.siteVersions[s] === original.siteVersions[s] && r.shots[s]);
  if (from) { original.shots[s] = from.shots[s]; original.shotsFrom[s] = from.slug; }
}

fs.writeFileSync(path.join(__dirname, 'data.js'), 'window.BENCH = ' + JSON.stringify({ builtAt: new Date().toISOString(), original, runs }) + ';\n');
console.log(`Wrote benchmark/viewer/data.js (${runs.length} run${runs.length === 1 ? '' : 's'} + unmodified sites)`);

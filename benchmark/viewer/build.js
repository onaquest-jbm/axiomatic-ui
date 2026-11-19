#!/usr/bin/env node
'use strict';
// Scan benchmark/runs/*/run.json and write benchmark/viewer/data.js (window.BENCH = {...}).
const fs = require('fs'), path = require('path');
const RUNS = path.join(__dirname, '..', 'runs');
const readJSON = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
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
fs.writeFileSync(path.join(__dirname, 'data.js'), 'window.BENCH = ' + JSON.stringify({ builtAt: new Date().toISOString(), runs }) + ';\n');
console.log(`Wrote benchmark/viewer/data.js (${runs.length} run${runs.length === 1 ? '' : 's'})`);

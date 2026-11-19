#!/usr/bin/env node
'use strict';
// Freeze the current benchmark state as a run: node benchmark/viewer/snapshot.js --label "name" [--note "text"]
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const BENCH = path.join(__dirname, '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) { const v = process.argv[i + 1]; if (v === undefined || v.startsWith('--')) args[a.slice(2)] = true; else { args[a.slice(2)] = v; i++; } }
}
if (!args.label || args.label === true) { console.error('usage: node benchmark/viewer/snapshot.js --label "<name>" [--note "<text>"]'); process.exit(1); }
const slug = String(args.label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'run';
const out = path.join(BENCH, 'runs', slug);
if (fs.existsSync(out)) { console.error(`run "${slug}" already exists; pick another label or delete benchmark/runs/${slug}`); process.exit(1); }
fs.mkdirSync(out, { recursive: true });

// results/*.json
const resDir = path.join(BENCH, 'results');
const copied = [];
if (fs.existsSync(resDir)) for (const f of fs.readdirSync(resDir)) if (f.endsWith('.json')) { fs.copyFileSync(path.join(resDir, f), path.join(out, f)); copied.push(f); }

// sites: truth.json, page hash, screenshots and rectangles (1280-light and 390-light only)
const sitesDir = path.join(BENCH, 'sites'), shotsDir = path.join(BENCH, 'build', 'shots');
const siteVersions = {}; let nShots = 0, bytes = 0;
fs.mkdirSync(path.join(out, 'truth'), { recursive: true });
if (fs.existsSync(sitesDir)) for (const s of fs.readdirSync(sitesDir)) {
  const dir = path.join(sitesDir, s);
  if (!fs.statSync(dir).isDirectory()) continue;
  const idx = path.join(dir, 'index.html');
  // Line endings normalised, so a git CRLF/LF checkout does not look like a changed page.
  if (fs.existsSync(idx)) siteVersions[s] = crypto.createHash('sha1').update(fs.readFileSync(idx, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
  const t = path.join(dir, 'truth.json');
  if (fs.existsSync(t)) fs.copyFileSync(t, path.join(out, 'truth', s + '.json'));
  const sd = path.join(shotsDir, s);
  if (fs.existsSync(sd)) for (const f of fs.readdirSync(sd)) {
    if (!/-(1280|390)-light\.(png|rects\.json)$/.test(f)) continue;
    fs.mkdirSync(path.join(out, 'shots', s), { recursive: true });
    fs.copyFileSync(path.join(sd, f), path.join(out, 'shots', s, f));
    if (f.endsWith('.png')) nShots++;
    bytes += fs.statSync(path.join(sd, f)).size;
  }
}
let gitCommit = null;
try { gitCommit = cp.execSync('git rev-parse --short HEAD', { cwd: BENCH, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) {}
const run = { label: String(args.label), slug, note: args.note && args.note !== true ? String(args.note) : '', createdAt: new Date().toISOString(), gitCommit, siteVersions };
fs.writeFileSync(path.join(out, 'run.json'), JSON.stringify(run, null, 2) + '\n');
console.log(`Run "${run.label}" -> benchmark/runs/${slug}/ (${copied.join(', ') || 'no results'}; ${Object.keys(siteVersions).length} sites; ${nShots} screenshots, ${(bytes / 1048576).toFixed(1)} MB)`);
console.log('Now run: node benchmark/viewer/build.js');

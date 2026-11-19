#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { derive } = require('../src/derive');
const { checkModel, starter } = require('../src/model');
const { writeAll } = require('../src/tokens');
const { lintPaths, RULES } = require('../src/lint');
const { PRINCIPLES, BY_ID } = require('../src/principles');

const HELP = `axiomatic: interfaces derived from people, tasks and perception instead of sampled from habit

  axiomatic init [model.json]                 Starter model. Its TODOs are facts to get from the owner.
  axiomatic check <model.json>                Is the model complete enough to derive from?
  axiomatic system <model.json> [--out dir]   Derive every value: tokens.css, base.css, design.ts, Derived.kt,
                                           derivation.json and derivation.md (each value with its reason).
  axiomatic why <model.json> <key>            Explain one decision, e.g. "space", "type.sizes", "color.accent".
  axiomatic lint <paths...> --model <model.json>   Static check: only derived, meaning-named values in source.
  axiomatic verify <scenarios.json> [--out dir]    Render, measure and check the screen against the derivation.
      [--explore [--explore-max N]]  also click each likely opener (menus, dialogs, tabs) and check what appears
      [--attach <port|url>]          check an app already running with --remote-debugging-port (e.g. Electron)
  axiomatic principles                        The premises everything is derived from, with sources.
`;
const arg = (n, d) => { const i = process.argv.indexOf(n); return i !== -1 ? process.argv[i + 1] : d; };
const pos = () => { const a = process.argv.slice(3), o = []; for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { if (!['--headed', '--explore'].includes(a[i])) i++; continue; } o.push(a[i]); } return o; };
const load = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

async function main() {
  const cmd = process.argv[2];
  if (!cmd || cmd === 'help' || cmd === '--help') { process.stdout.write(HELP); return 0; }
  if (cmd === 'init') {
    const f = pos()[0] || 'model.json';
    if (fs.existsSync(f)) { console.error(`${f} exists.`); return 1; }
    fs.writeFileSync(f, JSON.stringify(starter(), null, 2) + '\n');
    console.log(`Wrote ${f}. The axiomatic-model skill walks through filling it in with the owner.`);
    return 0;
  }
  if (cmd === 'check') {
    const P = checkModel(load(pos()[0]));
    for (const p of P) console.log(`${p.level === 'error' ? 'ERROR' : 'warn '}  ${p.message}`);
    if (!P.length) console.log('Model is complete.');
    return P.some((p) => p.level === 'error') ? 1 : 0;
  }
  if (cmd === 'system') {
    const f = pos()[0];
    const m = load(f);
    const errors = checkModel(m).filter((p) => p.level === 'error');
    for (const e of errors) console.error(`ERROR  ${e.message}`);
    if (errors.length) return 1;
    const out = arg('--out', path.join(path.dirname(f), 'design'));
    for (const w of writeAll(derive(m), out, { kotlinPackage: arg('--kotlin-package') })) console.log(`wrote ${w}`);
    return 0;
  }
  if (cmd === 'why') {
    const [f, key] = pos();
    const d = derive(load(f));
    const hits = d.trace.filter((t) => !key || t.key === key || t.key.startsWith(key + '.'));
    if (!hits.length) { console.log(`No decision "${key}". Keys: ${d.trace.map((t) => t.key).join(', ')}`); return 1; }
    for (const t of hits) {
      console.log(`\n${t.key} = ${typeof t.value === 'object' ? JSON.stringify(t.value) : t.value}`);
      console.log(`  ${t.because}`);
      console.log(`  from: ${t.principles.map((p) => BY_ID[p].name).join('; ')}`);
      if (Object.keys(t.inputs).length) console.log(`  inputs: ${JSON.stringify(t.inputs)}`);
    }
    return 0;
  }
  if (cmd === 'lint') {
    const targets = pos();
    const d = derive(load(arg('--model', 'model.json')));
    const r = lintPaths(targets.length ? targets : ['.'], d);
    const order = { floor: 0, meaning: 1, derivation: 2, finish: 3 };
    for (const f of r.findings.sort((a, b) => order[a.tier] - order[b.tier])) console.log(`${f.tier.padEnd(10)} ${f.rule.padEnd(20)} ${path.relative(process.cwd(), f.file)}:${f.line}  ${f.message}`);
    console.log(`\n${r.files} files · floor ${r.counts.floor} · meaning ${r.counts.meaning} · derivation ${r.counts.derivation} · suppressed with reason ${r.suppressed}`);
    return r.counts.floor + r.counts.meaning + r.counts.derivation > 0 ? 1 : 0;
  }
  if (cmd === 'verify') {
    const { audit } = require('../src/audit');
    const { writeReport } = require('../src/report');
    const f = pos()[0];
    const out = arg('--out', path.join(path.dirname(f), 'axiomatic-report'));
    const rep = await audit(f, out, { headed: process.argv.includes('--headed'), explore: process.argv.includes('--explore') ? (Number(arg('--explore-max')) || true) : undefined, attach: arg('--attach') });
    console.log(`\nReport: ${writeReport(out)}`);
    return rep.results.some((r) => r.counts.floor || r.counts.meaning) ? 1 : 0;
  }
  if (cmd === 'principles') {
    for (const p of PRINCIPLES) console.log(`\n${p.name}  [${p.id}]\n  ${p.statement}\n  Uses: ${p.numbers}\n  Decides: ${p.decides}\n  Source: ${p.source}`);
    console.log(`\n${RULES.length} static rules map onto these; run "axiomatic lint" to see them in use.`);
    return 0;
  }
  process.stderr.write(HELP);
  return 1;
}
main().then((c) => process.exit(c), (e) => { console.error(e.stack || e.message); process.exit(2); });

'use strict';
// Builds docs/overview.html: the live derivation explorer, the verified demo and the premises,
// with the engine inlined and the page's own tokens derived by Derive.
const fs = require('fs');
const path = require('path');
const { derive } = require('../src/derive');
const { toCss } = require('../src/tokens');
const { PRINCIPLES } = require('../src/principles');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// The page's readers: mixed expertise, occasional visits, a few minutes, desktop and phone.
const pageModel = {
  product: { name: 'Derive overview' },
  people: { expertise: 'mixed', frequency: 'occasional', sessionLength: 'minutes' },
  context: { devices: ['desktop', 'phone'], input: ['mouse', 'touch'] },
  themes: ['light', 'dark'],
  information: { textRanks: ['meta', 'body', 'heading', 'title'], states: ['error', 'warning', 'info'] },
  tasks: [],
};
const pageTokens = toCss(derive(pageModel)).replace(/^\/\*.*\*\/\n/, '');

const engine = `(function () {
  var modules = {};
  function def(name, fn) { var m = { exports: {} }; fn(m, m.exports, function (p) { return modules[p.replace('./', '')]; }); modules[name] = m.exports; }
  def('color', function (module, exports, require) {\n${read('src/color.js')}\n});
  def('derive', function (module, exports, require) {\n${read('src/derive.js')}\n});
  window.DeriveEngine = modules.derive;
})();`;

const audit = JSON.parse(read('demo/report/audit.json'));
const images = {};
for (const r of audit.results) images[r.screenshot.file] = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'demo/report', r.screenshot.file)).toString('base64');
const demo = { results: audit.results.map((r) => ({ scenario: r.scenario, theme: r.theme, width: r.width, screenshot: r.screenshot, counts: r.counts, findings: r.findings, metrics: r.metrics, steps: r.steps })), images };

const out = read('docs/overview.template.html')
  .replace('__PAGE_TOKENS__', () => pageTokens)
  .replace('__ENGINE__', () => engine)
  .replace('__DEMO__', () => JSON.stringify(demo))
  .replace('__PRINCIPLES__', () => JSON.stringify(PRINCIPLES));
const file = path.join(__dirname, 'overview.html');
fs.writeFileSync(file, out);
console.log(`wrote ${file} (${Math.round(out.length / 1024)} KB)`);

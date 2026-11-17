'use strict';
// Local HTML report for `derive verify`: each screenshot with findings outlined, the planned
// salience order next to what was measured, and every finding with the principle it breaks.
const fs = require('fs');
const path = require('path');
const { BY_ID } = require('./principles');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function render(rep) {
  const sections = rep.results.map((r) => {
    const marks = r.findings.filter((f) => f.rect && f.rect.w).slice(0, 40).map((f) =>
      `<span class="mark ${f.tier}" title="${esc(f.rule + ': ' + f.message)}" style="left:${f.rect.x / r.width * 100}%;top:${f.rect.y / r.screenshot.height * 100}%;width:${f.rect.w / r.width * 100}%;height:${f.rect.h / r.screenshot.height * 100}%"></span>`).join('');
    const sal = (r.metrics.plannedSalience || []).map((p, i) => `<tr><td>${i + 1}</td><td><code>${esc(p.selector)}</code></td><td>${esc(p.task || '')}</td><td class="num">${p.salience}</td></tr>`).join('');
    const items = r.findings.map((f) => `<li class="${f.tier}"><b>${f.tier}</b> <code>${esc(f.rule)}</code> ${esc(f.message)}<br><span class="faint">${esc(BY_ID[f.principle] ? BY_ID[f.principle].name : '')}</span></li>`).join('');
    return `<section><h2>${esc(r.scenario)} <span class="faint">${r.theme} · ${r.width}px</span></h2>
<div class="cols"><div class="shot"><img src="${esc(r.screenshot.file)}" alt="">${marks}</div>
<div><table><tr><th>#</th><th>Planned to be seen</th><th>Task</th><th class="num">Measured</th></tr>${sal}</table>
<p class="faint">floor ${r.counts.floor} · meaning ${r.counts.meaning} · derivation ${r.counts.derivation}</p><ul>${items || '<li>No findings.</li>'}</ul></div></div></section>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>derive verify</title>
<style>body{font:13px/1.45 system-ui,sans-serif;margin:0;padding:24px 16px;background:#f4f7fb;color:#23272c}h2{font-size:15px}
.cols{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:24px}.shot{position:relative;border:1px solid #dbdfe4}.shot img{display:block;width:100%}
.mark{position:absolute;border:2px solid}.mark.floor{border-color:#b34941}.mark.meaning{border-color:#926100}.mark.derivation{border-color:#026fbf}
table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:4px 8px 4px 0;border-bottom:1px solid #dbdfe4}.num{text-align:right}
ul{list-style:none;padding:0}li{padding:6px 0;border-bottom:1px solid #dbdfe4}.faint{color:#676d73}code{font-size:12px}</style></head>
<body><h1 style="font-size:15px">derive verify · ${esc(rep.product && rep.product.name)}</h1>${sections}</body></html>`;
}

function writeReport(outDir) {
  const rep = JSON.parse(fs.readFileSync(path.join(outDir, 'audit.json'), 'utf8'));
  const f = path.join(outDir, 'index.html');
  fs.writeFileSync(f, render(rep));
  return f;
}

module.exports = { writeReport };

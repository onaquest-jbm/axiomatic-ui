'use strict';
(function () {
  const B = window.BENCH || { runs: [] };
  const runs = B.runs;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const main = $('main');
  const view = { name: 'overview', site: null, width: '1280', pf: { principle: '', layer: '', level: '', changed: false }, plan: 'plan' };

  const norm = (s) => (!s ? 'none' : /^caught/.test(s) ? 'caught' : /^silent/.test(s) ? 'silent' : /^no-rule/.test(s) ? 'norule' : 'other');
  const LABEL = { caught: 'caught', silent: 'silent', norule: 'no rule', other: 'other signal', none: 'n/a' };
  const stHTML = (k, raw) => `<span class="st st-${k}" title="${esc(raw || '')}">${LABEL[k]}</span>`;
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const none = '<span class="muted">(none)</span>';

  const bSel = $('before'), aSel = $('after');
  if (runs.length) {
    const opts = runs.map((r, i) => `<option value="${i}">${esc(r.label)} (${esc((r.createdAt || '').slice(0, 10))})</option>`).join('');
    bSel.innerHTML = opts; aSel.innerHTML = opts;
    aSel.value = String(runs.length - 1);
    bSel.value = String(Math.max(0, runs.length - 2));
  }
  const single = () => runs.length < 2 || bSel.value === aSel.value;
  const getB = () => runs[+bSel.value], getA = () => runs[+aSel.value];

  const plantedKey = (r) => `${r.case}|${r.variant}|${r.defect}`;
  const plantedRows = (run) => (run && run.planted && run.planted.rows) || [];
  const pStatus = (r) => (view.plan === 'plan' ? r.status : r.statusNoPlan);
  const siteRows = (run) => (run && run.sites && run.sites.rows) || [];
  const siteKey = (r) => `${r.site}|${r.surface}|${r.what}`;
  function counts(list) {
    const c = { total: list.length, caught: 0, silent: 0, norule: 0, other: 0 };
    for (const k of list) if (k in c) c[k]++;
    return c;
  }
  const pCounts = (run) => counts(plantedRows(run).map((r) => norm(pStatus(r))));
  const sCounts = (run) => counts(siteRows(run).map((r) => norm(r.status)));

  const when = (run) => esc((run.createdAt || '').slice(0, 16).replace('T', ' '));
  function head(run, tag) {
    return `<div class="row"><strong>${tag}: ${esc(run.label)}</strong><span class="meta">${when(run)}${run.gitCommit ? ' / commit ' + esc(run.gitCommit) : ''}</span></div>` + (run.note ? `<div class="muted">${esc(run.note)}</div>` : '');
  }
  const delta = (d) => (d === 0 ? '<span class="muted">0</span>' : `<span>${d > 0 ? '+' : ''}${d}</span>`);

  function overview() {
    if (!runs.length) return '<div class="note">No runs yet. Run <code>node benchmark/viewer/snapshot.js --label "name"</code> then <code>node benchmark/viewer/build.js</code>.</div>';
    const B_ = getB(), A_ = getA(), one = single();
    let h = '';
    if (one) h += '<div class="note">Only one run is available (or the same run is chosen twice), so it is shown alone. Take another snapshot after a change to compare.</div>' + head(A_, 'Run');
    else h += head(B_, 'Before') + head(A_, 'After');
    const block = (title, cf, has) => {
      const cells = (run) => {
        if (!has(run)) return '<td colspan="4" class="muted">no results in this run</td>';
        const c = cf(run);
        return `<td class="num">${c.total}</td><td class="num st-caught">${c.caught}</td><td class="num st-silent">${c.silent}</td><td class="num st-norule">${c.norule}${c.other ? ` <span class="meta">(+${c.other} other)</span>` : ''}</td>`;
      };
      let t = '';
      if (one) return `<tr><th scope="row">${title}</th><td>${esc(A_.label)}</td>${cells(A_)}</tr>`;
      t += `<tr><th scope="row">${title}</th><td>Before: ${esc(B_.label)}</td>${cells(B_)}</tr>`;
      t += `<tr><td></td><td>After: ${esc(A_.label)}</td>${cells(A_)}</tr>`;
      if (has(A_) && has(B_)) {
        const a = cf(A_), b = cf(B_);
        t += `<tr><td></td><td class="muted">Change</td><td class="num">${delta(a.total - b.total)}</td><td class="num">${delta(a.caught - b.caught)}</td><td class="num">${delta(a.silent - b.silent)}</td><td class="num">${delta(a.norule - b.norule)}</td></tr>`;
      }
      return t;
    };
    h += '<h2>Defects caught, silent, no rule</h2><div class="scroll"><table><thead><tr><th></th><th>Run</th><th class="num">Defects</th><th class="num">Caught</th><th class="num">Silent</th><th class="num">No rule</th></tr></thead><tbody>';
    h += block('Planted set', pCounts, (r) => plantedRows(r).length > 0);
    h += block('Generated sites', sCounts, (r) => siteRows(r).length > 0);
    h += '</tbody></table></div>';
    h += `<p class="meta">Caught: a rule designed for the defect fired. Silent: a rule was designed for it but did not fire. No rule: no rule is designed to catch it. Planted set uses the ${view.plan === 'plan' ? 'with-plan' : 'no-plan'} status (switch on the Planted tab).</p>`;
    if (!siteRows(A_).length && !(!one && siteRows(B_).length)) h += '<div class="note">No generated-site results in this run.</div>';
    if (!one) {
      const ch = changes();
      h += `<h2>Status changes (${ch.length})</h2>`;
      if (!ch.length) h += '<p class="muted">No defect changed status between these runs.</p>';
      else h += '<div class="scroll"><table><thead><tr><th>Set</th><th>Where</th><th>Defect</th><th>Before</th><th>After</th></tr></thead><tbody>' + ch.map((c) => `<tr class="changed"><td>${c.set}</td><td>${esc(c.where)}</td><td>${esc(c.what)}</td><td>${stHTML(c.b, c.braw)}</td><td>${stHTML(c.a, c.araw)}</td></tr>`).join('') + '</tbody></table></div>';
    }
    h += '<h2>Runs</h2><div class="scroll"><table><thead><tr><th>Label</th><th>Created</th><th>Commit</th><th class="num">Sites</th><th>Note</th></tr></thead><tbody>' + runs.map((r) => `<tr><td>${esc(r.label)}</td><td>${when(r)}</td><td>${esc(r.gitCommit || '')}</td><td class="num">${Object.keys(r.siteVersions || {}).length}</td><td>${esc(r.note)}</td></tr>`).join('') + '</tbody></table></div>';
    return h;
  }

  function changes() {
    const B_ = getB(), A_ = getA(), out = [];
    const pb = new Map(plantedRows(B_).map((r) => [plantedKey(r), r]));
    for (const r of plantedRows(A_)) {
      const o = pb.get(plantedKey(r)); if (!o) continue;
      const a = norm(pStatus(r)), b = norm(pStatus(o));
      if (a !== b) out.push({ set: 'planted', where: `${r.case} (${r.variant})`, what: r.what, a, b, araw: pStatus(r), braw: pStatus(o) });
    }
    const sb = new Map(siteRows(B_).map((r) => [siteKey(r), r]));
    for (const r of siteRows(A_)) {
      const o = sb.get(siteKey(r)); if (!o) continue;
      const a = norm(r.status), b = norm(o.status);
      if (a !== b) out.push({ set: 'generated', where: `${r.site} / ${r.surface}`, what: r.what, a, b, araw: r.status, braw: o.status });
    }
    return out;
  }

  function planted() {
    if (!runs.length) return '<div class="note">No runs yet.</div>';
    const A_ = getA(), B_ = getB(), one = single();
    const rowsA = plantedRows(A_), rowsB = one ? [] : plantedRows(B_);
    if (!rowsA.length && !rowsB.length) return '<div class="note">No planted-set results in the chosen run(s).</div>';
    const mapB = new Map(rowsB.map((r) => [plantedKey(r), r]));
    const all = rowsA.length ? rowsA : rowsB;
    const uniq = (f) => [...new Set(all.map(f))].sort();
    const sel = (key, label, vals) => `<label>${label} <select data-pf="${key}"><option value="">all</option>${vals.map((v) => `<option${String(view.pf[key]) === String(v) ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`;
    let h = '<div class="filters">' + sel('principle', 'Principle', uniq((r) => r.principle)) + sel('layer', 'Layer', uniq((r) => r.layer)) + sel('level', 'Level', uniq((r) => r.level))
      + `<label>Status basis <select id="pfplan"><option value="plan"${view.plan === 'plan' ? ' selected' : ''}>with screen plan</option><option value="noplan"${view.plan === 'noplan' ? ' selected' : ''}>without plan</option></select></label>`
      + `<label><input type="checkbox" id="pfchanged"${view.pf.changed ? ' checked' : ''}> only changed</label></div>`;
    const f = view.pf;
    const rows = all.filter((r) => (!f.principle || r.principle === f.principle) && (!f.layer || r.layer === f.layer) && (!f.level || String(r.level) === f.level));
    let body = '', shown = 0;
    for (const r of rows) {
      const o = one ? null : mapB.get(plantedKey(r));
      const cur = norm(pStatus(r)), prev = o ? norm(pStatus(o)) : null;
      const changed = !one && prev !== null && prev !== cur;
      if (f.changed && !changed) continue;
      shown++;
      const status = one ? stHTML(cur, pStatus(r)) : `${o ? stHTML(prev, pStatus(o)) : stHTML('none')}<span class="arrow">&rarr;</span>${stHTML(cur, pStatus(r))}`;
      body += `<tr${changed ? ' class="changed"' : ''}><td><code>${esc(r.case)}</code></td><td>${esc(r.variant)}</td><td class="num">${esc(r.level)}</td><td>${esc(r.principle)}</td><td>${esc(r.layer)}</td><td>${esc(r.surface)}</td><td>${esc(r.what)}</td><td>${status}</td><td>${esc((r.expect || []).join(', ')) || none}</td></tr>`;
    }
    h += `<p class="meta">${shown} of ${rows.length} rows${one ? '' : '. Status column reads before &rarr; after'}. Variant: base = defect on the page, step = after a click step, open = surface already open at load.</p>`;
    h += `<div class="scroll"><table><thead><tr><th>Case</th><th>Variant</th><th class="num">Level</th><th>Principle</th><th>Layer</th><th>Surface</th><th>Defect</th><th>${one ? 'Status' : 'Before &rarr; After'}</th><th>Expected rules</th></tr></thead><tbody>${body}</tbody></table></div>`;
    const ctl = (A_.planted && A_.planted.controls) || [];
    if (ctl.length) {
      const cell = (x) => esc((x || []).join(', ')) || '<span class="muted">none</span>';
      h += '<h2>Clean controls (false positives)</h2><div class="scroll"><table><thead><tr><th>Control</th><th>Lint fired</th><th>Verify (plan)</th><th>Verify (no plan)</th></tr></thead><tbody>' + ctl.map((c) => `<tr><td>${esc(c.title)}</td><td>${cell(c.lint)}</td><td>${cell(c.verifyPlan)}</td><td>${cell(c.verifyNoplan)}</td></tr>`).join('') + '</tbody></table></div><p class="meta">Controls are clean pages, so anything listed is a false positive. Shown for the After run.</p>';
    }
    return h;
  }

  const shotName = (surface) => (surface === 'page' ? 'page' : slug(surface));
  function shotFig(run, site, surface, tag) {
    const file = `${shotName(surface)}-${view.width}-light.png`;
    const has = run.shots && run.shots[site] && run.shots[site].indexOf(file) >= 0;
    const cap = `<figcaption>${tag}: ${esc(run.label)}</figcaption>`;
    if (!has) return `<figure>${cap}<div class="missing">No screenshot in this run</div></figure>`;
    const src = `../runs/${encodeURIComponent(run.slug)}/shots/${encodeURIComponent(site)}/${encodeURIComponent(file)}`;
    return `<figure>${cap}<a href="${src}" target="_blank" rel="noopener"><img loading="lazy" src="${src}" alt="${esc(site)} ${esc(surface)} at ${view.width}px, run ${esc(run.label)}"></a></figure>`;
  }

  function sites() {
    if (!runs.length) return '<div class="note">No runs yet.</div>';
    const A_ = getA(), B_ = getB(), one = single();
    const names = new Set();
    for (const r of one ? [A_] : [B_, A_]) Object.keys(r.truth || {}).forEach((s) => names.add(s));
    const list = [...names].sort();
    if (!list.length) return '<div class="note">No generated-site results in this run.</div>';
    if (!view.site || list.indexOf(view.site) < 0) view.site = list[0];
    const s = view.site;
    let h = '<div class="filters"><label>Site <select id="sitesel">' + list.map((n) => `<option${n === s ? ' selected' : ''}>${esc(n)}</option>`).join('') + '</select></label>'
      + `<span class="row"><button data-w="1280" aria-pressed="${view.width === '1280'}">1280 wide</button><button data-w="390" aria-pressed="${view.width === '390'}">390 wide</button></span></div>`;
    if (!siteRows(A_).length) h += '<div class="note">No generated-site results in the After run; ground truth and screenshots are shown where they exist.</div>';
    const t = (A_.truth || {})[s] || (B_.truth || {})[s];
    if (!t) return h + '<p class="muted">This site has no ground truth in the chosen runs.</p>';
    const vB = B_.siteVersions && B_.siteVersions[s], vA = A_.siteVersions && A_.siteVersions[s];
    h += `<h2>${esc(s)}</h2><div class="row"><span class="tag">built by ${esc(t.builder)}</span>${t.reviewer ? `<span class="tag">reviewed by ${esc(t.reviewer)}</span>` : ''}`;
    if (!one) h += !vB || !vA ? '<span class="tag">page not in both runs</span>' : vA !== vB ? '<span class="tag page-changed">Page itself changed between runs</span>' : '<span class="tag">Page unchanged; only the tools differ</span>';
    h += '</div>';
    h += `<p><span class="muted">Brief:</span> ${esc(t.brief)}</p>`;
    const rowsFor = (run) => new Map(siteRows(run).filter((r) => r.site === s).map((r) => [siteKey(r), r]));
    const mA = rowsFor(A_), mB = one ? new Map() : rowsFor(B_);
    const surfaces = ['page'].concat((t.surfaces || []).map((x) => x.name));
    const known = new Set(surfaces);
    for (const d of t.defects || []) if (!known.has(d.surface)) { known.add(d.surface); surfaces.push(d.surface); }
    for (const sf of surfaces) {
      const ds = (t.defects || []).filter((d) => d.surface === sf);
      h += `<section class="surface"><h3>${esc(sf)}</h3><div class="pair${one ? ' single' : ''}${view.width === '390' ? ' narrow' : ''}">`;
      h += one ? shotFig(A_, s, sf, 'Run') : shotFig(B_, s, sf, 'Before') + shotFig(A_, s, sf, 'After');
      h += '</div>';
      if (!ds.length) h += '<p class="meta">No ground-truth defects planted on this surface.</p>';
      else {
        h += `<div class="scroll"><table><thead><tr><th>Principle</th><th>Layer</th><th>Defect</th><th>${one ? 'Status' : 'Before &rarr; After'}</th><th>Expected rules</th></tr></thead><tbody>`;
        for (const d of ds) {
          const k = `${s}|${d.surface}|${d.what}`, ra = mA.get(k), rb = mB.get(k);
          const a = ra ? norm(ra.status) : 'none', b = rb ? norm(rb.status) : 'none';
          const ch = !one && ra && rb && a !== b;
          const st = one ? stHTML(a, ra && ra.status) : `${stHTML(b, rb && rb.status)}<span class="arrow">&rarr;</span>${stHTML(a, ra && ra.status)}`;
          h += `<tr${ch ? ' class="changed"' : ''}><td>${esc(d.principle)}</td><td>${esc(d.layer)}</td><td>${esc(d.what)}</td><td>${st}</td><td>${esc((d.expect || []).join(', ')) || none}</td></tr>`;
        }
        h += '</tbody></table></div>';
      }
      h += '</section>';
    }
    return h;
  }

  function render() {
    for (const b of document.querySelectorAll('#nav button')) b.setAttribute('aria-pressed', String(b.dataset.view === view.name));
    main.innerHTML = view.name === 'overview' ? overview() : view.name === 'sites' ? sites() : planted();
  }

  $('nav').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { view.name = b.dataset.view; render(); } });
  bSel.addEventListener('change', render); aSel.addEventListener('change', render);
  main.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'sitesel') view.site = t.value;
    else if (t.id === 'pfplan') view.plan = t.value;
    else if (t.id === 'pfchanged') view.pf.changed = t.checked;
    else if (t.dataset && t.dataset.pf) view.pf[t.dataset.pf] = t.value;
    else return;
    render();
  });
  main.addEventListener('click', (e) => { const b = e.target.closest('button[data-w]'); if (b) { view.width = b.dataset.w; render(); } });
  render();
})();

'use strict';
// Benchmark viewer. Data: window.BENCH = { original, runs[] } from build.js.
// "original" is the unmodified generated sites (reviewed problems, no tool results).
(function () {
  const B = window.BENCH || { runs: [] };
  const runs = B.runs || [];
  const ORIG = B.original || null;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const main = $('main');
  const state = { view: 'sites', cards: new Map(), open: new Set(), pf: { principle: '', layer: '', level: '', plan: 'plan', changed: false } };

  // ---------- sources (the unmodified sites, or a run) ----------
  const sources = [];
  if (ORIG && Object.keys(ORIG.truth || {}).length) sources.push(ORIG);
  for (const r of runs.slice().reverse()) sources.push(r);
  const nameOf = (s) => (s.original ? 'Unmodified sites' : s.label);
  const aSel = $('a'), bSel = $('b');
  const opts = sources.map((s, i) => `<option value="${i}">${esc(nameOf(s))}</option>`).join('');
  aSel.innerHTML = opts; bSel.innerHTML = opts;
  // Default: the unmodified sites compared with the latest run.
  aSel.value = '0';
  bSel.value = String(sources.length > 1 ? 1 : 0);
  const A = () => sources[+aSel.value], Bs = () => sources[+bSel.value];
  const same = () => aSel.value === bSel.value;

  // ---------- statuses ----------
  const norm = (s) => (!s ? 'none' : /^caught/.test(s) ? 'caught' : /^silent/.test(s) ? 'silent' : /^no-rule/.test(s) ? 'norule' : 'other');
  const LABEL = { caught: 'Caught', silent: 'Missed', norule: 'No rule', other: 'Other signal', none: '—', found: 'Found by review' };
  const HELP = {
    caught: 'A rule meant for this problem fired.',
    silent: 'A rule exists for this problem but did not fire.',
    norule: 'No rule is designed to catch this problem.',
    other: 'Something fired, but not a rule meant for this problem.',
    none: 'Not in this source.',
    found: 'Listed by the blind review. The unmodified sites have no tool results.',
  };
  const st = (k) => `<span class="st st-${k}" title="${esc(HELP[k])}">${LABEL[k]}</span>`;

  const siteRows = (s) => (s && s.sites && s.sites.rows) || [];
  const siteKey = (site, surface, what) => `${site}|${surface}|${what}`;
  function siteStatus(src, site, d) {
    if (!src) return 'none';
    if (src.original) return (src.truth[site] && src.truth[site].defects.some((x) => x.surface === d.surface && x.what === d.what)) ? 'found' : 'none';
    const r = siteRows(src).find((x) => siteKey(x.site, x.surface, x.what) === siteKey(site, d.surface, d.what));
    return r ? norm(r.status) : 'none';
  }
  const plantedRows = (s) => (s && s.planted && s.planted.rows) || [];
  const pKey = (r) => `${r.case}|${r.variant}|${r.defect}`;
  const pStat = (r) => norm(state.pf.plan === 'plan' ? r.status : r.statusNoPlan);

  function siteList() {
    const names = new Set();
    for (const s of [A(), Bs()]) for (const k of Object.keys((s && s.truth) || {})) names.add(k);
    return [...names].sort();
  }
  const truthOf = (site) => (Bs() && Bs().truth[site]) || (A() && A().truth[site]) || null;
  function defectsOf(site) {
    const seen = new Map();
    for (const s of [A(), Bs()]) for (const d of ((s && s.truth[site]) || {}).defects || []) {
      const k = `${d.surface}|${d.what}`;
      if (!seen.has(k)) seen.set(k, d);
    }
    return [...seen.values()];
  }
  const caughtCount = (src, site, list) => (src && !src.original ? list.filter((d) => siteStatus(src, site, d) === 'caught').length : null);
  const pair = (a, b) => (a === null && b === null ? '—' : a === null ? String(b) : b === null ? String(a) : same() ? String(b) : `${a} → ${b}`);

  // ---------- details that stay open across re-renders ----------
  const det = (key, cls, summary, body) => `<details class="${cls}" data-key="${esc(key)}"${state.open.has(key) ? ' open' : ''}><summary>${summary}</summary><div class="body">${body}</div></details>`;
  main.addEventListener('toggle', (e) => {
    const k = e.target.getAttribute && e.target.getAttribute('data-key');
    if (!k) return;
    if (e.target.open) state.open.add(k); else state.open.delete(k);
  }, true);

  // ---------- overview ----------
  function overview() {
    if (!sources.length) return '<p class="note">No runs yet. Run <code>node benchmark/viewer/snapshot.js --label "name"</code>, then <code>node benchmark/viewer/build.js</code>.</p>';
    const a = A(), b = Bs();
    const sites = siteList();
    const siteTotal = (s) => (s ? sites.reduce((n, x) => n + (((s.truth[x] || {}).defects || []).length), 0) : 0);
    const siteCaught = (s) => (s && !s.original ? sites.reduce((n, x) => n + caughtCount(s, x, defectsOf(x)), 0) : null);
    const pc = (s) => { const r = plantedRows(s).filter((x) => x.variant !== 'open'); return r.length ? r.filter((x) => pStat(x) === 'caught').length : null; };
    const pt = (s) => plantedRows(s).filter((x) => x.variant !== 'open').length || null;
    const cell = (v) => (v === null ? '<td class="num muted">—</td>' : `<td class="num">${v}</td>`);
    const dlt = (x, y) => (x === null || y === null || same() ? '<td class="num muted"></td>' : `<td class="num ${y > x ? 'up' : y < x ? 'down' : 'muted'}">${y - x > 0 ? '+' : ''}${y - x}</td>`);
    const cols = same() ? `<th class="num">${esc(nameOf(a))}</th>` : `<th class="num">${esc(nameOf(a))}</th><th class="num">${esc(nameOf(b))}</th><th class="num">Change</th>`;
    const row = (label, f) => `<tr><th scope="row">${label}</th>${same() ? cell(f(a)) : cell(f(a)) + cell(f(b)) + dlt(f(a), f(b))}</tr>`;
    let h = `<p class="lede">${same() ? `Showing <strong>${esc(nameOf(a))}</strong>.` : `Comparing <strong>${esc(nameOf(a))}</strong> with <strong>${esc(nameOf(b))}</strong>.`}</p>`;
    h += `<table class="summary"><thead><tr><th></th>${cols}</tr></thead><tbody>`;
    h += row('Problems on the generated sites', (s) => (s ? siteTotal(s) : null));
    h += row('… caught by the tools', siteCaught);
    h += row('Planted defects', pt);
    h += row('… caught by the tools', pc);
    h += '</tbody></table>';
    h += det('ov-help', 'aside', 'How to read this', `
      <ul class="plain">
        <li><strong>Unmodified sites</strong> are the pages as the models built them, with the problems a blind reviewer found. They have no tool results, so compare them with a run to see what the tools catch, or with a run where pages were fixed to see before and after.</li>
        <li><strong>Caught</strong>: a rule meant for the problem fired. <strong>Missed</strong>: a rule exists but didn't fire. <strong>No rule</strong>: nothing is designed to catch it.</li>
        <li>Planted counts use the page and click-opened variants (surfaces already open at load are in the Planted tab).</li>
      </ul>`);
    const runRows = runs.slice().reverse().map((r) => `<tr><td>${esc(r.label)}</td><td>${esc((r.createdAt || '').slice(0, 16).replace('T', ' '))}</td><td><code>${esc(r.gitCommit || '')}</code></td><td>${esc(r.note || '')}</td></tr>`).join('');
    h += det('ov-runs', 'aside', `All runs <span class="meta">${runs.length}</span>`, `<table><thead><tr><th>Label</th><th>Created</th><th>Commit</th><th>Note</th></tr></thead><tbody>${runRows}</tbody></table>`);
    return h;
  }

  // ---------- sites ----------
  function shot(src, site, surface, width) {
    const from = src.original ? (src.shotsFrom || {})[site] : src.slug;
    const file = `${slug(surface)}-${width}-light.png`;
    if (!from || !((src.shots || {})[site] || []).includes(file)) return '<div class="noshot">No screenshot</div>';
    return `<img loading="lazy" src="../runs/${esc(from)}/shots/${esc(site)}/${esc(file)}" alt="${esc(site)}, ${esc(surface)}, ${width} px">`;
  }

  const comparedSources = () => same() ? [A()] : [A(), Bs()];
  const surfaceName = (surface) => surface === 'page' ? 'Main page' : surface;
  function cardState(site) {
    if (!state.cards.has(site)) state.cards.set(site, { surface: 'page', width: '1280', expanded: false });
    return state.cards.get(site);
  }

  function problems(regionId, site, defs, expanded) {
    if (!defs.length) return '<p class="no-problems muted">No problems listed for this surface.</p>';
    const sides = comparedSources().filter((src) => src.sites && !src.original);
    const rows = (list) => list.map((d) => {
      const meta = [d.principle, d.layer, d.expect?.length ? `rules: ${d.expect.join(', ')}` : '', d.note].filter(Boolean).join(' · ');
      const statuses = sides.map((src) => `<div><span class="meta">${esc(nameOf(src))}</span>${st(siteStatus(src, site, d))}</div>`).join('');
      return `<li class="problem">
        <div>${esc(d.what)}<div class="meta">${esc(meta)}</div></div>
        ${statuses ? `<div class="problem-statuses">${statuses}</div>` : ''}
      </li>`;
    }).join('');
    const extra = defs.slice(4);
    let h = `<ul class="problem-list">${rows(defs.slice(0, 4))}</ul>`;
    if (extra.length) {
      const label = `Show ${extra.length} more`;
      h += `<button type="button" class="show-more" data-more="${label}" aria-controls="${regionId}" aria-expanded="${expanded}">${expanded ? 'Show fewer' : label}</button>
        <div id="${regionId}" class="more-problems" aria-hidden="${!expanded}"${expanded ? '' : ' inert'}>
          <ul class="problem-list">${rows(extra)}</ul>
        </div>`;
    }
    return h;
  }

  async function updateShot(frame, markup) {
    frame.querySelector('.pending')?.remove();
    const next = document.createElement('div');
    next.className = 'shot-layer pending';
    next.setAttribute('aria-hidden', 'true');
    next.innerHTML = markup;
    frame.append(next);
    const img = next.querySelector('img');
    if (img) {
      img.loading = 'eager';
      try {
        await img.decode();
      } catch {
        if (!img.naturalWidth) next.innerHTML = '<div class="noshot">No screenshot</div>';
      }
    }
    if (!next.isConnected) return;
    frame.querySelector('.leaving')?.remove();
    const current = frame.firstElementChild;
    current.setAttribute('aria-hidden', 'true');
    current.classList.remove('entering');
    current.classList.add('leaving');
    next.removeAttribute('aria-hidden');
    next.classList.replace('pending', 'entering');
  }

  function updateCardShots(card, surface, width) {
    const sides = comparedSources();
    card.querySelectorAll('.shot-frame').forEach((frame, i) => updateShot(frame, shot(sides[i], card.dataset.site, surface, width)));
  }

  function selectSurface(card, surface) {
    const site = card.dataset.site;
    const chosen = cardState(site);
    chosen.surface = surface;
    for (const button of card.querySelectorAll('[data-surface]')) {
      button.setAttribute('aria-pressed', String(button.dataset.surface === surface));
    }
    card.querySelector('.surface-select').value = surface;
    const defs = defectsOf(site).filter((d) => d.surface === surface);
    card.querySelector('.site-problems').innerHTML = problems(`more-${card.dataset.index}`, site, defs, chosen.expanded);
    updateCardShots(card, surface, chosen.width);
  }

  function sitesView() {
    const sites = siteList();
    if (!sites.length) return '<p class="note">No generated-site results in this selection.</p>';
    const a = A(), b = Bs();
    const sides = comparedSources();
    let h = '<div class="site-list">';
    for (const [index, site] of sites.entries()) {
      const t = truthOf(site);
      const defs = defectsOf(site);
      const bySurface = new Map([['page', []]]);
      for (const src of [b, a]) for (const surface of src.truth[site]?.surfaces || []) {
        if (!bySurface.has(surface.name)) bySurface.set(surface.name, []);
      }
      for (const d of defs) {
        if (!bySurface.has(d.surface)) bySurface.set(d.surface, []);
        bySurface.get(d.surface).push(d);
      }
      const changed = !same() && a && b && a.siteVersions && b.siteVersions && a.siteVersions[site] && b.siteVersions[site] && a.siteVersions[site] !== b.siteVersions[site];
      const ca = caughtCount(a, site, defs), cb = caughtCount(b, site, defs);
      const facts = `${defs.length} problem${defs.length === 1 ? '' : 's'}${ca !== null || cb !== null ? ` · caught ${pair(ca, cb)}` : ''}${changed ? ' · page changed' : ''}`;
      const { surface, width, expanded } = cardState(site);
      const selected = bySurface.has(surface) ? surface : 'page';
      const surfaces = [...bySurface].map(([name, list]) => ({
        name: esc(name), label: `${esc(surfaceName(name))} (${list.length})`, selected: name === selected,
      }));
      h += `<article class="site-card" data-site="${esc(site)}" data-index="${index}" aria-labelledby="site-${index}">
        <header>
          <div class="site-heading">
            <h2 id="site-${index}">${esc(site)}</h2>
            <span class="meta">${esc(t.builder)}</span>
            <span class="site-facts">${facts}</span>
          </div>
          ${t.brief ? `<p class="brief meta">${esc(t.brief)}</p>` : ''}
          ${t.reviewer ? `<p class="brief meta">Reviewed by ${esc(t.reviewer)}.</p>` : ''}
        </header>
        <div class="site-controls">
          <div class="surface-buttons" role="group" aria-label="Surface">
            ${surfaces.map((s) => `<button type="button" data-surface="${s.name}" aria-pressed="${s.selected}">${s.label}</button>`).join('')}
          </div>
          <select class="surface-select" aria-label="Surface">
            ${surfaces.map((s) => `<option value="${s.name}"${s.selected ? ' selected' : ''}>${s.label}</option>`).join('')}
          </select>
          <div class="width-buttons" role="group" aria-label="Screenshot width">
            <button type="button" data-width="1280" aria-pressed="${width === '1280'}">Desktop</button>
            <button type="button" data-width="390" aria-pressed="${width === '390'}">Phone</button>
          </div>
        </div>
        <div class="shots${same() ? ' one' : ''}">
          ${sides.map((src) => `<figure><figcaption>${esc(nameOf(src))}</figcaption><div class="shot-frame" data-axiomatic="specimen"><div class="shot-layer">${shot(src, site, selected, width)}</div></div></figure>`).join('')}
        </div>
        <div class="site-problems">${problems(`more-${index}`, site, bySurface.get(selected), expanded)}</div>
      </article>`;
    }
    return h + '</div>';
  }

  // ---------- planted ----------
  function plantedView() {
    const a = A(), b = Bs();
    const has = (s) => plantedRows(s).length > 0;
    if (!has(a) && !has(b)) return '<p class="note">The unmodified sites have no planted set. Pick a run.</p>';
    const L = has(a) ? a : b, R = has(b) ? b : a;
    const one = L === R;
    const f = state.pf;
    const rowsL = new Map(plantedRows(L).map((r) => [pKey(r), r]));
    let rows = plantedRows(R).filter((r) => (!f.principle || r.principle === f.principle) && (!f.layer || r.layer === f.layer) && (!f.level || String(r.level) === f.level));
    if (f.changed && !one) rows = rows.filter((r) => { const l = rowsL.get(pKey(r)); return !l || pStat(l) !== pStat(r); });
    const all = plantedRows(R);
    const opt = (vals, cur) => '<option value="">All</option>' + [...new Set(vals)].sort().map((v) => `<option${String(v) === cur ? ' selected' : ''}>${esc(v)}</option>`).join('');
    let h = `<p class="lede">${one ? `Showing <strong>${esc(nameOf(R))}</strong>.` : `Comparing <strong>${esc(nameOf(L))}</strong> with <strong>${esc(nameOf(R))}</strong>.`} ${rows.length} defects.</p>`;
    h += `<div class="filters">
      <label>Principle <select data-f="principle">${opt(all.map((r) => r.principle), f.principle)}</select></label>
      <label>Needs <select data-f="layer">${opt(all.map((r) => r.layer), f.layer)}</select></label>
      <label>Level <select data-f="level">${opt(all.map((r) => r.level), f.level)}</select></label>
      <label>Plan <select data-f="plan"><option value="plan"${f.plan === 'plan' ? ' selected' : ''}>With screen plan</option><option value="noplan"${f.plan === 'noplan' ? ' selected' : ''}>Without</option></select></label>
      ${one ? '' : `<label class="check"><input type="checkbox" data-f="changed"${f.changed ? ' checked' : ''}> Only changes</label>`}
    </div>`;
    const groups = {};
    for (const r of rows) (groups[r.principle] = groups[r.principle] || []).push(r);
    h += '<div class="list">';
    for (const [p, g] of Object.entries(groups).sort()) {
      const cR = g.filter((r) => pStat(r) === 'caught').length;
      const cL = g.filter((r) => { const l = rowsL.get(pKey(r)); return l && pStat(l) === 'caught'; }).length;
      const sum = `<span class="name">${esc(p)}</span><span class="facts">${g.length} defect${g.length === 1 ? "" : "s"} · caught ${one ? cR : `${cL} → ${cR}`}</span>`;
      let t = `<table class="defects"><thead><tr><th>Defect</th>${one ? '<th>Status</th>' : `<th>${esc(nameOf(L))}</th><th>${esc(nameOf(R))}</th>`}</tr></thead><tbody>`;
      for (const r of g) {
        const l = rowsL.get(pKey(r));
        const x = l ? pStat(l) : 'none', y = pStat(r);
        const where = r.variant === 'base' ? '' : r.variant === 'step' ? ' · opened by a click' : ' · open at load';
        t += `<tr${!one && x !== y ? ' class="moved"' : ''}><td>${esc(r.what)}<div class="meta"><code>${esc(r.case)}</code>${where} · ${esc(r.layer)} · level ${esc(r.level)}${r.expect.length ? ` · rules: ${esc(r.expect.join(', '))}` : ''}</div></td>${one ? `<td>${st(y)}</td>` : `<td>${st(x)}</td><td>${st(y)}</td>`}</tr>`;
      }
      h += det(`p:${p}`, 'site', sum, t + '</tbody></table>');
    }
    h += '</div>';
    const ctl = (R.planted && R.planted.controls) || [];
    if (ctl.length) {
      const any = (c) => [...c.lint, ...c.verifyPlan, ...c.verifyNoplan];
      const alarms = ctl.filter((c) => any(c).length).length;
      h += det('p:controls', 'aside', `Clean pages (false alarms) <span class="meta">${alarms} of ${ctl.length} drew a finding</span>`,
        `<table><thead><tr><th>Clean page</th><th>lint</th><th>verify, plan</th><th>verify, no plan</th></tr></thead><tbody>${ctl.map((c) => `<tr><td>${esc(c.title)}</td><td>${esc(c.lint.join(', ') || '0')}</td><td>${esc(c.verifyPlan.join(', ') || '0')}</td><td>${esc(c.verifyNoplan.join(', ') || '0')}</td></tr>`).join('')}</tbody></table>`);
    }
    return h;
  }

  // ---------- render + events ----------
  function render(animate = false) {
    for (const b of document.querySelectorAll('.tabs button')) b.setAttribute('aria-pressed', String(b.dataset.view === state.view));
    const html = state.view === 'sites' ? sitesView() : state.view === 'planted' ? plantedView() : overview();
    main.innerHTML = animate ? `<div class="view-enter">${html}</div>` : html;
  }
  document.querySelector('.tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.dataset.view === state.view) return;
    state.view = b.dataset.view;
    render(true);
  });
  for (const picker of [aSel, bSel]) picker.addEventListener('change', () => render());
  main.addEventListener('error', (e) => {
    if (!e.target.matches('.shot-layer:not(.pending) img')) return;
    e.target.outerHTML = '<div class="noshot">No screenshot</div>';
  }, true);
  main.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    const card = b?.closest('.site-card');
    if (!card) return;
    const site = card.dataset.site;
    const chosen = cardState(site);
    if (b.hasAttribute('data-more')) {
      chosen.expanded = !chosen.expanded;
      b.setAttribute('aria-expanded', String(chosen.expanded));
      b.textContent = chosen.expanded ? 'Show fewer' : b.dataset.more;
      const extra = $(b.getAttribute('aria-controls'));
      extra.setAttribute('aria-hidden', String(!chosen.expanded));
      extra.toggleAttribute('inert', !chosen.expanded);
      return;
    }
    if (b.getAttribute('aria-pressed') === 'true') return;
    if (b.hasAttribute('data-surface')) {
      selectSurface(card, b.dataset.surface);
      return;
    }
    chosen.width = b.dataset.width;
    b.parentElement.querySelector('[aria-pressed="true"]').setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-pressed', 'true');
    updateCardShots(card, card.querySelector('.surface-select').value, chosen.width);
  });
  main.addEventListener('change', (e) => {
    if (e.target.matches('.surface-select')) {
      selectSurface(e.target.closest('.site-card'), e.target.value);
      return;
    }
    const k = e.target.dataset && e.target.dataset.f;
    if (!k) return;
    state.pf[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    render();
  });
  render();
})();

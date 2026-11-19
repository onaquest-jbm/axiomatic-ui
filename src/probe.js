'use strict';
// Runs inside the rendered page (serialized, so it must be self-contained).
// It checks that the screen still says what the derivation says it should:
//   floor      - a human limit is broken (contrast, target size, overflow, focus)
//   meaning    - a visual difference means nothing, or a meaning is not visible
//   derivation - a value on screen is not one the derivation produced
//   finish     - small structural problems
// Salience is estimated with a simple model (size x luminance contrast x chroma x position).
// It is a heuristic for ordering, not a model of human vision; the screenshots remain the judge.

/* eslint-disable no-undef */
function probe(opts) {
  const B = opts.budgets;
  const findings = [];
  const add = (rule, tier, principle, message, el, extra) => findings.push(Object.assign({ rule, tier, principle, message, selector: el ? sel(el) : null, rect: el ? box(el) : null }, extra || {}));

  function sel(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '#' + el.id;
    const parts = [];
    let n = el;
    for (let d = 0; n && n.nodeType === 1 && d < 3; d++) {
      let s = n.tagName.toLowerCase();
      const cls = (n.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (cls.length) s += '.' + cls.join('.');
      parts.unshift(s);
      if (n.id) { parts[0] = '#' + n.id; break; }
      n = n.parentElement;
    }
    return parts.join(' > ');
  }
  function box(el) { const r = el.getBoundingClientRect(); return { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; }
  function rgba(s) {
    const m = s && s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function lum(c) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  function chroma(c) { const mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b); return (mx - mn) / 255; }
  function blend(top, bottom) { const a = top.a; return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 }; }
  const gradientColor = (img) => { const m = img.match(/rgba?\([^)]+\)/); return m ? rgba(m[0]) : null; };
  function bgOf(el, skipSelf) {
    const layers = [];
    let n = skipSelf ? el.parentElement : el;
    let gradient = false;
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && /gradient/.test(cs.backgroundImage)) { gradient = true; const g = gradientColor(cs.backgroundImage); if (g) { layers.push(Object.assign(g, { a: 1 })); break; } }
      const c = rgba(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
      n = n.parentElement;
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) bg = blend(layers[i], bg);
    return { color: bg, gradient };
  }
  const ownText = (el) => Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
  // Visible means a person could see it now: rendered, not transparent through an ancestor,
  // not clipped away by a collapsed ancestor, and not parked off-screen horizontally.
  const visible = (el, cs) => {
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || r.right <= 0 || r.left >= innerWidth) return false;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const acs = getComputedStyle(a);
      if (acs.overflow !== 'visible') { const ar = a.getBoundingClientRect(); if (ar.height < 1 || ar.width < 1) return false; }
    }
    return true;
  };

  // Regions marked data-axiomatic="specimen" display other designs (swatches, previews, screenshots).
  // They are content, not this interface, so they are left out of meaning and derivation checks.
  const specimen = (el) => !!(el.closest && el.closest('[data-axiomatic="specimen"]'));
  // Scoped mode: after a click, only what the click made visible (a menu, dialog, panel or
  // new view) is checked; audit.js records that set in window.__axScope before probing.
  const scope = opts.scoped ? (window.__axScope || new Set()) : null;
  const all = Array.from(document.body.querySelectorAll('*')).slice(0, 6000);
  const styles = new Map();
  const vis = [];
  for (const el of all) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (!visible(el, cs)) continue;
    styles.set(el, cs);
    if (!scope || scope.has(el)) vis.push(el);
  }
  const roots = scope ? vis.filter((el) => !el.parentElement || !scope.has(el.parentElement)) : [document.body];
  const vw = innerWidth, ph = Math.max(document.documentElement.scrollHeight, innerHeight);

  // ---------- salience
  const local = new Map();
  function localSalience(el) {
    if (local.has(el)) return local.get(el);
    const cs = styles.get(el);
    if (!cs) return 0;
    const r = el.getBoundingClientRect();
    const pos = 1 - 0.15 * Math.min(1, (r.top + scrollY) / ph) - 0.1 * Math.min(1, r.left / vw);
    let s = 0;
    const bgBehind = bgOf(el, true).color;
    const fill = rgba(cs.backgroundColor);
    const img = cs.backgroundImage && /gradient/.test(cs.backgroundImage) ? gradientColor(cs.backgroundImage) : null;
    const fillC = img ? Object.assign(img, { a: 1 }) : (fill && fill.a > 0.5 ? blend(fill, bgBehind) : null);
    if (fillC) {
      const k = Math.log2(1 + ratio(fillC, bgBehind) - 1 + 0.0001) + 0.0;
      s = Math.max(s, Math.sqrt(r.width * r.height) * 0.25 * Math.max(0, k) * (1 + 3 * chroma(fillC)));
    }
    if (ownText(el)) {
      const fg = rgba(cs.color);
      if (fg) {
        const bg = bgOf(el, false).color;
        const fgc = fg.a < 1 ? blend(fg, bg) : fg;
        const transparentText = (cs.webkitTextFillColor && /rgba\(0, 0, 0, 0\)|transparent/.test(cs.webkitTextFillColor)) || fg.a === 0;
        const cr = transparentText ? 4 : ratio(fgc, bg);
        const w = parseInt(cs.fontWeight, 10) >= 600 ? 1.3 : 1;
        s = Math.max(s, parseFloat(cs.fontSize) * w * Math.log2(1 + cr) * 0.6 * (1 + 3 * chroma(transparentText ? { r: 140, g: 90, b: 240 } : fgc)));
      }
    }
    if (cs.animationName !== 'none' && cs.animationIterationCount === 'infinite') s *= 1.5;
    s *= pos;
    local.set(el, s);
    return s;
  }
  function salience(el) {
    let s = localSalience(el);
    const kids = el.querySelectorAll('*');
    for (let i = 0; i < kids.length && i < 400; i++) if (styles.has(kids[i])) s = Math.max(s, localSalience(kids[i]));
    return s;
  }

  const plan = opts.plan || {};
  const planned = (plan.salience || []).map((p) => ({ p, el: document.querySelector(p.selector) }));
  for (const { p, el } of planned) if (!el) add('plan-missing', 'meaning', 'purpose', `Planned element "${p.selector}" is not on screen, so its task has no visible home.`);
  // An element that exists but is not visible at this size (e.g. a sidebar behind a menu button on a phone)
  // has moved one level down; it is left out of the ordering rather than reported missing.
  const present = planned.filter((x) => x.el && (styles.has(x.el) || Array.from(x.el.querySelectorAll('*')).some((k) => styles.has(k))));
  const plannedSal = present.map((x) => ({ ...x, s: salience(x.el) }));
  if (plannedSal.length) {
    const top = plannedSal[0];
    const insidePlanned = (el) => present.some((x) => x.el === el || x.el.contains(el) || el.contains(x.el));
    const rivals = vis.filter((el) => !insidePlanned(el) && !specimen(el)).map((el) => ({ el, s: localSalience(el) })).filter((x) => x.s > top.s * 1.0).sort((a, b) => b.s - a.s);
    if (rivals.length) {
      add('primary-not-first', 'meaning', 'salience', `"${top.p.selector}" (${top.p.task || 'top task'}) should be seen first, but ${rivals.length} unplanned element(s) draw more attention.`, top.el);
      for (const r of rivals.slice(0, 4)) add('unearned-salience', 'meaning', 'salience', `Draws more attention (${r.s.toFixed(0)}) than the top task (${top.s.toFixed(0)}) without serving a task.`, r.el);
    }
    for (let i = 0; i < plannedSal.length; i++) for (let j = i + 1; j < plannedSal.length; j++) {
      if (plannedSal[j].s > plannedSal[i].s * 1.25) add('salience-inversion', 'meaning', 'salience', `"${plannedSal[j].p.selector}" (${plannedSal[j].s.toFixed(0)}) is louder than higher-priority "${plannedSal[i].p.selector}" (${plannedSal[i].s.toFixed(0)}).`, plannedSal[j].el);
    }
  }

  // ---------- one primary per view
  const accent = opts.accent ? rgba(opts.accent) : null;
  if (accent) {
    const near = (c) => c && Math.abs(c.r - accent.r) + Math.abs(c.g - accent.g) + Math.abs(c.b - accent.b) < 12;
    const filled = vis.filter((el) => el.matches('button, a, [role=button], input[type=submit]') && near(rgba(styles.get(el).backgroundColor)));
    if (filled.length > B.primaryPerView) add('competing-primaries', 'meaning', 'salience', `${filled.length} accent-filled actions are visible; one view gets one primary. Others: ${filled.slice(1).map((e) => '"' + e.textContent.trim().slice(0, 20) + '"').join(', ')}.`, filled[1]);
  }

  // ---------- pointing: target size follows frequency
  const FREQ = { constant: 4, frequent: 3, occasional: 2, rare: 1 };
  const acts = (plan.actions || []).map((a) => ({ a, el: document.querySelector(a.selector) })).filter((x) => x.el && styles.has(x.el));
  for (const x of acts) { const r = x.el.getBoundingClientRect(); x.area = r.width * r.height; x.f = FREQ[x.a.frequency] || 2; }
  // Fitts applies where the pointer already is, so compare targets within one region.
  const region = (el) => el.closest('section, form, nav, header, aside, dialog, [role=group], [role=dialog]') || document.body;
  for (const x of acts) for (const y of acts) {
    if (region(x.el) !== region(y.el)) continue;
    if (x.f > y.f && y.area > x.area * 1.25) add('pointing-order', 'meaning', 'pointing', `"${y.a.selector}" (${y.a.frequency}) is a bigger target than more frequent "${x.a.selector}" (${x.a.frequency}).`, y.el);
  }

  // ---------- grouping: gaps inside a group must be clearly smaller than gaps around it
  for (const g of plan.groups || []) {
    const members = g.members.flatMap((s) => Array.from(document.querySelectorAll(s))).filter((el) => styles.has(el));
    if (members.length < 2) continue;
    const rects = members.map((el) => el.getBoundingClientRect()).sort((a, b) => a.top - b.top || a.left - b.left);
    const gapOf = (a, b) => Math.max(0, b.left - a.right, a.left - b.right, b.top - a.bottom, a.top - b.bottom);
    let intra = 0;
    for (let i = 1; i < rects.length; i++) intra = Math.max(intra, gapOf(rects[i - 1], rects[i]));
    const bb = { left: Math.min(...rects.map((r) => r.left)), right: Math.max(...rects.map((r) => r.right)), top: Math.min(...rects.map((r) => r.top)), bottom: Math.max(...rects.map((r) => r.bottom)) };
    let lca = members[0].parentElement;
    while (lca && !members.every((m) => lca.contains(m))) lca = lca.parentElement;
    const scope = lca && lca.parentElement ? lca.parentElement : document.body;
    let inter = Infinity;
    for (const el of scope.querySelectorAll('*')) {
      if (!styles.has(el) || members.some((m) => m === el || m.contains(el) || el.contains(m))) continue;
      if (lca && el.contains(lca)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const overlapX = r.left < bb.right && r.right > bb.left, overlapY = r.top < bb.bottom && r.bottom > bb.top;
      if (!overlapX && !overlapY) continue;
      inter = Math.min(inter, gapOf(bb, r));
    }
    if (inter !== Infinity && inter < Math.max(intra * 1.5, intra + 4)) add('weak-grouping', 'meaning', 'grouping', `"${g.name}": items are ${Math.round(intra)}px apart but only ${Math.round(inter)}px from what's outside the group, so it doesn't read as a group.`, members[0]);
  }

  // ---------- derivation: only derived values on screen
  const sizes = new Map(), spaces = new Map(), colors = new Map();
  let bold = 0, textCount = 0;
  const allowedColors = (opts.palette || []).map(rgba).filter(Boolean);
  const inPalette = (c) => allowedColors.some((p) => Math.abs(p.r - c.r) <= 3 && Math.abs(p.g - c.g) <= 3 && Math.abs(p.b - c.b) <= 3);
  for (const el of vis) {
    if (specimen(el)) continue;
    const cs = styles.get(el);
    const autoX = cs.marginLeft === cs.marginRight && parseFloat(cs.marginLeft) > 0;
    for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'rowGap', 'columnGap']) {
      if (autoX && /margin(Left|Right)/.test(p)) continue;
      const v = Math.abs(parseFloat(cs[p]));
      if (v && isFinite(v) && v < 400) { const k = Math.round(v * 10) / 10; if (!spaces.has(k)) spaces.set(k, el); }
    }
    for (const prop of ['backgroundColor', 'borderTopColor']) {
      if (prop === 'borderTopColor' && !(parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none')) continue;
      const c = rgba(cs[prop]);
      if (c && c.a >= 1) { const k = `${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)}`; if (!colors.has(k)) colors.set(k, { c, el, prop }); }
    }
    if (!ownText(el)) continue;
    textCount++;
    if (parseInt(cs.fontWeight, 10) >= 600) bold++;
    const fs = Math.round(parseFloat(cs.fontSize) * 10) / 10;
    if (!sizes.has(fs)) sizes.set(fs, el);
    const c = rgba(cs.color);
    if (c && c.a >= 1) { const k = `${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)}`; if (!colors.has(k)) colors.set(k, { c, el, prop: 'color' }); }
  }
  const sizeSet = new Set(opts.sizes);
  const offSizes = [...sizes.keys()].filter((s) => !sizeSet.has(s));
  if (offSizes.length) add('underived-size', 'derivation', 'encoding', `Font sizes on screen that the derivation never produced: ${offSizes.sort((a, b) => a - b).join(', ')}px (derived: ${[...sizeSet].join(', ')}). Each extra size is a rank difference that means nothing.`, sizes.get(offSizes[0]));
  const spaceSet = new Set(opts.space.concat([0]));
  const offSpace = [...spaces.keys()].filter((v) => !spaceSet.has(v));
  if (offSpace.length) add('underived-space', 'derivation', 'grouping', `Spacing values that are not a relatedness level: ${offSpace.sort((a, b) => a - b).slice(0, 12).join(', ')}px (levels: ${opts.space.join(', ')}).`, spaces.get(offSpace[0]));
  if (allowedColors.length) {
    const off = [...colors.values()].filter((x) => !inPalette(x.c));
    if (off.length) add('underived-color', 'derivation', 'encoding', `${off.length} color(s) on screen with no derived meaning, e.g. rgb(${off.slice(0, 4).map((x) => [x.c.r, x.c.g, x.c.b].map(Math.round).join(' ')).join('), rgb(')}).`, off[0].el);
  }
  if (textCount > 10 && bold / textCount > 0.4) add('flat-emphasis', 'meaning', 'salience', `${Math.round(100 * bold / textCount)}% of text is emphasized, so emphasis no longer marks anything.`);

  // ---------- decoration: differences that encode nothing
  const boxes = vis.filter((el) => {
    if (specimen(el)) return false;
    const cs = styles.get(el), r = el.getBoundingClientRect();
    if (r.width < 60 || r.height < 40) return false;
    if (el.matches('button, a, input, select, textarea, summary, [role=button]')) return false; // controls are not enclosures
    const borders = ['Top', 'Right', 'Bottom', 'Left'].filter((s) => parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none' && (rgba(cs['border' + s + 'Color']) || {}).a > 0).length;
    return (borders >= 3 || (cs.boxShadow && cs.boxShadow !== 'none')) && (rgba(cs.backgroundColor) || {}).a > 0.05;
  });
  const boxSet = new Set(boxes);
  let nested = 0;
  for (const b of boxes) {
    let n = b.parentElement, depth = 0;
    while (n) { if (boxSet.has(n)) depth++; n = n.parentElement; }
    if (depth >= 1 && nested < 6) { nested++; add('redundant-enclosure', 'meaning', 'grouping', `A box inside a box (depth ${depth}). An enclosure says "this is a group"; nesting says it twice.`, b); }
  }
  for (const el of vis) {
    if (specimen(el)) continue;
    const cs = styles.get(el);
    if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') add('decorative-color', 'meaning', 'encoding', 'Gradient-filled text: a color change that encodes nothing.', el);
    if (cs.backdropFilter && cs.backdropFilter !== 'none') add('decorative-depth', 'meaning', 'encoding', 'Backdrop blur: depth with no layering meaning.', el);
    if (cs.animationIterationCount === 'infinite' && cs.animationName !== 'none' && !/spin|load|progress|pulse/i.test(cs.animationName)) add('decorative-motion', 'meaning', 'motion', `Endless animation "${cs.animationName}": motion that reports no change.`, el);
    const durs = (cs.transitionDuration + ',' + cs.animationDuration).split(',').map((d) => parseFloat(d) * (/ms/.test(d) ? 1 : 1000)).filter((d) => d > 0);
    const indicator = cs.animationIterationCount === 'infinite' && /spin|load|progress|pulse/i.test(cs.animationName);
    if (!indicator && durs.length && Math.max(...durs) > opts.maxMotion + 20) add('slow-motion', 'floor', 'response', `${Math.round(Math.max(...durs))}ms of motion; the derived maximum is ${opts.maxMotion}ms.`, el);
  }
  const text = roots.map((el) => el.innerText || '').join(' ');
  const emoji = text.match(/\p{Extended_Pictographic}/gu);
  if (emoji) add('decorative-symbol', 'meaning', 'encoding', `${emoji.length} emoji in interface text: symbols that don't map to a state or object.`);

  // ---------- floor: human limits
  // A fixed overlay (or a menu pushed past a side edge) that doesn't fit the window can't be
  // scrolled into view: part of it is simply unreachable.
  if (scope) {
    let clipped = 0;
    for (const el of roots) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || clipped >= 4) continue;
      let fixed = false;
      for (let n = el; n && n !== document.body; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') { fixed = true; break; } }
      const out = { top: Math.max(0, -r.top), bottom: Math.max(0, r.bottom - innerHeight), left: Math.max(0, -r.left), right: Math.max(0, r.right - innerWidth) };
      const lost = (fixed ? out.top + out.bottom : 0) + out.left + out.right;
      if (lost > 2) { clipped++; add('surface-offscreen', 'floor', 'legibility', `${Math.round(lost)}px of this ${fixed ? 'fixed ' : ''}panel lies outside the ${innerWidth}x${innerHeight} window and can't be scrolled into view.`, el); }
    }
  }
  // ---------- consequence: an irreversible action among routine ones, unseparated and styled alike
  const DESTRUCTIVE = /\b(delete|remove|discard|destroy|erase|wipe|revoke|terminate|kill|reset|drop)\b/i;
  const BENIGN = /\b(filter|filters|tag|selection|from (cart|list|view)|search)\b/i;
  const labelOf = (el) => (el.getAttribute('aria-label') || el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
  const isControl = (el) => el.matches('button, [role=button], [role=menuitem], a[href], input[type=button], input[type=submit]');
  const separated = (a, b) => {
    // Something drawn between two controls: a rule, a separator role, or a border on either side.
    const [first, second] = a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? [a, b] : [b, a];
    const range = document.createRange(); range.setStartAfter(first); range.setEndBefore(second);
    const between = range.cloneContents().querySelectorAll ? range.cloneContents().querySelectorAll('hr, [role=separator]') : [];
    if (between.length) return true;
    for (const el of [first, second, first.parentElement, second.parentElement]) { const cs = getComputedStyle(el); if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && el !== first.parentElement) return true; }
    return false;
  };
  let csq = 0;
  for (const el of vis) {
    if (csq >= 4 || !isControl(el) || specimen(el)) continue;
    const l = labelOf(el);
    if (!DESTRUCTIVE.test(l) || BENIGN.test(l) || l.length > 40) continue;
    let group = el.parentElement;
    for (let i = 0; i < 2 && group && group.querySelectorAll('button, [role=button], [role=menuitem]').length < 2; i++) group = group.parentElement;
    if (!group) continue;
    const peers = Array.from(group.querySelectorAll('button, [role=button], [role=menuitem], a[href]')).filter((p) => p !== el && styles.has(p) && !DESTRUCTIVE.test(labelOf(p)));
    if (!peers.length) continue;
    const r = el.getBoundingClientRect();
    const dist = (p) => { const q = p.getBoundingClientRect(); return Math.max(0, q.left - r.right, r.left - q.right, q.top - r.bottom, r.top - q.bottom); };
    const nearest = peers.slice().sort((a, b) => dist(a) - dist(b))[0];
    const gaps = peers.map(dist).filter((g) => g < 200);
    const typical = gaps.length ? gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 0;
    const cs = styles.get(el), ns = styles.get(nearest);
    // Text colour alone (red text) is not separation: it is easy to miss and carries no position
    // or shape. Only a different fill or weight counts as looking different.
    const alike = cs.backgroundColor === ns.backgroundColor && cs.fontWeight === ns.fontWeight;
    if (alike && dist(nearest) <= Math.max(typical * 1.5, 12) && !separated(el, nearest)) { csq++; add('destructive-unseparated', 'meaning', 'consequence', `"${l}" sits among routine actions ("${labelOf(nearest).slice(0, 24)}") with nothing separating it and the same look, so an irreversible action reads as a routine one.`, el); }
  }
  for (const s of vis.filter((e) => e.matches('select'))) {
    const opts_ = Array.from(s.options || []).map((o) => o.textContent.trim());
    const bad = opts_.filter((t) => DESTRUCTIVE.test(t) && !BENIGN.test(t));
    if (bad.length && bad.length < opts_.length && csq < 6) { csq++; add('destructive-unseparated', 'meaning', 'consequence', `"${bad[0]}" is an option in a select beside ordinary values: choosing it is a destructive act disguised as a setting.`, s); }
  }

  // ---------- choice / memory: too many peer actions in one undivided group
  const wallMax = (B && B.visibleActionsPerGroup ? B.visibleActionsPerGroup : 4) * 2;
  let walls = 0;
  const flaggedWalls = new Set();
  for (const parent of new Set(vis.filter(isControl).map((e) => e.parentElement))) {
    if (!parent || walls >= 3 || parent.closest('table, nav, [role=navigation], [role=grid], [role=listbox], [role=tablist], [data-axiomatic="specimen"]')) continue;
    if ([...flaggedWalls].some((f) => f.contains(parent) || parent.contains(f))) continue;
    // Peers: visible controls among the parent's children, split into runs by separators.
    let run = [], best = [];
    for (const k of parent.children) {
      if (k.matches('hr, [role=separator]')) { if (run.length > best.length) best = run; run = []; continue; }
      if (styles.has(k) && isControl(k)) run.push(k);
    }
    if (run.length > best.length) best = run;
    if (best.length <= wallMax) continue;
    const avgLen = best.reduce((n, k) => n + labelOf(k).length, 0) / best.length;
    if (avgLen > 28) continue; // rows of content (messages, files), not actions
    walls++; flaggedWalls.add(parent);
    add('too-many-peers', 'meaning', 'choice', `${best.length} actions side by side with nothing dividing them (about ${wallMax / 2} per group can be weighed at once): rare ones slow every choice of the frequent ones.`, parent);
  }

  // ---------- a surface that covers the control that opened it
  if (scope && opts.trigger) {
    const t = opts.trigger, tArea = t.w * t.h;
    for (const el of roots) {
      const r = el.getBoundingClientRect();
      if (r.width * r.height > 0.6 * innerWidth * innerHeight || tArea <= 0) continue; // a modal sheet covers everything on purpose
      let floating = false; // only an overlay can cover; content that re-rendered in place does not
      for (let n = el; n && n !== document.body; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'absolute') { floating = true; break; } }
      if (!floating) continue;
      const dlg = el.closest('dialog'); if (dlg && dlg.matches(':modal')) continue; // a modal covers everything on purpose, behind a backdrop
      const ix = Math.max(0, Math.min(r.right, t.x + t.w) - Math.max(r.left, t.x)), iy = Math.max(0, Math.min(r.bottom, t.y + t.h) - Math.max(r.top, t.y));
      if (ix * iy > 0.5 * tArea) { add('covers-trigger', 'meaning', 'grouping', 'What appeared covers the control that opened it, hiding the thing just acted on.', el); break; }
    }
  }

  const vp = document.querySelector('meta[name="viewport"]');
  if (!scope && (!vp || !/width\s*=\s*device-width/.test(vp.getAttribute('content') || ''))) add('no-viewport-meta', 'floor', 'legibility', 'No viewport meta: phones render a shrunken desktop page.');
  if (document.documentElement.scrollWidth > innerWidth + 1) add('horizontal-scroll', 'floor', 'legibility', `Page scrolls sideways at ${innerWidth}px.`);
  let low = 0, over = 0;
  for (const el of vis) {
    if (!ownText(el)) continue;
    const cs = styles.get(el);
    const fg = rgba(cs.color);
    const bgInfo = bgOf(el, false);
    if (fg && fg.a > 0 && !bgInfo.gradient) {
      const f = fg.a < 1 ? blend(fg, bgInfo.color) : fg;
      const cr = ratio(f, bgInfo.color);
      const size = parseFloat(cs.fontSize);
      const need = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700) ? 3 : 4.5;
      if (cr < need && low < 12) { low++; add('low-contrast', 'floor', 'legibility', `Contrast ${cr.toFixed(2)}:1, needs ${need}:1: "${el.textContent.trim().slice(0, 40)}"`, el); }
    } else if (bgInfo.gradient && low < 12) { low++; add('text-on-gradient', 'floor', 'legibility', 'Text on a gradient: contrast varies across it and cannot be guaranteed.', el); }
    if (cs.overflowX === 'visible' && cs.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && over < 8) { over++; add('text-overflow', 'floor', 'legibility', 'Text spills out of its box.', el); }
  }
  const interactive = vis.filter((el) => el.matches('a[href], button, [role="button"], input:not([type="hidden"]), select, textarea, summary'));
  let small = 0;
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    const inline = el.tagName === 'A' && el.closest('p, li') && styles.get(el).display === 'inline';
    const label = /^(checkbox|radio)$/.test(el.type) && el.closest('label');
    const lr = label && label.getBoundingClientRect();
    if (inline || (lr && lr.height >= opts.minTarget)) continue;
    if ((r.width < opts.minTarget || r.height < opts.minTarget) && small < 10) { small++; add('small-target', 'floor', 'pointing', `${Math.round(r.width)}x${Math.round(r.height)}px target; the minimum here is ${opts.minTarget}px.`, el); }
  }
  for (const el of vis.filter((e) => e.matches('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea'))) {
    if (!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label') || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)))) add('unlabelled-field', 'floor', 'legibility', 'Form field with no label.', el);
  }
  for (const el of vis.filter((e) => e.matches('img'))) if (!el.hasAttribute('alt')) add('img-no-alt', 'floor', 'legibility', 'Image without alt text.', el);

  return {
    findings,
    metrics: {
      fontSizes: [...sizes.keys()].sort((a, b) => a - b),
      spacingValues: [...spaces.keys()].sort((a, b) => a - b),
      colors: colors.size,
      emphasisRatio: textCount ? Math.round(100 * bold / textCount) / 100 : 0,
      plannedSalience: plannedSal.map((x) => ({ selector: x.p.selector, task: x.p.task, salience: Math.round(x.s), rect: box(x.el) })),
      topUnplanned: vis.filter((el) => !specimen(el)).map((el) => ({ el, s: localSalience(el) })).filter((x) => !present.some((p) => p.el === x.el || p.el.contains(x.el) || x.el.contains(p.el))).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => ({ selector: sel(x.el), salience: Math.round(x.s), rect: box(x.el) })),
      actions: acts.map((x) => ({ selector: x.a.selector, frequency: x.a.frequency, area: Math.round(x.area) })),
    },
  };
}

module.exports = { probe };

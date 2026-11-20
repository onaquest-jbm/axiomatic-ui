'use strict';
// Infers a screen plan for a page that has none, so the plan-based checks (what is seen first,
// target size by frequency, grouping) can run on arbitrary pages. Runs inside the rendered page
// (serialized, so it must be self-contained).
//
// It reads meaning only: text, roles, form structure, landmarks. It never reads size, colour,
// weight or position, because the checks compare those against the plan; a plan inferred from
// how loud things are would only confirm the page.
//
// What it infers, in order of confidence:
//   1. A blocking request: a region that says it needs the person (approval, review, a decision)
//      and holds the control that answers it. It is the top of the plan, and its answer is the
//      constant action.
//   2. The view's primary action: the one control whose label starts the main task (New, Create,
//      Send, Place order, ...), preferring the main landmark and the main form's submit.
//   3. Action frequency from labels: answers and main-task verbs are frequent; settings, export,
//      help, delete and the like are rare. Everything else is left out rather than guessed.
//   4. Groups from structure: fieldsets and role=group, and each label with its field.
// The result is marked inferred; an owner should confirm or correct it in model.json.

/* eslint-disable no-undef */
function inferPlan(opts) {
  opts = opts || {};
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    return true;
  };
  const sel = (el) => {
    if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) return '#' + CSS.escape(el.id);
    const parts = [];
    let n = el;
    while (n && n.nodeType === 1 && n !== document.body) {
      if (n.id && document.querySelectorAll('#' + CSS.escape(n.id)).length === 1) { parts.unshift('#' + CSS.escape(n.id)); break; }
      let s = n.tagName.toLowerCase();
      const same = n.parentElement ? Array.from(n.parentElement.children).filter((k) => k.tagName === n.tagName) : [];
      if (same.length > 1) s += `:nth-of-type(${same.indexOf(n) + 1})`;
      parts.unshift(s);
      n = n.parentElement;
    }
    if (n === document.body) parts.unshift('body');
    return parts.join(' > ');
  };
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.value || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
  const controls = Array.from(document.querySelectorAll('button, [role=button], a[href], input[type=submit], input[type=button]')).filter(visible);
  const ANSWER = /^(approve|allow( once)?|accept|confirm|run( it| this| command)?|yes|grant|review( now)?|resolve|respond|reply|decide)\b/i;
  const REFUSE = /^(deny|reject|decline|refuse|no|block|dismiss)\b/i;
  const NEEDS = /\b(needs? (your |an? )?(approval|review|attention|input|decision|response)|awaiting (your |an? )?(approval|review|response|decision)|waiting (for|on) (you|your|approval|a decision)|approval (needed|required|requested|pending)|pending (approval|review|request|decision)|action required|requires? (your )?(approval|action|attention)|permission (request|needed|required)|wants to (run|execute|write|delete|edit))\b/i;
  const PRIMARY = /^(\+\s*)?(new|create|start|add|compose|send|run|launch|save|submit|place order|check ?out|pay|continue|next|get started|sign up|book|publish|import|upload|invite|ask)\b/i;
  // The stronger kind of primary verb: committing the main task, rather than starting or adding.
  const COMMIT = /^(place order|check ?out|pay|submit|send|publish|book|sign up|get started|save|continue|next|finish|done|run|launch|confirm order)\b/i;
  const RARE =/\b(settings|preferences|export|download|import|delete|remove|discard|help|shortcuts?|about|sign ?out|log ?out|billing|api keys?|advanced|feedback|report( a)? (bug|problem)|changelog|what's new|terms|privacy|theme)\b/i;
  const notes = [];
  const plan = { salience: [], actions: [], groups: [], inferred: true, notes };

  // 1. A blocking request: the smallest region that both says it needs the person and holds an answer.
  let blocking = null;
  for (const el of Array.from(document.querySelectorAll('body *')).filter(visible)) {
    if (/^(SCRIPT|STYLE|BUTTON|A|INPUT|LABEL|SPAN|B|STRONG|EM)$/.test(el.tagName)) continue;
    const text = (el.innerText || '').slice(0, 2000);
    const isAlert = el.matches('[role=alertdialog], [role=alert]');
    const answers = controls.filter((c) => el.contains(c) && ANSWER.test(label(c)));
    if (!answers.length) continue;
    const refuse = controls.filter((c) => el.contains(c) && REFUSE.test(label(c)));
    // A region asks for a decision if it says so, or if it offers an answer and a refusal side by side.
    if (!isAlert && !NEEDS.test(text) && !refuse.length) continue;
    if (!blocking || blocking.el.contains(el)) blocking = { el, answers, refuse };
  }
  if (blocking) {
    // The smallest match is often just the button row; the request is the card around it.
    const card = blocking.el.closest('section, article, li, dialog, [role=dialog], [role=alertdialog], [role=region], form, [aria-labelledby]');
    if (card && card !== document.body && !card.matches('main, [role=main]')) blocking.el = card;
    plan.salience.push({ selector: sel(blocking.el), task: 'decide', why: 'Says it needs the person and holds the answer: work waits on it.' });
    plan.actions.push({ selector: sel(blocking.answers[0]), task: 'decide', frequency: 'constant' });
    for (const r of blocking.refuse.slice(0, 1)) plan.actions.push({ selector: sel(r), task: 'decide', frequency: 'frequent' });
    notes.push(`blocking request: "${label(blocking.answers[0]).slice(0, 30)}" in ${sel(blocking.el)}`);
  }

  // 2. The view's primary action.
  const main = document.querySelector('main, [role=main]');
  const inChrome = (c) => !!c.closest('nav, [role=navigation], body > footer, [role=contentinfo], dialog, [role=dialog], [role=menu]');
  // A label on three or more controls ("Add note" on every row) is a row action, not the view's
  // action (two is a repeated call to action); "Next message" is navigation, not a step forward.
  const counts = {};
  for (const c of controls) { const l = label(c).toLowerCase(); counts[l] = (counts[l] || 0) + 1; }
  const primaries = controls.filter((c) => {
    const l = label(c);
    return PRIMARY.test(l) && !RARE.test(l) && !/^(next|previous|prev)\s+\w/i.test(l) && counts[l.toLowerCase()] < 3 && !inChrome(c) && (!blocking || !blocking.el.contains(c));
  });
  const score = (c) => (COMMIT.test(label(c)) ? 4 : 0) + (main && main.contains(c) ? 2 : 0) + (c.matches('[type=submit]') && c.closest('form') ? 1 : 0);
  const primary = primaries.sort((a, b) => score(b) - score(a))[0];
  if (primary) {
    if (!blocking) plan.salience.push({ selector: sel(primary), task: 'primary', why: `The view's main action ("${label(primary).slice(0, 30)}").` });
    plan.actions.push({ selector: sel(primary), task: 'primary', frequency: 'frequent' });
    notes.push(`primary action: "${label(primary).slice(0, 30)}"`);
  }

  // 3. Rare actions, by label. Occasional ones are not guessed.
  const listed = new Set(plan.actions.map((a) => a.selector));
  let rare = 0;
  for (const c of controls) {
    if (rare >= 12 || c.closest('dialog, [role=dialog], [role=menu]')) continue;
    const l = label(c);
    if (!l || l.length > 40 || !RARE.test(l)) continue;
    const s = sel(c);
    if (listed.has(s)) continue;
    listed.add(s); rare++;
    plan.actions.push({ selector: s, task: 'other', frequency: 'rare' });
  }

  // 4. Groups from structure.
  for (const g of Array.from(document.querySelectorAll('fieldset, [role=group], [role=radiogroup]')).filter(visible).slice(0, 8)) {
    const members = Array.from(g.querySelectorAll('input:not([type=hidden]), select, textarea, button, label')).filter(visible).filter((m) => !(m.tagName === 'LABEL' && m.querySelector('input, select, textarea')));
    if (members.length >= 2 && members.length <= 12) plan.groups.push({ name: (g.querySelector('legend') ? label(g.querySelector('legend')) : g.getAttribute('aria-label') || 'group').slice(0, 30), members: members.map(sel) });
  }
  let pairs = 0;
  for (const l of Array.from(document.querySelectorAll('label[for]')).filter(visible)) {
    if (pairs >= 8) break;
    const f = document.getElementById(l.htmlFor);
    if (!f || !visible(f) || l.contains(f)) continue;
    const lr = l.getBoundingClientRect();
    if (lr.width < 4 || lr.height < 4) continue; // a visually hidden label: there is no visible pair to group
    pairs++;
    plan.groups.push({ name: `label: ${label(l).slice(0, 24)}`, members: [sel(l), sel(f)] });
  }
  if (!plan.salience.length) notes.push('no blocking request or primary action found: salience is not checked');
  return plan;
}

module.exports = { inferPlan };

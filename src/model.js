'use strict';
// Checks that a model holds the facts the derivation needs. These are facts about people and
// work, which an agent must get from the owner or the product, not invent.

const FREQ = ['constant', 'frequent', 'occasional', 'rare'];
const CONSEQ = ['low', 'medium', 'high'];

function checkModel(m) {
  const P = [];
  const err = (message) => P.push({ level: 'error', message });
  const warn = (message) => P.push({ level: 'warn', message });
  const todo = JSON.stringify(m).includes('TODO');
  if (todo) err('The model still has TODOs. They are facts to get from the owner, not to guess.');
  if (!m.product || !m.product.purpose) err('product.purpose: one sentence on what people use this for.');
  const pe = m.people || {};
  if (!['novice', 'mixed', 'expert'].includes(pe.expertise)) err('people.expertise must be novice, mixed or expert.');
  if (!['daily', 'weekly', 'occasional'].includes(pe.frequency)) err('people.frequency must be daily, weekly or occasional.');
  if (!['minutes', 'hours'].includes(pe.sessionLength)) err('people.sessionLength must be minutes or hours.');
  const c = m.context || {};
  if (!Array.isArray(c.devices) || !c.devices.length) err('context.devices: which devices, primary first (desktop, phone, tablet).');
  if (!Array.isArray(c.input) || !c.input.length) err('context.input: mouse, keyboard, touch.');
  if (!Array.isArray(c.conventions) || !c.conventions.length) warn('context.conventions: name 1-3 products these people already use daily. Their layout is memory your users already have.');
  const tasks = m.tasks || [];
  if (!tasks.length) err('tasks: list what people come to do. Every element on screen must trace to one.');
  const ids = new Set();
  for (const t of tasks) {
    if (!t.id || !t.does) err(`A task needs id and does: ${JSON.stringify(t).slice(0, 60)}`);
    if (ids.has(t.id)) err(`Duplicate task id ${t.id}.`);
    ids.add(t.id);
    if (!FREQ.includes(t.frequency)) err(`Task ${t.id}: frequency must be one of ${FREQ.join(', ')}.`);
    if (!CONSEQ.includes(t.consequence)) err(`Task ${t.id}: consequence must be one of ${CONSEQ.join(', ')}.`);
    if (typeof t.reversible !== 'boolean') warn(`Task ${t.id}: say whether it is reversible; it decides undo versus confirmation.`);
  }
  if (tasks.filter((t) => t.frequency === 'constant').length > 2) warn('More than two "constant" tasks: if everything is constant, nothing is. Rank honestly.');
  const served = new Set();
  for (const s of m.screens || []) {
    for (const id of s.serves || []) { if (!ids.has(id)) err(`Screen ${s.id} serves unknown task ${id}.`); served.add(id); }
    const plan = s.plan || {};
    if (!plan.salience || !plan.salience.length) warn(`Screen ${s.id}: no salience plan, so the verifier cannot check what is seen first.`);
    for (const p of plan.salience || []) if (p.task && !ids.has(p.task)) err(`Screen ${s.id}: salience entry ${p.selector} names unknown task ${p.task}.`);
    for (const a of plan.actions || []) if (a.task && !ids.has(a.task)) err(`Screen ${s.id}: action ${a.selector} names unknown task ${a.task}.`);
  }
  if ((m.screens || []).length) for (const t of tasks) if (!served.has(t.id) && t.frequency !== 'rare') warn(`Task ${t.id} is not served by any screen.`);
  return P;
}

function starter() {
  return {
    product: { name: 'TODO', purpose: 'TODO: one sentence, what people use this for' },
    people: { who: 'TODO', expertise: 'mixed', frequency: 'daily', sessionLength: 'minutes' },
    context: { devices: ['desktop'], input: ['mouse', 'keyboard'], conventions: ['TODO: products these people already use daily'] },
    themes: ['light', 'dark'],
    information: { textRanks: ['meta', 'body', 'heading', 'title'], states: [], objects: [] },
    tasks: [{ id: 'TODO', does: 'TODO: verb + object', frequency: 'frequent', consequence: 'low', reversible: true }],
    screens: [],
  };
}

module.exports = { checkModel, starter };

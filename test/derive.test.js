'use strict';
const test = require('./harness');
const assert = require('node:assert');
const { derive } = require('../src/derive');
const { contrast, luminance, parseColor } = require('../src/color');
const { lintText } = require('../src/lint');
const { tokenNames } = require('../src/tokens');
const { checkModel } = require('../src/model');
const demo = require('../demo/model.json');

const base = (people, extra = {}) => ({ product: { purpose: 'x' }, people, context: { devices: ['desktop'], input: ['mouse'] }, tasks: [{ id: 'a', does: 'a', frequency: 'frequent', consequence: 'low', reversible: true }], ...extra });

test('density follows expertise and session length', () => {
  assert.strictEqual(derive(base({ expertise: 'expert', frequency: 'daily', sessionLength: 'hours' })).model.density, 'compact');
  assert.strictEqual(derive(base({ expertise: 'novice', frequency: 'occasional', sessionLength: 'minutes' })).model.density, 'comfortable');
});

test('one font size per text rank, all distinct and legible', () => {
  const d = derive(base({ expertise: 'expert', frequency: 'daily', sessionLength: 'hours' }, { information: { textRanks: ['meta', 'body', 'heading', 'title'] } }));
  const v = Object.values(d.type.sizes);
  assert.strictEqual(v.length, 4);
  assert.strictEqual(new Set(v).size, 4);
  assert.ok(v[0] >= 11);
});

test('each spacing level is at least 1.5x the one inside it', () => {
  for (const exp of ['novice', 'mixed', 'expert']) {
    const s = Object.values(derive(base({ expertise: exp, frequency: 'daily', sessionLength: 'hours' })).space);
    for (let i = 1; i < s.length; i++) assert.ok(s[i] >= s[i - 1] * 1.5, `${exp}: ${s}`);
  }
});

test('every ink and state color passes on every surface it can sit on, both themes', () => {
  const d = derive(demo);
  for (const [theme, c] of Object.entries(d.color)) {
    for (const surface of ['surface-canvas', 'surface-base', 'surface-sunken', 'selection']) {
      for (const ink of ['ink-primary', 'ink-secondary', 'ink-tertiary', 'state-running', 'state-waiting', 'state-error', 'state-success']) {
        assert.ok(contrast(c[ink], c[surface]) >= 4.5, `${theme} ${ink} on ${surface}: ${contrast(c[ink], c[surface]).toFixed(2)}`);
      }
      assert.ok(contrast(c['edge-control'], c[surface]) >= 3 || surface === 'selection', `${theme} edge-control on ${surface}`);
    }
    assert.ok(contrast(c['on-accent'], c.accent) >= 4.5, `${theme} on-accent`);
  }
});

test('only states in the model get a color', () => {
  const d = derive(base({ expertise: 'mixed', frequency: 'daily', sessionLength: 'hours' }, { information: { states: ['error'] } }));
  const keys = Object.keys(d.color.light).filter((k) => k.startsWith('state-'));
  assert.deepStrictEqual(keys, ['state-error']);
});

test('frequent irreversible actions are not given a confirm dialog', () => {
  const d = derive(demo);
  const decide = d.tasks.find((t) => t.id === 'decide');
  assert.strictEqual(decide.tier, 'primary');
  assert.match(decide.treatment.join(' '), /control itself is the confirmation/);
});

test('every derived value carries a reason and premises', () => {
  for (const t of derive(demo).trace) { assert.ok(t.because.length > 20, t.key); assert.ok(t.principles.length > 0, t.key); }
});

test('lint: literal values are underived, meaning tokens pass', () => {
  const d = derive(demo);
  const ctx = () => ({ names: tokenNames(d), projectVars: new Set(), suppressed: 0 });
  const rules = (s) => lintText(s, 'x.css', d, ctx()).map((f) => f.rule);
  assert.deepStrictEqual(rules('.a { padding: var(--gap-group); color: var(--ink-secondary); }'), []);
  const r = rules('.a { padding: 13px; color: #333; font-size: 17px; transition: all .5s; z-index: 9999; background: linear-gradient(#f0f, #0ff); }');
  for (const id of ['raw-space', 'raw-color', 'raw-size', 'raw-motion', 'raw-layer', 'decorative-color', 'motion-unscoped']) assert.ok(r.includes(id), id);
  assert.ok(!rules('.a { transition: background-color var(--duration-state) var(--ease-enter); }').includes('motion-unscoped'));
  assert.ok(lintText('<div class="card transition-all">x</div>', 'x.html', d, ctx()).some((f) => f.rule === 'motion-unscoped'));
  assert.ok(rules('.a { padding: var(--gap4); }').includes('unknown-token'));
  assert.ok(!rules('.a { color: #123456; } /* derive-ignore raw-color: logo artwork from brand guide */').includes('raw-color'));
});

test('model check catches missing facts', () => {
  const msgs = checkModel({ tasks: [{ id: 'a', does: 'a', frequency: 'often', consequence: 'low' }] }).map((p) => p.message).join('\n');
  assert.match(msgs, /purpose/);
  assert.match(msgs, /frequency must be/);
  assert.deepStrictEqual(checkModel(demo).filter((p) => p.level === 'error'), []);
});

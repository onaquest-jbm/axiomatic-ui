'use strict';
// The derivation engine. Input: a model of the people, their tasks and the information.
// Output: every design value the interface may use, each with the reasoning that produced it.
// Pure function, no I/O, so it also runs in the browser (the overview page uses it live).

const C = require('./color');

const FREQ = { constant: 4, frequent: 3, occasional: 2, rare: 1 };
const round2 = (v) => Math.max(2, Math.round(v / 2) * 2);

function derive(model) {
  const trace = [];
  const note = (key, value, because, principles, inputs) => { trace.push({ key, value, because, principles, inputs: inputs || {} }); return value; };
  const people = model.people || {};
  const ctx = model.context || {};
  const devices = ctx.devices || ['desktop'];
  const inputs = ctx.input || ['mouse', 'keyboard'];
  const touchFirst = devices[0] === 'phone' || (inputs[0] === 'touch');

  // ---- Density: how much is shown at once.
  const expert = people.expertise === 'expert';
  const novice = people.expertise === 'novice';
  const long = people.sessionLength === 'hours';
  const often = people.frequency === 'daily';
  let density = 'regular';
  if (expert && (long || often)) density = 'compact';
  else if (novice || people.frequency === 'occasional') density = 'comfortable';
  if (model.override && model.override.density) density = model.override.density;
  note('density', density,
    density === 'compact'
      ? 'Experts in long, daily sessions gain more from seeing more at once (less scrolling, less to remember) than they lose to tighter spacing; they already know the layout.'
      : density === 'comfortable'
        ? 'Novice or occasional users are still parsing the layout, so groups need more separation to be read correctly.'
        : 'Mixed expertise: balance information per screen against how easily groups are parsed.',
    ['memory', 'grouping'], { expertise: people.expertise, frequency: people.frequency, sessionLength: people.sessionLength });

  // ---- Type: base size from viewing distance and density, ranks from the information's hierarchy.
  const bodyTable = touchFirst ? { compact: 15, regular: 16, comfortable: 17 } : { compact: 13, regular: 14, comfortable: 16 };
  const body = note('type.body', bodyTable[density],
    touchFirst ? 'Phones are read at about 30 cm in variable light; 15-17 px keeps text above the comfortable legibility threshold.'
      : 'Desktop text is read at 50-70 cm; 13-16 px is legible, and denser layouts sit at the low end.',
    ['legibility'], { primaryDevice: devices[0], density });
  const minLegible = touchFirst ? 12 : 11;
  const ratio = note('type.ratio', { compact: 1.15, regular: 1.2, comfortable: 1.25 }[density],
    'Adjacent ranks must differ by at least ~15% in size to be read as different ranks rather than inconsistency; denser layouts use the smallest step that is still distinct.',
    ['encoding', 'salience'], { density });
  const ranks = (model.information && model.information.textRanks) || ['meta', 'body', 'heading', 'title'];
  const bodyIdx = Math.max(0, ranks.indexOf('body'));
  const sizes = {};
  let prev = 0;
  ranks.forEach((r, i) => {
    let v = Math.round(body * Math.pow(ratio, i - bodyIdx));
    if (i < bodyIdx) v = Math.max(minLegible, v);
    if (v <= prev) v = prev + 1;
    sizes[r] = v;
    prev = v;
  });
  note('type.sizes', sizes,
    `One size per text rank the information actually has (${ranks.length}): ${ranks.join(', ')}. No other sizes exist, so every size difference means a rank difference. Smaller ranks are clamped to ${minLegible} px.`,
    ['encoding', 'legibility'], { ranks, ratio, body });
  const weights = note('type.weights', { regular: 400, strong: 600 },
    'Two weights: weight is a second channel for rank when size steps are small. A third weight would be a difference people cannot reliably name.',
    ['encoding'], {});
  const leading = note('type.leading', { body: density === 'compact' ? 1.4 : 1.5, heading: 1.25 },
    'Body line height of 1.4-1.5 lets the eye find the next line; headings are short, so tighter leading keeps them one unit.',
    ['legibility', 'grouping'], { density });
  const measure = note('type.measure', '68ch',
    'Running text is limited to about 68 characters per line, inside the 45-75 range where reading speed and return sweeps are best.',
    ['legibility'], {});

  // ---- Spacing: one value per level of relatedness.
  const levels = ['control', 'related', 'group', 'section', 'region'];
  const step = 1.6;
  const related = body * 0.5;
  const space = {};
  levels.forEach((lvl, i) => { space[lvl] = round2(related * Math.pow(step, i - 1)); });
  for (let i = 1; i < levels.length; i++) {
    while (space[levels[i]] < space[levels[i - 1]] * 1.5) space[levels[i]] += 2;
  }
  note('space', space,
    `Five relatedness levels: inside a control, between related items, between groups, between sections, between regions. Each is at least 1.5x the level inside it, so proximity alone tells people what belongs together. Base: half the body size (${related}px); grid: 2 px.`,
    ['grouping', 'encoding'], { body, step });

  // ---- Targets.
  const minTarget = note('target.min', touchFirst ? 44 : 24,
    touchFirst ? 'Fingertip contact is about 10 mm; 44 px is the smallest reliable touch target.' : 'With a mouse, 24 px is the floor below which pointing time and errors rise sharply.',
    ['pointing'], { input: inputs });
  const touchTarget = !touchFirst && inputs.includes('touch')
    ? note('target.touch', 44, 'Touch is also an input, so layouts used with a finger (coarse pointer or phone width) switch to 44 px targets.', ['pointing'], { input: inputs })
    : null;
  const lineH = Math.round(sizes.body * leading.body);
  const controlHeight = note('target.control', Math.max(minTarget, round2(lineH + 2 * space.control + 4)),
    `Control height = one line of body text (${lineH}px) plus control padding on both sides, but never below the minimum target.`,
    ['pointing', 'grouping'], { lineH });
  const radius = {
    control: note('radius.control', Math.max(2, round2(controlHeight * 0.18)),
      'Rounded corners mark a thing as one pickable object. A small radius proportional to control height reads as a control without competing with content.',
      ['convention', 'encoding'], { controlHeight }),
  };
  radius.container = note('radius.container', radius.control + space.control,
    'Containers that hold controls use the control radius plus the inner gap, so the inner and outer curves stay concentric and read as one shape.',
    ['grouping'], {});

  // ---- Color.
  let hue = 250;
  let hueWhy = 'No brand color given: blue, the long-standing convention for interactive and selected things.';
  if (model.brand && model.brand.accent) {
    const p = C.parseColor(model.brand.accent);
    if (p) { hue = Math.round(C.rgbToOklch(p).h); hueWhy = `Hue taken from the brand accent ${model.brand.accent}.`; }
  } else if (model.brand && typeof model.brand.hue === 'number') {
    hue = model.brand.hue; hueWhy = `Brand hue ${hue}.`;
  }
  note('color.hue', hue, hueWhy, ['convention'], {});
  const themes = model.themes || ['light', 'dark'];
  const states = (model.information && model.information.states) || [];
  const STATE_HUE = { error: 27, danger: 27, failed: 27, warning: 75, waiting: 75, success: 150, done: 150, running: hue, info: hue };
  const color = {};
  for (const theme of themes) {
    const light = theme === 'light';
    const nC = 0.006;
    const surf = {
      canvas: C.oklchHex(light ? 0.975 : 0.185, nC, hue),
      base: C.oklchHex(light ? 0.998 : 0.215, nC, hue),
      sunken: C.oklchHex(light ? 0.955 : 0.16, nC, hue),
    };
    const on = surf.base;
    const side = light ? 'darker' : 'lighter';
    const solve = (target, h, chroma, against = on) => C.solveLightness(target + 0.08, against, h, chroma, side);
    // Selection is a surface too: selected rows carry text. It stays within the surface lightness range.
    const selection = C.oklchHex(light ? 0.94 : 0.27, 0.035, hue);
    // Ink must pass on every surface it can sit on, so solve against the worst one
    // (the darkest in light themes, the lightest in dark themes).
    const lumOf = (h) => C.luminance(C.parseColor(h));
    const candidates = [surf.canvas, surf.base, surf.sunken, selection];
    const worst = candidates.reduce((a, b) => (light ? (lumOf(b) < lumOf(a) ? b : a) : (lumOf(b) > lumOf(a) ? b : a)));
    const t = {
      'surface-canvas': surf.canvas,
      'surface-base': surf.base,
      'surface-sunken': surf.sunken,
      'ink-primary': solve(13, hue, 0.01, worst),
      'ink-secondary': solve(7, hue, 0.012, worst),
      'ink-tertiary': solve(4.5, hue, 0.012, worst),
      'edge-separator': solve(1.25, hue, 0.008),
      'edge-control': solve(3, hue, 0.01, worst),
    };
    const accentChroma = 0.15;
    if (light) {
      // The accent is also used as link text, so it must pass on the darkest surface; white on it then passes too.
      t.accent = solve(4.5, hue, accentChroma, worst);
      t['on-accent'] = '#ffffff';
      t['accent-hover'] = C.oklchHex(C.rgbToOklch(C.parseColor(t.accent)).L - 0.05, accentChroma, hue);
    } else {
      t.accent = solve(6, hue, accentChroma, worst);
      t['on-accent'] = C.oklchHex(0.2, 0.03, hue);
      t['accent-hover'] = C.oklchHex(C.rgbToOklch(C.parseColor(t.accent)).L + 0.05, accentChroma, hue);
    }
    t.focus = t.accent;
    t.selection = selection;
    for (const s of states) {
      const h = STATE_HUE[s] !== undefined ? STATE_HUE[s] : hue;
      t[`state-${s}`] = solve(4.6, h, 0.14, worst);
    }
    color[theme] = t;
  }
  note('color.surfaces', 'canvas, base, sunken',
    'Three surfaces, one per region role: the app canvas, content that sits on it, and inset wells. They differ by a small lightness step so regions separate without borders.',
    ['grouping', 'encoding'], {});
  note('color.ink', 'primary 13:1, secondary 7:1, tertiary 4.5:1',
    'Three text emphasis ranks, each solved to an exact contrast against the lightest/darkest surface it sits on. The lowest rank is still above the 4.5:1 reading floor; each step roughly halves contrast so the ranks are distinct.',
    ['legibility', 'encoding', 'salience'], {});
  note('color.edges', 'separator 1.25:1, control 3:1',
    'Two edge meanings: a separator (only where spacing cannot show the grouping) is faint; a control boundary must reach 3:1 so people can find the thing to click.',
    ['legibility', 'grouping', 'encoding'], {});
  note('color.accent', 'one accent',
    'One accent hue means one thing: the primary action and the current selection. A second accent would be a second meaning competing for the same attention.',
    ['salience', 'encoding'], { hue });
  note('color.states', states.length ? states.join(', ') : 'none',
    `One color per state the information actually has (${states.length}). States not in the model get no color. Each is solved to 4.5:1 so it can be used as text.`,
    ['encoding', 'legibility'], { states });

  // ---- Motion and response.
  const scale = expert ? 0.9 : 1;
  const motion = {
    state: note('motion.state', Math.round(10 * scale) * 10,
      'In-place state changes (color, opacity) need just enough time to read as a change rather than a flicker.', ['motion'], { expert }),
    element: note('motion.element', Math.round(16 * scale) * 10,
      'An element appearing, leaving or expanding: long enough to be seen as one object transforming, short enough not to wait for.', ['motion', 'response'], {}),
    region: note('motion.region', Math.round(22 * scale) * 10,
      'A panel or sidebar crossing a large distance needs the most time to stay readable as movement, and stays under 250 ms.', ['motion', 'response'], {}),
  };
  note('motion.easing', 'decelerate in, accelerate out',
    'Things entering slow down into place (they arrive under control); things leaving speed up (they get out of the way). Overshoot would add motion that means nothing.',
    ['motion', 'encoding'], {});
  const response = note('response', { feedbackMs: 100, progressMs: 1000, cancelMs: 10000 },
    'Every input shows a visible result within 100 ms. Work over 1 s shows progress. Work over 10 s can be cancelled.',
    ['response'], {});

  // ---- Tasks: priority, visibility and treatment.
  const tasks = (model.tasks || []).map((t) => ({ ...t, score: (FREQ[t.frequency] || 2) * 10 + (t.consequence === 'high' ? 3 : t.consequence === 'medium' ? 1 : 0) }));
  tasks.sort((a, b) => b.score - a.score);
  const plan = tasks.map((t, i) => {
    const f = FREQ[t.frequency] || 2;
    const reading = t.kind === 'read';
    const tier = i === 0 ? 'primary' : f >= 3 ? 'secondary' : f === 2 ? 'tertiary' : 'one level down';
    const treatment = [];
    if (reading) {
      treatment.push(tier === 'primary' ? 'the most salient content on its screen' : 'always visible, updates in place; no action needed to see it');
    } else {
      if (tier === 'primary') treatment.push('most salient thing on its screen; the one accent-filled action');
      if (tier === 'secondary') treatment.push('visible, quiet styling');
      if (tier === 'tertiary') treatment.push('visible as a text button, or in context where it applies');
      if (tier === 'one level down') treatment.push('menu, command palette or disclosure');
      if (t.reversible === false && f >= 3) treatment.push('irreversible but frequent: the control itself is the confirmation, so it states exactly what will happen; no extra dialog, which would become a reflex and protect nothing');
      else if (t.reversible === false) treatment.push('irreversible and rare: separated from frequent actions, names its object, needs a deliberate second step');
      else if (t.consequence === 'high') treatment.push('reversible but costly: state the consequence in the control, keep undo available');
      else treatment.push('act immediately; offer undo instead of asking first');
      if (expert && f >= 3) treatment.push('keyboard shortcut, shown next to the label');
    }
    return { id: t.id, does: t.does, kind: reading ? 'read' : 'act', frequency: t.frequency, consequence: t.consequence, tier, treatment };
  });
  note('tasks', plan.map((p) => `${p.id}: ${p.tier}`).join('; '),
    'Tasks are ranked by how often they happen, then by how much a mistake costs. Rank decides salience; frequency decides visibility and target size; consequence decides friction.',
    ['salience', 'choice', 'pointing', 'consequence'], {});
  const budget = note('budget', { primaryPerView: 1, visibleActionsPerGroup: 4, groupsPerLevel: 4 },
    'One primary per view (one thing is seen first). About four visible actions per group and four groups competing at each level, the size of working memory.',
    ['salience', 'memory', 'choice'], {});

  return {
    model: { product: model.product, density, themes },
    type: { sizes, weights, leading, measure, ratio, body },
    space, target: { min: minTarget, control: controlHeight, touch: touchTarget || minTarget }, radius,
    color, motion, response, tasks: plan, budget,
    elevation: { overlay: '0 8px 24px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.10)' },
    z: { base: 0, sticky: 10, overlay: 200, modal: 300, toast: 400 },
    trace,
  };
}

module.exports = { derive };

'use strict';
// node benchmark/settruth.js <file.json>
// Writes reviewed defects (+ maintainer-assigned expect rules) into sites/*/truth.json.
// Input rows: [surface, principle, layer, what, expect]. "what" is condensed from the blind review.
// Expect rules are assigned before any check runs on the site, and are not edited afterwards.
const fs = require('fs');
const path = require('path');
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
const T = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const [site, rows] of Object.entries(T)) {
  const f = path.join(__dirname, 'sites', site, 'truth.json');
  const t = JSON.parse(fs.readFileSync(f, 'utf8'));
  const names = Object.fromEntries((t.surfaces || []).map((s) => [slug(s.name), s.name]));
  t.reviewer = t.reviewer || 'Claude Sonnet, blind review of screenshots and source (never saw the rule list)';
  t.defects = rows.map(([surface, principle, layer, what, expect]) => {
    const s = slug(surface.replace(/\s*390$/, ''));
    const name = s === 'page' ? 'page' : names[s];
    if (!name) throw new Error(`${site}: unknown surface "${surface}"`);
    return { surface: name, principle, layer, what, expect };
  });
  fs.writeFileSync(f, JSON.stringify(t, null, 2) + '\n');
  console.log(site, t.defects.length, 'defects,', t.defects.filter((d) => d.expect.length).length, 'with a rule that could catch them');
}

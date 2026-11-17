# Derive

Interfaces derived from first principles. People, tasks and the limits of perception go in; every visual value, with the reason for it, comes out; then the rendered screen is checked against that reasoning.

> **Every visual difference must mean something, and every meaningful difference must be visible.**

Generated UI looks generated because a model that doesn't know what matters samples the most common-looking choices. It fails both halves of that sentence at once: decoration that means nothing, and a flat screen where the one thing that needs the person looks like everything else. Derive doesn't ban styles. It makes the agent know what each thing means, and then encode exactly that.

## How it works

```
model.json  ──derive system──▶  every value + its reason  ──build──▶  screen  ──derive verify──▶  does it still say that?
people, tasks,                   tokens named by meaning               only those        salience order, Fitts order,
information,                     (--gap-group, --ink-secondary)        tokens            grouping gaps, one primary,
screen plans                     derivation.md                                           human limits, only derived values
```

1. **Model** (`derive-model` skill): who the people are (expertise, frequency, session length), their tasks (frequency, consequence, reversibility), the information's text ranks and states. These are facts from the owner, never invented.
2. **Derive** (`derive system`): density, type sizes (one per rank), spacing (one per relatedness level, each ≥1.5x the last), targets, a color ramp solved to exact contrast in both themes, one color per state, motion durations, task tiers and treatments. `derive why model.json <key>` explains any of them.
3. **Plan and build** (`derive-screen` skill): each screen's salience order, actions with frequencies, and groups go into the model, then the build uses only meaning-named tokens.
4. **Verify** (`derive verify`, `derive-verify` skill): render at each width and theme, then check that the planned first element is the most salient thing on screen, that salience follows priority, that frequent actions are the bigger targets in their region, that groups are tighter inside than out, that there's one accent-filled action, that only derived values appear, and that human limits hold. Then look at the screenshots.
5. **Critique** (`derive-critique` skill): a fresh subagent asks what each visible difference means and which meanings are missing.

**Existing interfaces** (`derive-retrofit` skill): render the screen, recover the model from the product and confirm it with the owner, sort every value in use into "has a meaning", "duplicates a meaning" or "means nothing", find meanings the screen never shows, then decide honestly whether to rebuild the system, correct a few things, or leave it alone. Nothing changes until the owner has seen the recovered model.

The twelve premises, with sources: [docs/PRINCIPLES.md](docs/PRINCIPLES.md), or `derive principles`.

## Try it

```bash
node bin/derive.js check demo/model.json
node bin/derive.js system demo/model.json --out demo/design
node bin/derive.js why demo/model.json space
node bin/derive.js lint demo/after.html --model demo/model.json
node bin/derive.js verify demo/scenarios.json --out demo/report
node test/derive.test.js
```

No dependencies. Node 16+. `verify` drives any installed Chrome, Edge or Chromium over the DevTools protocol (`DERIVE_BROWSER` picks one).

## In a project

- Claude Code: install as a plugin (`.claude-plugin/plugin.json`), or copy `skills/*` to `.claude/skills/`. The hook in `hooks/` lints every UI file the agent edits against the nearest `model.json`.
- Other agents: `AGENTS.md`.
- CI: `derive lint src --model model.json` and `derive verify scenarios.json` both exit non-zero on floor or meaning findings.

## Status

v0.3 adds the retrofit path, rules for words, numbers, charts and icons, a tells reference for critique, and a lint rule for `transition: all`. v0.2 was verified on Windows with Edge on the demo (before: 59 findings; after: 0 at both widths in both themes), 9 unit tests. The salience model is a simple heuristic (size × contrast × chroma × position) used as a tripwire, not a model of vision. Not yet tried on a real codebase with a real model, and not yet used by a fresh agent end to end.

## Acknowledgements

Several of the patterns in `skills/derive-critique/tells.md`, and the idea of sizing a change before touching an existing screen, are adapted from [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Derive takes a different approach: it doesn't fix those patterns one at a time, it traces each one back to the missing decision that caused it.

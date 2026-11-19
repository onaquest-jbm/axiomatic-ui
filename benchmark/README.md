# Benchmark

A growing set of interfaces with known problems, used to measure what Axiomatic UI's checks actually catch. It is meant to get larger over time, and every change to `lint`, `verify` or the skills should be run against it.

Two corpora:

| | What it is | Ground truth | Runner |
|---|---|---|---|
| **Planted** (`cases.js`) | One known defect planted on a copy of the clean demo page (`demo/after.html` plus a clean menu and settings dialog). Controlled: the only difference from the clean control is the defect. | Written in `cases.js` before any check ran: the principle it breaks, the cheapest layer that could detect it, and the rule ids that would count as catching it (`[]` = no rule exists). | `node benchmark/run.js` |
| **Generated** (`sites/`) | Whole pages built by other models (Claude Sonnet, and gpt-6.2-sol through the Codex CLI) from ordinary product briefs. The builders were not told what the pages were for. | `sites/<site>/truth.json`: an independent reviewer (a separate model that saw only screenshots and source, never the rule list) listed the problems; each was then mapped to the rules that would count as catching it, before the checks ran. | `node benchmark/shots.js` (screenshots for reviewers), `node benchmark/run-sites.js` |

Results are written to `results/` (committed). Built pages, screenshots and reports go to `build/` (ignored).

To compare approaches, freeze each one as a run (`node benchmark/viewer/snapshot.js --label "<name>"`, then `node benchmark/viewer/build.js`) and open `benchmark/viewer/index.html`. It shows each run's numbers and, per generated site and surface, before and after screenshots with each defect's status in both runs. Run JSON is committed. Run screenshots (about 7 MB per run) stay local.

Current baseline (v0.3): planted 45 of 70 caught; generated 14 of 118 caught, 79 with no rule at all. See `docs/ROADMAP.md`.

## How a defect is scored

- **caught**: a rule listed in `expect` fired on that page (or surface) and not on its clean control.
- **other signal**: something new fired, but not a rule meant for this defect.
- **silent**: nothing new fired.
- **no rule**: ground truth says no rule is designed to catch it. These are not failures of a rule; they are the principles that are stated but never checked.

Rare surfaces (menus, dialogs, popovers, toasts, tooltips) are rendered twice in the planted set: opened by a click step, and already open at load. `verify` probes the page once, before steps, so the difference between the two shows what it cannot reach.

## Adding cases

- Planted: add an entry to `CASES` in `cases.js`. Write `defects` (principle, layer, what, expect) first, and do not edit them after seeing results. Every `replace` must match or the build fails.
- Generated: put a single self-contained `index.html` in `sites/<name>/`, write `truth.json` with `builder`, `brief`, and `surfaces` (`{ name, opener, event? }`), run `shots.js`, have someone who has not seen the rules review the screenshots, then add `defects`.

## Limits

- The planted cases were written by the same agent that maintains the tools. They test whether a rule works on the problem it targets, not whether the rules cover what real generated pages get wrong; the generated set is for that.
- The generated pages have no `model.json`, so they are checked against the demo model with no screen plan. Only floor and meaning findings count there; derivation findings would be noise.
- This measures `lint` and `verify`. The skills (model, plan, critique) are not measured yet.

# Benchmark results viewer

Static, no dependencies, opens from disk (no server).

A run is a frozen copy of the benchmark state for one approach or iteration of the project.

1. Produce results as usual (`benchmark/run.js`, `run-sites.js`, `shots.js`).
2. Freeze them: `node benchmark/viewer/snapshot.js --label "v0.4 probe-after-steps" --note "what changed"`
   Copies `results/*.json`, each site's `truth.json`, the 1280 and 390 light screenshots and their rectangle sidecars, and records the git commit and a sha1 of each site's `index.html` in `benchmark/runs/<slug>/`. A label that already exists is refused.
3. Rebuild the data file: `node benchmark/viewer/build.js` (writes `benchmark/viewer/data.js`).
4. Open `benchmark/viewer/index.html` in a browser.

Pick the comparison sources at the top. The default compares Unmodified sites with the latest run. The Sites tab marks pages whose hashes differ between the chosen sources.

Runs are not meant to be edited by hand. `benchmark/runs/*/shots` is about 8 MB per run; consider ignoring it in git.

## Comparing with the unmodified sites

Both pickers include **Unmodified sites**: the generated pages as the models built them, with the problems the blind review found and no tool results. Compare it with a run to see what the tools catch on each site, or with a run whose pages were fixed (their hash differs, marked "page changed") to see before and after.

Each site card lists all problems for its selected surface. The list groups Caught, No rule, and Missed in that order, followed by the remaining statuses. It uses the right-hand run's status, or the left-hand run's when comparing with Unmodified sites on the right.

Select a problem to highlight its region on both screenshots. Select it again to clear the highlight. **No single region** means the review has no selector for that problem. **Not on this page** means that screenshot has no rectangle for the selected problem, which can happen when the element is off screen, absent, or from a run captured before rectangle data was collected.

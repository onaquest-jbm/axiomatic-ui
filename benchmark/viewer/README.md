# Benchmark results viewer

Static, no dependencies, opens from disk (no server).

A run is a frozen copy of the benchmark state for one approach or iteration of the project.

1. Produce results as usual (`benchmark/run.js`, `run-sites.js`, `shots.js`).
2. Freeze them: `node benchmark/viewer/snapshot.js --label "v0.4 probe-after-steps" --note "what changed"`
   Copies `results/*.json`, each site's `truth.json`, the 1280 and 390 light screenshots, and records the git commit and a sha1 of each site's `index.html` in `benchmark/runs/<slug>/`. A label that already exists is refused.
3. Rebuild the data file: `node benchmark/viewer/build.js` (writes `benchmark/viewer/data.js`).
4. Open `benchmark/viewer/index.html` in a browser.

Pick a Before and an After run at the top (default: the two most recent). The Generated sites tab says whether a site's page changed between the runs (sha differs) or only the tools did.

Runs are not meant to be edited by hand. `benchmark/runs/*/shots` is about 8 MB per run; consider ignoring it in git.

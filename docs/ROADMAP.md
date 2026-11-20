# Roadmap

Written 2026-11-19, after the first benchmark run (`benchmark/`). Part A is the plan for what to do next. Part B is a roadmap for four larger questions; nothing in Part B is being acted on yet.

## Update, same day: Part A steps 1, 3 (partly) and 4 done

Measured by re-running the benchmark (`benchmark/results/`, frozen as the run "v0.4 surfaces + attach" in the viewer):

- **Step 1, done.** `verify` now checks what every click reveals (menus, dialogs, popovers, panels, new views), reports only what wasn't already on the page, and lists which likely openers were never exercised. `--explore` clicks every likely opener on a fresh load and checks each. Planted surface defects opened by a click, counting `verify` alone: **11 of 14 caught**, against 1 of 14 in the baseline run. The same defects already open at load: 10 of 14, against 9. The click path now scores at least as well as the open path, which was the done criterion. With `lint`, 12 of 14 are caught on the click path. The modal-primary false alarm is gone on the click path, because a surface is checked on its own.
- **Step 3, partly.** New checks:
  - `too-many-peers` (more than twice the derived `visibleActionsPerGroup` undivided actions);
  - `destructive-unseparated` (an irreversible action placed among routine ones, with no separator and the same fill and weight);
  - `covers-trigger` (a non-modal overlay covering the control that opened it);
  - `surface-offscreen` (a fixed panel that doesn't fit the window).

  `groupsPerLevel` is still unchecked.
- **Step 4, done.** `verify --attach <port>` checks a running app, and works on the owner's Electron app through its new inspect fixture (private results):
  - 9 menus and dialogs checked at two widths, against none before;
  - new floor problems on rare surfaces (13 px checkboxes, a 20 px tall menu);
  - a destructive action beside a routine one.

  The meaning problems that make that app look worst are still not caught (about 1 of 7).
- **Overall:**
  - Planted: 50 of 70 caught (was 45).
  - Generated sites: 19 of 118 (was 14). The new rules catch 4 of the 12 reviewed problems mapped to them. The mapping was made after the rules were written, for every problem of that kind and not only the ones they caught. One of the 4 (a Delete placed directly under Archive) came after `destructive-unseparated` was changed to ignore text colour as separation, so that number was tuned on the test set.
  - Known false alarms: `destructive-unseparated` fires on "Remove <item>" beside "Add note" in a cart, where removal is routine and has undo, so reversibility needs judgment. `layout-shift` on the long-transcript control now fires with a plan too (timing, flaky).
  - Still silent: plan-dependent salience (step 2), and judgment.
- **Step 2, done (programmatic part).** `verify --infer-plan` (`src/infer.js`) drafts a screen plan from meaning only (text, roles, forms, landmarks; never size or colour):
  - a region that asks for a decision and holds the answer;
  - the view's main action;
  - rare actions, by their labels;
  - groups, from fieldsets and label/field pairs.

  Results:
  - Planted: 49 of 70 caught with an inferred plan, against 50 with the hand-written plan and 46 with none, and no new false alarms on the clean controls.
  - Generated sites: **27 of 118**, against 19 with no plan. The new catches are the blocking approval below the fold, the wrong loudest element, a quiet main call to action, a decorative hero and two spacing problems.
  - Each page also gets a few plan-based findings that match no reviewed problem. Some look real (a skip link left visible), some doubtful (quantity steppers read as split groups); precision is not measured yet.
  - Not done: the model call for pages where the rules find nothing (a dashboard and a landing page got no plan). The rules inferred the primary action of six of the eight generated sites. ALI's quiet model picker (Trial 1 item 1) needs a frequency the labels don't give.
- **Gap analysis:** `benchmark/results/gap-analysis.md` (by gpt-6.2-sol, read-only) clusters the 79 no-rule problems, rates each cluster as programmatic, LLM or human-judged, and gives the cause of each silent case.
- **Prompt sweep** (`benchmark/results/sweep-findings.md`): the same app built 12 ways. Adding one sentence, "make it look modern, stunning and premium", to a one-line brief roughly triples the problems at desktop width (mean 25 against 7). Blind reviewers rated the worst "stunning" page 4/10 but did not separate the other three pages. Building feature by feature in six fresh sessions did not make things worse; long accretion across files is untested.

## What the benchmark showed (first run)

Full tables: `benchmark/results/planted.md` and `benchmark/results/sites.md`; visual comparison: `benchmark/viewer/`.

**Planted defects (70, self-authored, one defect per page):** 45 caught (64%).
- Problems visible in source: 25 of 25 caught. Problems that need the rendered page: 19 of 31. Problems that need judgment: 1 of 14 (no rule exists for 12 of them).
- `consequence`, `memory`, `choice` and `convention`: 0 of 11 caught. No rule exists for most of them.
- **Rare surfaces:** when a menu or dialog is opened by a click (how people reach it), `verify` catches 1 of 14 surface defects. When the same defects are already open at load, it catches 9 of 14. `verify` probes the page once, before any step runs.
- Without a screen plan, recall drops from 45 to 41, and the salience and grouping checks mostly go quiet.
- **Silent where a rule should have fired (causes not yet diagnosed):**
  - hiding a planned action with `display: none` (`plan-missing` did not fire)
  - a block wider than the phone inside a scroll container (`horizontal-scroll`)
  - a 600 ms delay before a click shows anything (`slow-response`)
  - a banner inserted 150 ms after load (`layout-shift`, possibly below its 0.02 threshold)
  - a pending decision faded to 55% opacity (the salience checks)
  - a dialog wider than the phone (it is `position: fixed`, so the page itself does not scroll)
- **False alarms on clean pages:** a modal dialog's own primary button is counted as competing with the page's primary. One `layout-shift` fired on a long-transcript control without a plan.

**Generated sites (8, built by Sonnet and gpt-6.2-sol from ordinary briefs; 118 problems found by blind review):** 14 caught (12%), 25 silent, 79 with no rule.
- Of the 39 that have a rule meant for them, 14 are caught (36%), almost all `low-contrast` and `small-target`.
- Judgment-layer problems: 0 of 50.
- **About half the problems were on menus, dialogs, popovers, drawers and toasts**, and 2 of those were caught. In this run those surfaces were rendered already open, so the low catch is not about reach: most of those problems have no rule. In normal use, `verify` would not reach them at all (see the planted result above).
- Without a model or plan, `lint` reports 114-257 derivation findings per site (noise) and 0 floor findings.
- **The builders reproduced the same failures:** both the Sonnet and Codex pages put the blocking or primary action below the fold or in a secondary style, used one accent for five meanings, and placed destructive actions in plain lists with no separation.

**A real app (private):** the owner's own Electron app for supervising coding agents was checked privately. `verify` cannot attach to it yet. `lint` reports hundreds of per-line value findings, and of the seven meaning problems a manual review had found, 0 are caught cleanly and 1 only as noise. The `agent-desk` site, built by Sonnet from a description of the same kind of product, reproduced several of those problems without being asked to.

**What this means.** The current tools are good at what can be read from source, and at floors (contrast, target size) on the main page. They miss most of what makes generated UI look generated: the wrong thing is loudest, colour means several things, destructive actions sit unguarded, and rare surfaces are worse than the main one. Those are judgment and plan problems, and that is where the work is.

**Caveats.**
- The planted cases are written by the maintainer, so they test whether a rule works on the problem it targets, not coverage of real problems.
- One Sonnet reviewer per site set the generated ground truth, with no second reviewer to measure agreement. Two reviewed problems were removed as artifacts of how surfaces were opened (scripted clicks). A few focus-ring complaints are flagged as possibly the same.
- On generated sites, a problem counts as caught when its rule fired anywhere on that page or surface, so 14 is an upper bound.
- The generated sites have no `model.json`.
- These are single runs. The timing rules look flaky: a clean control drew `layout-shift` in one mode and not the other.
- The "known weak spots" in Part B are from reading `principles.js` and from memory of the literature. The source review itself is still to do.

---

# Part A: the plan after the benchmark

In order. Each step is measured by re-running the benchmark; a step is done when its numbers move, not when its code exists.

1. **Make `verify` reach every surface.** Run the probe after every step, not only at load, and add a surface inventory to the scenario format: every menu, submenu, dialog, popover, drawer, sheet, tooltip, toast and state, each with the step that opens it. The report lists inventory items that were never rendered, and each one counts as a finding. Done when the planted surface cases score the same opened by a click as already open at load.
2. **Infer a plan when there isn't one.** Most of the meaning checks need a screen plan (what should be seen first, which actions are frequent, what belongs together), and an arbitrary page has none, which is why they go quiet on generated pages. Add a `plan` step that drafts one from the DOM and `model.json`, programmatically where it can (control frequency from position, labels and shortcuts) and with one small model call where it can't, marked as inferred until the owner confirms it. Done when the generated-site recall without a hand-written plan approaches the planted recall with one.
3. **Check the budgets the derivation already computes.** `derive` produces `visibleActionsPerGroup`, `groupsPerLevel` and task tiers, and nothing checks them. Adding these turns `memory` and `choice` from stated into acted on with no new theory.
4. **`verify --attach`** to an existing DevTools endpoint (Electron, a running dev server), then run the whole benchmark loop on a real app, with its manual review findings as ground truth.
5. **`inventory` command, and `lint` grouped by cluster** (12 / 12.5 / 13 / 13.5 px as one finding with a suggested mapping, not 120 lines).
6. **Grow the corpus.** More generated sites from more builders, a second independent reviewer per site so agreement can be measured, and the planted set extended for every new rule (a rule without a benchmark case is not finished).

---

# Part B: roadmap (not acted on yet)

## 1. Solidify the philosophy, and review every source

**Separate three kinds of statement that are currently mixed together.**

- The **axiom**: every visual difference must mean something, and every meaningful difference must be visible. This is a design commitment, not an empirical claim, and it should be defended as one.
- **Premises**: facts about people (pointing time, working memory, contrast thresholds, response-time thresholds). These are empirical, and each needs a source that actually says what we claim.
- **Policies**: the numbers chosen to act on a premise (1.5x spacing ratio, 100-250 ms motion, 13:1 / 7:1 / 4.5:1 ink ramp, about 4 groups per level). Several of these are reasonable choices, not findings, and should say so.

**Grade every principle.** Give each one: the claim, its source read in the original, evidence strength (A: replicated experimental finding; B: established standard or widely used model; C: convention or vendor guidance), the boundary conditions where it stops holding, and the check that enforces it. Publish the grades in `PRINCIPLES.md`.

**Known weak spots to start with** (from reading the current `principles.js`):

- `choice` cites Hick-Hyman, which holds for equally likely, unpracticed choices. Experts with practiced, unequal choices show much flatter costs. The policy ("rare actions one level down") may still be right, but for a different reason (visual search and clutter), and the source should change.
- `memory` cites Cowan's ~4 chunks for working memory. Applying it to "groups on a screen" is an inference, not the finding. Visual search and clutter research may be the better basis.
- `grouping`'s 1.5x ratio is a policy. Kubovy & van den Berg show that grouping strength follows relative distance, but not that 1.5 is the threshold. Measure it, or grade it C.
- `encoding` cites Bertin (a theory) and Mackinlay (an automated-design system). Cleveland & McGill's measured ranking of perceptual channels is the empirical source to add.
- `salience` cites Itti & Koch, but the tool's salience score (size × contrast × chroma × position) is a home-made heuristic that has never been validated. Validate it against a public UI saliency dataset with eye-tracking ground truth (for example UEyes, CHI 2023), or present it as a tripwire only.
- `legibility`'s 45-75 characters is typographic convention. Screen-reading studies (Dyson) found longer lines read as fast or faster, while people prefer shorter ones. Keep the range, grade it B/C, and say it's about comfort.
- `legibility` uses WCAG 2 contrast ratios, which are legally relevant but known to be inaccurate for dark themes and thin text. Note APCA as the likely successor, and decide whether to report both.
- `motion` durations come from Material and Apple guidance (convention, grade C). Michotte supports "motion reads as causation", not the specific numbers.

**Open philosophy questions to settle in writing.**

- What "visible" means: always visible, or visible when it becomes relevant? Progressive disclosure is compatible with the axiom only under the second reading, so say so.
- **Equal quality on every surface.** Frequency decides how prominent something is, never how well it is made. A menu opened once a month meets the same floors and uses the same tokens as the main screen. This is a corollary of the axiom (an off-system menu is a visual difference that means nothing), and it should be written down as one, because it is the failure people notice most.
- Brand and identity: is "this is product X" a meaning the axiom allows a channel for? It has to say yes or no, because every real product will ask.
- Who decides a meaning. Today it's the owner, through the model. Write down what happens when the owner's preference conflicts with a premise (see 2b).

**Process:** a sources table (claim, quote, page, grade) checked by someone outside the project, ideally an HCI researcher, before any public "first principles" claim is made more loudly.

## 2. Every stated principle is acted on

**Rule:** a principle that no check enforces at some layer (source, rendered page, or judgment) is either given a check, demoted from "principle" to guidance in the skills, or cut. The benchmark's principle-by-status table is the evidence, and it is re-run every time.

**Where each stands now and what would make it acted on:**

| Principle | Checks today | Planted caught | Generated caught | What would make it acted on |
|---|---|---|---|---|
| encoding | lint (raw values, decoration), verify (off-palette) | 14/15 | 1/15 | A colour-role check (one hue used for several roles), and the same tokens on every surface |
| salience | verify, needs a plan | 5/8 | 0/14 | Plan inference (A2); count opacity in the salience score |
| grouping | verify, needs a plan | 3/4 | 0/12 | Infer groups from DOM structure when there is no plan |
| legibility | lint + verify floors | 12/17 | 7/19 | Probe after steps (A1), overflow inside scroll containers, a line-length measure |
| pointing | verify | 3/4 | 5/10 | Mostly works; frequency order needs a plan |
| motion | lint + verify | 6/7 | (none found) | Catch late shifts inside scroll containers |
| response | verify (click timing) | 1/2 | 0/5 | Fix delayed-feedback timing; check that every action leaves visible evidence |
| purpose | `plan-missing` only | 1/2 | 0/10 | Flag visible elements that map to no task in the plan |
| memory | none | 0/1 | 0/1 | Check `groupsPerLevel` from `derive` |
| choice | none | 0/3 | 0/9 | Check `visibleActionsPerGroup` and frequency tiers against what is visible |
| consequence | none on screen | 0/5 | 1/14 | Detect destructive actions (model tasks, labels, danger styling); check separation, a label that names the object, and confirm/undo by reversibility × frequency |
| convention | none | 0/2 | 0/9 | Judgment only; move it into the model (see below) |

**Candidate cuts and merges (the owner's call).** Twelve principles is more than the evidence supports:

- Merge `motion` and `response` into one **time** principle (feedback within 100 ms, progress past 1 s, motion only to show a change, never long enough to wait for).
- Merge `memory` and `choice` into one **load** principle (how many things compete at once, and which are one step away), checked by the budgets `derive` already computes.
- Make `purpose` the axiom's first clause rather than a separate principle: an element that serves no task is a difference that means nothing.
- Move `convention` out of the principles and into the model: the owner names the reference products, the plan follows their skeleton, and the critique checks against it. It is a constraint on choices, not a fact about perception.
- That leaves about seven principles (encoding, salience, grouping, load, pointing, time, legibility, plus consequence), each with a check.

### 2b. Principles that apply differently, or not at all

Make the magnitude of each principle an explicit function of the model, instead of a hidden constant:

| Principle | Scales with | Example |
|---|---|---|
| pointing | input (touch vs mouse), frequency | 44 px on touch; frequent actions bigger; experts with shortcuts care less |
| load (choice/memory) | expertise, frequency, session length | experts on a daily tool tolerate dense screens; one-time wizards should show very little |
| time | consequence, data volume | optimistic updates for reversible actions only |
| salience | screen type | a dashboard may have no single "first" thing; say which screens are exempt and why |
| legibility | none below the floor | contrast, size and zoom floors are not adjustable: they are accessibility requirements |
| consequence | reversibility × frequency | already in the model |

**Owner preferences** become a declared layer on top: density (compact or comfortable), strictness (prototype, production), and named exceptions. Each override needs a reason and a scope, and is logged in `derivation.md`, so a preference is visible as a preference, not hidden in a value. Floors (contrast, target minimums, focus, zoom) cannot be overridden.

## 3. How much model use: three tiers

The same pipeline at three costs. The benchmark scores each tier, so the choice is made on measured recall per dollar, not on assumption.

| | **1. Programmatic** ("low cost") | **2. Mixed** ("moderate") | **3. Agentic** ("high quality") |
|---|---|---|---|
| What runs | `lint`, `verify`, `inventory`. No model calls. | Tier 1, plus a small model where a heuristic says judgment is needed (below). | Tier 2, plus an independent critique of every surface from screenshots, two reviewers on different models, adjudication, and a fix-and-reverify loop. |
| Catches | source floors and meaning checks where a plan exists | plus inferred plans (which unlocks most meaning checks), labels that don't say what happens, unseparated destructive actions | plus judgment-only problems: purpose, convention, contradictions between data and display |
| Rough cost per screen | CPU seconds, $0 | about $0.01-0.05 (one or two small-model calls with a DOM summary, about 5-15k tokens) | about $0.30-1.00 with a Sonnet-class reviewer (screenshots of every surface, about 100k tokens, matching this benchmark's reviewers); 2-4x with an Opus-class model or two reviewers |
| Use for | every save (the hook), CI | every pull request that touches UI | releases, retrofits, new products |

**When tier 2 calls a model** (the escalation heuristic, cheapest first):

1. There is no plan for the screen: infer one (one call per screen, cached until the DOM's structure changes).
2. The surface contains a destructive or irreversible action (detected from the model's tasks, labels like delete/remove/stop/revoke, or danger styling): check separation, labelling and confirmation.
3. A programmatic measurement is borderline (contrast within 10% of the floor, a salience order within 25%): ask a model to look at that crop.
4. A principle has no programmatic check on this surface type: route just that principle to a model.
5. Nothing changed since the last pass: skip.

**Models and reasoning levels to compare** on the benchmark: small, mid and large models at low, medium and high effort, for the plan-inference step and the critique step separately. The likely result to test is that plan inference works at small/low and critique needs mid/medium or more, but it should be measured. The reviewer used to write this benchmark's ground truth is itself a first tier-3 prototype; agreement between two different reviewer models is the first thing to measure, because it bounds how good tier 3 can look.

## 4. Next steps toward a product

Generated interfaces look generated, and today's tools only catch part of the problem. Accessibility checkers (axe, Lighthouse) catch floors. Linters and token systems catch values that are off the system. Visual-regression tools catch change, not quality. As far as I know (a proper market scan is a step below), nothing checks whether a rendered interface says what matters, in the right order, on every surface, against a statement of what the product is for. That gap is the product.

1. **Prove it with an A/B, not more features.** Give a fresh agent the same product briefs used here, with and without Axiomatic UI, and have blind reviewers score both. "Pages built with it have N% fewer problems found by blind review, at this cost" is the claim the product needs. Nothing else matters as much.
2. **Dogfood on a real app** (the owner's own first). Attach, recover and confirm the model with the owner, fix by cause, and measure before and after with the same blind review. A real app, made better, with numbers.
3. **Publish the benchmark.** A public, growing set of UI defects with ground truth is useful on its own, and it is the honest way to show progress. Invite other builders' pages into it.
4. **Package it.** A Claude Code plugin with the hook on by default, the Codex pointer in `~/.codex/AGENTS.md`, an npm package, and a CI action that comments tier-1 findings on pull requests and offers tier 2.
5. **Do a market scan** of AI design-review and UI-QA tools before any public positioning, so the claim of a gap is checked rather than assumed.
6. **Let the owner's taste in, explicitly.** Owner preferences as a declared layer (2b), so the system is principled without being dogmatic.

### Cost of growing the benchmark

Measured on this run:

| Item | Tokens | Cost |
|---|---|---|
| Build a site with a Sonnet subagent | about 67-82k per site | about $0.30-0.50 per site at $2 / $10 per million tokens |
| Build a site with gpt-6.2-sol (Codex CLI) | about 91-102k per site | billed to the ChatGPT plan's limits, not per token |
| Blind review of one site, Sonnet, all surface screenshots | about 98-112k (mostly image input) | about $0.20-0.35 per site |
| Screenshots, lint, verify, scoring | — | $0 (about 1-2 minutes of CPU per site) |
| Mapping each reviewed problem to rules | a few minutes of maintainer time per site | could be a model call, about $0.05 |

So a new generated site costs about **$0.50-0.85** with one reviewer, or **$0.75-1.20** with two (needed to measure agreement). 50 more sites: about $25-60. 200: about $100-240. Planted cases cost nothing to run; their cost is authoring time, about 5-10 minutes per case. The expensive part is not tokens but trustworthy ground truth. A second reviewer from a different model, plus occasional human spot checks, is where the money should go.

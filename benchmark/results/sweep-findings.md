# Which ways of asking produce worse interfaces? (prompt sweep, 2026-11-19)

The same product, a web app for running and supervising AI coding agents, was built 12 ways:

- **Builders (2):** Claude Sonnet 5.5, and gpt-6.2-sol through the Codex CLI.
- **Briefs (3):**
  - a one-liner;
  - a detailed content spec, which also asked for "polished production-ready look, light and dark mode, usable at 390px";
  - the one-liner plus "make it look modern, stunning and premium; it should wow people".
- **Processes (2):** everything asked for at once, or a base build followed by six "now add X" requests, each made in a fresh session that saw only the current file.

Pages and every intermediate round are in `benchmark/sweep/`; the measurements are in `sweep.md`.

## Result 1: one sentence asking for "stunning" roughly triples the problems

The one-liner and the "stunning" brief differ by exactly one sentence, so that is the clean comparison. To keep requirements out of it that only one brief asked for, count at desktop width in the light theme only: `verify --explore` floor and meaning findings, distinct by rule and element, on the page and on every surface a click opens.

| 1280 px, light | one-liner | "stunning" | detailed spec |
|---|---|---|---|
| Sonnet, at once / step by step | 6 / 9 | **43 / 22** | 7 / 8 |
| gpt-6.2-sol, at once / step by step | 7 / 6 | **13 / 22** | 12 / 6 |
| mean | 7 | **25** | 8 |

The "stunning" sentence brings in what the checks count as decoration or illegibility:
- gradient text and gradient fills under text;
- backdrop blur and glows;
- dim grey text on dark;
- small, low-contrast labels.

At desktop width the detailed spec is no better than the one-liner. Counted across all three views, as in `sweep.md` (1280 light, 1280 dark, 390 light), it looks better for Sonnet. That gap comes from the phone and dark checks, which only the spec asked for, so it is not evidence for writing longer briefs.

## Result 2: blind reviewers agree on the worst page, less on the rest

Four pages went to four separate Sonnet reviewers: the two "stunning" pages with the most problems, and the detailed-spec page of each builder. Each reviewer saw only the source and screenshots of the page and every surface. Each gave a 1–10 "finished and professional" rating and listed every problem it found.

| page | rating | problems (high severity) | tool count, all views |
|---|---|---|---|
| Sonnet, "stunning", at once | **4** | 37 (7) | 75 |
| gpt-6.2-sol, "stunning", step by step | 6 | 37 (5) | 51 |
| Sonnet, detailed spec, at once | 6 | 19 (3) | 17 |
| gpt-6.2-sol, detailed spec, at once | **7** | 24 (2) | 40 |

- **Problem counts agree with the tool:** both "stunning" pages have the most problems by both measures.
- **Ratings agree only on the worst page.** The other three sit within one point of each other, and the highest-rated page has the second-highest tool count.
- **This comparison does not isolate the adjective.** It sets "stunning" against the detailed spec, which differs in more than one sentence. Many of the reviewers' high-severity items are about phone layout and light/dark rendering, which the "stunning" briefs never asked for.
- **What the reviewers said about the "stunning" pages:**
  - gradients, glows and blur used everywhere, so they signal nothing (Sonnet);
  - a decorative dark hero that is the loudest thing on screen and pushes the work below the fold (gpt-6.2-sol);
  - a settings dialog pinned to the top-left corner (Sonnet; visible in its screenshot).
- **What the reviewers said about the detailed-spec pages:** ordinary product-design gaps. Rows that need approval don't stand out, Delete shares a menu with Restart, API keys are shown in plain text, and the phone layout is cramped.

## Result 3: building feature by feature did not make it worse here

Across all views, the mean is 42 problems built at once and 37 step by step. Round by round, the step-by-step builds drift up slowly: gpt-6.2-sol's "stunning" page goes from 16 to 22 page problems over six rounds as it grows from 67 to 103 kB. That is far smaller than the effect of the brief. Six requests in a single file is short, though. A real app grows over months, across many files and many agents, and this sweep does not reproduce that.

## What this does not show

- **Small samples:** one build per cell and one reviewer per page, so there is no variance and no measure of reviewer agreement.
- **The Sonnet builders were not fully blind.** They ran as Claude Code agents with the owner's global instructions loaded, and those mention Axiomatic UI. Some were also started from this repository's session. They were told to work only in their own folder, and they did not read outside it. The gpt-6.2-sol builders had none of that context. This weakens the builder comparison more than the brief comparison.
- **Small targets dominate the counts** (about 60% of findings). The all-views counts include a 390 px check that only the detailed spec asked for.
- **Explore is capped:** it clicked at most 15 kinds of opener per page, one per repeated control.
- **The counts measure rule breaks, not "AI-looking" style.** They say how often a page breaks the floor and meaning rules. A plain page with good contrast and large targets scores well even if it looks generic.
- **The owner's real app looks worse than any of these.** It probably got there through long accretion across many sessions and files, which this sweep does not reproduce.

## What to do with it

- **Add a "stunning" variant of each real-world brief to the corpus.** It is the cheapest way to get the problems the rules should catch: decoration that means nothing, and loudness in the wrong place.
- **For people prompting builders:** describe the content and the tasks, and leave out style adjectives.
- **Next for the sweep:**
  - several builds per cell;
  - a second reviewer, to measure agreement;
  - a long accretion run (dozens of feature requests across several files and agents), the process most like the owner's real app.

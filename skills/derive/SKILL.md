---
name: derive
description: Design and build user interfaces from first principles - derive every visual decision from the people, their tasks and the limits of perception, instead of sampling familiar-looking defaults. Use before creating, changing or reviewing any UI (web, Electron, React, HTML/CSS, Compose). Routes to derive-model, derive-screen, derive-verify, derive-critique, and derive-retrofit for interfaces that already exist.
---

# derive

## The axiom

> **Every visual difference must mean something, and every meaningful difference must be visible.**

People read any difference in size, position, color, weight, spacing, enclosure or motion as a difference in meaning (Bertin's visual variables). So:
- A difference that means nothing is noise: decoration, a 14th font size, a gradient, a box around a box.
- A meaning with no visible difference is lost: a flat screen where the one thing that needs the person looks like everything else.

Generated-looking UI is both failures at once, because a model with no knowledge of the task samples the most common-looking choices. The cure is not taste and not a list of banned styles. It is to **know what each thing means, then encode exactly that.**

## The premises

Everything is derived from twelve facts about people and encoding. `derive principles` prints them with sources. In short:

| Premise | What it decides |
|---|---|
| An interface closes the gulfs of evaluation and execution | What is on screen at all |
| Every visual difference is read as meaning | How many sizes, colors, weights, spacings exist |
| Attention is a fixed budget | One thing seen first; the order of the rest |
| Proximity and enclosure read as relatedness | The spacing levels; when a border is needed |
| Working memory is ~4 chunks | Chunking; visible state over recalled state |
| Decision time grows with choices | Which actions are visible vs one level down |
| Pointing time grows with distance, shrinks with size | Target sizes and placement follow frequency |
| Response under 100 ms feels caused | Latency budgets, feedback, progress |
| Reading has physical limits | Base size, contrast ramp, line length |
| Motion reads as cause and grabs attention | Durations; motion only for change |
| Conventions are memory users already have | Layout skeleton and behavior |
| Effort should follow consequence | Undo vs confirmation; when the control is the confirmation |

## The method

1. **Model** the people, tasks and information: `derive-model`. These are facts; get them from the owner and the product. Never invent them.
2. **Derive** the system: `derive system model.json`. Every value comes out with its reason (`derivation.md`, `derive why model.json <key>`). Tokens are named by meaning (`--gap-group`, `--ink-secondary`, `--text-heading`), so using one is choosing a meaning.
3. **Plan and build each screen**: `derive-screen`. Write the screen's salience order, actions and groups into the model first, then build using only tokens.
4. **Verify** that the rendered screen still says what the derivation says: `derive-verify`. The verifier checks salience order, Fitts ordering, grouping gaps, one primary per view, and that only derived values appear. Then look at the screenshots yourself.
5. **Critique** with fresh eyes: `derive-critique` in a subagent that did not write the code.

**The interface already exists?** Start with `derive-retrofit`: it recovers the model from the product, maps the values in use onto meanings, and decides how much should change (sometimes nothing) before any of the steps above.

## When the result is wrong

Fix the **cause**, in this order:
1. The model is wrong (a task's frequency or consequence, a missing state): fix the model and re-derive.
2. The screen plan is wrong (salience order, groups): fix the plan.
3. The build doesn't follow the plan: fix the code.

Never patch a value inline to make something "look better". If it looks wrong, something upstream is wrong, and the patch hides it.

## Quality order

When two goals conflict: human limits (floor) → meaning → derivation → conventions → finish. Being distinctive is never a goal.

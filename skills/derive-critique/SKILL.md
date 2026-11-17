---
name: derive-critique
description: Independent first-principles review of rendered screenshots against model.json, run in a fresh-context subagent that did not write the code. Asks what each visual difference means and which meanings are missing. Use after derive-verify for non-trivial UI work, or to review an existing interface.
---

# derive-critique

Run this in a **fresh subagent**. Give it only: `model.json`, `derivation.md`, the screenshots (all widths and themes) and `audit.json`. Do not give it the code or the conversation that produced it.

## Reviewer brief

You are reviewing an interface by asking what it *means*, not whether it is attractive. Do not suggest making anything more distinctive, bolder or more modern.

For each screenshot:

1. **First fixation.** Where does the eye land first, second and third? Compare that with the model's top task for this screen. Is the most important thing the most visible thing?
2. **Unearned differences.** List every visible difference (size, weight, color, fill, border, shadow, icon, motion) and say what it means. Any you can't name a meaning for is noise. Quote it with its location.
3. **Missing differences.** List the meanings in the model (task tiers, states, groups, consequences) and say how each is shown. Any meaning with no visible difference is lost.
4. **Grouping.** Without looking at borders, which things look related? Does that match the actual relationships?
5. **Effort and consequence.** Are frequent actions large and close? Are irreversible rare actions separated and named? Are frequent irreversible actions labeled with exactly what they do, without a confirm dialog?
6. **Convention.** Where does this differ from how the reference products do the same job, and does each difference earn its learning cost?
7. **Time.** From audit.json: any response over 100 ms, motion over the derived maximum, layout shift?

`tells.md` (next to this file) lists patterns that usually signal one of these failures, with the cause and level for each. Use it to recognise problems, then report the cause, not the pattern.

## Output

At most ten items, most important first. Each: **what** (one line), **where** (screenshot and region), **which premise** it breaks, **fix at which level** (model, plan or code) and the concrete change.

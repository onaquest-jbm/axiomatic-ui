---
name: derive-retrofit
description: Bring an existing interface onto Derive - reconstruct the model from the product as it is, map the values already in use onto derived meanings, size the change honestly, then fix causes in order. Use when a project already has UI and no model.json, when asked to clean up, polish or review an existing screen, or when a screen looks generated.
---

# derive-retrofit

Most interfaces already exist. A new build starts from the model; a retrofit has to recover the model first, because the screen in front of you encodes one, usually by accident. Every finding is a gap between what the screen says and what the product means.

## 1. See it as people see it

Render the screen before reading its code: run the app, or open the file in a browser, at desktop and phone widths, in both themes if it has them. Judge what is on screen, not what the code intends. If you only have a screenshot, work from the screenshot and say so.

## 2. Recover the model

Follow `derive-model`, but read the answers off the product: routes, data models and states, what sits closest to the top, what has shortcuts, what the copy promises. Propose each answer to the owner and get it confirmed. **The current screen is evidence, not the spec.** If the most prominent thing on it serves a rare task, that is a finding, not a fact about the task.

## 3. Read what the screen currently says

Inventory the encoding in use, from the rendered page (`derive verify` reports font sizes, spacing values and the color count, and works with a draft model) or from the code:
- every font size, weight, color, spacing value, radius, shadow and duration, with how often each appears
- what is loudest, second and third on each screen
- which actions are accent-filled, and how big each target is

Then map each value to a meaning from the model. One of three things is true for every value:
1. **It has a meaning.** It maps to a token (`--gap-group`, `--ink-secondary`). Keep the meaning; move the value to the token.
2. **It duplicates a meaning.** Three grays for "secondary text", eleven paddings for "inside a card". Collapse them into one token.
3. **It has no meaning.** A gradient, a glow, a 13.5 px size, a pulse on something that isn't live. Delete it. Do not replace it with a quieter decoration.

And for every meaning in the model, find how the screen shows it. A state with no color, a blocking decision that looks like a row, a frequent action hidden in a menu: those are meanings left unshown, and adding them is part of the fix.

`tells.md` in `derive-critique` lists the patterns that most often signal one of these failures.

## 4. Size the change honestly

Decide from the inventory, before planning edits:
- **Rebuild the system.** Many duplicated or meaningless values across the screen. Derive the system from the model (`derive system`) and move the screen onto the tokens, screen by screen.
- **Correct.** The screen mostly encodes the right things with a few failures. Fix only those, keep its layout and existing values where they already carry a meaning, and map them to tokens instead of re-deriving them.
- **Leave it.** The screen already says what the product means. Say so plainly, list at most a few concrete refinements, and change nothing unless the owner agrees.

Never change a screen that works to make it look different. Unfamiliar costs the person; the convention premise is the reason.

Show the owner the recovered model, the inventory summary (counts before, what maps to what) and the size you chose, then wait before editing. A wrong model makes every fix wrong in the same direction.

## 5. Fix causes, then verify

Fix in the order from `derive`: model, then plan, then code. Then follow `derive-screen` for each screen you touch and `derive-verify` before reporting. Report the inventory counts before and after (sizes, colors, spacing values, accent-filled controls), not just the finding count.

---
name: derive-model
description: Build or update model.json - the people, their tasks (with frequency, consequence and reversibility), the information and its states - which every UI decision is derived from. Use when a project has UI work and no model.json, when derive check reports errors, or when the product's users or tasks change.
---

# derive-model

The model is the input to every design decision. If it is wrong, every derived value is wrong in a consistent, confident way. **Its contents are facts to get from the owner and the product. Do not invent them.**

## 1. Gather before asking

Read what exists and propose answers so the owner confirms rather than authors:
- README, docs, issue tracker: what the product is for, who uses it.
- Routes, screens, API endpoints, data models: the objects and their states (running, failed, draft, paid…).
- Analytics or logs if available: which actions actually happen and how often.
- Existing UI: what people do most (what is closest to the top, what has shortcuts).

## 2. Ask the owner, with your proposals

Ask in this order. Give your proposed answer for each so they can say "yes" or correct it.

1. **Purpose:** one sentence, what people use it for.
2. **People:** expertise (novice / mixed / expert), how often (daily / weekly / occasional), session length (minutes / hours).
3. **Context:** devices (primary first), inputs (mouse, keyboard, touch), and 1-3 products these people already use daily.
4. **Tasks:** for each thing people come to do:
   - `does`: verb + object ("Approve or deny a command").
   - `kind`: `act` or `read` (watching progress is a task too).
   - `frequency`: constant / frequent / occasional / rare. Be honest: if everything is constant, nothing is.
   - `consequence` of a mistake: low / medium / high.
   - `reversible`: true / false.
5. **Information:** the text ranks the content really has (usually 3-4: meta, body, heading, title), and the states objects can be in. Each state gets a color; states not listed get none.

## 3. Check and derive

```bash
derive check model.json      # errors are missing facts; warnings are weak spots
derive system model.json --out src/design
derive why model.json tasks  # read back how each task will be treated
```

Read `derivation.md` back to the owner in plain words ("Approving commands will be the most prominent thing on its screen, and the Run button itself will be the confirmation, with no extra dialog, because you do it constantly"). Their disagreement is the most valuable input you will get: it means a fact in the model is wrong.

## Model shape

See `model/model.schema.json` and `demo/model.json` for a complete example.

---
name: axiomatic-screen
description: Plan and build one screen from the model - decide what is seen first, which actions are visible and how big, how content groups - write that plan into model.json, then build it using only meaning-named derived tokens. Use whenever building or changing a screen, view, panel or component in a project with a model.json.
---

# axiomatic-screen

## 1. Plan before code

Add the screen to `model.json` under `screens`:

```json
{
  "id": "session",
  "serves": ["decide", "follow", "ask"],
  "plan": {
    "salience": [
      { "selector": ".request", "task": "decide", "why": "Work is blocked until the person decides." },
      { "selector": ".turn p", "task": "follow" }
    ],
    "actions": [
      { "selector": ".request .primary", "task": "decide", "frequency": "constant" },
      { "selector": "[data-action=always]", "task": "trust", "frequency": "occasional" }
    ],
    "groups": [ { "name": "request actions", "members": [".request .primary", "[data-action=deny]"] } ]
  }
}
```

How to decide each part:
- **serves**: the tasks this screen exists for. Anything on screen that serves no task should not be there.
- **salience**: order the elements by the task tier from `axiomatic why model.json tasks`, adjusted for *now*. Something that blocks the person (a pending decision, an error) goes first while it exists. Exactly one first.
- **actions**: every control, with its task's frequency. Frequency decides its tier: constant → the one accent-filled control; frequent → visible, quiet; occasional → text button or in context; rare → menu or command palette.
- **groups**: what belongs together. Each group is separated from its surroundings by the next gap level up.

## 2. Build with meanings, not values

Tokens are named for what they mean. Choosing one is choosing a meaning:

| You are expressing | Use |
|---|---|
| Space inside a control / between related items / between groups / sections / regions | `--gap-control` / `--gap-related` / `--gap-group` / `--gap-section` / `--gap-region` |
| Text rank | `--text-meta`, `--text-body`, `--text-heading` (only the ranks the model has) |
| Text emphasis | `--ink-primary`, `--ink-secondary`, `--ink-tertiary` |
| Region role | `--surface-canvas`, `--surface-base`, `--surface-sunken` |
| A boundary that separates / that identifies a control | `--edge-separator` / `--edge-control` |
| The one primary action, or the current selection | `--accent` / `--selection` |
| A state from the model | `--state-<name>` |
| Something appearing / changing in place / a region moving | `--duration-element` / `--duration-state` / `--duration-region` |

Rules that follow from the axiom:
- If you need a value that has no meaning in this list, the model is missing something. Add it there and re-derive. Don't write a number.
- Use enclosure (border or fill) only where spacing can't show the group. Never a box inside a box.
- One accent-filled control per view.
- Irreversible and frequent: the control's label says exactly what will happen ("Run tests"), with no confirm dialog. Irreversible and rare: separated, names its object, second step.
- Every input shows a visible result within 100 ms: change the state first, then do the work.
- Motion only for appearing, leaving, moving, or a state change, using the duration for that kind of change. Transition the property that changes, never `all`.
- Things of the same kind line up: icons in one column, labels on one edge, numbers right-aligned on one edge. Alignment says "same kind", so a stray offset says "different" when nothing is.
- A radius inside a container is the container's radius minus the padding between them, so the two curves stay parallel.
- Build the states the screen will hit: empty, loading, error, long content, narrow width, both themes. Add each as a scenario.

**Words** are encoding too. The same axiom applies:
- A label names the object or the action ("Run tests", "Billing"), not a mood ("Let's go!"). A title names the context (the page, the period, the object), never a greeting.
- Tone that changes nothing is noise: no exclamation marks, hype words or "New" badges unless "new" changes what the person should do.
- A number that changes says what it changed against ("+12% vs last month"). Without the reference, the meaning is invisible.
- Never invent claims, counts or testimonials. Fixture data is plausible and real-shaped (names, amounts, lengths), because the edge cases live in real data.

**Numbers and data:**
- One format per kind of number on a screen, with tabular figures. A format difference reads as a meaning difference.
- Pick the chart by the data's shape and by how accurately people read the encoding (Cleveland and McGill: position on a common scale best, then length, then angle and area). Trend: line. Comparison: bars on a shared baseline. Part of a whole: one stacked bar or a ranked list. One target: a progress bar.
- Within a chart, the series or point the task cares about gets the accent; the rest are neutral steps. Several hues only when the series must be told apart, and each hue is a meaning in the model.
- A stat is a label, a figure and its reference. Nothing is added to fill the card.

**Icons** are a second name for something. Use them where they speed recognition (frequent, scannable controls), not on every heading. One set, one size, one stroke, colored by the ink role of their text, in a fixed-width box so their labels align.

## 3. Then verify

Run `axiomatic-verify`. You are not done until it passes and you have looked at the screenshots.

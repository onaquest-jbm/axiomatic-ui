---
name: axiomatic-verify
description: Check that a rendered screen still says what its derivation says - salience order, one primary, Fitts ordering, grouping gaps, only derived values, human limits - at phone and desktop widths in both themes, then look at the screenshots. Use after any UI change and before reporting UI work as done.
---

# axiomatic-verify

Source code can't show whether the thing that matters is the thing that's seen first. That only exists once the screen is rendered, so verification renders it.

## Run

```bash
axiomatic lint <changed files> --model model.json
axiomatic verify scenarios.json --out axiomatic-report
```

`scenarios.json` lists what to render:

```json
{
  "model": "model.json",
  "widths": [1280, 390],
  "themes": ["light", "dark"],
  "scenarios": [
    { "name": "Session, request pending", "url": "http://localhost:5173/?fixture=pending", "screen": "session",
      "steps": [{ "name": "Show details", "click": "#why-toggle" }] }
  ]
}
```

### Menus, dialogs and other views

Every click step is followed by a check of what it revealed (a menu, dialog, popover, panel or new view), so surfaces get the same checks as the page. Problems already on the page aren't repeated; surface findings carry a `surface` name. Each result also lists **coverage**: the controls that look like openers, and which were never clicked.

- `--explore` clicks every likely opener the steps didn't, one at a time from a fresh load, and checks what each reveals. It never clicks destructive or committing actions (delete, send, pay, sign out…); add more with `"exploreSkip": ["regex", …]` in scenarios.json. `--explore-max N` caps it (default 20). Use it before reporting UI work as done: rarely opened surfaces are where problems hide.
- `--attach <port|url>` checks an app that is already running with `--remote-debugging-port` (an Electron app, a signed-in browser) instead of launching one. Scenarios may omit `url` and give `"match": "<url substring>"` to pick the page. The attached app is checked once, at its real window size and theme (emulation is skipped, because it stops Electron from painting), is never reloaded (between surfaces dialogs are closed, Escape is pressed and toggles are flipped back), and is left running. Restart it at another window size to check another width. Run it against a fixture or test profile, never real data: explore clicks things.

## What the findings mean

| Tier | Meaning | What to do |
|---|---|---|
| **floor** | A human limit is broken: contrast, target size, overflow, a panel partly outside the window, focus, >100 ms response, motion over the derived maximum. | Always fix. |
| **meaning** | A difference means nothing, or a meaning isn't visible. Examples: an unplanned element is louder than the top task, salience order inverted, a rare action is a bigger target than a frequent one, a group's inner gap is as big as its outer gap, two accent-filled buttons, a box inside a box, an irreversible action styled like and placed among routine ones, more than about eight undivided actions in one group, a popup covering the control that opened it. | Fix the cause: model → plan → code, in that order. |
| **derivation** | A value is on screen that the derivation never produced. | Use the token for the meaning, or add the meaning to the model. |

Regions that *display* other designs (color swatches, live previews, screenshots, charts of design data) are content, not interface. Mark them `data-axiomatic="specimen"` and they are left out of meaning and derivation checks; floor checks still apply.

The salience measure is a simple model (size × contrast × chroma × position), not human vision. Treat it as a tripwire. **The screenshots are the judge.**

## Look

Open every screenshot in the report. For each, write one line:
1. What did your eye land on first? Is it the plan's first entry?
2. Can you see the groups without the borders?
3. Is anything there that serves no task?

If your eye disagrees with the measurement, trust your eye, and say so in the report.

## Report

When you say the UI work is done, include: the verify summary per scenario, the click-to-paint and motion numbers, what you looked at and fixed, and what wasn't checked (real data, real latency, other browsers, real devices).

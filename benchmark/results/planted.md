# Planted-defect results

Generated 2026-11-19 against `demo/model.json`. lint + verify.

Status per defect: **caught** = an expected rule fired; **other signal** = some new finding, not one meant for this; **silent** = nothing new; **no-rule** = no rule exists for it (ground truth says so).

## By principle (with plan; surface cases counted as opened by a click)

| | defects | caught | other signal | silent | no rule |
|---|---|---|---|---|---|
| choice | 3 | 0 | 0 | 1 | 2 |
| consequence | 5 | 0 | 0 | 0 | 5 |
| convention | 2 | 0 | 0 | 1 | 1 |
| encoding | 15 | 14 | 0 | 0 | 1 |
| grouping | 4 | 3 | 0 | 0 | 1 |
| legibility | 17 | 12 | 0 | 3 | 2 |
| memory | 1 | 0 | 0 | 0 | 1 |
| motion | 7 | 6 | 0 | 1 | 0 |
| pointing | 4 | 3 | 1 | 0 | 0 |
| purpose | 2 | 1 | 0 | 1 | 0 |
| response | 2 | 1 | 0 | 1 | 0 |
| salience | 8 | 5 | 0 | 2 | 1 |

## By detection layer the defect needs

| | defects | caught | other signal | silent | no rule |
|---|---|---|---|---|---|
| judgment | 14 | 1 | 0 | 1 | 12 |
| render | 31 | 19 | 1 | 9 | 2 |
| source | 25 | 25 | 0 | 0 | 0 |

## By level (1 obvious, 2 subtle, 3 compound, 4 rare surface)

| | defects | caught | other signal | silent | no rule |
|---|---|---|---|---|---|
| L1 | 21 | 20 | 0 | 1 | 0 |
| L2 | 29 | 11 | 0 | 6 | 12 |
| L3 | 6 | 6 | 0 | 0 | 0 |
| L4 | 14 | 8 | 1 | 3 | 2 |

## Rare surfaces: opened by a click vs already open at load

| | defects | caught | other signal | silent | no rule |
|---|---|---|---|---|---|
| #more-menu · open | 7 | 6 | 0 | 0 | 1 |
| #more-menu · step | 7 | 5 | 1 | 0 | 1 |
| #settings · open | 4 | 1 | 1 | 1 | 1 |
| #settings · step | 4 | 0 | 0 | 3 | 1 |
| #tip · open | 2 | 2 | 0 | 0 | 0 |
| #tip · step | 2 | 2 | 0 | 0 | 0 |
| #toast · open | 1 | 1 | 0 | 0 | 0 |
| #toast · step | 1 | 1 | 0 | 0 | 0 |

## Without a screen plan (what an arbitrary page gets)

| | defects | caught | other signal | silent | no rule |
|---|---|---|---|---|---|
| choice | 3 | 0 | 0 | 1 | 2 |
| consequence | 5 | 0 | 0 | 0 | 5 |
| convention | 2 | 0 | 0 | 1 | 1 |
| encoding | 15 | 14 | 0 | 0 | 1 |
| grouping | 4 | 2 | 0 | 1 | 1 |
| legibility | 17 | 12 | 0 | 3 | 2 |
| memory | 1 | 0 | 0 | 0 | 1 |
| motion | 7 | 6 | 0 | 1 | 0 |
| pointing | 4 | 2 | 2 | 0 | 0 |
| purpose | 2 | 1 | 0 | 1 | 0 |
| response | 2 | 1 | 0 | 1 | 0 |
| salience | 8 | 3 | 1 | 3 | 1 |

## False alarms on clean controls

| control | lint | verify (plan) | verify (no plan) |
|---|---|---|---|
| Base page (menu and dialog closed) | 0 | 0 | 0 |
| Clean menu open at load | 0 | 0 | 0 |
| Clean dialog open at load | 0 | competing-primaries | competing-primaries |
| Clean page with a long transcript | 0 | 0 | layout-shift |

## Every defect

| case | variant | principle | layer | defect | expected | lint | verify | status |
|---|---|---|---|---|---|---|---|---|
| enc-gradient-bar | base | encoding | source | Decorative gradient on the header | decorative-color, text-on-gradient, raw-color, underived-color | raw-color, decorative-color | primary-not-first, unearned-salience, text-on-gradient | caught |
| enc-gradient-text | base | encoding | source | Gradient text on the title | decorative-color, raw-color | raw-color, decorative-color | decorative-color, text-on-gradient | caught |
| enc-glass-card | base | encoding | source | Backdrop blur with no layering meaning | decorative-depth, raw-color | raw-color, decorative-depth | decorative-depth, low-contrast | caught |
| enc-shadow-soup | base | encoding | source | Literal shadows on in-flow boxes (depth that means nothing) | decorative-depth, raw-color, underived-color | raw-color, decorative-depth | · | caught |
| enc-emoji-labels | base | encoding | source | Emoji that map to no state or object | decorative-symbol | decorative-symbol | decorative-symbol | caught |
| enc-near-duplicate-sizes | base | encoding | source | 12 / 12.5 / 13 / 13.5 px: differences no one can name a meaning for | raw-size, underived-size | raw-size | underived-size | caught |
| enc-radius-zoo | base | encoding | source | Radii with no meaning per value | raw-radius | raw-radius | · | caught |
| enc-pastel-rows | base | encoding | source | Color variety that encodes nothing | raw-color, underived-color | raw-color | underived-color, salience-inversion, low-contrast | caught |
| enc-state-lost | base | encoding | judgment | A meaningful state (waiting on you) with no visible difference | (none) | · | · | no-rule |
| enc-icon-header | base | salience | judgment | Eight actions of very different frequency drawn identically | (none) | decorative-symbol | decorative-symbol, small-target, underived-space | no-rule, incidental signal |
| enc-icon-header | base | legibility | render | Icon-only buttons with no accessible name | (none) | decorative-symbol | decorative-symbol, small-target, underived-space | no-rule, incidental signal |
| sal-three-primaries | base | salience | render | Three accent-filled actions in one view | competing-primaries | · | competing-primaries, pointing-order | caught |
| sal-promo-banner | base | salience | render | An element serving no task is the loudest thing on screen | unearned-salience, primary-not-first, competing-primaries | · | primary-not-first, unearned-salience | caught |
| sal-all-bold | base | salience | render | Emphasis everywhere, so it marks nothing | flat-emphasis | · | flat-emphasis | caught |
| sal-blocking-quiet | base | salience | render | The one thing blocking work is among the quietest elements | primary-not-first, salience-inversion, low-contrast | · | · | silent |
| sal-sidebar-shouts | base | salience | render | Switching chats (frequent) outranks the blocking decision (constant) | primary-not-first, salience-inversion, unearned-salience | · | salience-inversion, low-contrast | caught |
| grp-even-spacing | base | grouping | render | Gaps inside and between groups are equal, so grouping is ambiguous | weak-grouping, raw-space, underived-space | raw-space | weak-grouping, underived-space | caught |
| grp-box-in-box | base | grouping | render | Nested enclosures repeat "this is a group" | redundant-enclosure | · | redundant-enclosure | caught |
| grp-orphan-control | base | grouping | judgment | A stray control that belongs to no group and aligns with nothing | (none) | · | · | no-rule |
| grp-split-group | base | grouping | render | The two answers to one question are split across the row | weak-grouping | · | weak-grouping | caught |
| mem-flat-nav | base | memory | judgment | Ten peers at one level, more than can be held in mind | (none) | · | underived-space | no-rule, incidental signal |
| mem-flat-nav | base | choice | judgment | Rare features given the same weight as constant ones | (none) | · | underived-space | no-rule, incidental signal |
| cho-action-wall | base | choice | judgment | Rare actions shown beside the constant one slow every decision | (none) | · | weak-grouping | no-rule, incidental signal |
| cho-frequent-hidden | base | choice | render | A frequent action removed from view | plan-missing | · | · | silent |
| pnt-tiny-targets | base | pointing | render | Targets below the minimum | small-target, raw-space | raw-space | pointing-order, small-target | caught |
| pnt-div-button | base | pointing | source | Not focusable or operable by keyboard | clickable-non-control | clickable-non-control | redundant-enclosure | caught |
| pnt-inverted-sizes | base | pointing | render | Occasional action is a bigger target than the constant one | pointing-order, salience-inversion | · | pointing-order, small-target | caught |
| leg-grey-on-white | base | legibility | render | Text below 4.5:1 | low-contrast, raw-color, underived-color | raw-color | salience-inversion, underived-color, low-contrast | caught |
| leg-tiny-text | base | legibility | source | Text below the legible size | raw-size, underived-size | raw-size | underived-size | caught |
| leg-focus-removed | base | legibility | source | Keyboard users cannot see where they are | focus-removed, invisible-focus | · | invisible-focus | caught |
| leg-zoom-blocked | base | legibility | source | People who need to zoom cannot | zoom-blocked | zoom-blocked | · | caught |
| leg-long-lines | base | legibility | render | Running text far past 75 characters per line | (none) | · | · | no-rule |
| leg-sideways-scroll | base | legibility | render | Page scrolls sideways at phone width | horizontal-scroll, text-overflow | · | · | silent |
| leg-placeholder-label | base | legibility | render | A field with no label once typed in | unlabelled-field | · | unlabelled-field | caught |
| leg-img-no-alt | base | legibility | source | Image with no text alternative | img-no-alt | img-no-alt | img-no-alt | caught |
| leg-dark-hardcoded | base | legibility | render | Near-white text on white in dark mode | low-contrast, raw-color, underived-color | raw-color | salience-inversion, underived-color, low-contrast | caught |
| mot-bounce | base | motion | source | Overshoot easing that reports no change | decorative-motion | decorative-motion | · | caught |
| mot-glow-loop | base | motion | source | Looping motion that carries no information | decorative-motion | decorative-motion, raw-motion | decorative-motion, slow-motion | caught |
| mot-transition-all | base | motion | source | Every property animates, including ones that should not move | motion-unscoped | motion-unscoped | · | caught |
| mot-slow-reveal | base | motion | render | Motion long enough that people wait for it | raw-motion, slow-motion | raw-motion | slow-motion | caught |
| rsp-delayed-feedback | base | response | render | No visible result within 100 ms of the click | slow-response | · | · | silent |
| rsp-blocking-click | base | response | render | A 250 ms long task on every click | long-task, slow-response | · | slow-response, long-task | caught |
| rsp-late-banner | base | motion | render | Content jumps by itself after load | layout-shift | · | · | silent |
| pur-stat-cards | base | purpose | judgment | Elements that serve no task in the model | unearned-salience, primary-not-first, underived-size, raw-size | raw-size | underived-size | caught |
| pur-decor-blobs | base | purpose | judgment | Decoration with no meaning, using only derived tokens | unearned-salience | · | · | silent |
| csq-delete-beside-run | base | consequence | judgment | An irreversible rare action placed among frequent ones, styled the same | (none) | · | weak-grouping, pointing-order | no-rule, incidental signal |
| csq-vague-labels | base | consequence | judgment | An irreversible, frequent action whose control does not say what it does | (none) | · | · | no-rule |
| csq-confirm-habit | base | consequence | judgment | Confirmation on a constant action becomes a reflex | (none) | · | underived-space, small-target | no-rule, incidental signal |
| cnv-composer-on-top | base | convention | judgment | Breaks the layout every chat tool has taught people | (none) | · | · | no-rule |
| cnv-desktop-hamburger | base | convention | render | A frequent destination hidden where there is room for it | plan-missing | · | · | silent |
| cmp-generated-look | base | encoding | source | Purple-blue gradient header | decorative-color, text-on-gradient | raw-color, decorative-color, decorative-depth, raw-radius, motion-unscoped, decorative-motion, raw-motion, raw-size, decorative-symbol | primary-not-first, unearned-salience, salience-inversion, competing-primaries, pointing-order, underived-color, slow-motion, decorative-depth, decorative-symbol, text-on-gradient, low-contrast | caught |
| cmp-generated-look | base | encoding | source | Glass card with a colored shadow | decorative-depth | raw-color, decorative-color, decorative-depth, raw-radius, motion-unscoped, decorative-motion, raw-motion, raw-size, decorative-symbol | primary-not-first, unearned-salience, salience-inversion, competing-primaries, pointing-order, underived-color, slow-motion, decorative-depth, decorative-symbol, text-on-gradient, low-contrast | caught |
| cmp-generated-look | base | motion | source | Bouncy lift on every button | decorative-motion, motion-unscoped | raw-color, decorative-color, decorative-depth, raw-radius, motion-unscoped, decorative-motion, raw-motion, raw-size, decorative-symbol | primary-not-first, unearned-salience, salience-inversion, competing-primaries, pointing-order, underived-color, slow-motion, decorative-depth, decorative-symbol, text-on-gradient, low-contrast | caught |
| cmp-generated-look | base | legibility | render | Slate-400 body text | low-contrast | raw-color, decorative-color, decorative-depth, raw-radius, motion-unscoped, decorative-motion, raw-motion, raw-size, decorative-symbol | primary-not-first, unearned-salience, salience-inversion, competing-primaries, pointing-order, underived-color, slow-motion, decorative-depth, decorative-symbol, text-on-gradient, low-contrast | caught |
| cmp-generated-look | base | salience | render | Two primaries | competing-primaries | raw-color, decorative-color, decorative-depth, raw-radius, motion-unscoped, decorative-motion, raw-motion, raw-size, decorative-symbol | primary-not-first, unearned-salience, salience-inversion, competing-primaries, pointing-order, underived-color, slow-motion, decorative-depth, decorative-symbol, text-on-gradient, low-contrast | caught |
| cmp-generated-look | base | encoding | source | Sparkle emoji | decorative-symbol | raw-color, decorative-color, decorative-depth, raw-radius, motion-unscoped, decorative-motion, raw-motion, raw-size, decorative-symbol | primary-not-first, unearned-salience, salience-inversion, competing-primaries, pointing-order, underived-color, slow-motion, decorative-depth, decorative-symbol, text-on-gradient, low-contrast | caught |
| srf-menu-tiny-items | step | pointing | render | Menu targets below the minimum | small-target | raw-size | · | other signal |
| srf-menu-tiny-items | step | legibility | source | Menu text below the derived sizes | raw-size, underived-size | raw-size | · | caught |
| srf-menu-tiny-items | open | pointing | render | Menu targets below the minimum | small-target | raw-size | small-target | caught |
| srf-menu-tiny-items | open | legibility | source | Menu text below the derived sizes | raw-size, underived-size | raw-size | small-target | caught |
| srf-menu-faded | step | legibility | render | Menu items below 4.5:1 | low-contrast, raw-color, underived-color | raw-color | · | caught |
| srf-menu-faded | open | legibility | render | Menu items below 4.5:1 | low-contrast, raw-color, underived-color | raw-color | underived-color, low-contrast | caught |
| srf-menu-own-style | step | encoding | source | Menu uses its own radii, shadow, blur and spacing instead of the system | raw-radius, decorative-depth, raw-space, raw-color, underived-space, underived-color | raw-radius, raw-color, decorative-depth, raw-space | · | caught |
| srf-menu-own-style | open | encoding | source | Menu uses its own radii, shadow, blur and spacing instead of the system | raw-radius, decorative-depth, raw-space, raw-color, underived-space, underived-color | raw-radius, raw-color, decorative-depth, raw-space | decorative-depth, primary-not-first, unearned-salience, low-contrast | caught |
| srf-menu-delete-mixed | step | consequence | judgment | Irreversible item not separated, not marked, no second step | (none) | · | · | no-rule |
| srf-menu-delete-mixed | open | consequence | judgment | Irreversible item not separated, not marked, no second step | (none) | · | · | no-rule |
| srf-menu-emoji | step | encoding | source | Pictographs as decoration | decorative-symbol | decorative-symbol | · | caught |
| srf-menu-emoji | open | encoding | source | Pictographs as decoration | decorative-symbol | decorative-symbol | decorative-symbol | caught |
| srf-dialog-two-primaries | step | salience | render | Two primaries, one of them destructive | competing-primaries | · | · | silent |
| srf-dialog-two-primaries | open | salience | render | Two primaries, one of them destructive | competing-primaries | · | primary-not-first, unearned-salience | other signal |
| srf-dialog-fixed-width | step | legibility | render | Dialog wider than the phone | horizontal-scroll, text-overflow | · | · | silent |
| srf-dialog-fixed-width | open | legibility | render | Dialog wider than the phone | horizontal-scroll, text-overflow | · | · | silent |
| srf-dialog-unlabelled | step | legibility | render | Fields with no label | unlabelled-field | · | · | silent |
| srf-dialog-unlabelled | open | legibility | render | Fields with no label | unlabelled-field | · | unlabelled-field | caught |
| srf-dialog-vague-confirm | step | consequence | judgment | Labels that do not say what will happen | (none) | · | · | no-rule |
| srf-dialog-vague-confirm | open | consequence | judgment | Labels that do not say what will happen | (none) | · | small-target | no-rule, incidental signal |
| srf-tooltip-faint | step | legibility | render | Tooltip text below 4.5:1 | low-contrast, raw-color, underived-color | raw-space, raw-size, raw-color | small-target | caught |
| srf-tooltip-faint | step | legibility | source | Tooltip text below the derived sizes | raw-size, underived-size | raw-space, raw-size, raw-color | small-target | caught |
| srf-tooltip-faint | open | legibility | render | Tooltip text below 4.5:1 | low-contrast, raw-color, underived-color | raw-space, raw-size, raw-color | underived-size, underived-space, underived-color, low-contrast, small-target | caught |
| srf-tooltip-faint | open | legibility | source | Tooltip text below the derived sizes | raw-size, underived-size | raw-space, raw-size, raw-color | underived-size, underived-space, underived-color, low-contrast, small-target | caught |
| srf-toast-slow | step | motion | render | Motion long enough that people wait for it | raw-motion, slow-motion | raw-motion | slow-motion, small-target | caught |
| srf-toast-slow | open | motion | render | Motion long enough that people wait for it | raw-motion, slow-motion | raw-motion | slow-motion, small-target | caught |
| srf-menu-off-palette | step | encoding | source | Colors that are not in the derived palette | raw-color, underived-color | raw-color | · | caught |
| srf-menu-off-palette | open | encoding | source | Colors that are not in the derived palette | raw-color, underived-color | raw-color | primary-not-first, unearned-salience, underived-color | caught |

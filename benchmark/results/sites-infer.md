# Generated-site results

Generated 2026-11-20. lint + verify (no screen plan; demo model; floor and meaning tiers only).

## Per site

| site | built by | defects | caught | silent | no rule | lint floor/meaning/derivation | verify page floor/meaning/derivation |
|---|---|---|---|---|---|---|---|
| agent-desk | Claude Sonnet (subagent) | 17 | 4 | 3 | 10 | 0/6/227 | 47/10/12 |
| food-checkout | Claude Sonnet (subagent) | 15 | 5 | 4 | 6 | 0/2/144 | 42/32/12 |
| inbox | gpt-6.2-sol (Codex CLI) | 15 | 4 | 3 | 8 | 0/1/248 | 26/16/12 |
| onboarding-wizard | Claude Sonnet (subagent) | 14 | 3 | 3 | 8 | 0/0/114 | 24/8/12 |
| revenue-dash | Claude Sonnet (subagent) | 14 | 3 | 2 | 9 | 0/0/153 | 58/4/12 |
| ticket-admin | Claude Sonnet (subagent) | 16 | 3 | 3 | 10 | 0/0/186 | 42/2/12 |
| tracewell-landing | gpt-6.2-sol (Codex CLI) | 13 | 1 | 3 | 9 | 0/6/165 | 20/42/12 |
| workspace-settings | gpt-6.2-sol (Codex CLI) | 14 | 4 | 3 | 7 | 0/3/257 | 32/26/12 |

## By principle

| | defects | caught | silent | no rule |
|---|---|---|---|---|
| choice | 9 | 1 | 3 | 5 |
| consequence | 14 | 3 | 3 | 8 |
| convention | 9 | 0 | 3 | 6 |
| encoding | 15 | 1 | 0 | 14 |
| grouping | 12 | 2 | 2 | 8 |
| legibility | 19 | 7 | 6 | 6 |
| memory | 1 | 0 | 0 | 1 |
| pointing | 10 | 6 | 3 | 1 |
| purpose | 10 | 1 | 1 | 8 |
| response | 5 | 0 | 1 | 4 |
| salience | 14 | 6 | 2 | 6 |

## By layer

| | defects | caught | silent | no rule |
|---|---|---|---|---|
| judgment | 50 | 5 | 6 | 39 |
| render | 47 | 20 | 14 | 13 |
| source | 21 | 2 | 4 | 15 |

## Page vs rare surfaces

| | defects | caught | silent | no rule |
|---|---|---|---|---|
| page | 58 | 20 | 12 | 26 |
| surfaces | 60 | 7 | 12 | 41 |

## Every defect

| site | surface | principle | layer | defect | expected | caught by |
|---|---|---|---|---|---|---|
| agent-desk | page | salience | judgment | Pending approval (blocking, constant) sits below the fold; only a small badge shows at load | primary-not-first, salience-inversion | primary-not-first |
| agent-desk | page | salience | render | Solid accent 'New chat' is the loudest element, louder than Approve; accent reused for logo, send, avatar, selection | competing-primaries, unearned-salience | unearned-salience |
| agent-desk | page | choice | source | About nine header icon buttons, mostly rare and duplicated in More; seven sidebar nav items ahead of the chat list | too-many-peers | — |
| agent-desk | page | pointing | source | Approve/Deny/Always allow are ordinary small buttons with no shortcuts; Always allow sits right next to Approve | pointing-order | — |
| agent-desk | page | consequence | judgment | 'Always allow' grants a standing rule beside one-time Approve with no confirmation; scope text does not cover the chained command | (none) | no rule |
| agent-desk | page | encoding | source | Chat status by small low-contrast dot colour alone; waiting chats not grouped above idle | (none) | no rule |
| agent-desk | page | legibility | render | Group headers, footnote, sub-lines and key chip are small and low contrast | low-contrast | low-contrast |
| agent-desk | page | salience | render | On phone the approval card is even further below the fold; send button wraps to its own row | primary-not-first | primary-not-first |
| agent-desk | page | legibility | judgment | On phone the 'waiting for you' badge is hidden, title truncated, goal bar wraps awkwardly | (none) | no rule |
| agent-desk | permission menu | consequence | judgment | 'Full auto' is one click away in a plain list with no warning or confirmation | (none) | no rule |
| agent-desk | permission menu | encoding | source | Permission mode is a tiny muted pill with an unexplained coloured dot; menu offset hard-coded on phone | (none) | no rule |
| agent-desk | model menu | choice | judgment | Model, effort and permission are three near-identical peer pills; effort loses its label on phone | (none) | no rule |
| agent-desk | more menu | consequence | source | 'Stop agent' sits under 'Export transcript' with only red text, no separator or confirmation | destructive-unseparated | — |
| agent-desk | chat context menu | consequence | source | Delete removes a chat immediately with no confirmation or undo; kebab invisible until hover | (none) | no rule |
| agent-desk | settings dialog | grouping | judgment | Toggles, select and read-only usage stats in one list with identical separators | (none) | no rule |
| agent-desk | settings dialog | convention | source | Focus lands on the X with a heavy ring; both X and Cancel; no pending-change state | (none) | no rule |
| agent-desk | copy toast | grouping | render | Toast covers the composer's effort and permission controls and duplicates in-button feedback | (none) | no rule |
| food-checkout | fees popover | encoding | render | An empty 'Promo' row shows in the summary because [hidden] is overridden by display:flex | (none) | no rule |
| food-checkout | fees popover | grouping | render | Breakdown popover covers the tip and total it explains; cut off at 390px | surface-offscreen | — |
| food-checkout | fees popover | pointing | render | Fee breakdown only reachable through a 22px info button | small-target | — |
| food-checkout | page | salience | judgment | Order summary and total sit at the bottom after seven cards; never visible on phone without scrolling | primary-not-first | — |
| food-checkout | page | grouping | render | On phone 'Remove' wraps to its own line, leaving ragged loosely attached action rows | weak-grouping | weak-grouping |
| food-checkout | page | consequence | source | Remove is a muted link with a ~28px hit area; minus at quantity 1 silently removes the item | small-target | small-target |
| food-checkout | page | legibility | render | At 390px the long address runs under the 'Change' link | text-overflow | — |
| food-checkout | page | encoding | judgment | Brand red used for primary, links, selection and (almost) error, so red says nothing | (none) | no rule |
| food-checkout | page | legibility | render | Section headings and sub-amounts are small and low contrast | low-contrast | low-contrast |
| food-checkout | page | consequence | source | Place order commits with no recap beside it; confirmation's back link allows placing it again | (none) | no rule |
| food-checkout | address sheet | convention | source | Sheet has no close or cancel; new address commits silently on Done | (none) | no rule |
| food-checkout | schedule picker | legibility | render | Disabled 'Confirm time' label hard to read in both themes | low-contrast | low-contrast |
| food-checkout | schedule picker | choice | judgment | 23 slots in one undivided grid; focus ring on 'Today' looks like a selection | too-many-peers | too-many-peers |
| food-checkout | payment sheet | purpose | judgment | 'Default wallet' label contradicts the preselected default card | (none) | no rule |
| food-checkout | undo snackbar | response | render | Undo toast covers cards for six seconds while the total jumps with no other signal | (none) | no rule |
| inbox | page | legibility | render | 10px timestamps and chips, 11.5px snippets in faint grey in a list read all day | low-contrast | low-contrast |
| inbox | page | pointing | render | Star and more buttons about 26px; more invisible until hover | small-target | small-target |
| inbox | page | choice | judgment | Archive and delete, the main triage actions, are not on rows | (none) | no rule |
| inbox | page | salience | judgment | Reply sits at the end of the message in secondary style | (none) | no rule |
| inbox | page | encoding | judgment | One accent means brand, primary, selection, unread and danger; avatar tints mean nothing | (none) | no rule |
| inbox | page | purpose | judgment | Account avatar and message count each shown two or three times | (none) | no rule |
| inbox | page | pointing | render | On phone, row buttons, Compose and toolbar buttons about 33px | small-target | small-target |
| inbox | compose window | consequence | judgment | Discard draft is a bare trash icon next to a close X that saves; no visible difference | destructive-unseparated | — |
| inbox | compose window | convention | judgment | Compose is modal, blocking the message being replied to; no Cc, Bcc or attach | (none) | no rule |
| inbox | message menu | choice | judgment | Order reverses frequency; duplicates the toolbar | (none) | no rule |
| inbox | message menu | consequence | judgment | Delete directly under Archive with no gap; unclear if permanent | destructive-unseparated | destructive-unseparated |
| inbox | snooze picker | encoding | judgment | Icons switch meaning; focus lands on the close X | (none) | no rule |
| inbox | archive toast | response | render | Toast covers content, does not say which message, small Undo | small-target | — |
| inbox | shortcuts dialog | purpose | judgment | Omits frequent triage shortcuts; help shown on touch phones | (none) | no rule |
| inbox | advanced search | convention | judgment | Unlabeled opener; popover covers headers; missing common filters | unlabelled-field | — |
| onboarding-wizard | page | salience | render | Current step in the progress bar is drawn faintest; segments unlabeled | (none) | no rule |
| onboarding-wizard | page | legibility | render | Programmatic focus puts a heavy ring on the heading at load | (none) | no rule |
| onboarding-wizard | page | grouping | render | At 390px the gap between stacked fields is larger than elsewhere; misstated grouping | weak-grouping | weak-grouping |
| onboarding-wizard | page | salience | judgment | Exit, the fiscal-year hint and an inline 'Why' link compete; the 'Why' modal hides text that could be inline | (none) | no rule |
| onboarding-wizard | page | pointing | render | Help '?' button 36px and 'Why' link 32px tall, under the phone minimum | small-target | small-target |
| onboarding-wizard | page | purpose | source | Two overlapping help mechanisms explain the same step | (none) | no rule |
| onboarding-wizard | page | convention | source | Back, Skip and Next in three styles; optional steps not marked until an error | (none) | no rule |
| onboarding-wizard | page | legibility | render | Muted hint, progress and placeholder text small and low contrast, especially dark | low-contrast | — |
| onboarding-wizard | help popover | grouping | render | Popover covers the field it explains; no arrow, no close | covers-trigger | — |
| onboarding-wizard | help popover | encoding | render | Popover drawn like the card, so in dark mode it blends in | (none) | no rule |
| onboarding-wizard | why dialog | legibility | render | Muted body copy; no close control; 'Got it' only | low-contrast | — |
| onboarding-wizard | exit dialog | consequence | judgment | Harmless 'exit and save' styled as danger, louder than Keep going | (none) | no rule |
| onboarding-wizard | exit dialog | consequence | source | Dialog promises progress is saved, but only the step number is | (none) | no rule |
| onboarding-wizard | exit dialog | legibility | render | Dark mode: white text on salmon fill, weak contrast | low-contrast | low-contrast |
| revenue-dash | page | salience | judgment | Share is the only filled control and the loudest thing, though the main task is reading the trend | unearned-salience, primary-not-first | — |
| revenue-dash | page | encoding | source | Colours have no stable meaning: plan colours reuse the MRR/accent blue, each sparkline an arbitrary hue | (none) | no rule |
| revenue-dash | page | legibility | render | Cohort heatmap labels fail contrast in light and especially dark mode | low-contrast | low-contrast |
| revenue-dash | page | grouping | judgment | Cohort table shows an empty current-month row that reads as broken | (none) | no rule |
| revenue-dash | page | pointing | render | On phone the toolbar wraps into uneven rows and KPI trend context is dropped | (none) | no rule |
| revenue-dash | date popover | grouping | render | Quick ranges wrap unevenly and are out of order; popover covers the KPIs it changes | (none) | no rule |
| revenue-dash | date popover | response | source | Quick ranges apply instantly but custom range needs Apply; reversed range swapped silently | (none) | no rule |
| revenue-dash | export menu | grouping | judgment | Immediate downloads and a persistent schedule setup in one flat list; focus ring reads as selection | (none) | no rule |
| revenue-dash | customer drawer | pointing | render | Close button 34px, under the 44px touch minimum; no outside-tap exit on phone | small-target | small-target |
| revenue-dash | customer drawer | purpose | judgment | Drawer padded with made-up rows and a status that never varies; no action | (none) | no rule |
| revenue-dash | share dialog | consequence | source | 'Remove' is an option inside the role select and applies immediately with no confirmation or undo | destructive-unseparated | destructive-unseparated |
| revenue-dash | share dialog | legibility | render | Link field opens scrolled to the end; small grey access text; unlabeled toggles | low-contrast, unlabelled-field | — |
| revenue-dash | plan-mix tooltip | encoding | judgment | Tooltip repeats legend figures; hover earns little | (none) | no rule |
| revenue-dash | page | encoding | judgment | Delta badges contradict the chart, and arrow direction and colour are read two ways | (none) | no rule |
| ticket-admin | page | salience | judgment | Default sort by updated scatters SLA-breaching tickets; 'SLA at risk' is a quiet fifth tab | (none) | no rule |
| ticket-admin | page | encoding | judgment | Priority and status are look-alike coloured pills with overlapping hues | (none) | no rule |
| ticket-admin | page | encoding | render | Identical avatars and bold subjects everywhere: emphasis distinguishes nothing | flat-emphasis | flat-emphasis |
| ticket-admin | page | legibility | render | 11px uppercase headers, 12px mono IDs and disabled pager arrows are low contrast | low-contrast | low-contrast |
| ticket-admin | page | pointing | render | 16px checkboxes, 28px kebab and pager buttons; under 44px on phone | small-target | small-target |
| ticket-admin | page | convention | render | At 390px the table is cut off with no cue, tabs clipped, buttons collapse to unlabeled icons | horizontal-scroll, text-overflow | — |
| ticket-admin | page | purpose | judgment | 'New ticket' is the most saturated element on a triage screen where it is rarely used | unearned-salience | — |
| ticket-admin | filter popover | choice | judgment | Three steps per filter that duplicate the tabs; no quick filters | (none) | no rule |
| ticket-admin | filter popover | legibility | render | Odd 'Is' label; popover covers headers; no match preview | (none) | no rule |
| ticket-admin | row actions menu | choice | judgment | Frequent actions (assign to me, resolve) hidden behind a 28px kebab; rare 'Open details' leads | (none) | no rule |
| ticket-admin | row actions menu | consequence | source | Delete sits two rows under Merge with a hairline; no undo for resolve or assign | destructive-unseparated | — |
| ticket-admin | column menu | purpose | judgment | Column picker serves almost no triage task and takes prime toolbar space | (none) | no rule |
| ticket-admin | column menu | convention | render | On phone toggling hidden columns does nothing, so the menu misstates what shows | (none) | no rule |
| ticket-admin | ticket side panel | salience | judgment | No reply box; resolve is emphasised before any response is written | (none) | no rule |
| ticket-admin | ticket side panel | grouping | render | Labels far from values; SLA due drawn like created/updated | (none) | no rule |
| ticket-admin | ticket side panel | response | source | Scrim blocks the list; no next/previous, so close-and-reopen per ticket | (none) | no rule |
| tracewell-landing | page | salience | judgment | The main task (book a demo) is a quiet secondary button; the only filled primary just scrolls the page | primary-not-first, unearned-salience | primary-not-first, unearned-salience |
| tracewell-landing | page | salience | judgment | A dark code snippet dominates the fold; the product itself is below it | (none) | no rule |
| tracewell-landing | page | choice | render | On phone the main conversion action is hidden inside the collapsed menu | plan-missing | — |
| tracewell-landing | demo dialog | convention | judgment | 'Book a demo' leads to downloading a text file; label, heading and outcome disagree | (none) | no rule |
| tracewell-landing | demo dialog | legibility | source | Required and optional fields look the same; small labels; browser-default errors only | (none) | no rule |
| tracewell-landing | copy toast | response | render | Copy only selects text; the toast is far from the button and confirms nothing | (none) | no rule |
| tracewell-landing | copy toast | encoding | judgment | A loud lime selection colour used nowhere else, hard to read on the snippet | (none) | no rule |
| tracewell-landing | page | legibility | render | 11-12px chart and trace labels in muted colour, hard to read in dark mode; hero letters nearly touch | low-contrast | — |
| tracewell-landing | product menu | purpose | judgment | Dropdown hides three in-page anchors and mixes navigation levels | (none) | no rule |
| tracewell-landing | faq answer | grouping | render | Large empty heading column; faint toggle far from the question | (none) | no rule |
| tracewell-landing | page | encoding | judgment | Pricing repeats prices and labels like 'View quickstart' do not say what happens | (none) | no rule |
| tracewell-landing | page | purpose | judgment | Invented, unattributed testimonials take a full section | (none) | no rule |
| tracewell-landing | page | pointing | render | The strongest call to action is in pricing, not in the hero | salience-inversion | — |
| workspace-settings | page | purpose | judgment | Decorative 157px hero banner with orbit rings repeats the title and pushes the form down | unearned-salience, primary-not-first | primary-not-first, unearned-salience |
| workspace-settings | page | grouping | judgment | Danger zone is a peer of routine sections in the nav | (none) | no rule |
| workspace-settings | page | salience | render | 42px title outweighs the fields people came to change; a rare avatar action gets a full panel | primary-not-first, salience-inversion | primary-not-first |
| workspace-settings | page | memory | judgment | Saving split across a panel button, a floating bar and a status label with different wording | (none) | no rule |
| workspace-settings | page | encoding | source | Active nav item marked four ways; decorative label styling and tile | (none) | no rule |
| workspace-settings | page | pointing | render | On phone, 38px-high 12px tabs in a 3x2 grid take the first screen | small-target | small-target |
| workspace-settings | page | legibility | render | Much supporting text is 10-12px muted grey; low-contrast footer | low-contrast | — |
| workspace-settings | timezone popover | convention | render | Picker opens above its trigger and covers the field label and other inputs | covers-trigger | — |
| workspace-settings | timezone popover | choice | judgment | About 400 ungrouped zone names with no offsets; five rows visible | too-many-peers | — |
| workspace-settings | role menu | legibility | judgment | Roles listed without what they can do; current role marked twice | (none) | no rule |
| workspace-settings | remove member dialog | consequence | judgment | Does not say what happens to the person's content, whether it can be undone, or billing; red trash always visible per row | (none) | no rule |
| workspace-settings | delete workspace dialog | consequence | source | Copy understates a permanent deletion; button looks active before the name is typed | (none) | no rule |
| workspace-settings | save toast | salience | render | Toast covers the Save button just clicked, at both widths | covers-trigger | covers-trigger |
| workspace-settings | invite dialog | legibility | judgment | Roles unexplained, jargon copy, unclear if an email is sent or a seat billed; dark radios look disabled | (none) | no rule |

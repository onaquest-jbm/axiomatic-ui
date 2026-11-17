# Derivation: Workbench

Every value below follows from the model and the principles it cites. To change a value, change the model.

| Decision | Value | Because | Principles |
|---|---|---|---|
| density | compact | Experts in long, daily sessions gain more from seeing more at once (less scrolling, less to remember) than they lose to tighter spacing; they already know the layout. | Working memory holds about four chunks; Proximity and enclosure are read as relatedness |
| type.body | 13 | Desktop text is read at 50-70 cm; 13-16 px is legible, and denser layouts sit at the low end. | Reading has physical limits |
| type.ratio | 1.15 | Adjacent ranks must differ by at least ~15% in size to be read as different ranks rather than inconsistency; denser layouts use the smallest step that is still distinct. | Every visual difference is read as a difference in meaning; Attention is a fixed budget |
| type.sizes | meta 11, body 13, heading 15 | One size per text rank the information actually has (3): meta, body, heading. No other sizes exist, so every size difference means a rank difference. Smaller ranks are clamped to 11 px. | Every visual difference is read as a difference in meaning; Reading has physical limits |
| type.weights | regular 400, strong 600 | Two weights: weight is a second channel for rank when size steps are small. A third weight would be a difference people cannot reliably name. | Every visual difference is read as a difference in meaning |
| type.leading | body 1.4, heading 1.25 | Body line height of 1.4-1.5 lets the eye find the next line; headings are short, so tighter leading keeps them one unit. | Reading has physical limits; Proximity and enclosure are read as relatedness |
| type.measure | 68ch | Running text is limited to about 68 characters per line, inside the 45-75 range where reading speed and return sweeps are best. | Reading has physical limits |
| space | control 4, related 6, group 10, section 16, region 26 | Five relatedness levels: inside a control, between related items, between groups, between sections, between regions. Each is at least 1.5x the level inside it, so proximity alone tells people what belongs together. Base: half the body size (6.5px); grid: 2 px. | Proximity and enclosure are read as relatedness; Every visual difference is read as a difference in meaning |
| target.min | 24 | With a mouse, 24 px is the floor below which pointing time and errors rise sharply. | Pointing time grows with distance and shrinks with size |
| target.touch | 44 | Touch is also an input, so layouts used with a finger (coarse pointer or phone width) switch to 44 px targets. | Pointing time grows with distance and shrinks with size |
| target.control | 30 | Control height = one line of body text (18px) plus control padding on both sides, but never below the minimum target. | Pointing time grows with distance and shrinks with size; Proximity and enclosure are read as relatedness |
| radius.control | 6 | Rounded corners mark a thing as one pickable object. A small radius proportional to control height reads as a control without competing with content. | Conventions are memory people already have; Every visual difference is read as a difference in meaning |
| radius.container | 10 | Containers that hold controls use the control radius plus the inner gap, so the inner and outer curves stay concentric and read as one shape. | Proximity and enclosure are read as relatedness |
| color.hue | 250 | No brand color given: blue, the long-standing convention for interactive and selected things. | Conventions are memory people already have |
| color.surfaces | canvas, base, sunken | Three surfaces, one per region role: the app canvas, content that sits on it, and inset wells. They differ by a small lightness step so regions separate without borders. | Proximity and enclosure are read as relatedness; Every visual difference is read as a difference in meaning |
| color.ink | primary 13:1, secondary 7:1, tertiary 4.5:1 | Three text emphasis ranks, each solved to an exact contrast against the lightest/darkest surface it sits on. The lowest rank is still above the 4.5:1 reading floor; each step roughly halves contrast so the ranks are distinct. | Reading has physical limits; Every visual difference is read as a difference in meaning; Attention is a fixed budget |
| color.edges | separator 1.25:1, control 3:1 | Two edge meanings: a separator (only where spacing cannot show the grouping) is faint; a control boundary must reach 3:1 so people can find the thing to click. | Reading has physical limits; Proximity and enclosure are read as relatedness; Every visual difference is read as a difference in meaning |
| color.accent | one accent | One accent hue means one thing: the primary action and the current selection. A second accent would be a second meaning competing for the same attention. | Attention is a fixed budget; Every visual difference is read as a difference in meaning |
| color.states | running, waiting, error, success | One color per state the information actually has (4). States not in the model get no color. Each is solved to 4.5:1 so it can be used as text. | Every visual difference is read as a difference in meaning; Reading has physical limits |
| motion.state | 90 | In-place state changes (color, opacity) need just enough time to read as a change rather than a flicker. | Motion is seen as cause, and it captures attention |
| motion.element | 140 | An element appearing, leaving or expanding: long enough to be seen as one object transforming, short enough not to wait for. | Motion is seen as cause, and it captures attention; Response time has three human thresholds |
| motion.region | 200 | A panel or sidebar crossing a large distance needs the most time to stay readable as movement, and stays under 250 ms. | Motion is seen as cause, and it captures attention; Response time has three human thresholds |
| motion.easing | decelerate in, accelerate out | Things entering slow down into place (they arrive under control); things leaving speed up (they get out of the way). Overshoot would add motion that means nothing. | Motion is seen as cause, and it captures attention; Every visual difference is read as a difference in meaning |
| response | feedbackMs 100, progressMs 1000, cancelMs 10000 | Every input shows a visible result within 100 ms. Work over 1 s shows progress. Work over 10 s can be cancelled. | Response time has three human thresholds |
| tasks | decide: primary; follow: secondary; review: secondary; ask: secondary; switch: secondary; trust: tertiary; configure: tertiary; start: tertiary | Tasks are ranked by how often they happen, then by how much a mistake costs. Rank decides salience; frequency decides visibility and target size; consequence decides friction. | Attention is a fixed budget; Decision time grows with the number of choices; Pointing time grows with distance and shrinks with size; Effort should follow consequence |
| budget | primaryPerView 1, visibleActionsPerGroup 4, groupsPerLevel 4 | One primary per view (one thing is seen first). About four visible actions per group and four groups competing at each level, the size of working memory. | Attention is a fixed budget; Working memory holds about four chunks; Decision time grows with the number of choices |

## Tasks

| Task | Tier | Treatment |
|---|---|---|
| Approve or deny a command the agent wants to run | primary | most salient thing on its screen; the one accent-filled action; irreversible but frequent: the control itself is the confirmation, so it states exactly what will happen; no extra dialog, which would become a reflex and protect nothing; keyboard shortcut, shown next to the label |
| Follow what the agent is doing and why | secondary | always visible, updates in place; no action needed to see it |
| See what changed (files, +/- lines) | secondary | always visible, updates in place; no action needed to see it |
| Send the next instruction | secondary | visible, quiet styling; act immediately; offer undo instead of asking first; keyboard shortcut, shown next to the label |
| Switch to another running chat | secondary | visible, quiet styling; act immediately; offer undo instead of asking first; keyboard shortcut, shown next to the label |
| Always allow a command class | tertiary | visible as a text button, or in context where it applies; reversible but costly: state the consequence in the control, keep undo available |
| Change model or permission mode | tertiary | visible as a text button, or in context where it applies; act immediately; offer undo instead of asking first |
| Start a new chat | tertiary | visible as a text button, or in context where it applies; act immediately; offer undo instead of asking first |

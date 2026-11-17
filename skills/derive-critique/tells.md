# Tells

Patterns that usually mean the axiom broke somewhere upstream. They are for **recognising** a failure in an existing or rendered screen, not a list to build against: a screen built with `derive-screen` should never produce them, and removing one without fixing its cause just makes room for the next.

Each tell names which half of the axiom fails and where the cause usually lives.

**Noise** = a difference that means nothing. **Lost** = a meaning with no visible difference.

| Tell | Fails | Usual cause | Fix at |
|---|---|---|---|
| Hue gradients on surfaces or text, colored glows, blurred color blobs | Noise | No meaning was assigned to color, so color became decoration | Code: surface and ink tokens only |
| Many near-identical tints for text | Noise | Text emphasis levels were never decided | System: three ink roles |
| Everything highlighted, several accent-filled buttons | Lost | No task ranking for the screen | Plan: salience order, one primary |
| Card around everything, box inside a box | Noise | Enclosure used where spacing should show grouping | Plan: groups; code: gap levels |
| A dozen font sizes, odd values like 13.5 px | Noise | Sizes improvised per element instead of per rank | System: one size per text rank |
| Heavy weights everywhere, bold headings at 800 to 900 | Lost | Emphasis spread so wide it marks nothing | Plan: what is emphasised, and why |
| Uppercase, widely tracked labels | Noise | Case used as decoration rather than a rank | Code: the text rank's token |
| Emoji as icons or label decoration, a sparkle on anything "AI" | Noise | Symbols that map to no object or state | Code: icon set or text |
| Icons in many sizes and colors, or on every heading | Noise | Icons used as ornament, not recognition aids | Code: one set, ink-role color |
| Uneven paddings in sibling items, arbitrary px values | Noise | Values typed in place, no relatedness levels | System: gap levels |
| Groups closer to their neighbours than to their own items | Lost | Relatedness never modelled | Plan: groups |
| Greeting headlines, exclamation marks, hype words | Noise | Copy written for tone, not for the task | Code: labels name objects and actions |
| "+12%" with no reference, mixed number formats | Lost | The comparison or unit was never stated | Code: reference and one format |
| Unsourced social proof, "10x faster", round fake numbers | Lost | Claims invented instead of taken from the product | Model: facts only; ask the owner |
| Several charts the same size, rainbow series in one chart | Lost | No ranking of the data by task | Plan: one main chart, accent on what matters |
| Pulsing or looping motion on things that aren't live | Noise | Motion used for liveliness, not change | Code: motion only for change |
| `transition: all`, bouncy or overshooting easing, `hover:scale` on cards | Noise | Motion not tied to a specific change | Code: name the property, derived easing |
| Only the populated, happy-path state exists | Lost | States never modelled | Model: states; scenarios for each |
| A layout that departs from what the reference products do, for no task reason | Noise | Novelty treated as a goal | Plan: follow convention unless a task earns the cost |

When a tell appears, name the cause and the level in the finding, not just the tell.

Several of these patterns are adapted from unslop by Damir Sokolovsky (github.com/heydamir/unslop), licensed CC BY 4.0 (creativecommons.org/licenses/by/4.0). Derive maps them to causes instead of fixing them one by one.

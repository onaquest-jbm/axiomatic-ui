'use strict';
// The premises Axiomatic UI reasons from. Each one is a fact about people or about encoding, with the
// number Axiomatic UI uses, where it comes from, and what in the interface it decides.
// Everything Axiomatic UI outputs cites one or more of these ids.

const PRINCIPLES = [
  {
    id: 'purpose',
    name: 'An interface exists to close two gulfs',
    statement: 'A person must be able to tell the system\'s state (evaluation) and turn an intention into an action (execution). An element that shortens neither gulf for some task is cost without benefit.',
    numbers: 'Every element maps to a task in the model, or it is removed.',
    decides: 'What is on the screen at all.',
    source: 'Norman & Draper, User Centered System Design (1986); Norman, The Design of Everyday Things (2013).',
  },
  {
    id: 'encoding',
    name: 'Every visual difference is read as a difference in meaning',
    statement: 'Position, size, value (lightness), color, shape, orientation and texture are channels that carry information. People read a difference in any channel as a difference in meaning, so a difference that means nothing is noise, and a meaning with no visible difference is lost.',
    numbers: 'Distinct values per channel = distinct meanings that channel carries. Nothing more.',
    decides: 'How many sizes, colors, weights, spacings and surfaces exist, and what each one is for.',
    source: 'Bertin, Semiology of Graphics (1967); Mackinlay, ACM TOG (1986); Tufte, The Visual Display of Quantitative Information (1983).',
  },
  {
    id: 'salience',
    name: 'Attention is a fixed budget',
    statement: 'Size, contrast, color, motion and position are processed before conscious attention and pull the eye. Salience is relative: raising one element lowers every other. A screen can have one thing that is seen first.',
    numbers: 'One most-salient element per view, then a short ordered list. Salience order = task priority order.',
    decides: 'The ranking of every element on a screen and how loudly each is drawn.',
    source: 'Treisman & Gelade, Cognitive Psychology (1980); Wolfe & Horowitz, Nature Reviews Neuroscience (2004); Itti & Koch, Vision Research (2000).',
  },
  {
    id: 'grouping',
    name: 'Proximity and enclosure are read as relatedness',
    statement: 'Elements closer together, or inside a shared region, are perceived as one group. The gap between groups must be clearly larger than the gap inside a group, or grouping is ambiguous.',
    numbers: 'Each relatedness level gets one spacing value, at least 1.5x the level inside it.',
    decides: 'The spacing scale, and when a border or background is needed at all.',
    source: 'Wertheimer (1923); Palmer, Cognitive Psychology (1992) on common region; Kubovy & van den Berg, Psychological Review (2008).',
  },
  {
    id: 'memory',
    name: 'Working memory holds about four chunks',
    statement: 'People hold roughly four items in mind at once. Recognizing a visible option is cheaper than recalling a hidden one.',
    numbers: 'About 4 groups competing at any level; keep state visible instead of making people remember it.',
    decides: 'How content is chunked, and what must stay visible versus be one step away.',
    source: 'Cowan, Behavioral and Brain Sciences (2001); Miller, Psychological Review (1956).',
  },
  {
    id: 'choice',
    name: 'Decision time grows with the number of choices',
    statement: 'Time to choose rises with the log of the number of equally likely options. Choices that are rarely used slow down the common ones.',
    numbers: 'Show actions in proportion to their use; rare actions go one level down (menu, palette, disclosure).',
    decides: 'Which actions are visible, which are in menus, and the order of options.',
    source: 'Hick, QJEP (1952); Hyman, JEP (1953).',
  },
  {
    id: 'pointing',
    name: 'Pointing time grows with distance and shrinks with size',
    statement: 'Time to hit a target is a + b·log2(D/W + 1). Frequent actions should be large and close to where the pointer or thumb already is; edges and corners are effectively infinite targets.',
    numbers: 'Minimum target 24 px with a mouse, 44 px for touch. Target size and nearness follow frequency.',
    decides: 'Control sizes, where the most frequent actions sit, keyboard shortcuts for expert-frequency actions.',
    source: 'Fitts, JEP (1954); MacKenzie, HCI (1992); WCAG 2.2 SC 2.5.8; Apple HIG.',
  },
  {
    id: 'response',
    name: 'Response time has three human thresholds',
    statement: 'Under about 100 ms a response feels caused by the action. Under about 1 s the flow of thought is kept. Past about 10 s attention leaves.',
    numbers: 'Visible feedback ≤ 100 ms for every input; progress shown for anything ≥ 1 s; cancel for anything ≥ 10 s.',
    decides: 'Latency budgets, optimistic updates, progress and cancel affordances.',
    source: 'Miller, AFIPS (1968); Card, Robertson & Mackinlay, CHI (1991); Nielsen, Usability Engineering (1993).',
  },
  {
    id: 'legibility',
    name: 'Reading has physical limits',
    statement: 'Text must clear a luminance-contrast threshold and a size threshold for its viewing distance. Comfortable line length is roughly 45 to 75 characters.',
    numbers: 'Text ≥ 4.5:1 (3:1 at 24 px+), control boundaries ≥ 3:1. Body text 13-16 px on desktop, 16 px+ on phones. Lines 45-75 characters.',
    decides: 'Base text size, the text color ramp, line height and maximum text width.',
    source: 'WCAG 2.2 SC 1.4.3 and 1.4.11; Legge & Bigelow, Journal of Vision (2011); Dyson, Typographic research summaries (2004); Bringhurst (1992).',
  },
  {
    id: 'motion',
    name: 'Motion is seen as cause, and it captures attention',
    statement: 'A change animated over roughly 100-300 ms is perceived as one object moving or transforming. Shorter reads as a jump, longer makes people wait. Motion pulls attention involuntarily, so it must carry information.',
    numbers: '100-250 ms, scaled by how far the thing moves; motion only for appearing, leaving, moving or changing state.',
    decides: 'Duration tokens and which changes are animated at all.',
    source: 'Michotte, The Perception of Causality (1946/1963); Abrams & Christ, Psychological Science (2003); Material motion and Apple HIG durations.',
  },
  {
    id: 'convention',
    name: 'Conventions are memory people already have',
    statement: 'Users spend most of their time in other software. Where they expect a thing to be and how they expect it to behave is a learned model; matching it costs nothing, breaking it costs learning time and errors.',
    numbers: 'Default to the reference products\' placement and behavior; a departure must buy more than it costs.',
    decides: 'Layout skeleton, placement of navigation and actions, keyboard behavior, control types.',
    source: 'Nielsen, "Jakob\'s Law" (2000); Carroll & Rosson, "The paradox of the active user" (1987).',
  },
  {
    id: 'consequence',
    name: 'Effort should follow consequence',
    statement: 'Reversible actions should be fast. Irreversible or costly actions should be harder to trigger by accident, and the cost of a mistake should be visible before it is made. But a confirmation on a frequent action becomes a reflex and stops protecting anything; there the control itself must state exactly what will happen.',
    numbers: 'Reversible: act immediately, offer undo. Irreversible and rare: separate it, name the object, second step. Irreversible and frequent: the labelled control is the confirmation.',
    decides: 'Confirmation, undo, destructive styling and placement.',
    source: 'Norman, "Design rules based on analyses of human error" CACM (1983); Reason, Human Error (1990); Raskin, The Humane Interface (2000) on habituation.',
  },
];

const BY_ID = Object.fromEntries(PRINCIPLES.map((p) => [p.id, p]));

module.exports = { PRINCIPLES, BY_ID };

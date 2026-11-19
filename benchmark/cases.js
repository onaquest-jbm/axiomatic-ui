'use strict';
// Benchmark cases: known UI defects, each planted on a copy of a clean page.
//
// Ground truth is written here BEFORE running any check, and is not edited to fit results.
// Each defect records:
//   principle  which premise in src/principles.js it breaks
//   layer      the cheapest place it could be detected: 'source' (reading code), 'render'
//              (measuring the rendered page), 'judgment' (needs a person or model to judge meaning)
//   expect     rule ids that would legitimately count as catching it. [] means no rule is
//              designed to catch it today; that is recorded, not hidden.
//
// Mutations apply to the base page (demo/after.html plus a clean "More" menu and settings dialog):
//   css      appended to the page's <style>
//   replace  [from, to] pairs; every `from` must match or the build fails
//   html     inserted right before </body>
//   surface  for rare-surface cases: { trigger, target } — built twice, once opened by a click
//            step and once already open at load, so "can't reach it" separates from "no rule".
//   themes / widths   override the default render matrix

const L = { obvious: 1, subtle: 2, compound: 3, surface: 4 };

const CASES = [
  // ---------- encoding: every visual difference means something ----------
  { id: 'enc-gradient-bar', level: L.obvious, title: 'Gradient header bar',
    css: '.topbar { background: linear-gradient(90deg, #6d5dfc, #c86dd7); }',
    defects: [{ principle: 'encoding', layer: 'source', what: 'Decorative gradient on the header', expect: ['decorative-color', 'text-on-gradient', 'raw-color', 'underived-color'] }] },
  { id: 'enc-gradient-text', level: L.obvious, title: 'Gradient-filled title',
    css: '.topbar h1 { background: linear-gradient(90deg, #6d5dfc, #e0559a); -webkit-background-clip: text; background-clip: text; color: transparent; }',
    defects: [{ principle: 'encoding', layer: 'source', what: 'Gradient text on the title', expect: ['decorative-color', 'raw-color'] }] },
  { id: 'enc-glass-card', level: L.obvious, title: 'Frosted glass request card',
    css: '.request { background: rgba(255,255,255,0.55); backdrop-filter: blur(12px); }',
    defects: [{ principle: 'encoding', layer: 'source', what: 'Backdrop blur with no layering meaning', expect: ['decorative-depth', 'raw-color'] }] },
  { id: 'enc-shadow-soup', level: L.obvious, title: 'A different shadow on every box',
    css: '.user-msg { box-shadow: 0 2px 6px rgba(0,0,0,.08); } .composer-box { box-shadow: 0 8px 24px rgba(0,0,0,.12); } .request { box-shadow: 0 4px 14px rgba(0,0,0,.1); } .chat[aria-current="page"] { box-shadow: 0 1px 3px rgba(0,0,0,.2); }',
    defects: [{ principle: 'encoding', layer: 'source', what: 'Literal shadows on in-flow boxes (depth that means nothing)', expect: ['decorative-depth', 'raw-color', 'underived-color'] }] },
  { id: 'enc-emoji-labels', level: L.obvious, title: 'Emoji in headings and buttons',
    replace: [['<h1>Fix login redirect</h1>', '<h1>🚀 Fix login redirect</h1>'], ['<h2>Today</h2>', '<h2>✨ Today</h2>'], ['Run tests <kbd>Enter</kbd>', '✅ Run tests <kbd>Enter</kbd>']],
    defects: [{ principle: 'encoding', layer: 'source', what: 'Emoji that map to no state or object', expect: ['decorative-symbol'] }] },
  { id: 'enc-near-duplicate-sizes', level: L.subtle, title: 'Four body sizes that read as one (seen in a real app)',
    css: '.chat-title { font-size: 13.5px; } .turn p { font-size: 13px; } .user-msg { font-size: 12.5px; } .request-head span { font-size: 12px; }',
    defects: [{ principle: 'encoding', layer: 'source', what: '12 / 12.5 / 13 / 13.5 px: differences no one can name a meaning for', expect: ['raw-size', 'underived-size'] }] },
  { id: 'enc-radius-zoo', level: L.subtle, title: 'Five different corner radii',
    css: '.btn { border-radius: 6px; } .request { border-radius: 14px; } .composer-box { border-radius: 20px; } .user-msg { border-radius: 10px; } .command { border-radius: 3px; }',
    defects: [{ principle: 'encoding', layer: 'source', what: 'Radii with no meaning per value', expect: ['raw-radius'] }] },
  { id: 'enc-pastel-rows', level: L.subtle, title: 'Each chat row a different pastel',
    css: '.chats li:nth-child(1) .chat { background: #eef2ff; } .chats li:nth-child(2) .chat { background: #fdf2f8; } .chats li:nth-child(3) .chat { background: #ecfdf5; }',
    defects: [{ principle: 'encoding', layer: 'source', what: 'Color variety that encodes nothing', expect: ['raw-color', 'underived-color'] }] },
  { id: 'enc-state-lost', level: L.subtle, title: 'Waiting looks the same as idle',
    css: '.dot.waiting { background: var(--edge-control); }',
    defects: [{ principle: 'encoding', layer: 'judgment', what: 'A meaningful state (waiting on you) with no visible difference', expect: [] }] },
  { id: 'enc-icon-header', level: L.subtle, title: 'Eight equal unlabeled icon buttons (seen in a real app)',
    replace: [['<span class="grow"></span>\n      <div class="diffstat"', '<span class="grow"></span>\n      <span class="icons"><button class="btn text" type="button">⎘</button><button class="btn text" type="button">⇪</button><button class="btn text" type="button">☰</button><button class="btn text" type="button">⚙</button><button class="btn text" type="button">⌕</button><button class="btn text" type="button">⧉</button><button class="btn text" type="button">⟳</button><button class="btn text" type="button">⋯</button></span>\n      <div class="diffstat"']],
    css: '.icons { display: flex; gap: var(--gap-control); }',
    defects: [
      { principle: 'salience', layer: 'judgment', what: 'Eight actions of very different frequency drawn identically', expect: [] },
      { principle: 'legibility', layer: 'render', what: 'Icon-only buttons with no accessible name', expect: [] }] },

  // ---------- salience: attention is a fixed budget ----------
  { id: 'sal-three-primaries', level: L.obvious, title: 'Every request action accent-filled',
    replace: [['<button class="btn" type="button" data-action="deny">', '<button class="btn primary" type="button" data-action="deny">'], ['<button class="btn text" type="button" data-action="always">', '<button class="btn primary" type="button" data-action="always">']],
    defects: [{ principle: 'salience', layer: 'render', what: 'Three accent-filled actions in one view', expect: ['competing-primaries'] }] },
  { id: 'sal-promo-banner', level: L.obvious, title: 'Upgrade banner above the work',
    replace: [['<div class="column">', '<div class="column"><div class="promo"><strong>Unlock Pro features</strong><span>Faster agents, longer context, priority support.</span><button class="btn primary" type="button">Upgrade now</button></div>']],
    css: '.promo { display: flex; flex-direction: column; gap: var(--gap-related); padding: var(--gap-section); border-radius: var(--radius-container); background: var(--accent); color: var(--on-accent); } .promo strong { font-size: var(--text-heading); } .promo .btn.primary { background: var(--surface-base); color: var(--ink-primary); }',
    defects: [{ principle: 'salience', layer: 'render', what: 'An element serving no task is the loudest thing on screen', expect: ['unearned-salience', 'primary-not-first', 'competing-primaries'] }] },
  { id: 'sal-all-bold', level: L.subtle, title: 'Everything bold',
    css: 'body, .turn p, .chat-title, .user-msg, .request-head span, .steps summary { font-weight: 700; }',
    defects: [{ principle: 'salience', layer: 'render', what: 'Emphasis everywhere, so it marks nothing', expect: ['flat-emphasis'] }] },
  { id: 'sal-blocking-quiet', level: L.subtle, title: 'Pending decision shown as a muted line (seen in a real app)',
    css: '.request { border: 0; padding: 0; background: none; } .request-head strong { font-size: var(--text-meta); font-weight: var(--weight-regular); color: var(--ink-tertiary); } .request-head span, .command, .request-actions { opacity: .55; }',
    defects: [{ principle: 'salience', layer: 'render', what: 'The one thing blocking work is among the quietest elements', expect: ['primary-not-first', 'salience-inversion', 'low-contrast'] }] },
  { id: 'sal-sidebar-shouts', level: L.subtle, title: 'Navigation louder than the work',
    css: '.chat-title { font-size: var(--text-heading); font-weight: var(--weight-strong); } .sidebar { background: var(--accent); } .chat { color: var(--on-accent); } .chat-meta, .day h2 { color: var(--on-accent); }',
    defects: [{ principle: 'salience', layer: 'render', what: 'Switching chats (frequent) outranks the blocking decision (constant)', expect: ['primary-not-first', 'salience-inversion', 'unearned-salience'] }] },

  // ---------- grouping ----------
  { id: 'grp-even-spacing', level: L.obvious, title: 'One spacing value everywhere',
    css: '.column, .turn, .request, .request-actions, .day, .sidebar, .chats { gap: 12px !important; } .request-actions .grow { display: none; }',
    defects: [{ principle: 'grouping', layer: 'render', what: 'Gaps inside and between groups are equal, so grouping is ambiguous', expect: ['weak-grouping', 'raw-space', 'underived-space'] }] },
  { id: 'grp-box-in-box', level: L.obvious, title: 'Cards inside cards',
    css: '.turn, .request-head, .command, .request-actions, .day { border: 1px solid var(--edge-control); border-radius: var(--radius-container); padding: var(--gap-group); }',
    defects: [{ principle: 'grouping', layer: 'render', what: 'Nested enclosures repeat "this is a group"', expect: ['redundant-enclosure'] }] },
  { id: 'grp-orphan-control', level: L.subtle, title: 'A control aligned with nothing (seen in a real app)',
    replace: [['<form class="composer"', '<div class="orphan"><button class="btn text" type="button">Set goal</button></div>\n    <form class="composer"']],
    css: '.main { grid-template-rows: auto minmax(0, 1fr) auto auto; } .orphan { display: flex; justify-content: flex-end; padding: 0 var(--gap-control); }',
    defects: [{ principle: 'grouping', layer: 'judgment', what: 'A stray control that belongs to no group and aligns with nothing', expect: [] }] },
  { id: 'grp-split-group', level: L.subtle, title: 'Deny far from Run tests',
    replace: [['<button class="btn" type="button" data-action="deny">Deny <kbd>Esc</kbd></button>\n            <button class="btn text" type="button" data-action="always">Always allow</button>\n            <span class="grow"></span>', '<button class="btn text" type="button" data-action="always">Always allow</button>\n            <span class="grow"></span>\n            <button class="btn" type="button" data-action="deny">Deny <kbd>Esc</kbd></button>']],
    defects: [{ principle: 'grouping', layer: 'render', what: 'The two answers to one question are split across the row', expect: ['weak-grouping'] }] },

  // ---------- memory and choice ----------
  { id: 'mem-flat-nav', level: L.subtle, title: 'Ten equal-weight sidebar entries (seen in a real app)',
    replace: [['<div class="day">\n      <h2>Today</h2>', '<div class="navlist"><button class="btn text" type="button">Search</button><button class="btn text" type="button">Running now</button><button class="btn text" type="button">Requests</button><button class="btn text" type="button">+</button><button class="btn text" type="button">Scoped browser</button><button class="btn text" type="button">Selected window</button><button class="btn text" type="button">Agents</button><button class="btn text" type="button">Skills</button><button class="btn text" type="button">Plugins</button><button class="btn text" type="button">Help</button></div>\n    <div class="day">\n      <h2>Today</h2>']],
    css: '.navlist { display: flex; flex-direction: column; gap: var(--gap-control); } .navlist .btn { justify-content: flex-start; }',
    defects: [
      { principle: 'memory', layer: 'judgment', what: 'Ten peers at one level, more than can be held in mind', expect: [] },
      { principle: 'choice', layer: 'judgment', what: 'Rare features given the same weight as constant ones', expect: [] }] },
  { id: 'cho-action-wall', level: L.subtle, title: 'Nine actions on the request',
    replace: [['<button class="btn text" type="button" data-action="always">Always allow</button>', '<button class="btn text" type="button" data-action="always">Always allow</button><button class="btn" type="button">Edit command</button><button class="btn" type="button">Copy</button><button class="btn" type="button">Explain</button><button class="btn" type="button">Run in sandbox</button><button class="btn" type="button">Schedule</button><button class="btn" type="button">Share</button>']],
    defects: [{ principle: 'choice', layer: 'judgment', what: 'Rare actions shown beside the constant one slow every decision', expect: [] }] },
  { id: 'cho-frequent-hidden', level: L.subtle, title: 'Deny hidden in an overflow menu',
    css: '.request [data-action=deny] { display: none; }',
    defects: [{ principle: 'choice', layer: 'render', what: 'A frequent action removed from view', expect: ['plan-missing'] }] },

  // ---------- pointing ----------
  { id: 'pnt-tiny-targets', level: L.obvious, title: 'Tiny request buttons',
    css: '.request-actions .btn { min-height: 18px; padding: 0 4px; font-size: var(--text-meta); }',
    defects: [{ principle: 'pointing', layer: 'render', what: 'Targets below the minimum', expect: ['small-target', 'raw-space'] }] },
  { id: 'pnt-div-button', level: L.obvious, title: 'Deny is a clickable div',
    replace: [['<button class="btn" type="button" data-action="deny">Deny <kbd>Esc</kbd></button>', '<div class="btn" data-action="deny" onclick="void 0">Deny <kbd>Esc</kbd></div>']],
    defects: [{ principle: 'pointing', layer: 'source', what: 'Not focusable or operable by keyboard', expect: ['clickable-non-control'] }] },
  { id: 'pnt-inverted-sizes', level: L.subtle, title: 'Rare action is the biggest target',
    css: '.request [data-action=always] { min-height: 56px; padding: 0 var(--gap-region); font-size: var(--text-heading); } .request .primary { min-height: var(--target-min); padding: 0 var(--gap-related); }',
    defects: [{ principle: 'pointing', layer: 'render', what: 'Occasional action is a bigger target than the constant one', expect: ['pointing-order', 'salience-inversion'] }] },

  // ---------- legibility ----------
  { id: 'leg-grey-on-white', level: L.obvious, title: 'Light grey secondary text',
    css: '.request-head span, .chat-meta, .turn p { color: #b4b4b4; }',
    defects: [{ principle: 'legibility', layer: 'render', what: 'Text below 4.5:1', expect: ['low-contrast', 'raw-color', 'underived-color'] }] },
  { id: 'leg-tiny-text', level: L.obvious, title: '9 px metadata',
    css: '.chat-meta, .branch, .composer-note { font-size: 9px; }',
    defects: [{ principle: 'legibility', layer: 'source', what: 'Text below the legible size', expect: ['raw-size', 'underived-size'] }] },
  { id: 'leg-focus-removed', level: L.obvious, title: 'Focus outline removed',
    css: '*:focus { outline: none; }',
    replace: [['.composer textarea:focus-visible { outline: none; }', '']],
    defects: [{ principle: 'legibility', layer: 'source', what: 'Keyboard users cannot see where they are', expect: ['focus-removed', 'invisible-focus'] }] },
  { id: 'leg-zoom-blocked', level: L.obvious, title: 'Pinch zoom disabled',
    replace: [['content="width=device-width, initial-scale=1"', 'content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"']],
    defects: [{ principle: 'legibility', layer: 'source', what: 'People who need to zoom cannot', expect: ['zoom-blocked'] }] },
  { id: 'leg-long-lines', level: L.subtle, title: '140-character lines',
    css: '.column { max-width: none; } .turn p, .request-why p { max-width: none; }',
    replace: [['then added a test for the /cart case.', 'then added a test for the /cart case. I also checked the other two callers of buildRedirect in the session middleware and the logout handler, and neither of them passes a returnTo value, so they are unaffected by this change and need no tests of their own.']],
    defects: [{ principle: 'legibility', layer: 'render', what: 'Running text far past 75 characters per line', expect: [] }] },
  { id: 'leg-sideways-scroll', level: L.obvious, title: 'Fixed-width block on a phone',
    widths: [390],
    css: '.request { min-width: 560px; }',
    defects: [{ principle: 'legibility', layer: 'render', what: 'Page scrolls sideways at phone width', expect: ['horizontal-scroll', 'text-overflow'] }] },
  { id: 'leg-placeholder-label', level: L.obvious, title: 'Search field labeled only by placeholder',
    replace: [['<span class="project">checkout-service</span>', '<input class="search" type="search" placeholder="Search chats">']],
    css: '.search { min-height: var(--control-height); padding: 0 var(--gap-related); border: 1px solid var(--edge-control); border-radius: var(--radius-control); background: var(--surface-base); }',
    defects: [{ principle: 'legibility', layer: 'render', what: 'A field with no label once typed in', expect: ['unlabelled-field'] }] },
  { id: 'leg-img-no-alt', level: L.obvious, title: 'Avatar without alt',
    replace: [['<div class="user-msg">', '<img class="avatar" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22/%3E" width="24" height="24"><div class="user-msg">']],
    defects: [{ principle: 'legibility', layer: 'source', what: 'Image with no text alternative', expect: ['img-no-alt'] }] },
  { id: 'leg-dark-hardcoded', level: L.subtle, title: 'Hard-coded white box breaks dark theme',
    themes: ['dark'],
    css: '.composer-box { background: #ffffff; } .composer textarea { color: #f4f4f4; }',
    defects: [{ principle: 'legibility', layer: 'render', what: 'Near-white text on white in dark mode', expect: ['low-contrast', 'raw-color', 'underived-color'] }] },

  // ---------- motion and response ----------
  { id: 'mot-bounce', level: L.obvious, title: 'Bouncy hover',
    css: '.btn { transition: transform var(--duration-state) cubic-bezier(.34,1.56,.64,1); } .btn:hover { transform: scale(1.06); }',
    defects: [{ principle: 'motion', layer: 'source', what: 'Overshoot easing that reports no change', expect: ['decorative-motion'] }] },
  { id: 'mot-glow-loop', level: L.obvious, title: 'Endless glow on the primary',
    css: '@keyframes glow { 50% { box-shadow: 0 0 0 6px var(--selection); } } .request .primary { animation: glow 2s ease-in-out infinite; }',
    defects: [{ principle: 'motion', layer: 'source', what: 'Looping motion that carries no information', expect: ['decorative-motion'] }] },
  { id: 'mot-transition-all', level: L.obvious, title: 'transition: all',
    css: '.chat, .btn { transition: all var(--duration-state) var(--ease-enter); }',
    defects: [{ principle: 'motion', layer: 'source', what: 'Every property animates, including ones that should not move', expect: ['motion-unscoped'] }] },
  { id: 'mot-slow-reveal', level: L.subtle, title: '900 ms detail reveal',
    css: '.request-why { transition: height 900ms ease, opacity 900ms ease; }',
    defects: [{ principle: 'motion', layer: 'render', what: 'Motion long enough that people wait for it', expect: ['raw-motion', 'slow-motion'] }] },
  { id: 'rsp-delayed-feedback', level: L.subtle, title: 'Details opens after 600 ms',
    replace: [["toggle.addEventListener('click', () => {", "toggle.addEventListener('click', () => setTimeout(() => {"], ["why.style.opacity = open ? '1' : '0';\n  });", "why.style.opacity = open ? '1' : '0';\n  }, 600));"]],
    defects: [{ principle: 'response', layer: 'render', what: 'No visible result within 100 ms of the click', expect: ['slow-response'] }] },
  { id: 'rsp-blocking-click', level: L.subtle, title: 'Click blocks the main thread',
    replace: [["toggle.addEventListener('click', () => {", "toggle.addEventListener('click', () => { const t = performance.now(); while (performance.now() - t < 250) {}"]],
    defects: [{ principle: 'response', layer: 'render', what: 'A 250 ms long task on every click', expect: ['long-task', 'slow-response'] }] },
  { id: 'rsp-late-banner', level: L.subtle, title: 'Banner pushes content after load',
    html: '<script>setTimeout(() => { const b = document.createElement("div"); b.className = "late"; b.textContent = "New: agents can now open pull requests."; document.querySelector(".column").prepend(b); }, 150);</script>',
    css: '.late { padding: var(--gap-related) var(--gap-group); background: var(--surface-sunken); border-radius: var(--radius-control); }',
    defects: [{ principle: 'motion', layer: 'render', what: 'Content jumps by itself after load', expect: ['layout-shift'] }] },

  // ---------- purpose ----------
  { id: 'pur-stat-cards', level: L.subtle, title: 'Vanity stat cards in the transcript',
    replace: [['<div class="column">', '<div class="column"><div class="stats"><div><b>98%</b><span>Success rate</span></div><div><b>1,284</b><span>Tasks completed</span></div><div><b>3.2x</b><span>Faster shipping</span></div></div>']],
    css: '.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--gap-group); } .stats div { display: flex; flex-direction: column; padding: var(--gap-group); border: 1px solid var(--edge-control); border-radius: var(--radius-container); background: var(--surface-base); } .stats b { font-size: 28px; }',
    defects: [{ principle: 'purpose', layer: 'judgment', what: 'Elements that serve no task in the model', expect: ['unearned-salience', 'primary-not-first', 'underived-size', 'raw-size'] }] },
  { id: 'pur-decor-blobs', level: L.subtle, title: 'Decorative blurred blobs',
    replace: [['<div class="transcript">', '<div class="transcript"><div class="blob" aria-hidden="true"></div>']],
    css: '.transcript { position: relative; } .blob { position: absolute; top: 40px; right: 40px; width: 220px; height: 220px; border-radius: 50%; background: var(--selection); filter: blur(40px); pointer-events: none; }',
    defects: [{ principle: 'purpose', layer: 'judgment', what: 'Decoration with no meaning, using only derived tokens', expect: ['unearned-salience'] }] },

  // ---------- consequence ----------
  { id: 'csq-delete-beside-run', level: L.subtle, title: 'Delete chat right next to Run tests',
    replace: [['<button class="btn" type="button" data-action="deny">', '<button class="btn" type="button">Delete chat</button><button class="btn" type="button" data-action="deny">']],
    defects: [{ principle: 'consequence', layer: 'judgment', what: 'An irreversible rare action placed among frequent ones, styled the same', expect: [] }] },
  { id: 'csq-vague-labels', level: L.subtle, title: 'OK / Cancel instead of saying what happens',
    replace: [['Run tests <kbd>Enter</kbd>', 'OK <kbd>Enter</kbd>'], ['Deny <kbd>Esc</kbd>', 'Cancel <kbd>Esc</kbd>'], ['Run this command to check the fix?', 'Are you sure?']],
    defects: [{ principle: 'consequence', layer: 'judgment', what: 'An irreversible, frequent action whose control does not say what it does', expect: [] }] },
  { id: 'csq-confirm-habit', level: L.subtle, title: 'A second confirmation on a constant action',
    replace: [['<pre class="command">', '<div class="confirm">You are about to run a command. This may modify files. Continue? <label><input type="checkbox"> I understand</label></div>\n          <pre class="command">']],
    defects: [{ principle: 'consequence', layer: 'judgment', what: 'Confirmation on a constant action becomes a reflex', expect: [] }] },

  // ---------- convention ----------
  { id: 'cnv-composer-on-top', level: L.subtle, title: 'Composer above the transcript, sidebar on the right',
    css: '.app { grid-template-columns: minmax(0, 1fr) 248px; } .sidebar { order: 2; } .main { grid-template-rows: auto auto minmax(0, 1fr); } .composer { order: -1; grid-row: 2; padding-top: var(--gap-section); } .transcript { grid-row: 3; }',
    defects: [{ principle: 'convention', layer: 'judgment', what: 'Breaks the layout every chat tool has taught people', expect: [] }] },
  { id: 'cnv-desktop-hamburger', level: L.subtle, title: 'Chat list hidden behind a menu on desktop',
    css: '@media (min-width: 721px) { .app { grid-template-columns: minmax(0, 1fr); } .sidebar { display: none; } .menu-btn { display: inline-flex; } }',
    defects: [{ principle: 'convention', layer: 'render', what: 'A frequent destination hidden where there is room for it', expect: ['plan-missing'] }] },

  // ---------- compound: a page in the generic generated style ----------
  { id: 'cmp-generated-look', level: L.compound, title: 'The generic generated look, all at once',
    replace: [['<h1>Fix login redirect</h1>', '<h1>✨ Fix login redirect</h1>'], ['<button class="btn text" type="button" data-action="always">', '<button class="btn primary" type="button" data-action="always">']],
    css: '.topbar { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; } .request { background: rgba(255,255,255,.6); backdrop-filter: blur(16px); border-radius: 24px; box-shadow: 0 20px 40px rgba(102,126,234,.25); } .btn { border-radius: 9999px; transition: all .3s cubic-bezier(.34,1.56,.64,1); } .btn:hover { transform: translateY(-2px); } .turn p { color: #94a3b8; font-size: 15px; } .user-msg { background: linear-gradient(135deg, #f093fb, #f5576c); color: #fff; }',
    defects: [
      { principle: 'encoding', layer: 'source', what: 'Purple-blue gradient header', expect: ['decorative-color', 'text-on-gradient'] },
      { principle: 'encoding', layer: 'source', what: 'Glass card with a colored shadow', expect: ['decorative-depth'] },
      { principle: 'motion', layer: 'source', what: 'Bouncy lift on every button', expect: ['decorative-motion', 'motion-unscoped'] },
      { principle: 'legibility', layer: 'render', what: 'Slate-400 body text', expect: ['low-contrast'] },
      { principle: 'salience', layer: 'render', what: 'Two primaries', expect: ['competing-primaries'] },
      { principle: 'encoding', layer: 'source', what: 'Sparkle emoji', expect: ['decorative-symbol'] }] },

  // ---------- rare surfaces: menu, dialog, tooltip, toast ----------
  { id: 'srf-menu-tiny-items', level: L.surface, title: 'Menu items 20 px tall in 11 px text',
    surface: { trigger: '#more-btn', target: '#more-menu' },
    css: '.menu button { min-height: 20px; font-size: 11px; }',
    defects: [
      { principle: 'pointing', layer: 'render', what: 'Menu targets below the minimum', expect: ['small-target'] },
      { principle: 'legibility', layer: 'source', what: 'Menu text below the derived sizes', expect: ['raw-size', 'underived-size'] }] },
  { id: 'srf-menu-faded', level: L.surface, title: 'Washed-out menu text',
    surface: { trigger: '#more-btn', target: '#more-menu' },
    css: '.menu button { color: #c0c0c0; }',
    defects: [{ principle: 'legibility', layer: 'render', what: 'Menu items below 4.5:1', expect: ['low-contrast', 'raw-color', 'underived-color'] }] },
  { id: 'srf-menu-own-style', level: L.surface, title: 'Menu styled from scratch',
    surface: { trigger: '#more-btn', target: '#more-menu' },
    css: '.menu { border-radius: 14px; box-shadow: 0 12px 32px rgba(15,23,42,.18); backdrop-filter: blur(8px); background: rgba(255,255,255,.8); padding: 6px; } .menu button { border-radius: 8px; padding: 0 10px; }',
    defects: [{ principle: 'encoding', layer: 'source', what: 'Menu uses its own radii, shadow, blur and spacing instead of the system', expect: ['raw-radius', 'decorative-depth', 'raw-space', 'raw-color', 'underived-space', 'underived-color'] }] },
  { id: 'srf-menu-delete-mixed', level: L.surface, title: 'Delete mixed in with harmless items',
    surface: { trigger: '#more-btn', target: '#more-menu' },
    replace: [['<button type="button" role="menuitem">Copy link</button>', '<button type="button" role="menuitem">Copy link</button><button type="button" role="menuitem">Delete chat</button>'], ['<hr>\n          <button type="button" role="menuitem" class="danger">Delete chat…</button>', '']],
    defects: [{ principle: 'consequence', layer: 'judgment', what: 'Irreversible item not separated, not marked, no second step', expect: [] }] },
  { id: 'srf-menu-emoji', level: L.surface, title: 'Emoji as menu icons',
    surface: { trigger: '#more-btn', target: '#more-menu' },
    replace: [['>Rename chat<', '>✏️ Rename chat<'], ['>Copy link<', '>🔗 Copy link<'], ['>Export transcript<', '>📤 Export transcript<']],
    defects: [{ principle: 'encoding', layer: 'source', what: 'Pictographs as decoration', expect: ['decorative-symbol'] }] },
  { id: 'srf-dialog-two-primaries', level: L.surface, title: 'Settings dialog with two filled buttons',
    surface: { trigger: '#settings-btn', target: '#settings' },
    replace: [['<button class="btn" type="button" id="settings-reset">Reset to defaults</button>', '<button class="btn primary" type="button" id="settings-reset">Reset to defaults</button>']],
    defects: [{ principle: 'salience', layer: 'render', what: 'Two primaries, one of them destructive', expect: ['competing-primaries'] }] },
  { id: 'srf-dialog-fixed-width', level: L.surface, title: 'Dialog 640 px wide on a phone',
    surface: { trigger: '#settings-btn', target: '#settings' }, widths: [390],
    css: '.sheet-panel { width: 640px; max-width: none; }',
    defects: [{ principle: 'legibility', layer: 'render', what: 'Dialog wider than the phone', expect: ['horizontal-scroll', 'text-overflow'] }] },
  { id: 'srf-dialog-unlabelled', level: L.surface, title: 'Dialog fields with placeholder-only labels',
    surface: { trigger: '#settings-btn', target: '#settings' },
    replace: [['<label for="set-name">Display name</label>', ''], ['<label for="set-branch">Branch prefix</label>', '']],
    defects: [{ principle: 'legibility', layer: 'render', what: 'Fields with no label', expect: ['unlabelled-field'] }] },
  { id: 'srf-dialog-vague-confirm', level: L.surface, title: '"Are you sure?" OK / Cancel for reset',
    surface: { trigger: '#settings-btn', target: '#settings' },
    replace: [['<h2 id="settings-title">Settings</h2>', '<h2 id="settings-title">Are you sure?</h2>'], ['>Save<', '>OK<'], ['>Reset to defaults<', '>Cancel<']],
    defects: [{ principle: 'consequence', layer: 'judgment', what: 'Labels that do not say what will happen', expect: [] }] },
  { id: 'srf-tooltip-faint', level: L.surface, title: 'Tiny faint tooltip',
    surface: { trigger: '#tip-btn', target: '#tip' },
    replace: [['<span class="branch">fix/login-redirect</span>', '<span class="branch">fix/login-redirect</span><span class="tipwrap"><button class="btn text" type="button" id="tip-btn" aria-describedby="tip">?</button><span class="tip" id="tip" role="tooltip">Branch the agent is working on</span></span>']],
    css: '.tipwrap { position: relative; } .tip { display: none; position: absolute; top: 100%; left: 0; white-space: nowrap; padding: 2px 4px; font-size: 10px; color: #9a9a9a; background: #f5f5f5; z-index: var(--layer-overlay); } .tip.open { display: block; }',
    defects: [
      { principle: 'legibility', layer: 'render', what: 'Tooltip text below 4.5:1', expect: ['low-contrast', 'raw-color', 'underived-color'] },
      { principle: 'legibility', layer: 'source', what: 'Tooltip text below the derived sizes', expect: ['raw-size', 'underived-size'] }] },
  { id: 'srf-toast-slow', level: L.surface, title: 'Toast that slides in over 900 ms',
    surface: { trigger: '#toast-btn', target: '#toast' },
    replace: [['<button class="btn" type="submit">Queue</button>', '<button class="btn" type="submit">Queue</button><button class="btn text" type="button" id="toast-btn">Copy</button>'], ['</form>', '</form>\n    <div class="toast" id="toast" role="status">Copied to clipboard</div>']],
    css: '.toast { position: fixed; bottom: var(--gap-section); left: 50%; transform: translate(-50%, 200%); padding: var(--gap-related) var(--gap-group); background: var(--ink-primary); color: var(--surface-base); border-radius: var(--radius-control); transition: transform 900ms ease; z-index: var(--layer-toast); } .toast.open { transform: translate(-50%, 0); }',
    defects: [{ principle: 'motion', layer: 'render', what: 'Motion long enough that people wait for it', expect: ['raw-motion', 'slow-motion'] }] },
  { id: 'srf-menu-off-palette', level: L.surface, title: 'Menu in colors from nowhere',
    surface: { trigger: '#more-btn', target: '#more-menu' },
    css: '.menu { background: #1e1b4b; border-color: #312e81; } .menu button { color: #e0e7ff; } .menu .danger { color: #fda4af; }',
    defects: [{ principle: 'encoding', layer: 'source', what: 'Colors that are not in the derived palette', expect: ['raw-color', 'underived-color'] }] },
];

// Clean pages: no defects. Any new finding here is a false alarm.
const CONTROLS = [
  { id: 'ctl-base', title: 'Base page (menu and dialog closed)' },
  { id: 'ctl-menu-open', title: 'Clean menu open at load', surface: { trigger: '#more-btn', target: '#more-menu' }, openOnly: true },
  { id: 'ctl-dialog-open', title: 'Clean dialog open at load', surface: { trigger: '#settings-btn', target: '#settings' }, openOnly: true },
  { id: 'ctl-long-content', title: 'Clean page with a long transcript',
    html: '<script>const c = document.querySelector(".column"), t = document.querySelector(".turn"); for (let i = 0; i < 6; i++) c.insertBefore(t.cloneNode(true), c.lastElementChild);</script>' },
];

module.exports = { CASES, CONTROLS, LEVELS: L };

#!/usr/bin/env node
'use strict';
// Claude Code PostToolUse hook: after the agent edits a UI file, lint it against the nearest
// model.json. Floor, meaning and derivation findings go back to the agent (exit 2) in the same turn.
const fs = require('fs');
const path = require('path');
const { derive } = require('../src/derive');
const { lintPaths } = require('../src/lint');
const UI = /\.(css|scss|less|html?|jsx|tsx|vue|svelte|astro)$/i;
function find(start) { let d = path.dirname(start); for (;;) { const f = path.join(d, 'model.json'); if (fs.existsSync(f)) return f; const u = path.dirname(d); if (u === d) return null; d = u; } }
let input = '';
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let p; try { p = JSON.parse(input); } catch (_) { process.exit(0); }
  const file = p && p.tool_input && (p.tool_input.file_path || p.tool_input.path);
  if (!file || !UI.test(file) || !fs.existsSync(file)) process.exit(0);
  const modelPath = find(path.resolve(file));
  if (!modelPath) process.exit(0);
  const r = lintPaths([file], derive(JSON.parse(fs.readFileSync(modelPath, 'utf8'))), { varRoots: [path.dirname(modelPath)] });
  if (!r.findings.length) process.exit(0);
  process.stderr.write(`derive: ${path.basename(file)} uses values with no derived meaning:\n` +
    r.findings.slice(0, 25).map((f) => `${f.tier} ${f.rule} line ${f.line}: ${f.message} → ${f.fix}`).join('\n') +
    '\nUse the meaning-named token. If no token fits, the model is missing a fact: add it and run derive system.\n');
  process.exit(2);
});

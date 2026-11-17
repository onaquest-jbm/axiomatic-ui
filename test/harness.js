'use strict';
// Tiny test runner so the suite runs on Node 16 (no node:test) as well as newer Node.
let failed = 0, passed = 0;
module.exports = function test(name, fn) {
  try { fn(); passed++; console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n      ${e.message}`); }
};
process.on('exit', () => { console.log(`\n${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1; });

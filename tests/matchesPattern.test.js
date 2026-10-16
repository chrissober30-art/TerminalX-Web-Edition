#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const { matchesPattern } = require(path.join('..', 'matchesPattern.js'));

function loadBackgroundMatcher() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');
  // Provide a minimal chrome stub the background script expects when run in a VM
  const chromeStub = {
    storage: { local: { get: (_keys, cb) => cb({}) } },
    tabs: {
      onUpdated: { addListener: () => {} },
      onActivated: { addListener: () => {} },
      get: async () => ({})
    }
  };

  const sandbox = { console, chrome: chromeStub, globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  // background.js defines matchesPattern in the global scope
  if (typeof sandbox.matchesPattern === 'function') return sandbox.matchesPattern;
  if (sandbox.globalThis && typeof sandbox.globalThis.matchesPattern === 'function') return sandbox.globalThis.matchesPattern;
  throw new Error('background.matchesPattern not found');
}

const backgroundMatches = loadBackgroundMatcher();

const cases = [
  ['https://example.com/foo', 'https://example.com/*', true],
  ['https://example.com', 'https://example.com/*', true],
  ['https://example.com/path', 'https://*.example.com/*', true],
  ['https://sub.example.com/path', 'https://*.example.com/*', true],
  ['http://example.com/path', 'http://*/*', true],
  ['https://example.com/abc/test', 'https://example.com/*/test', true],
  ['https://example.com/abc/test/def', 'https://example.com/*/test', false],
  ['chrome://settings', 'chrome://*/*', true],
  ['https://example.com/path', '*://*/*', true],
  ['http://example.com/path', '*://*/*', true],
  ['file:///tmp/test.txt', 'file://*/*', true],
  ['ftp://example.com/path', '*://*/*', false],
  ['https://example.com/path', 'https://example.org/*', false]
];

let failed = 0;
for (const [url, pattern, expected] of cases) {
  const modResult = matchesPattern(url, pattern);
  const bgResult = backgroundMatches(url, pattern);
  const ok = modResult === expected && bgResult === expected;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${url} | ${pattern} => module=${modResult}, background=${bgResult}, expected=${expected}`);
}

console.log(`\nTest summary: ${cases.length - failed}/${cases.length} passed.`);
process.exitCode = failed ? 1 : 0;

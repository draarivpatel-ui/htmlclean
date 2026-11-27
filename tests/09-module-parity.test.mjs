import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esm from '../src/index.mjs';

const require = createRequire(import.meta.url);
const cjs = require('../cjs/index.cjs');

const EXPORTS = ['sanitizeHtml', 'stripHtml', 'createSanitizer', 'HtmlCleanError',
  'STRICT_POLICY', 'PROSE_POLICY'];
const SAMPLES = [
  '<p>Hello <b>world</b></p>',
  '<script>alert(1)</script><p>safe</p>',
  '<img src=x onerror=alert(1)>',
  '<a href="javascript:alert(1)" target="_blank">x</a>',
  '<svg/onload=alert(1)>',
  '<div id=cookie style="color:red">x</div>',
  '<a href="jav&#x09;ascript:alert(1)">x</a>',
  '<table><td colspan="2">x</td></table>',
  '<noscript><img src=x onerror=alert(1)></noscript>',
  '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
];

test('ESM and CJS expose the same public API', () => {
  for (const name of EXPORTS) {
    assert.equal(typeof esm[name], typeof cjs[name], name);
    assert.ok(name in cjs, `CJS missing ${name}`);
  }
});

test('ESM and CJS sanitize identically', () => {
  for (const sample of SAMPLES) {
    assert.equal(cjs.sanitizeHtml(sample), esm.sanitizeHtml(sample), sample);
  }
});

test('ESM and CJS strip identically', () => {
  for (const sample of SAMPLES) {
    assert.equal(cjs.stripHtml(sample), esm.stripHtml(sample), sample);
  }
});

test('ESM and CJS bound sanitizers agree', () => {
  const policy = { allowedTags: ['p', 'b'], allowedAttributes: { b: ['title'] }, allowId: true };
  const a = esm.createSanitizer(policy);
  const b = cjs.createSanitizer(policy);
  for (const sample of SAMPLES) {
    assert.equal(b.sanitize(sample), a.sanitize(sample), sample);
  }
});

test('ESM and CJS error types agree', () => {
  assert.throws(() => cjs.sanitizeHtml(null), (err) =>
    err instanceof cjs.HtmlCleanError && err.code === 'INVALID_INPUT');
  assert.throws(() => esm.sanitizeHtml(null), (err) =>
    err instanceof esm.HtmlCleanError && err.code === 'INVALID_INPUT');
});

test('package exports resolve both entry points', () => {
  const pkg = require('../package.json');
  assert.equal(pkg.main, './cjs/index.cjs');
  assert.equal(pkg.module, './src/index.mjs');
  assert.equal(pkg.types, './types/index.d.ts');
  assert.deepEqual(pkg.dependencies, {});
  assert.deepEqual(pkg.devDependencies, { 'fast-check': '4.10.3' });
});

test('all CJS modules load without error', () => {
  for (const name of ['entities', 'tokenizer', 'sanitize', 'index']) {
    const mod = require(`../cjs/${name}.cjs`);
    assert.ok(mod && typeof mod === 'object', name);
  }
});

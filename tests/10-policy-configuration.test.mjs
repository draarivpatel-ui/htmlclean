import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, stripHtml, createSanitizer, HtmlCleanError } from '../src/index.mjs';

test('custom allowedTags replaces defaults', () => {
  const s = createSanitizer({ allowedTags: ['em'] });
  assert.equal(s.sanitize('<p><em>x</em></p>'), '<em>x</em>');
  assert.equal(s.sanitize('<em>x</em>'), '<em>x</em>');
});

test('custom allowedAttributes are scoped per tag', () => {
  const s = createSanitizer({ allowedTags: ['p', 'a'], allowedAttributes: { p: ['title'] } });
  assert.equal(s.sanitize('<p title="t" href="/x">x</p>'), '<p title="t">x</p>');
  assert.equal(s.sanitize('<a href="/x" title="t">x</a>'), '<a>x</a>');
});

test('policy objects are not mutated', () => {
  const policy = { allowedTags: ['p', 'b'], allowedAttributes: { p: ['title'] } };
  const before = JSON.stringify(policy);
  createSanitizer(policy).sanitize('<p title="t">x</p>');
  assert.equal(JSON.stringify(policy), before);
});

test('frozen policy presets can be passed directly', () => {
  assert.equal(sanitizeHtml('<p><div>x</div></p>', { allowedTags: ['p'] }), '<p>x</p>');
  assert.doesNotThrow(() => sanitizeHtml('<p>x</p>', Object.freeze({ allowedTags: ['p'] })));
});

test('Set inputs work for policy lists', () => {
  const s = createSanitizer({ allowedTags: new Set(['p']), allowedAttributes: { p: new Set(['title']) } });
  assert.equal(s.sanitize('<p title="t">x</p>'), '<p title="t">x</p>');
});

test('boolean and numeric policy fields are validated', () => {
  for (const policy of [{ maxInputBytes: -1 }, { maxDepth: 0 }, { maxTokens: 'x' }]) {
    assert.throws(() => createSanitizer(policy), (err) =>
      err instanceof HtmlCleanError && err.code === 'INVALID_POLICY');
  }
});

test('empty input and text-only input are handled', () => {
  assert.equal(sanitizeHtml(''), '');
  assert.equal(sanitizeHtml('plain text'), 'plain text');
  assert.equal(stripHtml(''), '');
});

test('tags with namespaces in names are not allowlisted by default', () => {
  assert.equal(sanitizeHtml('<x:script>alert(1)</x:script>'), 'alert(1)');
  assert.equal(sanitizeHtml('<svg:script>alert(1)</svg:script>'), 'alert(1)');
});

test('unknown attributes do not leak into output', () => {
  assert.equal(sanitizeHtml('<p data-secret="hidden" aria-label="x">text</p>'), '<p>text</p>');
  const s = createSanitizer({ allowedAttributes: { p: ['data-secret'] } });
  assert.equal(s.sanitize('<p data-secret="hidden">text</p>'), '<p data-secret="hidden">text</p>');
});

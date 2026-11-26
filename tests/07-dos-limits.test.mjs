import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, createSanitizer, HtmlCleanError } from '../src/index.mjs';

test('maxInputBytes rejects oversized UTF-8 input', () => {
  const s = createSanitizer({ maxInputBytes: 32 });
  assert.throws(() => s.sanitize('x'.repeat(33)), (err) =>
    err instanceof HtmlCleanError && err.code === 'INPUT_TOO_LARGE');
  assert.equal(s.sanitize('x'.repeat(32)), 'x'.repeat(32));
});

test('byte limit counts UTF-8 bytes, not code points', () => {
  const s = createSanitizer({ maxInputBytes: 9 });
  assert.throws(() => s.sanitize('世'.repeat(4)), (err) => err.code === 'INPUT_TOO_LARGE');
  assert.equal(s.sanitize('世'.repeat(3)), '世世世');
});

test('maxDepth rejects excessive nesting', () => {
  const s = createSanitizer({ maxDepth: 4 });
  const deep = '<div>'.repeat(5) + 'x' + '</div>'.repeat(5);
  assert.throws(() => s.sanitize(deep), (err) =>
    err instanceof HtmlCleanError && err.code === 'MAX_DEPTH_EXCEEDED');
  const ok = '<div>'.repeat(4) + 'x' + '</div>'.repeat(4);
  assert.equal(s.sanitize(ok), ok);
});

test('maxTokens rejects token floods with a typed error', () => {
  const s = createSanitizer({ maxTokens: 10 });
  assert.throws(() => s.sanitize('<br>'.repeat(20)), (err) =>
    err instanceof HtmlCleanError && err.code === 'TOKEN_LIMIT_EXCEEDED');
});

test('malformed unterminated attribute cannot hang the tokenizer', () => {
  assert.equal(sanitizeHtml('<a href="javascript:alert(1)'), '<a></a>');
  assert.equal(sanitizeHtml('<p title="unclosed'), '<p></p>');
});

test('invalid policy values are rejected with typed errors', () => {
  assert.throws(() => sanitizeHtml('<p>x</p>', { maxDepth: 0 }), (err) =>
    err instanceof HtmlCleanError && err.code === 'INVALID_POLICY');
  assert.throws(() => sanitizeHtml('<p>x</p>', { allowedTags: 42 }), (err) => err.code === 'INVALID_POLICY');
  assert.throws(() => sanitizeHtml('<p>x</p>', null), (err) => err.code === 'INVALID_POLICY');
  assert.throws(() => sanitizeHtml('<p>x</p>', { idPrefix: 123 }), (err) => err.code === 'INVALID_POLICY');
});

test('non-string input is rejected', () => {
  for (const value of [null, undefined, 42, {}, []]) {
    assert.throws(() => sanitizeHtml(value), (err) =>
      err instanceof HtmlCleanError && err.code === 'INVALID_INPUT');
  }
});

test('HtmlCleanError has a stable name and code', () => {
  const err = new HtmlCleanError('test', 'INPUT_TOO_LARGE');
  assert.equal(err.name, 'HtmlCleanError');
  assert.equal(err.code, 'INPUT_TOO_LARGE');
  assert.ok(err instanceof Error);
});

test('large but valid documents do not throw', () => {
  const input = '<p>Paragraph with <b>bold</b> text.</p>'.repeat(2000);
  assert.ok(sanitizeHtml(input).length > 10000);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, HtmlCleanError } from '../src/index.mjs';
import { tokenize } from '../src/tokenizer.mjs';

test('tokenizer emits text, start, end and comment tokens', () => {
  const tokens = tokenize('<p a="1">hi</p>');
  assert.deepEqual(tokens.map((t) => t.type), ['start', 'text', 'end']);
  assert.equal(tokens[0].name, 'p');
  assert.deepEqual(tokens[0].attributes, [{ name: 'a', value: '1' }]);
  assert.equal(tokens[1].value, 'hi');
});

test('tokenizer handles quoted attributes containing >', () => {
  const tokens = tokenize('<a title="a>b">x</a>');
  assert.equal(tokens[0].attributes[0].value, 'a>b');
  assert.equal(sanitizeHtml('<a title="a>b">x</a>'), '<a title="a&gt;b">x</a>');
});

test('tokenizer lowercases names', () => {
  const tokens = tokenize('<DIV>text</DIV>');
  assert.equal(tokens[0].name, 'div');
  assert.equal(tokens[2].name, 'div');
});

test('tokenizer handles comments, doctype and cdata', () => {
  const tokens = tokenize('<!DOCTYPE html><!--c--><![CDATA[d]]><p>x</p>');
  assert.deepEqual(tokens.map((t) => t.type), ['doctype', 'comment', 'cdata', 'start', 'text', 'end']);
  assert.equal(sanitizeHtml('<!DOCTYPE html><!--c--><p>x</p>'), '<p>x</p>');
});

test('tokenizer treats raw-text content as opaque until closing tag', () => {
  const tokens = tokenize('<script>if (a < b) { x("<p>"); }</script>');
  assert.equal(tokens[1].type, 'text');
  assert.equal(tokens[1].value, 'if (a < b) { x("<p>"); }');
  assert.equal(tokens[2].type, 'end');
});

test('tokenizer enforces a token limit', () => {
  assert.throws(() => tokenize('<p>x</p>'.repeat(20), 5), (err) =>
    err instanceof HtmlCleanError && err.code === 'TOKEN_LIMIT_EXCEEDED');
});

test('processing instructions are ignored', () => {
  assert.equal(sanitizeHtml('<?xml version="1.0"?><p>x</p>'), '<p>x</p>');
});

test('stray angle brackets become escaped text', () => {
  assert.equal(sanitizeHtml('a < b and c > d'), 'a &lt; b and c &gt; d');
  assert.equal(sanitizeHtml('2 < 3'), '2 &lt; 3');
});

test('multiple comments and empty comments are dropped', () => {
  assert.equal(sanitizeHtml('<!----><p>a</p><!--x--><p>b</p><!-- y --!>'), '<p>a</p><p>b</p>');
});

test('doctype with internal subset does not leak', () => {
  assert.equal(sanitizeHtml('<!DOCTYPE html [<!ENTITY x "y">]><p>hi</p>'), '<p>hi</p>');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, stripHtml } from '../src/index.mjs';

// Deterministic pseudo-random property tests. No external fuzzing dependency.
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const FRAGMENTS = [
  '<p>', '</p>', '<b>', '</b>', '<script>', '</script>', '<svg/onload=alert(1)>',
  '<img src=x onerror=alert(1)>', 'text', '&amp;', '&lt;', '&#106;', 'javascript:',
  '<a href="javascript:alert(1)">', '</a>', '<div id=cookie>', '</div>',
  '<style>', '</style>', '<noscript>', '</noscript>', '<!--', '-->', '<br>',
  '<table>', '</table>', '<td colspan="2">', '</td>', '"', "'", '<', '>', '&',
];

test('sanitized output never contains executable patterns', () => {
  const rand = seeded(20261126);
  for (let i = 0; i < 300; i += 1) {
    let input = '';
    const count = 1 + Math.floor(rand() * 12);
    for (let j = 0; j < count; j += 1) input += FRAGMENTS[Math.floor(rand() * FRAGMENTS.length)];
    const output = sanitizeHtml(input);
    assert.doesNotMatch(output, /<script/i, input);
    assert.doesNotMatch(output, /<svg/i, input);
    assert.doesNotMatch(output, /onerror=/i, input);
    assert.doesNotMatch(output, /href="javascript:/i, input);
    assert.doesNotMatch(output, /<img/i, input);
  }
});

test('sanitize output is always idempotent under fuzzing', () => {
  const rand = seeded(424242);
  for (let i = 0; i < 200; i += 1) {
    let input = '';
    const count = 1 + Math.floor(rand() * 10);
    for (let j = 0; j < count; j += 1) input += FRAGMENTS[Math.floor(rand() * FRAGMENTS.length)];
    const once = sanitizeHtml(input);
    assert.equal(sanitizeHtml(once), once, input);
  }
});

test('stripHtml output never contains executable markup from input tags', () => {
  const rand = seeded(99991);
  for (let i = 0; i < 200; i += 1) {
    let input = '';
    const count = 1 + Math.floor(rand() * 8);
    for (let j = 0; j < count; j += 1) input += FRAGMENTS[Math.floor(rand() * FRAGMENTS.length)];
    const text = stripHtml(input);
    // Decoded entity text can legitimately contain < as plain text, but
    // executable event handlers and script tags from raw markup must be gone.
    assert.doesNotMatch(text, /<script/i, input);
    assert.doesNotMatch(text, /onerror=/i, input);
    assert.doesNotMatch(text, /<img/i, input);
  }
});

test('output is always a string', () => {
  const rand = seeded(7);
  const chars = 'ab<>/&"\'\n\t#;=()';
  for (let i = 0; i < 200; i += 1) {
    let input = '';
    const length = Math.floor(rand() * 80);
    for (let j = 0; j < length; j += 1) input += chars[Math.floor(rand() * chars.length)];
    assert.equal(typeof sanitizeHtml(input), 'string');
  }
});

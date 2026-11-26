import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeReferences, escapeCanonical } from '../src/index.mjs';

test('named references decode with and without semicolons', () => {
  assert.equal(decodeReferences('&amp;'), '&');
  assert.equal(decodeReferences('&lt;'), '<');
  assert.equal(decodeReferences('&gt;'), '>');
  assert.equal(decodeReferences('&quot;'), '"');
  assert.equal(decodeReferences('&apos;'), "'");
  assert.equal(decodeReferences('&amp'), '&');
  assert.equal(decodeReferences('&lt'), '<');
  assert.equal(decodeReferences('&copy'), '©');
  assert.equal(decodeReferences('&copy;'), '©');
  assert.equal(decodeReferences('&notit;'), '¬it;');
});

test('numeric decimal and hexadecimal references decode', () => {
  assert.equal(decodeReferences('&#106;'), 'j');
  assert.equal(decodeReferences('&#x6a;'), 'j');
  assert.equal(decodeReferences('&#X6A;'), 'j');
  assert.equal(decodeReferences('&#0000106;'), 'j');
  assert.equal(decodeReferences('&#x00006a;'), 'j');
  assert.equal(decodeReferences('&#106'), 'j');
  assert.equal(decodeReferences('&#x6a'), 'j');
});

test('invalid numeric references produce replacement characters', () => {
  assert.equal(decodeReferences('&#x110000;'), '\uFFFD');
  assert.equal(decodeReferences('&#xD800;'), '\uFFFD');
  assert.equal(decodeReferences('&#0;'), '\uFFFD');
  assert.equal(decodeReferences('&#-1;'), '&#-1;');
});

test('ambiguous ampersands are preserved', () => {
  assert.equal(decodeReferences('AT&T'), 'AT&T');
  assert.equal(decodeReferences('&unknown;'), '&unknown;');
  assert.equal(decodeReferences('&'), '&');
  assert.equal(decodeReferences('&#;'), '&#;');
});

test('escapeCanonical escapes all five dangerous characters', () => {
  assert.equal(escapeCanonical(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
  assert.equal(escapeCanonical('plain'), 'plain');
});

test('decode is a single pass and does not re-decode escaped output', () => {
  assert.equal(decodeReferences('&amp;lt;'), '&lt;');
  assert.equal(decodeReferences('&amp;amp;'), '&amp;');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, stripHtml, createSanitizer } from '../src/index.mjs';

const SAMPLES = [
  '<p>Hello <b>world</b></p>',
  '<a href="https://example.com?a=1&amp;b=2" title="T">L</a>',
  '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
  '<script>alert(1)</script><p>safe</p>',
  '<svg/onload=alert(1)>',
  '<p style="color:red" onclick="x()">text</p>',
  '<table><tr><td colspan="2">x</td></tr></table>',
  '<a href="javascript:alert(1)" target="_blank">x</a>',
  '<p>line1\nline2\ttab</p>',
  '<div id=cookie>clobber</div>',
  'no markup at all',
  '<p title="&quot;quoted&quot;">q</p>',
];

test('sanitize is idempotent across representative samples', () => {
  for (const sample of SAMPLES) {
    const once = sanitizeHtml(sample);
    const twice = sanitizeHtml(once);
    assert.equal(twice, once, sample);
  }
});

test('canonical output uses double-quoted, lowercased attributes with enforced rel', () => {
  assert.equal(sanitizeHtml("<a title='T' HREF='https://x' target='_blank'>x</a>"),
    '<a href="https://x" rel="noopener noreferrer" target="_blank" title="T">x</a>');
});

test('special characters in text are always escaped', () => {
  assert.equal(sanitizeHtml('<p>& < > " \'</p>'), '<p>&amp; &lt; &gt; &quot; &#39;</p>');
});

test('stripHtml removes markup but keeps canonical text', () => {
  assert.equal(stripHtml('<p>Hello <b>world</b></p>'), 'Hello world');
  assert.equal(stripHtml('<script>alert(1)</script><p>Safe</p>'), 'Safe');
  assert.equal(stripHtml('<p>A &amp; B &lt; C</p>'), 'A & B < C');
  assert.equal(stripHtml('<a href="/x" title="t">Link</a>'), 'Link');
  assert.equal(stripHtml('<style>body{}</style><div>text</div>'), 'text');
});

test('bound sanitizer strip method behaves like stripHtml', () => {
  const s = createSanitizer();
  assert.equal(s.strip('<p>x <b>y</b></p>'), stripHtml('<p>x <b>y</b></p>'));
});

test('canonical output preserves unicode', () => {
  assert.equal(sanitizeHtml('<p>Hello, 世界! emoji: 🎉</p>'), '<p>Hello, 世界! emoji: 🎉</p>');
});

test('whitespace and line breaks in text are preserved', () => {
  assert.equal(sanitizeHtml('<p>a\nb\tc</p>'), '<p>a\nb\tc</p>');
});

test('repeated sanitization is stable for all presets', () => {
  for (const preset of [{}, { allowedTags: ['b'] }, { allowStyle: true }]) {
    const s = createSanitizer(preset);
    const once = s.sanitize('<p>a <b>b</b></p>');
    assert.equal(s.sanitize(once), once);
  }
});

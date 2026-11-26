import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, createSanitizer } from '../src/index.mjs';

test('empty and whitespace-only attribute values', () => {
  assert.equal(sanitizeHtml('<a href="">x</a>'), '<a href="">x</a>');
  assert.equal(sanitizeHtml('<a title="">x</a>'), '<a title="">x</a>');
  assert.equal(sanitizeHtml('<a href="   ">x</a>'), '<a href="">x</a>');
});

test('attribute values containing newlines', () => {
  assert.equal(sanitizeHtml('<a title="a\nb">x</a>'), '<a title="a\nb">x</a>');
  assert.equal(sanitizeHtml('<a href="java\nscript:alert(1)">x</a>'), '<a>x</a>');
});

test('non-alpha tag names and stray delimiters', () => {
  assert.equal(sanitizeHtml('<1>text</1>'), '&lt;1&gt;text');
  assert.equal(sanitizeHtml('<>text</>'), '&lt;&gt;text');
  assert.equal(sanitizeHtml('<!>text'), '&lt;!&gt;text');
});

test('nested raw-text elements', () => {
  assert.equal(sanitizeHtml('<script><script>alert(1)</script></script>'), '');
  assert.equal(sanitizeHtml('<style>/* <script>alert(1)</script> */</style>'), '');
  assert.equal(sanitizeHtml('<title><script>alert(1)</script></title>'), '');
});

test('comment edge cases', () => {
  assert.equal(sanitizeHtml('<!-->text'), '');
  assert.equal(sanitizeHtml('<!--->text'), '');
  assert.equal(sanitizeHtml('<!-- comment --><p>x</p>'), '<p>x</p>');
});

test('entities without semicolons in text', () => {
  assert.equal(sanitizeHtml('<p>&amp &lt &gt &quot</p>'), '<p>&amp; &lt; &gt; &quot;</p>');
  assert.equal(sanitizeHtml('<p>&copy2026</p>'), '<p>©2026</p>');
});

test('inline formatting within table cells', () => {
  assert.equal(sanitizeHtml('<table><tr><td><b>bold</b></td></tr></table>'),
    '<table><tr><td><b>bold</b></td></tr></table>');
});

test('blockquote cite attribute', () => {
  assert.equal(sanitizeHtml('<blockquote cite="javascript:alert(1)">x</blockquote>'),
    '<blockquote>x</blockquote>');
  assert.equal(sanitizeHtml('<blockquote cite="https://x.test">x</blockquote>'),
    '<blockquote cite="https://x.test">x</blockquote>');
});

test('nested dangerous elements with allowlisted wrappers', () => {
  assert.equal(sanitizeHtml('<div><script>alert(1)</script><p>ok</p></div>'),
    '<div><p>ok</p></div>');
  assert.equal(sanitizeHtml('<div><svg><p>hidden</p></svg>visible</div>'),
    '<div>visible</div>');
});

test('mixed-case event handlers on non-allowlisted tags', () => {
  assert.equal(sanitizeHtml('<IMG ONERROR=alert(1) SRC=x><p>ok</p>'), '<p>ok</p>');
});

test('href with encoded colon variants', () => {
  assert.equal(sanitizeHtml('<a href="java&#x3a;script:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<a href="javascript&#58alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<a href="javascript&colon;alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<a href="&#x6a;avascript&#58;alert(1)">x</a>'), '<a>x</a>');
});

test('HTML entity in attribute that introduces markup is escaped', () => {
  assert.equal(sanitizeHtml('<a title="&lt;img src=x onerror=alert(1)&gt;">x</a>'),
    '<a title="&lt;img src=x onerror=alert(1)&gt;">x</a>');
});

test('null bytes in text and attributes', () => {
  assert.equal(sanitizeHtml('<p>a\x00b</p>'), '<p>a\x00b</p>');
  assert.equal(sanitizeHtml('<a href="java\x00script:alert(1)">x</a>'), '<a>x</a>');
});

test('very long attribute values are preserved when allowlisted', () => {
  const title = 'x'.repeat(1000);
  const s = createSanitizer({ allowedAttributes: { p: ['title'] } });
  assert.equal(s.sanitize(`<p title="${title}">ok</p>`), `<p title="${title}">ok</p>`);
});

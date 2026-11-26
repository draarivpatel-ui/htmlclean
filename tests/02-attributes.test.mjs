import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, createSanitizer } from '../src/index.mjs';

test('event handlers are rejected on every element', () => {
  const events = ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus',
    'onanimationstart', 'ontoggle', 'onbegin', 'onpointerenter', 'ONCLICK'];
  for (const event of events) {
    assert.equal(sanitizeHtml(`<p ${event}="alert(1)">x</p>`), '<p>x</p>', event);
    assert.equal(sanitizeHtml(`<a href="/x" ${event}=alert(1)>x</a>`), '<a href="/x">x</a>', event);
  }
});

test('style attribute is rejected by default and opt-in via policy', () => {
  assert.equal(sanitizeHtml('<p style="color:red">x</p>'), '<p>x</p>');
  const s = createSanitizer({ allowStyle: true, allowedAttributes: { p: ['style'] } });
  assert.equal(s.sanitize('<p style="color:red">x</p>'), '<p style="color:red">x</p>');
});

test('srcdoc and formaction are always rejected', () => {
  assert.equal(sanitizeHtml('<a srcdoc="<script>alert(1)</script>">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<p formaction="javascript:alert(1)">x</p>'), '<p>x</p>');
});

test('attribute values are canonically escaped in output', () => {
  assert.equal(sanitizeHtml('<a title="&quot;&lt;&gt;&amp;&#39;">x</a>'),
    '<a title="&quot;&lt;&gt;&amp;&#39;">x</a>');
  assert.equal(sanitizeHtml('<a title="<b>&x</b>">x</a>'),
    '<a title="&lt;b&gt;&amp;x&lt;/b&gt;">x</a>');
});

test('single-quoted, unquoted and boolean attributes parse identically', () => {
  assert.equal(sanitizeHtml("<a href='https://x.test' title='hi'>x</a>"),
    '<a href="https://x.test" title="hi">x</a>');
  assert.equal(sanitizeHtml('<a href=https://x.test title=hi>x</a>'),
    '<a href="https://x.test" title="hi">x</a>');
  assert.equal(sanitizeHtml('<a href="/x" disabled>x</a>'), '<a href="/x">x</a>');
});

test('duplicate attributes collapse to the first allowlisted value', () => {
  assert.equal(sanitizeHtml('<a href="https://first" href="https://second">x</a>'),
    '<a href="https://first">x</a>');
});

test('id and name are rejected by default', () => {
  assert.equal(sanitizeHtml('<div id="x" name="y">z</div>'), '<div>z</div>');
  assert.equal(sanitizeHtml('<p id="a">x</p>'), '<p>x</p>');
});

test('id and name can be opted in with a prefix', () => {
  const s = createSanitizer({ allowId: true, allowName: true, idPrefix: 'hc-',
    allowedTags: ['div', 'p', 'input'], allowedAttributes: {} });
  assert.equal(s.sanitize('<div id="main" name="field">x</div>'),
    '<div id="hc-main" name="hc-field">x</div>');
});

test('DOM clobbering names are rejected even when id is allowed', () => {
  const s = createSanitizer({ allowId: true, allowName: true });
  const names = ['location', 'cookie', 'createElement', 'domain', 'defaultView',
    'window', 'document', 'body', 'constructor', 'LOCATION'];
  for (const name of names) {
    assert.equal(s.sanitize(`<div id="${name}">x</div>`), '<div>x</div>', name);
    assert.equal(s.sanitize(`<div name="${name}">x</div>`), '<div>x</div>', name);
  }
  assert.equal(s.sanitize('<div id="safe-id">x</div>'), '<div id="safe-id">x</div>');
});

test('clobber blocklist can be customized', () => {
  const s = createSanitizer({ allowId: true, clobberBlocklist: ['custom'] });
  assert.equal(s.sanitize('<div id="custom">x</div>'), '<div>x</div>');
  assert.equal(s.sanitize('<div id="location">x</div>'), '<div id="location">x</div>');
});

test('target is restricted to safe values and rel is enforced', () => {
  assert.equal(sanitizeHtml('<a href="/x" target="_blank">x</a>'),
    '<a href="/x" rel="noopener noreferrer" target="_blank">x</a>');
  assert.equal(sanitizeHtml('<a href="/x" target="_self">x</a>'), '<a href="/x" target="_self">x</a>');
  assert.equal(sanitizeHtml('<a href="/x" target="evil" rel="stylesheet">x</a>'), '<a href="/x">x</a>');
  assert.equal(sanitizeHtml('<a href="/x" target="_blank" rel="nofollow">x</a>'),
    '<a href="/x" rel="nofollow noopener noreferrer" target="_blank">x</a>');
});

test('colspan and rowspan are numeric and bounded', () => {
  assert.equal(sanitizeHtml('<table><td colspan="2" rowspan="3">x</td></table>'),
    '<table><td colspan="2" rowspan="3">x</td></table>');
  assert.equal(sanitizeHtml('<table><td colspan="javascript:alert(1)">x</td></table>'),
    '<table><td>x</td></table>');
  assert.equal(sanitizeHtml('<table><td colspan="999999">x</td></table>'),
    '<table><td>x</td></table>');
});

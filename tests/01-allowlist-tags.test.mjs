import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, createSanitizer, STRICT_POLICY, PROSE_POLICY } from '../src/index.mjs';

test('allowlisted elements round-trip canonically', () => {
  assert.equal(sanitizeHtml('<p>Hello <b>world</b> and <i>friends</i></p>'),
    '<p>Hello <b>world</b> and <i>friends</i></p>');
  assert.equal(sanitizeHtml('<h1>Title</h1><ul><li>One</li><li>Two</li></ul>'),
    '<h1>Title</h1><ul><li>One</li><li>Two</li></ul>');
  assert.equal(sanitizeHtml('<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>C</td></tr></tbody></table>'),
    '<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>C</td></tr></tbody></table>');
});

test('unknown and custom elements are unwrapped but their text survives', () => {
  assert.equal(sanitizeHtml('<custom-element>text</custom-element>'), 'text');
  assert.equal(sanitizeHtml('<foo>bar</foo>'), 'bar');
  assert.equal(sanitizeHtml('<span>ok</span><unknown>bad</unknown>'), '<span>ok</span>bad');
});

test('dangerous elements lose their content entirely', () => {
  const dangerous = ['script', 'style', 'iframe', 'object', 'embed', 'applet', 'base',
    'meta', 'link', 'form', 'input', 'button', 'textarea', 'select', 'svg', 'math',
    'template', 'noscript', 'xmp', 'noembed', 'noframes'];
  for (const tag of dangerous) {
    assert.equal(sanitizeHtml(`<${tag}>payload</${tag}><p>keep</p>`), '<p>keep</p>', tag);
  }
  assert.equal(sanitizeHtml('<script>alert(1)</script>'), '');
  assert.equal(sanitizeHtml('<style>body{color:red}</style>'), '');
});

test('self-closing and void elements are handled', () => {
  assert.equal(sanitizeHtml('<p>a<br>b<hr>c</p>'), '<p>a<br>b<hr>c</p>');
  assert.equal(sanitizeHtml('a<br/>b'), 'a<br>b');
  assert.equal(sanitizeHtml('<br><br><br>'), '<br><br><br>');
});

test('unclosed tags are closed canonically', () => {
  assert.equal(sanitizeHtml('<p>one<p>two'), '<p>one<p>two</p></p>');
  assert.equal(sanitizeHtml('<blockquote><b>bold'), '<blockquote><b>bold</b></blockquote>');
  assert.equal(sanitizeHtml('<p>text'), '<p>text</p>');
});

test('mismatched end tags do not corrupt the tree', () => {
  assert.equal(sanitizeHtml('<p><b>bold</p>'), '<p><b>bold</b></p>');
  assert.equal(sanitizeHtml('<p>a</b>b</p>'), '<p>ab</p>');
  assert.equal(sanitizeHtml('</p>text'), 'text');
});

test('STRICT_POLICY allows only a minimal formatting subset', () => {
  const s = createSanitizer(STRICT_POLICY);
  assert.equal(s.sanitize('<p><b>bold</b><div>block</div></p>'), '<p><b>bold</b>block</p>');
  assert.equal(s.sanitize('<a href="https://example.com">link</a>'), '<a href="https://example.com">link</a>');
  assert.equal(s.sanitize('<a href="/x">link</a>'), '<a href="/x">link</a>');
});

test('PROSE_POLICY permits articles but still drops dangerous content', () => {
  const s = createSanitizer(PROSE_POLICY);
  assert.equal(s.sanitize('<h2>Head</h2><p>Text</p><script>alert(1)</script>'), '<h2>Head</h2><p>Text</p>');
  assert.equal(s.sanitize('<figure><figcaption>Cap</figcaption></figure>'), '<figure><figcaption>Cap</figcaption></figure>');
});

test('createSanitizer returns a frozen reusable object', () => {
  const s = createSanitizer({ allowedTags: ['b'] });
  assert.equal(Object.isFrozen(s), true);
  assert.equal(s.sanitize('<b>x</b><i>y</i>'), '<b>x</b>y');
  assert.equal(s.sanitize('<b>x</b><i>y</i>'), '<b>x</b>y');
});

test('mixed-case tags and attributes are lowercased', () => {
  assert.equal(sanitizeHtml('<P CLASS="x">Hi</P>'), '<p>Hi</p>');
  assert.equal(sanitizeHtml('<A HREF="https://x.test" TITLE="T">L</A>'),
    '<a href="https://x.test" title="T">L</a>');
});

test('nested identical tags serialize in stack order', () => {
  assert.equal(sanitizeHtml('<b><b><b>x</b></b></b>'), '<b><b><b>x</b></b></b>');
});

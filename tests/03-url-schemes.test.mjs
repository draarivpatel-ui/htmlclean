import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, createSanitizer } from '../src/index.mjs';

test('dangerous URL schemes are stripped', () => {
  const vectors = [
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'vbscript:msgbox(1)',
    'data:text/html,<script>alert(1)</script>', 'data:image/svg+xml;base64,PHN2Zz4=',
    'blob:https://example.com/uuid', 'file:///etc/passwd', 'ftp://example.com/x',
  ];
  for (const url of vectors) {
    assert.equal(sanitizeHtml(`<a href="${url}">x</a>`), '<a>x</a>', url);
  }
});

test('allowed schemes survive', () => {
  assert.equal(sanitizeHtml('<a href="https://example.com">x</a>'), '<a href="https://example.com">x</a>');
  assert.equal(sanitizeHtml('<a href="http://example.com">x</a>'), '<a href="http://example.com">x</a>');
  assert.equal(sanitizeHtml('<a href="mailto:a@example.com">x</a>'), '<a href="mailto:a@example.com">x</a>');
});

test('relative paths and fragments are allowed', () => {
  for (const url of ['/path', './path', '../path', '#section', 'path/page.html', '?q=1']) {
    assert.equal(sanitizeHtml(`<a href="${url}">x</a>`), `<a href="${url}">x</a>`, url);
  }
});

test('protocol-relative URLs are blocked by default and opt-in', () => {
  assert.equal(sanitizeHtml('<a href="//evil.com/x">x</a>'), '<a>x</a>');
  const s = createSanitizer({ allowProtocolRelative: true });
  assert.equal(s.sanitize('<a href="//example.com/x">x</a>'), '<a href="https://example.com/x">x</a>');
});

test('named-entity encoded javascript schemes are decoded then blocked', () => {
  const vectors = [
    'jav&#x61;script:alert(1)',
    'java&#115;cript:alert(1)',
    '&#106;avascript:alert(1)',
    '&#0000106;avascript:alert(1)',
    '&#x6a;avascript:alert(1)',
    'javascript&colon;alert(1)',
    'java&Tab;script:alert(1)',
    '&Tab;javascript:alert(1)',
  ];
  for (const url of vectors) {
    assert.equal(sanitizeHtml(`<a href="${url}">x</a>`), '<a>x</a>', url);
  }
});

test('control characters and embedded whitespace inside scheme are stripped', () => {
  const vectors = [
    'java\tscript:alert(1)', 'java\nscript:alert(1)', 'java\rscript:alert(1)',
    'java\x00script:alert(1)', 'java\tsc&#x72;ipt:alert(1)', 'jav&#x09;ascript:alert(1)',
    'java&#x0A;script:alert(1)', 'java&#13;script:alert(1)', '&#x6a;ava&#x09;script:alert(1)',
    ' javascript:alert(1)',
  ];
  for (const url of vectors) {
    assert.equal(sanitizeHtml(`<a href="${url}">x</a>`), '<a>x</a>', url);
  }
});

test('backslash smuggling and drive-letter URLs are blocked', () => {
  assert.equal(sanitizeHtml('<a href="javascript\\:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<a href="/\\evil.com">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<a href="C:\\Windows\\x">x</a>'), '<a>x</a>');
});

test('all URL-bearing attributes are covered', () => {
  for (const attr of ['href', 'src', 'cite', 'poster']) {
    const s = createSanitizer({ allowedTags: ['a'], allowedAttributes: { a: [attr] } });
    assert.equal(s.sanitize(`<a ${attr}="javascript:alert(1)">x</a>`), '<a>x</a>', attr);
    assert.equal(s.sanitize(`<a ${attr}="https://example.com">x</a>`),
      `<a ${attr}="https://example.com">x</a>`, attr);
  }
});

test('allowedSchemes policy can extend accepted protocols', () => {
  const s = createSanitizer({ allowedSchemes: ['https:', 'ftp:'] });
  assert.equal(s.sanitize('<a href="ftp://example.com/x">x</a>'), '<a href="ftp://example.com/x">x</a>');
  assert.equal(s.sanitize('<a href="http://example.com">x</a>'), '<a>x</a>');
});

test('relative URL opt-out removes relative links', () => {
  const s = createSanitizer({ allowRelativeUrls: false });
  assert.equal(s.sanitize('<a href="/x">x</a>'), '<a>x</a>');
  assert.equal(s.sanitize('<a href="https://x.test">x</a>'), '<a href="https://x.test">x</a>');
});

test('empty href, fragment-only href and title attributes are preserved', () => {
  assert.equal(sanitizeHtml('<a href="#">x</a>'), '<a href="#">x</a>');
  assert.equal(sanitizeHtml('<a href="">x</a>'), '<a href="">x</a>');
  assert.equal(sanitizeHtml('<a href="https://x" title="link title">x</a>'),
    '<a href="https://x" title="link title">x</a>');
});

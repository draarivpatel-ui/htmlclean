import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, createSanitizer, stripHtml } from '../src/index.mjs';

// One assertion per OWASP cheat-sheet family, kept granular so each vector
// is visible in test output.

test('script tag with alert is removed', () => {
  assert.equal(sanitizeHtml('<script>alert(1)</script>'), '');
});
test('uppercase SCRIPT tag is removed', () => {
  assert.equal(sanitizeHtml('<SCRIPT>alert(1)</SCRIPT>'), '');
});
test('mixed-case script tag is removed', () => {
  assert.equal(sanitizeHtml('<ScRiPt>alert(1)</sCrIpT>'), '');
});
test('script with external src is removed', () => {
  assert.equal(sanitizeHtml('<script src="https://evil.com/x.js"></script>'), '');
});
test('script with slash syntax is removed', () => {
  assert.equal(sanitizeHtml('<script/src="https://evil.com/x.js">'), '');
});
test('script using String.fromCharCode is removed', () => {
  assert.equal(sanitizeHtml('<script>alert(String.fromCharCode(88,83,83))</script>'), '');
});
test('script inside HTML comment is removed', () => {
  assert.equal(sanitizeHtml('<script><!--alert(1)--></script>'), '');
});
test('img onerror is removed', () => {
  assert.equal(sanitizeHtml('<img src=x onerror=alert(1)>'), '');
});
test('IMG ONERROR uppercase is removed', () => {
  assert.equal(sanitizeHtml('<IMG SRC=x ONERROR=alert(1)>'), '');
});
test('img with encoded onerror parentheses is removed', () => {
  assert.equal(sanitizeHtml('<img src=x onerror=alert&#40;1&#41;>'), '');
});
test('img with multiple event handlers is removed', () => {
  assert.equal(sanitizeHtml('<img src=x onerror=alert(1) onload=alert(2)>'), '');
});
test('img with javascript href attribute is removed', () => {
  assert.equal(sanitizeHtml('<img src=1 href=1 onerror="javascript:alert(1)">'), '');
});
test('svg onload is removed', () => {
  assert.equal(sanitizeHtml('<svg/onload=alert(1)>'), '');
});
test('svg script child is removed', () => {
  assert.equal(sanitizeHtml('<svg><script>alert(1)</script></svg>'), '');
});
test('svg use with data URI is removed', () => {
  assert.equal(sanitizeHtml('<svg><use href="data:image/svg+xml;base64,PHN2Zz4=" /></svg>'), '');
});
test('svg animate javascript values is removed', () => {
  assert.equal(sanitizeHtml('<svg><animate attributeName=href values=javascript:alert(1) /></svg>'), '');
});
test('math mtext table mglyph mXSS is removed', () => {
  assert.equal(sanitizeHtml('<math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)>'), '');
});
test('iframe srcdoc is removed', () => {
  assert.equal(sanitizeHtml('<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>'), '');
});
test('object data is removed', () => {
  assert.equal(sanitizeHtml('<object data="javascript:alert(1)"></object>'), '');
});
test('embed src is removed', () => {
  assert.equal(sanitizeHtml('<embed src="javascript:alert(1)">'), '');
});
test('applet code is removed', () => {
  assert.equal(sanitizeHtml('<applet code="Evil.class"></applet>'), '');
});
test('form with javascript action is removed', () => {
  assert.equal(sanitizeHtml('<form action="javascript:alert(1)"><input></form>'), '');
});
test('button formaction is removed', () => {
  assert.equal(sanitizeHtml('<button formaction="javascript:alert(1)">x</button>'), '');
});
test('base href injection is removed', () => {
  assert.equal(sanitizeHtml('<base href="https://evil.com/"><p>x</p>'), '<p>x</p>');
});
test('meta refresh is removed', () => {
  assert.equal(sanitizeHtml('<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'), '');
});
test('link stylesheet is removed', () => {
  assert.equal(sanitizeHtml('<link rel="stylesheet" href="https://evil.com/x.css">'), '');
});
test('style attribute with url javascript is removed', () => {
  assert.equal(sanitizeHtml('<div style="background:url(javascript:alert(1))">x</div>'), '<div>x</div>');
});
test('style attribute with behavior is removed', () => {
  assert.equal(sanitizeHtml('<p style="behavior:url(#default#time2)">x</p>'), '<p>x</p>');
});
test('style attribute with moz-binding is removed', () => {
  assert.equal(sanitizeHtml('<b style="-moz-binding:url(http://evil/x.xml)">x</b>'), '<b>x</b>');
});
test('javascript scheme is stripped', () => {
  assert.equal(sanitizeHtml('<a href="javascript:alert(1)">x</a>'), '<a>x</a>');
});
test('vbscript scheme is stripped', () => {
  assert.equal(sanitizeHtml('<a href="vbscript:msgbox(1)">x</a>'), '<a>x</a>');
});
test('data scheme is stripped', () => {
  assert.equal(sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>'), '<a>x</a>');
});
test('blob scheme is stripped', () => {
  assert.equal(sanitizeHtml('<a href="blob:https://example.com/uuid">x</a>'), '<a>x</a>');
});
test('file scheme is stripped', () => {
  assert.equal(sanitizeHtml('<a href="file:///etc/passwd">x</a>'), '<a>x</a>');
});
test('entity encoded javascript is stripped', () => {
  assert.equal(sanitizeHtml('<a href="&#106;avascript:alert(1)">x</a>'), '<a>x</a>');
});
test('hex entity encoded javascript is stripped', () => {
  assert.equal(sanitizeHtml('<a href="&#x6a;avascript:alert(1)">x</a>'), '<a>x</a>');
});
test('padded decimal entity encoded javascript is stripped', () => {
  assert.equal(sanitizeHtml('<a href="&#0000106;avascript:alert(1)">x</a>'), '<a>x</a>');
});
test('tab inside scheme is stripped', () => {
  assert.equal(sanitizeHtml('<a href="java\tscript:alert(1)">x</a>'), '<a>x</a>');
});
test('newline inside scheme is stripped', () => {
  assert.equal(sanitizeHtml('<a href="java\nscript:alert(1)">x</a>'), '<a>x</a>');
});
test('null inside scheme is stripped', () => {
  assert.equal(sanitizeHtml('<a href="java\0script:alert(1)">x</a>'), '<a>x</a>');
});
test('named colon entity is decoded then stripped', () => {
  assert.equal(sanitizeHtml('<a href="javascript&colon;alert(1)">x</a>'), '<a>x</a>');
});
test('protocol-relative URL blocked by default', () => {
  assert.equal(sanitizeHtml('<a href="//evil.com/x">x</a>'), '<a>x</a>');
});
test('protocol-relative URL allowed with opt-in', () => {
  const s = createSanitizer({ allowProtocolRelative: true });
  assert.equal(s.sanitize('<a href="//example.com/x">x</a>'), '<a href="https://example.com/x">x</a>');
});
test('rel=noopener noreferrer enforced on target=_blank', () => {
  assert.equal(sanitizeHtml('<a href="/x" target="_blank">x</a>'),
    '<a href="/x" rel="noopener noreferrer" target="_blank">x</a>');
});
test('DOM clobbering id=cookie is rejected', () => {
  assert.equal(sanitizeHtml('<div id=cookie>x</div>'), '<div>x</div>');
});
test('DOM clobbering name=location is rejected', () => {
  assert.equal(sanitizeHtml('<a name=location>x</a>'), '<a>x</a>');
});
test('encoded angle brackets are escaped not re-parsed', () => {
  assert.equal(sanitizeHtml('&lt;script&gt;alert(1)&lt;/script&gt;'),
    '&lt;script&gt;alert(1)&lt;/script&gt;');
});
test('double-encoded angle brackets stay escaped', () => {
  assert.equal(sanitizeHtml('<p>&amp;lt;script&amp;gt;</p>'), '<p>&amp;lt;script&amp;gt;</p>');
});
test('comment breakout cannot execute script', () => {
  assert.equal(sanitizeHtml('<!--><img src=x onerror=alert(1)>-->'), '');
});
test('noscript mXSS cannot execute', () => {
  assert.doesNotMatch(sanitizeHtml('<noscript><p title="</noscript><img src=x onerror=alert(1)>">x</p></noscript>'),
    /<script\b|<img\b/i);
});
test('template mXSS cannot execute', () => {
  assert.equal(sanitizeHtml('<template><img src=x onerror=alert(1)></template>'), '');
});
test('textarea content is discarded', () => {
  assert.equal(sanitizeHtml('<textarea><img src=x onerror=alert(1)></textarea>'), '');
});
test('xmp content is discarded', () => {
  assert.equal(sanitizeHtml('<xmp><img src=x onerror=alert(1)></xmp>'), '');
});
test('stripHtml removes script text', () => {
  assert.equal(stripHtml('<script>alert(1)</script>Safe'), 'Safe');
});
test('idempotency holds for script vector', () => {
  const once = sanitizeHtml('<script>alert(1)</script><p>x</p>');
  assert.equal(sanitizeHtml(once), once);
});

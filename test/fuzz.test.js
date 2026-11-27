import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { HtmlCleanError, sanitizeHtml } from '../src/index.mjs';

const schemeArbitrary = fc.constantFrom(
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  'java\nscript:alert(1)',
  'java\tscript:alert(1)',
  'java\rscript:alert(1)',
  ' javascript:alert(1)',
  '&#106;avascript:alert(1)',
  '&#x6a;avascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:alert(1)',
  '//attacker.example/payload',
  'https://safe.example/" onclick="alert(1)',
);

const dangerousMarkupArbitrary = fc.constantFrom(
  '<script>alert(1)</script>',
  '<script src="https://attacker.example/x.js"></script>',
  '<svg onload="alert(1)"><circle></circle></svg>',
  '<img src="x" onerror="alert(1)">',
  '<iframe src="https://attacker.example"></iframe>',
  '<math><mi xlink:href="javascript:alert(1)">x</mi></math>',
  '<form action="javascript:alert(1)"><button>x</button></form>',
);

const noiseArbitrary = fc.string({
  unit: fc.constantFrom('a', 'b', 'c', ' ', '<', '>', '&', '"', "'", '\n', '='),
  maxLength: 40,
});

function assertNoExecutableOutput(output) {
  assert.equal(typeof output, 'string');
  assert.doesNotMatch(output, /<\s*script\b/i);
  assert.doesNotMatch(output, /<\s*(svg|math|iframe|img|object|embed|form)\b/i);
  const tags = output.match(/<[a-z][^>]*>/gi) || [];
  for (const tag of tags) {
    assert.doesNotMatch(tag, /(^|\s)on[a-z0-9_-]+\s*=/i, tag);
    assert.doesNotMatch(tag, /(?:href|cite|src)\s*=\s*"[^"]*javascript:/i, tag);
    assert.doesNotMatch(tag, /(?:href|cite|src)\s*=\s*"[^"]*(?:data|vbscript):/i, tag);
  }
}

test('fuzzed dangerous markup and attribute payloads never produce executable output', () => {
  fc.assert(
    fc.property(
      noiseArbitrary,
      schemeArbitrary,
      fc.string({ maxLength: 50 }),
      dangerousMarkupArbitrary,
      noiseArbitrary,
      (before, scheme, text, dangerousMarkup, after) => {
        const input = before + '<a href="' + scheme + '" onclick="alert(1)" onmouseover="alert(2)">' + text + '</a>' + dangerousMarkup + after;
        const output = sanitizeHtml(input);
        assertNoExecutableOutput(output);
        assert.equal(sanitizeHtml(output), output, 'sanitized output was not idempotent');
      },
    ),
    { seed: 20261127, numRuns: 200, endOnFailure: true },
  );
});

test('arbitrary HTML input either fails closed or sanitizes to a safe fixed point', () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 256 }), (input) => {
      let output;
      try {
        output = sanitizeHtml(input);
      } catch (error) {
        assert.ok(error instanceof HtmlCleanError, 'unexpected non-htmlclean exception');
        return;
      }
      assertNoExecutableOutput(output);
      assert.equal(sanitizeHtml(output), output, 'sanitized output was not idempotent');
    }),
    { seed: 20261128, numRuns: 200, endOnFailure: true },
  );
});

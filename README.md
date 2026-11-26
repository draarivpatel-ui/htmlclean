# @aarivbuildz/htmlclean

Zero-dependency, allowlist-based HTML sanitizer for Node.js, Cloudflare Workers, Deno, Bun and edge runtimes. No `jsdom`, no native bindings, no network calls.

`htmlclean` uses a real character-stream tokenizer and a canonical tree serializer. It never strips tags with regular expressions. Dangerous elements and their content are discarded before serialization, every emitted text and attribute value is escaped, and URLs are decoded then checked against a scheme allowlist.

## Install

```sh
npm install @aarivbuildz/htmlclean
```

## Usage

ESM:

```js
import { sanitizeHtml, stripHtml, createSanitizer } from '@aarivbuildz/htmlclean';

sanitizeHtml('<p>Hello <b>world</b></p><script>alert(1)</script>');
// '<p>Hello <b>world</b></p>'

stripHtml('<script>alert(1)</script><p>Safe</p>');
// 'Safe'

const clean = createSanitizer({
  allowedTags: ['p', 'b', 'a'],
  allowedAttributes: { a: ['href', 'title'] },
});
clean.sanitize('<a href="https://example.com" onclick="x()">Link</a>');
// '<a href="https://example.com">Link</a>'
```

CommonJS:

```js
const { sanitizeHtml } = require('@aarivbuildz/htmlclean');
```

The package ships ESM in `src/`, CJS in `cjs/`, and strict TypeScript declarations in `types/`. Both module formats are tested for exact output parity.

## API

### `sanitizeHtml(input: string, options?: SanitizePolicy): string`

Sanitizes an HTML string and returns canonical, idempotent HTML. Sanitizing the output again produces the same string.

### `stripHtml(input: string, options?: SanitizePolicy): string`

Removes all markup and dangerous subtrees and returns the plain text content. Character references are decoded once, so the result is plain text and not HTML-escaped: escape it before inserting it into an HTML document.

### `createSanitizer(policy?: SanitizePolicy): BoundSanitizer`

Returns a frozen object with `sanitize(input)` and `strip(input)` methods bound to a fixed policy.

### Presets

- `STRICT_POLICY`: minimal inline formatting and links.
- `PROSE_POLICY`: headings, lists, tables and common article markup.

### `HtmlCleanError`

Thrown for non-string input (`INVALID_INPUT`), invalid policies (`INVALID_POLICY`), oversized input (`INPUT_TOO_LARGE`), excessive nesting (`MAX_DEPTH_EXCEEDED`) and token floods (`TOKEN_LIMIT_EXCEEDED`).

## Policy options

| Option | Default | Description |
| --- | --- | --- |
| `allowedTags` | prose set | Tag names to keep. Everything else is unwrapped; dangerous subtrees are dropped. |
| `allowedAttributes` | small per-tag set | Attribute allowlist scoped by tag name. |
| `allowedSchemes` | `https:`, `http:`, `mailto:` | URL schemes accepted by `href`, `src`, `cite` and `poster`. |
| `allowProtocolRelative` | `false` | Permit `//host/path` URLs. |
| `allowRelativeUrls` | `true` | Permit `/path`, `./path`, `?q`, `#fragment`. |
| `allowStyle` | `false` | Permit the `style` attribute. Off by default because it enables CSS-based attacks. |
| `allowId` / `allowName` | `false` | Permit `id` / `name` attributes, with DOM clobbering checks. |
| `idPrefix` | `''` | Prefix applied to allowed `id` and `name` values. |
| `clobberBlocklist` | built-in set | Names rejected for `id` and `name` to prevent DOM clobbering. |
| `maxInputBytes` | `524288` | UTF-8 input size limit. |
| `maxDepth` | `64` | Element nesting limit. |
| `maxTokens` | `100000` | Tokenizer output limit. |

All `on*` event handlers, `srcdoc`, `formaction`, `xlink:href` and `style` (unless explicitly enabled) are always rejected regardless of policy.

## Threat model

`htmlclean` is an HTML-to-HTML sanitizer for untrusted markup rendered into an HTML document. It protects against:

- Script, event-handler and javascript: URL injection, including mixed case, entity encoding, embedded controls and malformed tags.
- SVG and MathML foreign-namespace mutation XSS (mXSS), including `<noscript>`, `<template>`, `<style>` and comment breakout vectors.
- DOM clobbering through `id` and `name`.
- Canonicalization escapes: output is fully re-escaped and every non-void start tag is balanced, so sanitized text cannot be re-parsed as different markup on a second pass.
- Linear resource abuse through input-size, depth and token-count limits. Raw-text scanning is a single linear pass with no whole-input lowercase copies.

It does not protect against:

- Attacks in non-HTML contexts (CSS, JavaScript string literals, URL query parameters) where the output is interpolated without context-appropriate encoding.
- Server-side template injection before sanitization. Sanitize at the last step before insertion into HTML.
- Content already added to the DOM through other libraries. Do not mix sanitized and unsanitized DOM manipulation.
- Application-level authorization, CSRF or business logic.

### Escaping guarantees

Text nodes serialize with `<`, `>`, `&`, `"` and `'` escaped. Attribute values always use double quotes with the same five characters escaped. URLs are fully decoded (named, decimal, hex and missing-semicolon references) and stripped of ASCII controls and whitespace before scheme validation.

## Development

```sh
npm run build   # regenerate cjs/ from src/
npm test        # Node test runner, 190 tests
```

Runtime dependencies: none. Dev dependencies: none. CI runs on Node 18, 20, 22 and 24 across Linux and Windows.

## License

MIT. See `LICENSE`.

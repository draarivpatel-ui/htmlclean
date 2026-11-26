# Good First Issues

These are concrete, scoped tasks for new contributors. Each one is testable with the existing Node test runner and requires no external dependencies.

## Policy presets

1. Add a `MINIMAL_POLICY` preset that allows only `b`, `i`, `em`, `strong` and `br`, with no attributes. Add a test that links are unwrapped.
2. Add a `TABLE_POLICY` preset with `table`, `thead`, `tbody`, `tr`, `th`, `td`, `colspan` and `rowspan`. Add a test that script content inside cells is removed.
3. Add a `COMMENT_POLICY` preset that allows only `p`, `br` and `a` with `href`. Add a test comparing it with `STRICT_POLICY`.
4. Add a `CODE_POLICY` preset for documentation sites with `pre`, `code`, `p`, `ul`, `ol`, `li` and `a`. Verify that `style` is rejected.
5. Add an `SVG_SAFE_TEXT_POLICY` that explicitly documents and tests that no SVG tag ever passes, including with a custom `allowedTags` containing `svg`.

## Markdown and prose

6. Add a `MARKDOWN_INLINE_POLICY` preset for rendering Markdown inline output: `code`, `em`, `strong`, `del`, `a`, `br`. Add tests for nested emphasis.
7. Add a helper `sanitizeMarkdownHtml(html)` that delegates to `sanitizeHtml` with `MARKDOWN_INLINE_POLICY`. Test that fenced-code output containing `<script>` is escaped text.
8. Add a test file covering blockquotes with `cite` values using `data:`, `blob:` and protocol-relative URLs.
9. Add a test file for headings `h1` through `h6` with nested formatting and entity-encoded text.

## Framework integration specs

10. Add a `createReactSanitizer(policy)` wrapper that returns a function safe to pass to `dangerouslySetInnerHTML`. Test that output is a string and is idempotent.
11. Add an `expressSanitizeBody(policy, fieldNames)` middleware spec in `docs/express.md` with code and tests using only Node primitives, with no Express dependency.
12. Add a Cloudflare Workers usage example in `docs/workers.md` that reads HTML from a request and returns sanitized HTML with `Content-Type: text/html`.
13. Add a Deno usage example in `docs/deno.md` importing the ESM entry directly by URL path.

## Hardening and tooling

14. Add a policy option `allowedSchemesByTag` that scopes URL schemes per tag and attribute. Include a regression test that `href` on `a` accepts `mailto:` while `cite` on `q` rejects it.
15. Add a deterministic property test that generates 1,000 random token sequences from a fixed vocabulary and asserts that sanitize output is idempotent and contains no `<script` or `<svg` tags.

All tasks must follow `CONTRIBUTING.md`. Open an issue before starting work so the scope can be confirmed.

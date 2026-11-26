# Contributing

Thanks for helping improve htmlclean. Security-correctness changes are welcome, but the bar is high: every behavior change needs a regression test.

## Setup

No install step is required. The repository has zero runtime and zero development dependencies.

```sh
npm run build
npm test
```

`npm run build` regenerates `cjs/` from `src/`. Always commit the generated CJS files alongside source changes. Do not hand-edit files in `cjs/`.

## Rules for changes

- Keep the package dependency-free. Do not add runtime or dev dependencies without a security discussion first.
- Add a test for every new sanitization rule or policy option. Prefer a concrete OWASP vector over a synthetic string.
- Preserve idempotency: `sanitizeHtml(sanitizeHtml(x)) === sanitizeHtml(x)` for all inputs.
- Preserve ESM and CJS parity. The parity test checks public API and output equality.
- Keep output canonical: lowercase tag and attribute names, double-quoted attributes, deterministic attribute order.
- Do not add em dashes or en dashes to documentation.
- Do not include personal paths, email addresses or private repository links in committed files.

## Testing XSS bypasses

Create a minimal payload, add it to the relevant test file, and verify that the output contains no executable markup. If the bypass is real, fix the tokenizer or sanitizer, then add the fix and the regression test in the same commit.

For suspected bypasses, follow `SECURITY.md` instead of opening a public issue.

## Commit style

Use short imperative commit messages. Example: `Reject javascript URL after named-entity decoding`.

## Pull requests

Describe the threat addressed, the tests added, and any change to the public policy surface. CI runs on Linux and Windows with Node 18, 20, 22 and 24.

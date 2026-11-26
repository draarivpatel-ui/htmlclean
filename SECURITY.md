# Security Policy

## Supported versions

Only the latest published minor version receives security fixes.

## Reporting a vulnerability

Please report suspected XSS bypasses or resource-exhaustion issues privately through the repository's security advisory form. Include:

- A minimal HTML payload that reproduces the issue.
- The policy options used, if any.
- The expected and actual sanitized output.
- The runtime (Node.js, Cloudflare Workers, Deno or Bun) and version.

Do not open a public issue for an unfixed bypass. Reports are acknowledged within seven days, and confirmed bypasses are patched with a regression test in the same release cycle.

## Scope

In scope:

- Arbitrary script execution from sanitized output in an HTML document.
- Foreign-namespace mutation XSS (mXSS) and DOM clobbering.
- URL-scheme validation bypasses.
- Unbounded CPU or memory use from a single input within the default limits.

Out of scope:

- Misuse of `allowStyle`, `allowProtocolRelative` or `allowId` with unsafe application data. These are explicit opt-ins documented in the README.
- Injection into non-HTML contexts such as CSS, JSON, JavaScript or shell commands.
- Vulnerabilities in applications that combine sanitized output with unsanitized DOM writes.

## Design notes

The tokenizer is a character-stream state machine and does not use regex tag stripping. Raw-text elements are consumed until their matching end tag. Dangerous elements are discarded with their nested content. Output is canonical and idempotent, with all text and attribute values escaped. URL attributes are decoded before scheme validation and all ASCII controls are removed.

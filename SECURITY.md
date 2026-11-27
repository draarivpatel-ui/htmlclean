# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| Latest published 0.x release | Yes |
| Older releases | No |

Security fixes apply to the latest published 0.x release. Users should upgrade to the fixed release as soon as it is available.

## Reporting a vulnerability

Report suspected vulnerabilities privately through [GitHub private vulnerability reporting](https://github.com/draarivpatel-ui/htmlclean/security/advisories/new). Do not open a public issue for an unfixed bypass or unpatched vulnerability.

Include:

- A minimal HTML payload that reproduces the issue.
- The policy options used, if any.
- The expected and actual sanitized output.
- The runtime (Node.js, Cloudflare Workers, Deno or Bun) and version.

Do not include real credentials, customer data or sensitive HTML in a report.

## Acknowledgment and coordinated disclosure timeline

- We aim to acknowledge a vulnerability report within 3 business days.
- We aim to complete initial triage and severity assessment within 14 days.
- We aim to release a fix within 90 days of confirming a vulnerability, sooner for high severity issues when practical.
- We coordinate public disclosure with the reporter. A public advisory is normally published after a fixed release is available or on a mutually agreed date.
- Credit is given in release notes and the advisory unless the reporter prefers otherwise.
- If a report is not accepted as a vulnerability, we will explain the reasoning before closing the advisory.

## Vulnerability handling process

1. Receive the private report through the GitHub security advisory.
2. Reproduce the issue, determine affected versions and assess severity.
3. Develop a fix with regression tests.
4. Publish the fixed release and prepare the advisory.
5. Publish coordinated disclosure notes with affected and fixed versions.

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

import {
  HtmlCleanError,
  normalizePolicy,
  sanitizeWithPolicy,
  DROP_CONTENT_ELEMENTS,
} from './sanitize.mjs';
import { decodeReferences, escapeCanonical } from './entities.mjs';

export const STRICT_POLICY = Object.freeze({
  allowedTags: Object.freeze(['b', 'em', 'i', 'strong', 'p', 'br', 'span', 'ul', 'ol', 'li', 'code', 'blockquote', 'a']),
  allowedAttributes: Object.freeze({
    a: Object.freeze(['href', 'title', 'target', 'rel']),
  }),
  allowStyle: false,
  allowId: false,
  allowName: false,
  allowProtocolRelative: false,
  maxInputBytes: 256 * 1024,
  maxDepth: 32,
});

export const PROSE_POLICY = Object.freeze({
  allowedTags: Object.freeze([
    'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'code', 'dd', 'del', 'details',
    'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5',
    'h6', 'hr', 'i', 'ins', 'li', 'main', 'mark', 'nav', 'ol', 'p', 'pre', 'q', 's',
    'section', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody',
    'td', 'th', 'thead', 'tr', 'u', 'ul', 'wbr',
  ]),
  allowedAttributes: Object.freeze({
    a: Object.freeze(['href', 'title', 'target', 'rel']),
    blockquote: Object.freeze(['cite']),
    q: Object.freeze(['cite']),
    td: Object.freeze(['colspan', 'rowspan']),
    th: Object.freeze(['colspan', 'rowspan']),
  }),
  allowStyle: false,
  allowId: false,
  allowName: false,
  allowProtocolRelative: false,
});

/** Sanitize an HTML string using an optional policy object. */
export function sanitizeHtml(input, options = DEFAULT_POLICY_VALUE) {
  const policy = normalizePolicy(options);
  return sanitizeWithPolicy(input, policy);
}

const DEFAULT_POLICY_VALUE = Object.freeze({});

/** Remove all markup and character references, leaving canonical text. */
export function stripHtml(input, options = DEFAULT_POLICY_VALUE) {
  if (typeof input !== 'string') {
    throw new HtmlCleanError('HTML input must be a string', 'INVALID_INPUT');
  }
  const policy = normalizePolicy({ ...options, allowedTags: [] });
  // Sanitize first so dangerous subtrees are discarded completely. The
  // sanitizer's output has all entities decoded exactly once and text
  // re-escaped canonically. Decode the canonical escapes once after stripping
  // tags so the returned plain text is readable.
  const safe = sanitizeWithPolicy(input, policy);
  return decodeReferences(stripTags(safe));
}

function stripTags(value) {
  let out = '';
  let i = 0;
  while (i < value.length) {
    if (value[i] === '<') {
      const close = value.indexOf('>', i);
      if (close === -1) break;
      i = close + 1;
    } else {
      out += value[i];
      i += 1;
    }
  }
  return out;
}

/** Create a reusable sanitizer bound to a fixed policy. */
export function createSanitizer(policy = DEFAULT_POLICY_VALUE) {
  const normalized = normalizePolicy(policy);
  return Object.freeze({
    sanitize(input) {
      return sanitizeWithPolicy(input, normalized);
    },
    strip(input) {
      if (typeof input !== 'string') {
        throw new HtmlCleanError('HTML input must be a string', 'INVALID_INPUT');
      }
      return decodeReferences(stripTags(sanitizeWithPolicy(input, { ...normalized, allowedTags: new Set() })));
    },
  });
}

export { HtmlCleanError, DROP_CONTENT_ELEMENTS, decodeReferences, escapeCanonical };

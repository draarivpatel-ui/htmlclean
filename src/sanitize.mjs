import { decodeReferences, escapeCanonical } from './entities.mjs';
import { tokenize } from './tokenizer.mjs';
import { HtmlCleanError } from './errors.mjs';

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr',
]);

// Dangerous elements whose inner content must be discarded entirely.
export const DROP_CONTENT_ELEMENTS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'applet', 'base', 'meta',
  'link', 'form', 'input', 'button', 'textarea', 'select', 'svg', 'math',
  'template', 'noscript', 'xmp', 'noembed', 'noframes', 'plaintext',
  'title', 'head', 'frame', 'frameset', 'audio', 'video', 'canvas',
  'picture', 'portal', 'slot', 'marquee',
]);

// Elements that never appear in markup output even when encountered alone.
const ALWAYS_DROP = new Set([
  ...DROP_CONTENT_ELEMENTS, 'html', 'body', 'doctype', 'frame', 'frameset',
  'param', 'map', 'area', 'source', 'track', 'col', 'colgroup',
]);

const URL_ATTRIBUTES = new Set(['href', 'src', 'cite', 'poster', 'action', 'background']);

const DEFAULT_ALLOWED_TAGS = new Set([
  'a', 'abbr', 'article', 'aside', 'b', 'blockquote', 'br', 'caption', 'code',
  'dd', 'del', 'details', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure',
  'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'i', 'ins',
  'li', 'main', 'mark', 'nav', 'ol', 'p', 'pre', 'q', 's', 'section', 'small',
  'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'th',
  'thead', 'tr', 'u', 'ul', 'wbr',
]);

const DEFAULT_ALLOWED_ATTRIBUTES = Object.freeze({
  a: new Set(['href', 'title', 'target', 'rel']),
  q: new Set(['cite']),
  blockquote: new Set(['cite']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
});

const SAFE_TARGETS = new Set(['_blank', '_self', '_parent', '_top']);

const DEFAULT_CLOBBER_NAMES = new Set([
  'location', 'cookie', 'createelement', 'domain', 'defaultview', 'window',
  'document', 'self', 'top', 'parent', 'frames', 'length', 'closed', 'opener',
  'navigator', 'alert', 'eval', 'function', 'globalthis', 'name', 'submit',
  'action', 'attributes', 'children', 'forms', 'images', 'links', 'body',
  'head', 'all', 'basis', 'call', 'caller', 'constructor', 'prototype',
  'tostring', 'valueof', 'focus', 'blur', 'open', 'close', 'write', 'writeln',
]);

const DEFAULTS = Object.freeze({
  allowedTags: DEFAULT_ALLOWED_TAGS,
  allowedAttributes: DEFAULT_ALLOWED_ATTRIBUTES,
  allowedSchemes: new Set(['https:', 'http:', 'mailto:']),
  allowProtocolRelative: false,
  allowRelativeUrls: true,
  allowStyle: false,
  allowId: false,
  allowName: false,
  idPrefix: '',
  clobberBlocklist: DEFAULT_CLOBBER_NAMES,
  maxInputBytes: 512 * 1024,
  maxDepth: 64,
  maxTokens: 100000,
});

const DEFAULT_POLICY = Object.freeze({});

function normalizePolicy(options = {}) {
  if (options === null || typeof options !== 'object') {
    throw new HtmlCleanError('Policy must be an object', 'INVALID_POLICY');
  }
  const merged = { ...DEFAULTS, ...options };
  if (options.allowedTags !== undefined) {
    merged.allowedTags = new Set(normalizeList(options.allowedTags, 'allowedTags'));
  }
  if (options.allowedAttributes !== undefined) {
    if (typeof options.allowedAttributes !== 'object' || options.allowedAttributes === null) {
      throw new HtmlCleanError('allowedAttributes must be an object', 'INVALID_POLICY');
    }
    const map = new Map();
    for (const [tag, names] of Object.entries(options.allowedAttributes)) {
      const key = String(tag).toLowerCase();
      map.set(key, new Set(normalizeList(names, `allowedAttributes.${key}`)));
    }
    merged.allowedAttributes = map;
  } else {
    const map = new Map();
    for (const [tag, names] of Object.entries(DEFAULT_ALLOWED_ATTRIBUTES)) {
      map.set(tag, new Set(names));
    }
    merged.allowedAttributes = map;
  }
  for (const key of ['allowedSchemes', 'clobberBlocklist']) {
    if (options[key] !== undefined) merged[key] = new Set(normalizeList(options[key], key));
  }
  if (typeof merged.idPrefix !== 'string') {
    throw new HtmlCleanError('idPrefix must be a string', 'INVALID_POLICY');
  }
  for (const key of ['maxInputBytes', 'maxDepth', 'maxTokens']) {
    const value = merged[key];
    if (!Number.isInteger(value) || value < 1) {
      throw new HtmlCleanError(`${key} must be a positive integer`, 'INVALID_POLICY');
    }
  }
  return merged;
}

function normalizeList(value, label) {
  if (typeof value === 'string') return [value.toLowerCase()];
  if (!Array.isArray(value) && !(value instanceof Set)) {
    throw new HtmlCleanError(`${label} must be an array or Set`, 'INVALID_POLICY');
  }
  return [...value].map((item) => {
    if (typeof item !== 'string') {
      throw new HtmlCleanError(`${label} entries must be strings`, 'INVALID_POLICY');
    }
    return item.toLowerCase();
  });
}

/** Remove ASCII controls and HTML whitespace from a URL before validation. */
function canonicalizeUrl(raw) {
  const decoded = decodeReferences(raw);
  let out = '';
  for (const ch of decoded) {
    const code = ch.codePointAt(0);
    if (code <= 0x20 || code === 0x7f || (code >= 0x80 && code <= 0x9f)) continue;
    out += ch;
  }
  return out;
}

function isClobbering(name, policy) {
  const lower = name.toLowerCase();
  if (policy.clobberBlocklist.has(lower)) return true;
  // DOM clobbering via dotted paths: name="a.b" or name="a/b".
  if (/[./]/.test(lower)) {
    const first = lower.split(/[./]/)[0];
    if (policy.clobberBlocklist.has(first)) return true;
  }
  return false;
}

function sanitizeUrl(raw, policy) {
  const url = canonicalizeUrl(raw);
  if (url === '' || url === '#') return url;
  // Windows drive-letter forms and backslash smuggling are rejected before
  // every scheme or protocol-relative branch. canonicalizeUrl has already
  // removed C0 controls, so the control test is a defense-in-depth invariant.
  if (/^[A-Za-z]:/.test(url) || url.includes('\\') || /[\u0000-\u001f]/.test(url)) return null;
  if (url.startsWith('//')) {
    if (!policy.allowProtocolRelative || !policy.allowedSchemes.has('https:')) return null;
    return `https:${url}`;
  }
  // Reject any string with a colon before the first slash, question or hash.
  const firstDelimiter = url.search(/[/?#]/);
  const colonIndex = url.indexOf(':');
  if (colonIndex !== -1 && (firstDelimiter === -1 || colonIndex < firstDelimiter)) {
    const scheme = url.slice(0, colonIndex + 1).toLowerCase();
    if (!policy.allowedSchemes.has(scheme)) return null;
    return url;
  }
  if (policy.allowRelativeUrls) return url;
  return null;
}

function canonicalizeAttribute(name, rawValue, tag, policy) {
  if (name.startsWith('on')) return null;
  if (name === 'style' && !policy.allowStyle) return null;
  if (name === 'srcdoc') return null;
  if (name === 'formaction' || name === 'xlink:href') return null;
  if ((name === 'id' || name === 'name') && !policy.allowId && !policy.allowName) return null;
  const allowed = policy.allowedAttributes.get(tag);
  if (!allowed || !allowed.has(name)) {
    if (name === 'id' && policy.allowId) {
      /* handled below */
    } else if (name === 'name' && policy.allowName) {
      /* handled below */
    } else {
      return null;
    }
  }
  const value = rawValue === null ? '' : decodeReferences(rawValue);
  if (name === 'id' || name === 'name') {
    const allow = name === 'id' ? policy.allowId : policy.allowName;
    if (!allow) return null;
    if (isClobbering(value, policy)) return null;
    return [name, `${policy.idPrefix}${value}`.trim()];
  }
  if (URL_ATTRIBUTES.has(name)) {
    const checked = sanitizeUrl(value, policy);
    if (checked === null) return null;
    return [name, checked];
  }
  if (name === 'target') {
    if (!SAFE_TARGETS.has(value.toLowerCase())) return null;
    return [name, value.toLowerCase()];
  }
  if (name === 'rel') {
    const lower = value.toLowerCase();
    if (lower.includes('stylesheet') || lower.includes('import')) return null;
    return [name, lower];
  }
  if (name === 'colspan' || name === 'rowspan') {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1 || number > 1000) return null;
    return [name, String(number)];
  }
  return [name, value];
}

/**
 * Sanitize HTML under a normalized policy. Returns a canonical, idempotent
 * string with every text and attribute value fully escaped.
 */
export function sanitizeWithPolicy(input, policy) {
  if (typeof input !== 'string') {
    throw new HtmlCleanError('HTML input must be a string', 'INVALID_INPUT');
  }
  // Edge runtimes such as Cloudflare Workers and Deno have no global Buffer.
  // The identifier must be probed with typeof, or accessing Buffer.byteLength
  // throws before the TextEncoder fallback can run.
  const bytes = typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function'
    ? Buffer.byteLength(input, 'utf8')
    : new TextEncoder().encode(input).length;
  if (bytes > policy.maxInputBytes) {
    throw new HtmlCleanError(`Input exceeds maxInputBytes (${policy.maxInputBytes})`, 'INPUT_TOO_LARGE');
  }

  const tokens = tokenize(input, policy.maxTokens);

  // Precompute which void drop-content tags have an explicit closing tag.
  // Such a pair encloses content that must be discarded.
  const voidCloseCount = new Map();
  for (const token of tokens) {
    if (token.type === 'end' && VOID_ELEMENTS.has(token.name) &&
        DROP_CONTENT_ELEMENTS.has(token.name)) {
      voidCloseCount.set(token.name, (voidCloseCount.get(token.name) || 0) + 1);
    }
  }
  const voidDropRemaining = new Map(voidCloseCount);

  let out = '';
  let depth = 0;
  let dropDepth = 0;
  const openTags = [];

  function emitText(value) {
    if (dropDepth > 0) return;
    out += escapeCanonical(decodeReferences(value));
  }

  for (const token of tokens) {
    if (token.type === 'text' || token.type === 'cdata') {
      emitText(token.value);
      continue;
    }
    if (token.type === 'comment' || token.type === 'doctype') continue;

    if (token.type === 'end') {
      const name = token.name;
      if (dropDepth > 0) {
        if (DROP_CONTENT_ELEMENTS.has(name)) dropDepth = Math.max(0, dropDepth - 1);
        continue;
      }
      if (VOID_ELEMENTS.has(name)) continue;
      const last = openTags[openTags.length - 1];
      if (last === name) {
        out += `</${name}>`;
        openTags.pop();
        depth -= 1;
      }
      continue;
    }

    // Start tag.
    const name = token.name;
    if (!name || ALWAYS_DROP.has(name) || !policy.allowedTags.has(name)) {
      // Void elements cannot contain content in real HTML. However, if an
      // explicit closing tag follows, treat the intervening text as content
      // and discard it too. Otherwise just drop the tag so following markup
      // survives (e.g. <base href=x><p>text</p>).
      if (DROP_CONTENT_ELEMENTS.has(name) && !token.selfClosing) {
        if (!VOID_ELEMENTS.has(name)) {
          dropDepth += 1;
        } else if ((voidDropRemaining.get(name) || 0) > 0) {
          voidDropRemaining.set(name, voidDropRemaining.get(name) - 1);
          dropDepth += 1;
        }
      }
      continue;
    }
    if (dropDepth > 0) continue;

    const attributes = [];
    const seen = new Set();
    for (const attr of token.attributes) {
      const canonical = canonicalizeAttribute(attr.name, attr.value, name, policy);
      if (!canonical) continue;
      const [key, value] = canonical;
      if (seen.has(key)) continue;
      seen.add(key);
      attributes.push([key, value]);
    }
    // Enforce noreferrer/noopener for every target=_blank link.
    if (name === 'a' && seen.has('target') && attributes.some(([k, v]) => k === 'target' && v === '_blank')) {
      const relIndex = attributes.findIndex(([k]) => k === 'rel');
      const prior = relIndex === -1 ? '' : attributes[relIndex][1];
      const parts = new Set(prior.split(/\s+/).filter(Boolean));
      parts.add('noopener');
      parts.add('noreferrer');
      const rel = [...parts].join(' ');
      if (relIndex === -1) attributes.push(['rel', rel]);
      else attributes[relIndex] = ['rel', rel];
    }

    // rel must precede target and href in canonical order, so sort by name
    // with a small fixed priority so target=_blank links stay idempotent.
    const PRIORITY = { href: 0, rel: 1, src: 0, cite: 0, poster: 0, target: 2 };
    attributes.sort((a, b) => {
      const pa = PRIORITY[a[0]] ?? 3;
      const pb = PRIORITY[b[0]] ?? 3;
      if (pa !== pb) return pa - pb;
      return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
    });

    let fragment = `<${name}`;
    for (const [key, value] of attributes) {
      fragment += ` ${key}="${escapeCanonical(value)}"`;
    }
    fragment += '>';
    out += fragment;

    // HTML has no self-closing syntax for non-void elements: every browser
    // treats <div/> as an opening div, so the emitted start tag must be
    // tracked and closed. Otherwise the output is unbalanced and re-parses
    // differently, breaking the idempotency guarantee.
    if (!VOID_ELEMENTS.has(name)) {
      if (depth >= policy.maxDepth) {
        throw new HtmlCleanError(`Input exceeds maxDepth (${policy.maxDepth})`, 'MAX_DEPTH_EXCEEDED');
      }
      depth += 1;
      openTags.push(name);
    }
  }

  // Close still-open elements to produce a complete, canonical tree.
  while (openTags.length > 0) {
    out += `</${openTags.pop()}>`;
  }
  return out;
}

export { normalizePolicy, DEFAULTS };

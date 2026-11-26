// A small, explicit state-machine HTML tokenizer. It never uses regular
// expressions to strip markup: it emits tokens from a character stream and
// hands them to the sanitizer, which decides what may be serialized.

export const RAW_TEXT_ELEMENTS = new Set([
  'script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed',
  'noframes', 'noscript', 'plaintext',
]);

const SELF_CLOSING_HINT = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr',
]);

function isWhitespace(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f';
}

function isNameStart(ch) {
  return ch !== undefined && /[A-Za-z]/.test(ch);
}

function isNameChar(ch) {
  return ch !== undefined && /[A-Za-z0-9:_\-.]/.test(ch);
}

/**
 * Tokenize HTML into a flat token array. Each token is one of:
 *   { type: 'text', value }
 *   { type: 'start', name, attributes, selfClosing, raw }
 *   { type: 'end', name, raw }
 *   { type: 'comment', value }
 *   { type: 'doctype', value }
 *   { type: 'cdata', value }
 * Names and attribute names are lowercased. Attribute values are raw source
 * text (entity decoding happens in the sanitizer).
 */
export function tokenize(input, maxTokens = 100000) {
  const tokens = [];
  let i = 0;
  const n = input.length;
  let rawTextTag = null;

  function push(token) {
    tokens.push(token);
    if (tokens.length > maxTokens) {
      throw new Error('HTMCLEAN_TOKEN_LIMIT');
    }
  }

  function readUntil(terminator, caseInsensitive = false) {
    let out = '';
    while (i < n) {
      const ch = input[i];
      if (caseInsensitive
          ? input.slice(i, i + terminator.length).toLowerCase() === terminator
          : input.startsWith(terminator, i)) {
        return out;
      }
      out += ch;
      i += 1;
    }
    return out;
  }

  function readName() {
    let name = '';
    while (i < n && isNameChar(input[i])) {
      name += input[i];
      i += 1;
    }
    return name.toLowerCase();
  }

  function skipWhitespace() {
    while (i < n && isWhitespace(input[i])) i += 1;
  }

  function readAttributes() {
    const attributes = [];
    let selfClosing = false;
    while (i < n) {
      skipWhitespace();
      if (i >= n) break;
      if (input[i] === '>') {
        i += 1;
        break;
      }
      if (input[i] === '/' && input[i + 1] === '>') {
        i += 2;
        selfClosing = true;
        break;
      }
      // A quote or equals at the start of an attribute position is junk;
      // consume one character so malformed markup cannot wedge the parser.
      if (input[i] === '"' || input[i] === "'" || input[i] === '=') {
        i += 1;
        continue;
      }
      if (!isNameStart(input[i])) {
        // Names may begin with underscore or digit in real-world HTML.
        if (!isNameChar(input[i])) {
          i += 1;
          continue;
        }
      }
      const name = readName();
      if (!name) {
        i += 1;
        continue;
      }
      skipWhitespace();
      let value = null;
      if (input[i] === '=') {
        i += 1;
        skipWhitespace();
        const quote = input[i];
        if (quote === '"' || quote === "'") {
          i += 1;
          const end = input.indexOf(quote, i);
          if (end === -1) {
            value = input.slice(i);
            i = n;
          } else {
            value = input.slice(i, end);
            i = end + 1;
          }
        } else {
          let raw = '';
          while (i < n && !isWhitespace(input[i]) && input[i] !== '>') {
            if (input[i] === '/' && input[i + 1] === '>') break;
            raw += input[i];
            i += 1;
          }
          value = raw;
        }
      }
      attributes.push({ name, value });
    }
    return { attributes, selfClosing };
  }

  while (i < n) {
    if (rawTextTag !== null) {
      // Raw text ends only at the matching end tag; nested "<tag>" sequences
      // are data. This is how a browser parses script/style/textarea bodies.
      const endTag = `</${rawTextTag}`;
      const found = input.toLowerCase().indexOf(endTag, i);
      if (found === -1) {
        push({ type: 'text', value: input.slice(i) });
        i = n;
      } else {
        push({ type: 'text', value: input.slice(i, found) });
        i = found;
        const closeIndex = input.indexOf('>', i);
        if (closeIndex === -1) {
          push({ type: 'text', value: input.slice(i) });
          i = n;
        } else {
          push({ type: 'end', name: rawTextTag, raw: input.slice(i, closeIndex + 1) });
          i = closeIndex + 1;
        }
        rawTextTag = null;
      }
      continue;
    }

    const lt = input.indexOf('<', i);
    if (lt === -1) {
      push({ type: 'text', value: input.slice(i) });
      break;
    }
    if (lt > i) push({ type: 'text', value: input.slice(i, lt) });
    i = lt;

    if (input.startsWith('<!--', i)) {
      i += 4;
      const value = readUntil('-->');
      if (i < n) i += 3;
      push({ type: 'comment', value });
      continue;
    }
    if (input.startsWith('<![CDATA[', i)) {
      i += 9;
      const value = readUntil(']]>');
      if (i < n) i += 3;
      push({ type: 'cdata', value });
      continue;
    }
    if (input.slice(i, i + 9).toLowerCase() === '<!doctype') {
      const start = i;
      // Skip a doctype internal subset (if present) before finding the end.
      let close = -1;
      let scan = i;
      let bracket = -1;
      while (scan < n) {
        const c = input[scan];
        if (c === '[' && bracket === -1) bracket = scan;
        else if (c === ']' && bracket !== -1) bracket = -1;
        else if (c === '>' && bracket === -1) { close = scan; break; }
        scan += 1;
      }
      if (close === -1) {
        push({ type: 'text', value: input.slice(i) });
        break;
      }
      i = close + 1;
      push({ type: 'doctype', value: input.slice(start, i) });
      continue;
    }
    if (input.startsWith('</', i)) {
      const start = i;
      i += 2;
      if (input[i] === '>') {
        i += 1;
        push({ type: 'end', name: '', raw: input.slice(start, i) });
        continue;
      }
      const name = readName();
      const close = input.indexOf('>', i);
      if (close === -1) {
        push({ type: 'text', value: input.slice(start) });
        break;
      }
      i = close + 1;
      push({ type: 'end', name, raw: input.slice(start, i) });
      continue;
    }
    if (input.startsWith('<?', i)) {
      const close = input.indexOf('>', i);
      if (close === -1) {
        push({ type: 'text', value: input.slice(i) });
        break;
      }
      i = close + 1;
      push({ type: 'comment', value: input.slice(2, close - i + close) });
      continue;
    }
    if (isNameStart(input[i + 1])) {
      const start = i;
      i += 1;
      const name = readName();
      const { attributes, selfClosing } = readAttributes();
      const raw = input.slice(start, i);
      push({ type: 'start', name, attributes, selfClosing, raw });
      if (!selfClosing && !SELF_CLOSING_HINT.has(name) && RAW_TEXT_ELEMENTS.has(name)) {
        rawTextTag = name;
      }
      continue;
    }
    // A lone '<' or malformed '<!' / '</' is literal text.
    push({ type: 'text', value: '<' });
    i += 1;
  }

  return tokens;
}

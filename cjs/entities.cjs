// Character-reference decoding. This is a self-contained HTML5-style decoder:
// named references (longest match, with or without a legacy semicolon), numeric
// decimal and hexadecimal references, and the missing-semicolon legacy form.

const NAMED = Object.freeze({
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  AMP: '&', LT: '<', GT: '>', QUOT: '"',_tab: '\t',
  Tab: '\t', NewLine: '\n', exclam: '!', excl: '!', num: '#', dollar: '$',
  percnt: '%', amp: '&', AMP: '&', apos: "'", lpar: '(', rpar: ')',
  ast: '*', midast: '*', plus: '+', comma: ',', period: '.', sol: '/',
  colon: ':', semi: ';', equals: '=', lt: '<', LT: '<', gt: '>', GT: '>',
  question: '?', commat: '@', lbrack: '[', lsqb: '[', bsol: '\\',
  rbrack: ']', rsqb: ']', caret: '^', lowbar: '_', grave: '`',
  lbrace: '{', lcub: '{', verbar: '|', vert: '|', rbrace: '}', rcub: '}',
  tilde: '~', iexcl: '¡', cent: '¢', pound: '£',
  curren: '¤', yen: '¥', brvbar: '¦', sect: '§',
  uml: '¨', diaer: '¨', copy: '©', ordf: 'ª',
  laquo: '«', not: '¬', shy: '­', reg: '®',
  macr: '¯', deg: '°', plusmn: '±', sup2: '²',
  sup3: '³', acute: '´', micro: 'µ', para: '¶',
  middot: '·', cedil: '¸', sup1: '¹', ordm: 'º',
  raquo: '»', frac14: '¼', frac12: '½', frac34: '¾',
  iquest: '¿', Agrave: 'À', Aacute: 'Á', Acirc: 'Â',
  Atilde: 'Ã', Auml: 'Ä', Aring: 'Å', AElig: 'Æ',
  Ccedil: 'Ç', Egrave: 'È', Eacute: 'É', Ecirc: 'Ê',
  Euml: 'Ë', Igrave: 'Ì', Iacute: 'Í', Icirc: 'Î',
  Iuml: 'Ï', ETH: 'Ð', Ntilde: 'Ñ', Ograve: 'Ò',
  Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ', Ouml: 'Ö',
  times: '×', Oslash: 'Ø', Ugrave: 'Ù', Uacute: 'Ú',
  Ucirc: 'Û', Uuml: 'Ü', Yacute: 'Ý', THORN: 'Þ',
  szlig: 'ß', agrave: 'à', aacute: 'á', acirc: 'â',
  atilde: 'ã', auml: 'ä', aring: 'å', aelig: 'æ',
  ccedil: 'ç', egrave: 'è', eacute: 'é', ecirc: 'ê',
  euml: 'ë', igrave: 'ì', iacute: 'í', icirc: 'î',
  iuml: 'ï', eth: 'ð', ntilde: 'ñ', ograve: 'ò',
  oacute: 'ó', ocirc: 'ô', otilde: 'õ', ouml: 'ö',
  divide: '÷', oslash: 'ø', ugrave: 'ù', uacute: 'ú',
  ucirc: 'û', uuml: 'ü', yacute: 'ý', thorn: 'þ',
  yuml: 'ÿ', OElig: 'Œ', oelig: 'œ', Scaron: 'Š',
  scaron: 'š', Yuml: 'Ÿ', fnof: 'ƒ', circ: 'ˆ',
  tilde: '˜', Alpha: 'Α', Beta: 'Β', Gamma: 'Γ',
  Delta: 'Δ', Epsilon: 'Ε', Zeta: 'Ζ', Eta: 'Η',
  Theta: 'Θ', Iota: 'Ι', Kappa: 'Κ', Lambda: 'Λ',
  Mu: 'Μ', Nu: 'Ν', Xi: 'Ξ', Omicron: 'Ο',
  Pi: 'Π', Rho: 'Ρ', Sigma: 'Σ', Tau: 'Τ',
  Upsilon: 'Υ', Phi: 'Φ', Chi: 'Χ', Psi: 'Ψ',
  Omega: 'Ω', alpha: 'α', beta: 'β', gamma: 'γ',
  delta: 'δ', epsilon: 'ε', zeta: 'ζ', eta: 'η',
  theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ',
  mu: 'μ', nu: 'ν', xi: 'ξ', omicron: 'ο',
  pi: 'π', rho: 'ρ', sigmaf: 'ς', sigma: 'σ',
  tau: 'τ', upsilon: 'υ', phi: 'φ', chi: 'χ',
  psi: 'ψ', omega: 'ω', thetasym: 'ϑ', upsih: 'ϒ',
  piv: 'ϖ', ensp: ' ', emsp: ' ', thinsp: ' ',
  zwnj: '‌', zwj: '‍', lrm: '‎', rlm: '‏',
  ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', bull: '•', hellip: '…',
  prime: '′', Prime: '″', oline: '‾', frasl: '⁄',
  weierp: '℘', image: 'ℑ', real: 'ℜ', trade: '™',
  alefsym: 'ℵ', larr: '←', uarr: '↑', rarr: '→',
  darr: '↓', harr: '↔', crarr: '↵', lArr: '⇐',
  uArr: '⇑', rArr: '⇒', dArr: '⇓', hArr: '⇔',
  forall: '∀', part: '∂', exist: '∃', empty: '∅',
  nabla: '∇', isin: '∈', notin: '∉', ni: '∋',
  prod: '∏', sum: '∑', minus: '−', lowast: '∗',
  radic: '√', prop: '∝', infin: '∞', ang: '∠',
  and: '∧', or: '∨', cap: '∩', cup: '∪', int: '∫',
  there4: '∴', sim: '∼', cong: '≅', asymp: '≈',
  ne: '≠', equiv: '≡', le: '≤', ge: '≥', sub: '⊂',
  sup: '⊃', nsub: '⊄', sube: '⊆', supe: '⊇',
  oplus: '⊕', otimes: '⊗', perp: '⊥', sdot: '⋅',
  lceil: '⌈', rceil: '⌉', lfloor: '⌊', rfloor: '⌋',
  lang: '〈', rang: '〉', loz: '◊', spades: '♠',
  clubs: '♣', hearts: '♥', diams: '♦', apos: "'",
});

// HTML legacy named references that are allowed without a trailing semicolon.
const NO_SEMI = new Set([
  'amp', 'lt', 'gt', 'quot', 'nbsp', 'copy', 'reg', 'cent', 'pound', 'yen',
  'sect', 'uml', 'ordf', 'laquo', 'not', 'shy', 'macr', 'deg', 'plusmn',
  'sup2', 'sup3', 'acute', 'micro', 'para', 'middot', 'cedil', 'sup1',
  'ordm', 'raquo', 'frac14', 'frac12', 'frac34', 'iquest', 'times',
  'divide', 'AElig', 'Agrave', 'Aacute', 'Acirc', 'Atilde', 'Auml', 'Aring',
  'Ccedil', 'Egrave', 'Eacute', 'Ecirc', 'Euml', 'Igrave', 'Iacute',
  'Icirc', 'Iuml', 'ETH', 'Ntilde', 'Ograve', 'Oacute', 'Ocirc', 'Otilde',
  'Ouml', 'Oslash', 'Ugrave', 'Uacute', 'Ucirc', 'Uuml', 'Yacute', 'THORN',
  'szlig', 'aelig', 'agrave', 'aacute', 'acirc', 'atilde', 'auml', 'aring',
  'ccedil', 'egrave', 'eacute', 'ecirc', 'euml', 'igrave', 'iacute',
  'icirc', 'iuml', 'eth', 'ntilde', 'ograve', 'oacute', 'ocirc', 'otilde',
  'ouml', 'oslash', 'ugrave', 'uacute', 'ucirc', 'uuml', 'yacute', 'thorn',
  'yuml', 'AMP', 'LT', 'GT', 'QUOT', 'nbsp',
]);

const MAX_REF_LENGTH = 32;

function numericValue(codePoint) {
  if (codePoint === 0 || codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
    return '�';
  }
  if (codePoint < 0x20 || (codePoint >= 0x7f && codePoint <= 0x9f)) {
    // HTML5 maps a few of these to typographic characters; replacement is
    // stricter and never affects allowlisted markup.
    if (codePoint === 0x0a || codePoint === 0x09 || codePoint === 0x0c) {
      return String.fromCodePoint(codePoint);
    }
    return '�';
  }
  return String.fromCodePoint(codePoint);
}

/** Decode character references in one HTML-compatible pass. */
function decodeReferences(value) {
  if (typeof value !== 'string' || value.indexOf('&') === -1) return value;
  let out = '';
  let i = 0;
  const length = value.length;
  while (i < length) {
    const ch = value[i];
    if (ch !== '&') {
      out += ch;
      i += 1;
      continue;
    }
    if (value[i + 1] === '#') {
      let cursor = i + 2;
      let hex = false;
      if (value[cursor] === 'x' || value[cursor] === 'X') {
        hex = true;
        cursor += 1;
      }
      const start = cursor;
      while (cursor < length && cursor - start < MAX_REF_LENGTH) {
        const c = value[cursor];
        if (hex ? /[0-9a-fA-F]/.test(c) : c >= '0' && c <= '9') cursor += 1;
        else break;
      }
      if (cursor === start) {
        out += '&';
        i += 1;
        continue;
      }
      const raw = value.slice(start, cursor);
      const parsed = hex ? parseInt(raw, 16) : parseInt(raw, 10);
      let consumed = cursor;
      if (value[consumed] === ';') consumed += 1;
      out += numericValue(parsed);
      i = consumed;
      continue;
    }
    // Named reference: greedily try the longest candidate, preferring the
    // semicolon form as HTML does.
    let cursor = i + 1;
    while (cursor < length && cursor - i - 1 < MAX_REF_LENGTH &&
           /[A-Za-z0-9]/.test(value[cursor])) {
      cursor += 1;
    }
    let matched = false;
    for (let end = cursor; end > i + 1; end -= 1) {
      const candidate = value.slice(i + 1, end);
      if (value[end] === ';' && Object.prototype.hasOwnProperty.call(NAMED, candidate)) {
        out += NAMED[candidate];
        i = end + 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      for (let end = cursor; end > i + 1; end -= 1) {
        const candidate = value.slice(i + 1, end);
        if (NO_SEMI.has(candidate) && Object.prototype.hasOwnProperty.call(NAMED, candidate)) {
          out += NAMED[candidate];
          i = end;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      out += '&';
      i += 1;
    }
  }
  return out;
}

/** Escape every character that can change markup context. */
function escapeCanonical(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

exports.decodeReferences = decodeReferences;
exports.escapeCanonical = escapeCanonical;

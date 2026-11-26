/** Error thrown for invalid input, invalid policies, and resource-limit breaches. */
export declare class HtmlCleanError extends Error {
  readonly name: 'HtmlCleanError';
  readonly code: 'INVALID_INPUT' | 'INVALID_POLICY' | 'INPUT_TOO_LARGE' | 'MAX_DEPTH_EXCEEDED';
  constructor(message: string, code?: string);
}

/** A sanitizer bound to a fixed policy. */
export interface BoundSanitizer {
  sanitize(input: string): string;
  strip(input: string): string;
}

/** Sanitization policy. All fields are optional; omitted fields use safe defaults. */
export interface SanitizePolicy {
  /** Tag names to permit. Everything else is dropped, with dangerous subtrees removed completely. */
  allowedTags?: ReadonlyArray<string> | ReadonlySet<string>;
  /** Per-tag attribute allowlist. Attributes not listed for a tag are rejected. */
  allowedAttributes?: Readonly<Record<string, ReadonlyArray<string> | ReadonlySet<string>>>;
  /** URL schemes accepted by href/src/cite/poster. Defaults to https, http, mailto. */
  allowedSchemes?: ReadonlyArray<string> | ReadonlySet<string>;
  /** Permit protocol-relative URLs such as //example.com. Default false. */
  allowProtocolRelative?: boolean;
  /** Permit relative URLs and fragments. Default true. */
  allowRelativeUrls?: boolean;
  /** Permit the style attribute. Default false. */
  allowStyle?: boolean;
  /** Permit id attributes. Default false. */
  allowId?: boolean;
  /** Permit name attributes. Default false. */
  allowName?: boolean;
  /** Prefix applied to every emitted id/name value. Default empty. */
  idPrefix?: string;
  /** id/name values that are rejected to prevent DOM clobbering. */
  clobberBlocklist?: ReadonlyArray<string> | ReadonlySet<string>;
  /** Maximum UTF-8 input size in bytes. Default 524288. */
  maxInputBytes?: number;
  /** Maximum element nesting depth. Default 64. */
  maxDepth?: number;
  /** Maximum tokenizer output tokens. Default 100000. */
  maxTokens?: number;
}

/** Sanitize an HTML string into canonical, idempotent, escaped HTML. */
export declare function sanitizeHtml(input: string, options?: SanitizePolicy): string;
/** Remove all markup and dangerous subtrees; return escaped text content. */
export declare function stripHtml(input: string, options?: SanitizePolicy): string;
/** Create a reusable sanitizer bound to a fixed policy. */
export declare function createSanitizer(policy?: SanitizePolicy): BoundSanitizer;

/** Conservative preset: a small set of inline formatting tags and links. */
export declare const STRICT_POLICY: Readonly<SanitizePolicy>;
/** Article//blog preset: headings, lists, tables and common prose markup. */
export declare const PROSE_POLICY: Readonly<SanitizePolicy>;

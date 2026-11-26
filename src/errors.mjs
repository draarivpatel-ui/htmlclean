/** Typed error for policy violations and resource limits. */
export class HtmlCleanError extends Error {
  constructor(message, code = 'INVALID_INPUT') {
    super(message);
    this.name = 'HtmlCleanError';
    this.code = code;
  }
}

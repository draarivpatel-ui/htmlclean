/** Typed error for policy violations and resource limits. */
class HtmlCleanError extends Error {
  constructor(message, code = 'INVALID_INPUT') {
    super(message);
    this.name = 'HtmlCleanError';
    this.code = code;
  }
}

exports.HtmlCleanError = HtmlCleanError;

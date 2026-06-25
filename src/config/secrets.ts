/**
 * Secret hygiene helpers.
 *
 * The server holds spendable key material (mnemonic / private key) and an
 * Alchemy API key. None of these may ever appear in logs, tool outputs, or
 * error messages. `registerSecret` records a secret value, and `sanitize`
 * redacts any registered secret from arbitrary strings/errors before they are
 * surfaced.
 */

const secrets = new Set<string>();

/** Record a secret so it can be redacted from any later output. */
export function registerSecret(value: string | undefined | null): void {
  if (value && value.trim().length > 0) {
    secrets.add(value.trim());
    // Also redact individual mnemonic words is intentionally NOT done — that
    // would over-redact common words. We redact the full phrase only.
  }
}

/** Replace any registered secret occurrence in a string with [REDACTED]. */
export function redact(text: string): string {
  let out = text;
  for (const secret of secrets) {
    if (secret && out.includes(secret)) {
      out = out.split(secret).join("[REDACTED]");
    }
  }
  return out;
}

/**
 * Sanitize an unknown thrown value into a safe message string with all
 * registered secrets redacted.
 */
export function sanitizeError(err: unknown): string {
  let message: string;
  if (err instanceof Error) {
    message = err.message;
  } else if (typeof err === "string") {
    message = err;
  } else {
    try {
      message = JSON.stringify(err);
    } catch {
      message = String(err);
    }
  }
  return redact(message);
}

/** For tests: clear the registered secret set. */
export function _resetSecrets(): void {
  secrets.clear();
}

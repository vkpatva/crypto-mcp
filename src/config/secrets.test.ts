import { describe, it, expect, beforeEach } from "vitest";
import { registerSecret, redact, sanitizeError, _resetSecrets } from "./secrets.js";

beforeEach(() => _resetSecrets());

describe("secret hygiene", () => {
  it("redacts registered secrets from strings", () => {
    registerSecret("super-secret-key");
    expect(redact("the key is super-secret-key here")).toBe(
      "the key is [REDACTED] here",
    );
  });

  it("redacts secrets from error messages", () => {
    registerSecret("0xdeadbeefprivatekey");
    const err = new Error("failed to use 0xdeadbeefprivatekey for signing");
    expect(sanitizeError(err)).toBe("failed to use [REDACTED] for signing");
  });

  it("ignores empty/whitespace secrets", () => {
    registerSecret("");
    registerSecret("   ");
    expect(redact("nothing to redact")).toBe("nothing to redact");
  });

  it("handles non-Error thrown values", () => {
    expect(sanitizeError("plain string error")).toBe("plain string error");
    expect(sanitizeError({ code: 42 })).toContain("42");
  });
});

/** Patterns / tokens rejected in patch string values (TRD §11.2). */
const UNSAFE_VALUE_RE =
  /javascript\s*:|data\s*:\s*text\/html|expression\s*\(|-moz-binding|@import|<\/?script|on[a-z]+\s*=/i;

const SAFE_CLASS_RE = /^[A-Za-z_][\w-]*$/;
const SAFE_CSS_PROP_RE = /^-{0,2}[A-Za-z_]+[\w-]*$/;
const SAFE_MONET_ID_RE = /^[A-Za-z][\w-]*$/;

export function isSafeMonetId(id: string): boolean {
  return SAFE_MONET_ID_RE.test(id);
}

export function isSafeClassName(name: string): boolean {
  return SAFE_CLASS_RE.test(name);
}

export function isSafeCssPropertyName(name: string): boolean {
  return SAFE_CSS_PROP_RE.test(name);
}

export function isSafePatchString(value: string): boolean {
  if (value.length > 4000) return false;
  if (UNSAFE_VALUE_RE.test(value)) return false;
  if (value.includes("\0")) return false;
  return true;
}

export function assertSafePatchString(
  value: string,
  label: string,
): void {
  if (!isSafePatchString(value)) {
    throw new ApplySafetyError(`Unsafe ${label}`);
  }
}

export function coercePatchString(
  raw: unknown,
  label: string,
): string {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }
  if (typeof raw !== "string") {
    throw new ApplySafetyError(`${label} must be a string or number`);
  }
  assertSafePatchString(raw, label);
  return raw;
}

export class ApplySafetyError extends Error {
  readonly code = "unsafe-patch" as const;

  constructor(message: string) {
    super(message);
    this.name = "ApplySafetyError";
  }
}

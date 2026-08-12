import type { SuggestionPayload } from "@/lib/schemas";
import {
  ApplySafetyError,
  coercePatchString,
  isSafeClassName,
  isSafeCssPropertyName,
} from "./safety";

type KindApplyResult = {
  inversePatch: Record<string, unknown>;
};

function asHTMLElement(el: Element): HTMLElement {
  if (!("style" in el)) {
    throw new ApplySafetyError("Target is not an HTMLElement");
  }
  return el as HTMLElement;
}

function toKebab(prop: string): string {
  if (prop.startsWith("--")) return prop;
  return prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function setInlineStyle(
  el: HTMLElement,
  prop: string,
  value: string,
): string {
  const kebab = toKebab(prop);
  const previous = el.style.getPropertyValue(kebab);
  if (value === "") {
    el.style.removeProperty(kebab);
  } else {
    el.style.setProperty(kebab, value);
  }
  return previous;
}

/** `style-patch` — camelCase or kebab CSS props on the target element. */
export function applyStylePatch(
  element: Element,
  patch: Record<string, unknown>,
): KindApplyResult {
  const el = asHTMLElement(element);
  const inversePatch: Record<string, unknown> = {};
  const entries = Object.entries(patch);
  if (entries.length === 0) {
    throw new ApplySafetyError("style-patch requires at least one property");
  }

  for (const [key, raw] of entries) {
    if (!isSafeCssPropertyName(key)) {
      throw new ApplySafetyError(`Unsafe style property: ${key}`);
    }
    const value = coercePatchString(raw, `style.${key}`);
    inversePatch[key] = setInlineStyle(el, key, value);
  }

  return { inversePatch };
}

type ClassTogglePatch = {
  add?: string[];
  remove?: string[];
  toggle?: string[];
};

function readStringList(
  raw: unknown,
  label: string,
): string[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new ApplySafetyError(`${label} must be an array of class names`);
  }
  return raw.map((item, i) => {
    const name = coercePatchString(item, `${label}[${i}]`);
    if (!isSafeClassName(name)) {
      throw new ApplySafetyError(`Unsafe class name: ${name}`);
    }
    return name;
  });
}

function parseClassTogglePatch(
  patch: Record<string, unknown>,
): ClassTogglePatch {
  const known = new Set(["add", "remove", "toggle"]);
  for (const key of Object.keys(patch)) {
    if (!known.has(key)) {
      throw new ApplySafetyError(
        `class-toggle patch only allows add/remove/toggle (got "${key}")`,
      );
    }
  }
  const add = readStringList(patch.add, "add");
  const remove = readStringList(patch.remove, "remove");
  const toggle = readStringList(patch.toggle, "toggle");
  if (add.length + remove.length + toggle.length === 0) {
    throw new ApplySafetyError(
      "class-toggle requires add, remove, and/or toggle class lists",
    );
  }
  return { add, remove, toggle };
}

/** `class-toggle` — add / remove / toggle class tokens on the target. */
export function applyClassToggle(
  element: Element,
  patch: Record<string, unknown>,
): KindApplyResult {
  const el = asHTMLElement(element);
  const { add = [], remove = [], toggle = [] } = parseClassTogglePatch(patch);

  const inverseAdd: string[] = [];
  const inverseRemove: string[] = [];

  for (const name of remove) {
    if (el.classList.contains(name)) {
      el.classList.remove(name);
      inverseAdd.push(name);
    }
  }

  for (const name of add) {
    if (!el.classList.contains(name)) {
      el.classList.add(name);
      inverseRemove.push(name);
    }
  }

  for (const name of toggle) {
    if (el.classList.contains(name)) {
      el.classList.remove(name);
      inverseAdd.push(name);
    } else {
      el.classList.add(name);
      inverseRemove.push(name);
    }
  }

  const inversePatch: Record<string, unknown> = {};
  if (inverseAdd.length) inversePatch.add = inverseAdd;
  if (inverseRemove.length) inversePatch.remove = inverseRemove;
  return { inversePatch };
}

function normalizeCssVarName(key: string): string {
  if (!isSafeCssPropertyName(key)) {
    throw new ApplySafetyError(`Unsafe CSS variable name: ${key}`);
  }
  return key.startsWith("--") ? key : `--${key}`;
}

/** `css-var` — set custom properties on the preview root (TRD §11.1). */
export function applyCssVar(
  previewRoot: Element,
  patch: Record<string, unknown>,
): KindApplyResult {
  const el = asHTMLElement(previewRoot);
  const inversePatch: Record<string, unknown> = {};
  const entries = Object.entries(patch);
  if (entries.length === 0) {
    throw new ApplySafetyError("css-var requires at least one variable");
  }

  for (const [key, raw] of entries) {
    const name = normalizeCssVarName(key);
    const value = coercePatchString(raw, `css-var.${name}`);
    inversePatch[name] = setInlineStyle(el, name, value);
  }

  return { inversePatch };
}

const TEXT_UNSAFE_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "LINK",
  "META",
  "BASE",
]);

function readTextReplaceValue(patch: Record<string, unknown>): string {
  const raw =
    patch.text !== undefined
      ? patch.text
      : patch.textContent !== undefined
        ? patch.textContent
        : undefined;
  if (raw === undefined) {
    throw new ApplySafetyError(
      'text-replace requires patch.text (or patch.textContent)',
    );
  }
  const extraKeys = Object.keys(patch).filter(
    (k) => k !== "text" && k !== "textContent",
  );
  if (extraKeys.length > 0) {
    throw new ApplySafetyError(
      `text-replace only allows text/textContent (got ${extraKeys.join(", ")})`,
    );
  }
  return coercePatchString(raw, "text");
}

/** `text-replace` — set textContent on safe targets (never HTML). */
export function applyTextReplace(
  element: Element,
  patch: Record<string, unknown>,
): KindApplyResult {
  const tag = element.tagName.toUpperCase();
  if (TEXT_UNSAFE_TAGS.has(tag)) {
    throw new ApplySafetyError(
      `text-replace blocked on <${tag.toLowerCase()}>`,
    );
  }
  const next = readTextReplaceValue(patch);
  const previous = element.textContent ?? "";
  element.textContent = next;
  return { inversePatch: { text: previous } };
}

export function buildInverseSuggestion(
  suggestion: SuggestionPayload,
  inversePatch: Record<string, unknown>,
): SuggestionPayload {
  return {
    kind: suggestion.kind,
    targetHint: suggestion.targetHint,
    patch: inversePatch,
    previewLabel: `Undo: ${suggestion.previewLabel}`,
  };
}

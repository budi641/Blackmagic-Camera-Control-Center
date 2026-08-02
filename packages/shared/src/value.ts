/** Defensive coercion helpers for camera payloads whose shape may vary by device. */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Read a boolean-ish enabled flag from payloads shaped {enabled} or a raw boolean. */
export function readEnabled(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (isRecord(value)) return asBoolean(value.enabled) ?? asBoolean(value.on) ?? asBoolean(value.active);
  return undefined;
}

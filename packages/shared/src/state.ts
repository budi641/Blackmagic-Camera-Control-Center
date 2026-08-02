/** Flat per-camera state keyed by API path (e.g. "/video/iso"). */

export interface StateChange {
  path: string;
  /** undefined removes the key. */
  value: unknown;
}

export type CameraStateMap = Record<string, unknown>;

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (typeof a === "object") {
    const aKeys = Object.keys(a as object);
    const bKeys = Object.keys(b as object);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) =>
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
    );
  }
  return false;
}

export function applyStateChanges(
  state: CameraStateMap,
  changes: StateChange[],
): { next: CameraStateMap; applied: StateChange[] } {
  const applied: StateChange[] = [];
  const next = { ...state };
  for (const change of changes) {
    const prev = next[change.path];
    if (change.value === undefined) {
      if (change.path in next) {
        delete next[change.path];
        applied.push(change);
      }
      continue;
    }
    if (!deepEqual(prev, change.value)) {
      next[change.path] = change.value;
      applied.push(change);
    }
  }
  return { next, applied };
}

/** Expand a path template like /audio/channel/{channelIndex}/level with concrete params. */
export function expandPath(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

/** Convert a path template to a regex matching concrete paths. */
export function pathTemplateToRegex(template: string): RegExp {
  const escaped = template.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\\\{(\w+)\\\}/g, "[^/]+")}$`);
}

import { useEffect } from "react";

export interface HotkeyBinding {
  key: string;
  /** Require no modifiers (default) or explicitly match ctrl/meta. */
  allowInInputs?: boolean;
  handler: (event: KeyboardEvent) => void;
  description: string;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable
  );
}

/** Global keyboard shortcuts; ignored while typing unless allowInInputs. */
export function useHotkeys(bindings: HotkeyBinding[], enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      for (const binding of bindings) {
        const keyMatches =
          event.key.toLowerCase() === binding.key.toLowerCase() ||
          (binding.key === "?" && event.key === "?");
        if (!keyMatches) continue;
        if (!binding.allowInInputs && isEditableTarget(event.target)) continue;
        event.preventDefault();
        binding.handler(event);
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bindings, enabled]);
}

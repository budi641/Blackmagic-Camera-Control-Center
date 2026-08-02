import { applyStateChanges, type CameraStateMap, type StateChange } from "@bmcc/shared";

/**
 * Flat per-camera state keyed by API path. Seeded by a REST sweep,
 * kept live by websocket events; emits applied changes for broadcast.
 */
export class StateStore {
  private state: CameraStateMap = {};

  apply(changes: StateChange[]): StateChange[] {
    const { next, applied } = applyStateChanges(this.state, changes);
    if (applied.length > 0) this.state = next;
    return applied;
  }

  set(path: string, value: unknown): StateChange[] {
    return this.apply([{ path, value }]);
  }

  get(path: string): unknown {
    return this.state[path];
  }

  clear(): void {
    this.state = {};
  }

  snapshot(): CameraStateMap {
    return { ...this.state };
  }
}

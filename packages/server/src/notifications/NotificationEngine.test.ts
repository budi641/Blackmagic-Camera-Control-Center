import { describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
import { NotificationEngine } from "./NotificationEngine.js";
import type { CameraSummary } from "@bmcc/shared";

function setup() {
  const manager = new EventEmitter();
  const engine = new NotificationEngine(manager as never);
  manager.emit("cameraSummary", {
    id: "cam1",
    name: "A Cam",
    status: "connected",
  } as CameraSummary);
  return { manager, engine };
}

describe("NotificationEngine", () => {
  it("notifies on recording start and stop transitions only", () => {
    const { manager, engine } = setup();
    manager.emit("stateDiff", "cam1", [{ path: "/transports/0/record", value: { recording: false } }]);
    expect(engine.list()).toHaveLength(0); // initial state, no transition
    manager.emit("stateDiff", "cam1", [{ path: "/transports/0/record", value: { recording: true } }]);
    manager.emit("stateDiff", "cam1", [{ path: "/transports/0/record", value: { recording: true } }]);
    manager.emit("stateDiff", "cam1", [{ path: "/transports/0/record", value: { recording: false } }]);
    const titles = engine.list().map((n) => n.title);
    expect(titles).toEqual(["Recording started on A Cam", "Recording stopped on A Cam"]);
  });

  it("notifies on connection status changes", () => {
    const { manager, engine } = setup();
    manager.emit("cameraStatus", "cam1", "connected");
    manager.emit("cameraStatus", "cam1", "error");
    const severities = engine.list().map((n) => n.severity);
    expect(severities).toEqual(["success", "warning"]);
  });

  it("fires storage warnings only on band crossings", () => {
    const { manager, engine } = setup();
    const workingset = (pct: number) => ({
      size: 1,
      workingset: [
        { deviceName: "internal", totalSpace: 1000, remainingSpace: pct * 10, clipCount: 1 },
      ],
    });
    manager.emit("stateDiff", "cam1", [{ path: "/media/workingset", value: workingset(50) }]);
    manager.emit("stateDiff", "cam1", [{ path: "/media/workingset", value: workingset(14) }]);
    manager.emit("stateDiff", "cam1", [{ path: "/media/workingset", value: workingset(12) }]);
    manager.emit("stateDiff", "cam1", [{ path: "/media/workingset", value: workingset(4) }]);
    manager.emit("stateDiff", "cam1", [{ path: "/media/workingset", value: workingset(3) }]);
    const titles = engine.list().map((n) => n.title);
    expect(titles).toEqual(["Storage low on A Cam", "Storage critically low on A Cam"]);
  });

  it("warns on low battery bands", () => {
    const { manager, engine } = setup();
    const power = (pct: number) => ({
      source: "Battery",
      batteries: [{ chargeRemainingPercent: pct, statusFlags: [] }],
    });
    manager.emit("stateDiff", "cam1", [{ path: "/camera/power", value: power(80) }]);
    manager.emit("stateDiff", "cam1", [{ path: "/camera/power", value: power(19) }]);
    manager.emit("stateDiff", "cam1", [{ path: "/camera/power", value: power(18) }]);
    manager.emit("stateDiff", "cam1", [{ path: "/camera/power", value: power(9) }]);
    const titles = engine.list().map((n) => n.title);
    expect(titles).toEqual(["Battery low on A Cam", "Battery critically low on A Cam"]);
  });

  it("caps history and supports markRead/clear", () => {
    const { manager, engine } = setup();
    for (let i = 0; i < 250; i++) {
      manager.emit("cameraStatus", "cam1", i % 2 === 0 ? "connected" : "error");
    }
    expect(engine.list().length).toBeLessThanOrEqual(200);
    engine.markRead();
    expect(engine.list().every((n) => n.read)).toBe(true);
    engine.clear();
    expect(engine.list()).toHaveLength(0);
  });
});

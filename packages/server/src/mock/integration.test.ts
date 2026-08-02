import { afterAll, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";
import type { AddressInfo } from "node:net";
import { createMockCamera } from "./mockCamera.js";
import { CameraManager } from "../cameras/CameraManager.js";
import { NotificationEngine } from "../notifications/NotificationEngine.js";
import { Store } from "../persistence/Store.js";
import { buildApp } from "../gateway/app.js";
import type { StreamServerMessage } from "@bmcc/shared";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function waitFor(condition: () => boolean, timeoutMs = 10000, intervalMs = 100): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (condition()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error("waitFor timed out"));
      }
    }, intervalMs);
  });
}

describe("mock camera integration", () => {
  let mock: Awaited<ReturnType<typeof createMockCamera>>;
  let mockPort: number;
  let manager: CameraManager;
  let tmpDir: string;
  let cameraId: string;

  beforeAll(async () => {
    mock = await createMockCamera({ host: "127.0.0.1", port: 0 });
    mockPort = (mock.app.server.address() as AddressInfo).port;
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bmcc-test-"));
    const store = new Store(tmpDir);
    manager = new CameraManager((records) => store.setCameras(records));
    new NotificationEngine(manager);
    const summary = manager.addManual({
      name: "Mock",
      host: "127.0.0.1",
      port: mockPort,
      scheme: "http",
      source: "mock",
      autoConnect: false,
    });
    cameraId = summary.id;
    await manager.connect(cameraId);
    await waitFor(() => manager.get(cameraId)?.status === "connected");
  }, 30000);

  afterAll(async () => {
    manager.shutdown();
    await mock.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("connects and seeds initial state", () => {
    const state = manager.state(cameraId);
    expect(state["/video/iso"]).toEqual({ iso: 400 });
    expect(state["/system/product"]).toMatchObject({ productName: "Blackmagic Camera" });
    expect(state["/media/workingset"]).toBeTruthy();
    expect(state["/slates/nextClip"]).toBeTruthy();
  });

  it("learns capabilities from device documentation", async () => {
    await waitFor(() => manager.get(cameraId)?.toSummary().capabilitiesKnown === true);
    expect(manager.get(cameraId)?.isSupported("/video/iso")).toBe(true);
    expect(manager.get(cameraId)?.isSupported("/video/ndFilter")).toBe(false);
  });

  it("applies REST writes and receives websocket events back", async () => {
    await manager.api(cameraId, "PUT", "/video/iso", { iso: 800 });
    await waitFor(() => {
      const state = manager.state(cameraId);
      return (state["/video/iso"] as { iso?: number })?.iso === 800;
    });
  });

  it("toggles recording and receives timecode ticks", async () => {
    await manager.api(cameraId, "POST", "/transports/0/record", { recording: true });
    await waitFor(() => {
      const rec = manager.state(cameraId)["/transports/0/record"] as { recording?: boolean };
      return rec?.recording === true;
    });
    const tc1 = manager.state(cameraId)["/transports/0/timecode"] as { display?: string };
    await new Promise((r) => setTimeout(r, 1600));
    const tc2 = manager.state(cameraId)["/transports/0/timecode"] as { display?: string };
    expect(tc2.display).not.toEqual(tc1.display);
    await manager.api(cameraId, "POST", "/transports/0/record", { recording: false });
  });

  it("serves the frontend gateway: REST proxy + websocket stream", async () => {
    const tmpDir2 = fs.mkdtempSync(path.join(os.tmpdir(), "bmcc-test-gw-"));
    const store = new Store(tmpDir2);
    const notifications = new NotificationEngine(manager);
    const app = await buildApp({ manager, notifications, store });
    await app.listen({ port: 0, host: "127.0.0.1" });
    const port = (app.server.address() as AddressInfo).port;

    // REST proxy
    const res = await fetch(`http://127.0.0.1:${port}/api/cameras/${cameraId}/rest/video/iso`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ iso: 800 });

    // Websocket hello + state
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/stream`);
    const messages: StreamServerMessage[] = [];
    ws.on("message", (raw) => messages.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve) => ws.on("open", resolve));
    ws.send(JSON.stringify({ type: "hello" }));
    await waitFor(() => messages.some((m) => m.type === "hello") && messages.some((m) => m.type === "state"));
    const hello = messages.find((m) => m.type === "hello");
    expect(hello && "cameras" in hello && hello.cameras.length).toBeGreaterThan(0);

    ws.close();
    await app.close();
    fs.rmSync(tmpDir2, { recursive: true, force: true });
  });
});

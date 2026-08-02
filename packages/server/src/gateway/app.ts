import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import type { WebSocket } from "ws";
import {
  type AppNotification,
  type CameraRecordInput,
  type CameraStateMap,
  type CameraSummary,
  type Preferences,
  type StateChange,
  type StreamClientMessage,
  type StreamServerMessage,
} from "@bmcc/shared";
import { CameraApiError } from "../cameras/CameraClient.js";
import type { CameraManager } from "../cameras/CameraManager.js";
import type { NotificationEngine } from "../notifications/NotificationEngine.js";
import type { Store } from "../persistence/Store.js";

export interface AppDeps {
  manager: CameraManager;
  notifications: NotificationEngine;
  store: Store;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { manager, notifications, store } = deps;
  const app = Fastify({ logger: false });
  await app.register(cors, { origin: true });
  await app.register(websocket);

  const clients = new Set<WebSocket>();
  const broadcast = (msg: StreamServerMessage) => {
    const payload = JSON.stringify(msg);
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  };

  manager.on("cameraSummary", (camera: CameraSummary) => broadcast({ type: "camera", camera }));
  manager.on("cameraAdded", (camera: CameraSummary) => broadcast({ type: "camera", camera }));
  manager.on("cameraRemoved", (cameraId: string) => broadcast({ type: "cameraRemoved", cameraId }));
  manager.on("cameraState", (cameraId: string, state: CameraStateMap) =>
    broadcast({ type: "state", cameraId, state }),
  );
  manager.on("stateDiff", (cameraId: string, changes: StateChange[]) =>
    broadcast({ type: "stateDiff", cameraId, changes }),
  );
  notifications.on("notification", (notification: AppNotification) =>
    broadcast({ type: "notification", notification }),
  );
  notifications.on("notifications", (list: AppNotification[]) =>
    broadcast({ type: "notifications", notifications: list }),
  );

  // ---------- Frontend websocket ----------

  app.get("/api/stream", { websocket: true }, (socket) => {
    clients.add(socket);
    socket.on("message", async (raw: Buffer) => {
      let msg: StreamClientMessage;
      try {
        msg = JSON.parse(String(raw)) as StreamClientMessage;
      } catch {
        return;
      }
      try {
        switch (msg.type) {
          case "hello":
            socket.send(
              JSON.stringify({
                type: "hello",
                cameras: manager.list(),
                notifications: notifications.list(),
              } satisfies StreamServerMessage),
            );
            for (const camera of manager.list()) {
              if (camera.status === "connected") {
                socket.send(
                  JSON.stringify({
                    type: "state",
                    cameraId: camera.id,
                    state: manager.state(camera.id),
                  } satisfies StreamServerMessage),
                );
              }
            }
            break;
          case "addCamera":
            manager.addManual(msg.input);
            break;
          case "removeCamera":
            manager.remove(msg.cameraId);
            break;
          case "connect":
            await manager.connect(msg.cameraId);
            break;
          case "disconnect":
            manager.disconnect(msg.cameraId);
            break;
          case "markNotificationsRead":
            notifications.markRead(msg.ids);
            break;
        }
      } catch (err) {
        notifications.notify({
          severity: "error",
          title: "Command failed",
          message: (err as Error).message,
        });
      }
    });
    socket.on("close", () => clients.delete(socket));
  });

  // ---------- REST: cameras ----------

  app.get("/api/health", async () => ({ ok: true, ts: Date.now() }));

  app.get("/api/cameras", async () => manager.list());

  app.post("/api/cameras", async (req, reply) => {
    const input = req.body as CameraRecordInput;
    if (!input?.host) return reply.code(400).send({ error: "host is required" });
    return manager.addManual(input);
  });

  app.delete("/api/cameras/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!manager.remove(id)) return reply.code(404).send({ error: "not found" });
    return reply.code(204).send();
  });

  app.post("/api/cameras/:id/connect", async (req) => {
    const { id } = req.params as { id: string };
    await manager.connect(id);
    return manager.get(id)?.toSummary();
  });

  app.post("/api/cameras/:id/disconnect", async (req) => {
    const { id } = req.params as { id: string };
    manager.disconnect(id);
    return manager.get(id)?.toSummary();
  });

  app.get("/api/cameras/:id/state", async (req) => {
    const { id } = req.params as { id: string };
    return manager.state(id);
  });

  /** Transparent proxy to the camera REST API: any endpoint incl. future ones. */
  app.all("/api/cameras/:id/rest/*", async (req, reply) => {
    const { id } = req.params as { id: string };
    const rest = (req.params as Record<string, string>)["*"] ?? "";
    const path = `/${rest}`;
    const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    try {
      const result = await manager.api(id, req.method, path + query, req.body);
      if (result.status === 204 || result.data === null) return reply.code(result.status).send();
      return reply.code(result.status).send(result.data);
    } catch (err) {
      if (err instanceof CameraApiError) {
        if (err.status === 0) return reply.code(502).send({ error: err.message });
        return reply.code(err.status).send(err.body ?? { error: err.message });
      }
      return reply.code(500).send({ error: (err as Error).message });
    }
  });

  // ---------- REST: workspaces & preferences ----------

  app.get("/api/workspaces", async () => store.snapshot.workspaces);

  app.put("/api/workspaces/:name", async (req, reply) => {
    const { name } = req.params as { name: string };
    const layout = (req.body as { layout?: unknown })?.layout;
    if (layout === undefined) return reply.code(400).send({ error: "layout is required" });
    store.setWorkspace(name, layout);
    return store.snapshot.workspaces;
  });

  app.delete("/api/workspaces/:name", async (req) => {
    const { name } = req.params as { name: string };
    store.deleteWorkspace(name);
    return store.snapshot.workspaces;
  });

  app.get("/api/preferences", async () => store.snapshot.preferences);

  app.put("/api/preferences", async (req) => {
    store.setPreferences((req.body ?? {}) as Preferences);
    return store.snapshot.preferences;
  });

  // ---------- REST: notifications ----------

  app.get("/api/notifications", async () => notifications.list());

  app.delete("/api/notifications", async () => {
    notifications.clear();
    return [];
  });

  return app;
}

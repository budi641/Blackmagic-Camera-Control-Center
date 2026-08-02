import { EventEmitter } from "node:events";
import WebSocket from "ws";
import {
  EVENT_WEBSOCKET_PATH,
  isCameraWsEvent,
  isCameraWsResponse,
  type CameraWsRequest,
} from "@bmcc/shared";

export interface CameraEventsOptions {
  baseUrl: string;
  /** Property subscriptions; defaults to all properties. */
  properties?: string[];
}

/**
 * Maintains a resilient subscription to the camera's notification websocket.
 * Emits "property" (path, value) for individual changes, "values" (map) for
 * bulk payloads included in subscribe responses, "open" and "close".
 */
export class CameraEvents extends EventEmitter {
  private ws: WebSocket | null = null;
  private stopped = false;
  private reconnectDelay = 1000;
  private requestId = 0;
  private readonly properties: string[];

  constructor(private readonly options: CameraEventsOptions) {
    super();
    this.properties = options.properties ?? ["*"];
  }

  get wsUrl(): string {
    const url = new URL(this.options.baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = EVENT_WEBSOCKET_PATH;
    url.search = "";
    return url.toString();
  }

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.ws?.removeAllListeners();
    this.ws?.close();
    this.ws = null;
  }

  send(action: CameraWsRequest["data"]["action"], properties?: string[]): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    const msg: CameraWsRequest = {
      type: "request",
      id: ++this.requestId,
      data: { action, properties },
    };
    this.ws.send(JSON.stringify(msg));
  }

  private connect(): void {
    if (this.stopped) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.wsUrl, { rejectUnauthorized: false });
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.on("open", () => {
      this.reconnectDelay = 1000;
      this.send("subscribe", this.properties);
      this.emit("open");
    });

    ws.on("message", (raw) => {
      let msg: unknown;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (isCameraWsEvent(msg)) {
        const data = msg.data;
        if (!data) return;
        if (data.action === "propertyValueChanged" && typeof data.property === "string") {
          this.emit("property", data.property, data.value);
        }
        if (data.values) this.emit("values", data.values);
      } else if (isCameraWsResponse(msg)) {
        const values = msg.data?.values;
        if (values) this.emit("values", values);
      }
    });

    ws.on("error", () => {
      // Close event follows; reconnect handled there.
    });

    ws.on("close", () => {
      this.emit("close");
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    setTimeout(() => this.connect(), delay).unref();
  }
}

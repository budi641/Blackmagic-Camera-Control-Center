import type { StreamClientMessage, StreamServerMessage } from "@bmcc/shared";
import { useAppStore } from "@/state/store";

/**
 * Resilient websocket client for the backend multiplex stream (/api/stream).
 * Reconnects with backoff and re-syncs (hello) after every reconnect.
 */
class StreamClient {
  private ws: WebSocket | null = null;
  private reconnectDelay = 500;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    this.connect();
  }

  send(msg: StreamClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private connect(): void {
    const store = useAppStore.getState();
    store.setWsStatus("connecting");
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${location.host}/api/stream`);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = 500;
      useAppStore.getState().setWsStatus("open");
      this.send({ type: "hello" });
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as StreamServerMessage;
        useAppStore.getState().handleStreamMessage(msg);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      useAppStore.getState().setWsStatus("closed");
      const delay = this.reconnectDelay;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000);
      setTimeout(() => this.connect(), delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }
}

export const stream = new StreamClient();

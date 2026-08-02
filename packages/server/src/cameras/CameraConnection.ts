import { EventEmitter } from "node:events";
import {
  SEED_ENDPOINTS,
  audioChannelEndpoints,
  displayEndpoints,
  asArray,
  asNumber,
  asString,
  isRecord,
  type AudioChannels,
  type CameraScheme,
  type CameraSource,
  type CameraStateMap,
  type CameraSummary,
  type ConnectionStatus,
  type MonitoringDisplays,
  type ProductInfo,
  type RecordState,
  type StateChange,
} from "@bmcc/shared";
import { CameraApiError, CameraClient, type CameraResponse } from "./CameraClient.js";
import { CameraEvents } from "./CameraEvents.js";
import { CapabilityRegistry } from "./CapabilityRegistry.js";
import { StateStore } from "./StateStore.js";

export interface CameraRecord {
  id: string;
  name: string;
  host: string;
  port: number;
  scheme: CameraScheme;
  source: CameraSource;
  autoConnect: boolean;
  addedAt: number;
}

/** After a successful write, re-read these paths so state stays in sync even
 * for properties the camera does not emit websocket events for. */
const WRITE_REFRESH: Record<string, string[]> = {
  "/transports/0/record": ["/transports/0/record", "/transports/0/timecode", "/transports/0"],
  "/transports/0/play": ["/transports/0/playback", "/transports/0"],
  "/transports/0/stop": ["/transports/0/playback", "/transports/0"],
  "/livestreams/0/start": ["/livestreams/0"],
  "/livestreams/0/stop": ["/livestreams/0"],
  "/livestreams/0/activePlatform": ["/livestreams/0/activePlatform"],
  "/lens/focus/doAutoFocus": ["/lens/focus"],
  "/video/whiteBalance/doAuto": ["/video/whiteBalance", "/video/whiteBalanceTint"],
  "/slates/nextClip/resetProjectData": ["/slates/nextClip"],
  "/slates/nextClip/resetLensData": ["/slates/nextClip"],
  "/presets/active": ["/presets/active"],
  "/media/active": ["/media/active", "/media/workingset"],
};

const PROBE_PORTS: { scheme: CameraScheme; port: number }[] = [
  { scheme: "https", port: 4444 },
  { scheme: "https", port: 443 },
  { scheme: "http", port: 80 },
];

export class CameraConnection extends EventEmitter {
  readonly store = new StateStore();
  status: ConnectionStatus = "disconnected";
  error: string | undefined;
  rttMs: number | undefined;
  lastSeenAt: number | undefined;

  private client: CameraClient | null = null;
  private capabilities: CapabilityRegistry | null = null;
  private events: CameraEvents | null = null;
  private resolvedBaseUrl: string | null = null;
  private timers: NodeJS.Timeout[] = [];
  private refreshPending = new Map<string, NodeJS.Timeout>();
  private maintainConnection = false;
  private reconnectDelay = 2000;
  private connecting = false;

  constructor(public readonly record: CameraRecord) {
    super();
  }

  // ---------- lifecycle ----------

  async connect(): Promise<void> {
    this.maintainConnection = true;
    await this.connectOnce();
  }

  private async connectOnce(): Promise<void> {
    if (this.connecting || !this.maintainConnection) return;
    this.connecting = true;
    this.setStatus("connecting");
    try {
      const baseUrl = await this.probeBaseUrl();
      this.resolvedBaseUrl = baseUrl;
      this.client = new CameraClient(baseUrl);
      this.capabilities = new CapabilityRegistry(this.client);
      this.capabilities.load().then(() => this.emitSummary()).catch(() => undefined);

      await this.sweepState();
      this.startEvents(baseUrl);
      this.startPollers();
      this.reconnectDelay = 2000;
      this.lastSeenAt = Date.now();
      this.setStatus("connected");
    } catch (err) {
      this.error = (err as Error).message;
      this.setStatus("error");
      this.scheduleReconnect();
    } finally {
      this.connecting = false;
    }
  }

  disconnect(): void {
    this.maintainConnection = false;
    this.tearDownTransport();
    this.setStatus("disconnected");
  }

  private tearDownTransport(): void {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    for (const t of this.refreshPending.values()) clearTimeout(t);
    this.refreshPending.clear();
    this.events?.stop();
    this.events = null;
  }

  private scheduleReconnect(): void {
    if (!this.maintainConnection) return;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    const timer = setTimeout(() => {
      if (this.maintainConnection && this.status !== "connected") void this.connectOnce();
    }, delay);
    timer.unref();
    this.timers.push(timer);
  }

  /** Probe candidate base URLs until the camera API answers. */
  private async probeBaseUrl(): Promise<string> {
    const candidates: string[] = [
      `${this.record.scheme}://${this.record.host}:${this.record.port}`,
      ...PROBE_PORTS.filter(
        (p) => !(p.scheme === this.record.scheme && p.port === this.record.port),
      ).map((p) => `${p.scheme}://${this.record.host}:${p.port}`),
    ];
    for (const baseUrl of candidates) {
      try {
        const probe = new CameraClient(baseUrl);
        const { status } = await probe.get("/system", 2500);
        if (status === 200 || status === 501) return baseUrl;
      } catch {
        // try next candidate
      }
    }
    throw new Error(`No camera API found at ${this.record.host}`);
  }

  // ---------- state ----------

  private async sweepState(): Promise<void> {
    if (!this.client) return;
    const changes: StateChange[] = [];
    const fetchPath = async (path: string): Promise<void> => {
      if (!this.client) return;
      try {
        const { data } = await this.client.get(path);
        changes.push({ path, value: data });
        if (this.capabilities && (data === null || data === undefined)) return;
      } catch (err) {
        this.handleApiError(path, err);
      }
    };

    await Promise.all(SEED_ENDPOINTS.map(fetchPath));

    // Expand dynamic endpoints: audio channels and monitoring displays.
    const dynamic: string[] = [];
    const channels = changes.find((c) => c.path === "/audio/channels");
    const channelCount = asNumber((channels?.value as AudioChannels | null)?.channels) ?? 0;
    for (let i = 0; i < Math.min(channelCount, 8); i++) dynamic.push(...audioChannelEndpoints(i));
    const displays = changes.find((c) => c.path === "/monitoring/display");
    const displayNames = asArray<string>((displays?.value as MonitoringDisplays | null)?.displays);
    for (const d of displayNames.slice(0, 8)) dynamic.push(...displayEndpoints(d));
    await Promise.all(dynamic.map(fetchPath));

    this.store.clear();
    this.store.apply(changes);
    this.emit("state", this.store.snapshot());
  }

  private startEvents(baseUrl: string): void {
    this.events = new CameraEvents({ baseUrl });
    this.events.on("property", (path: string, value: unknown) => {
      const applied = this.store.apply([{ path, value }]);
      if (applied.length > 0) {
        this.lastSeenAt = Date.now();
        this.emit("diff", applied);
      }
    });
    this.events.on("values", (values: Record<string, unknown>) => {
      const changes = Object.entries(values).map(([path, value]) => ({ path, value }));
      const applied = this.store.apply(changes);
      if (applied.length > 0) {
        this.lastSeenAt = Date.now();
        this.emit("diff", applied);
      }
    });
    this.events.on("close", () => {
      if (this.maintainConnection && this.status === "connected") {
        this.error = "Event stream interrupted";
        this.setStatus("error");
        this.tearDownTransport();
        this.scheduleReconnect();
      }
    });
    this.events.start();
  }

  private startPollers(): void {
    // Fast loop: timecode while recording.
    const fast = setInterval(() => {
      if (!this.client || this.status !== "connected") return;
      const rec = this.store.get("/transports/0/record") as RecordState | null;
      if (rec?.recording) {
        void this.refreshPath("/transports/0/timecode");
        void this.refreshPath("/media/workingset");
      }
    }, 1000);
    fast.unref();

    // Health + RTT.
    const health = setInterval(async () => {
      if (!this.client || this.status !== "connected") return;
      const start = performance.now();
      try {
        await this.client.get("/system", 4000);
        this.rttMs = Math.round(performance.now() - start);
        this.lastSeenAt = Date.now();
        this.emitSummary();
      } catch {
        this.error = "Health check failed";
        this.setStatus("error");
        this.tearDownTransport();
        this.scheduleReconnect();
      }
    }, 5000);
    health.unref();

    // Slow loop: power + livestream (not websocket-subscribable) + storage.
    let slowTick = 0;
    const slow = setInterval(() => {
      if (this.status !== "connected") return;
      slowTick++;
      void this.refreshPath("/livestreams/0");
      if (slowTick % 2 === 0) void this.refreshPath("/camera/power");
      if (slowTick % 4 === 0) void this.refreshPath("/media/workingset");
    }, 15000);
    slow.unref();

    this.timers.push(fast, health, slow);
  }

  private async refreshPath(path: string): Promise<void> {
    if (!this.client) return;
    try {
      const { data } = await this.client.get(path);
      const applied = this.store.apply([{ path, value: data }]);
      if (applied.length > 0) this.emit("diff", applied);
    } catch (err) {
      this.handleApiError(path, err);
    }
  }

  private scheduleRefresh(path: string): void {
    if (this.refreshPending.has(path)) return;
    const timer = setTimeout(() => {
      this.refreshPending.delete(path);
      void this.refreshPath(path);
    }, 400);
    timer.unref();
    this.refreshPending.set(path, timer);
  }

  // ---------- commands ----------

  async api(method: string, path: string, body?: unknown): Promise<CameraResponse> {
    if (!this.client || this.status !== "connected") {
      throw new CameraApiError(0, "Camera is not connected");
    }
    try {
      const result = await this.client.request(method, path, body);
      if (method !== "GET") {
        const refresh = WRITE_REFRESH[path] ?? [path.split("?")[0] ?? path];
        for (const p of refresh) this.scheduleRefresh(p);
      }
      return result;
    } catch (err) {
      this.handleApiError(path, err);
      throw err;
    }
  }

  private handleApiError(path: string, err: unknown): void {
    if (err instanceof CameraApiError && (err.status === 404 || err.status === 501)) {
      this.capabilities?.markUnsupported(path);
      this.emitSummary();
    }
  }

  isSupported(path: string): boolean {
    return this.capabilities?.isSupported(path) ?? true;
  }

  // ---------- summary ----------

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    if (status !== "error") this.error = undefined;
    this.emit("status", status);
    this.emitSummary();
  }

  private emitSummary(): void {
    this.emit("summary", this.toSummary());
  }

  toSummary(): CameraSummary {
    const product = this.store.get("/system/product") as ProductInfo | null;
    return {
      id: this.record.id,
      name: asString(product?.deviceName) ?? this.record.name,
      host: this.record.host,
      port: this.record.port,
      scheme: this.record.scheme,
      source: this.record.source,
      status: this.status,
      error: this.error,
      rttMs: this.rttMs,
      product: product ?? undefined,
      unsupportedPaths: this.capabilities?.unsupportedPaths() ?? [],
      capabilitiesKnown: this.capabilities?.known ?? false,
      autoConnect: this.record.autoConnect,
      lastSeenAt: this.lastSeenAt,
    };
  }

  stateSnapshot(): CameraStateMap {
    return this.store.snapshot();
  }
}

export { isRecord };

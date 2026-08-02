import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type {
  CameraRecordInput,
  CameraStateMap,
  CameraSummary,
  StateChange,
} from "@bmcc/shared";
import { CameraConnection, type CameraRecord } from "./CameraConnection.js";
import type { CameraResponse } from "./CameraClient.js";
import type { PersistedData } from "../persistence/Store.js";

export interface DiscoveredCamera {
  name: string;
  host: string;
  port: number;
  scheme: "http" | "https";
}

/**
 * Registry of all known cameras and their connections. Re-emits connection
 * events with camera ids so the gateway can multiplex them to clients.
 */
export class CameraManager extends EventEmitter {
  private connections = new Map<string, CameraConnection>();

  constructor(private readonly persist: (records: CameraRecord[]) => void) {
    super();
  }

  loadFromStore(data: PersistedData): void {
    for (const record of data.cameras ?? []) {
      this.addConnection(record);
    }
    for (const conn of this.connections.values()) {
      if (conn.record.autoConnect) void conn.connect();
    }
  }

  list(): CameraSummary[] {
    return [...this.connections.values()].map((c) => c.toSummary());
  }

  get(id: string): CameraConnection | undefined {
    return this.connections.get(id);
  }

  addManual(input: CameraRecordInput): CameraSummary {
    const existing = this.findByHost(input.host);
    if (existing) return existing.toSummary();
    const record: CameraRecord = {
      id: randomUUID(),
      name: input.name || input.host,
      host: input.host,
      port: input.port ?? 4444,
      scheme: input.scheme ?? "https",
      source: input.source ?? "manual",
      autoConnect: input.autoConnect ?? true,
      addedAt: Date.now(),
    };
    const conn = this.addConnection(record);
    this.persistRecords();
    if (record.autoConnect) void conn.connect();
    return conn.toSummary();
  }

  onDiscovered(found: DiscoveredCamera): void {
    const existing = this.findByHost(found.host);
    if (existing) {
      existing.lastSeenAt = Date.now();
      return;
    }
    const record: CameraRecord = {
      id: randomUUID(),
      name: found.name || found.host,
      host: found.host,
      port: found.port,
      scheme: found.scheme,
      source: "discovery",
      autoConnect: false,
      addedAt: Date.now(),
    };
    const conn = this.addConnection(record);
    this.emit("cameraAdded", conn.toSummary());
  }

  remove(id: string): boolean {
    const conn = this.connections.get(id);
    if (!conn) return false;
    conn.disconnect();
    conn.removeAllListeners();
    this.connections.delete(id);
    this.persistRecords();
    this.emit("cameraRemoved", id);
    return true;
  }

  async connect(id: string): Promise<void> {
    const conn = this.require(id);
    await conn.connect();
  }

  disconnect(id: string): void {
    this.require(id).disconnect();
  }

  async api(id: string, method: string, path: string, body?: unknown): Promise<CameraResponse> {
    return this.require(id).api(method, path, body);
  }

  state(id: string): CameraStateMap {
    return this.require(id).stateSnapshot();
  }

  shutdown(): void {
    for (const conn of this.connections.values()) {
      conn.disconnect();
      conn.removeAllListeners();
    }
    this.connections.clear();
  }

  private addConnection(record: CameraRecord): CameraConnection {
    const conn = new CameraConnection(record);
    conn.on("summary", (summary: CameraSummary) => this.emit("cameraSummary", summary));
    conn.on("status", (status: string) => this.emit("cameraStatus", record.id, status));
    conn.on("state", (state: CameraStateMap) => this.emit("cameraState", record.id, state));
    conn.on("diff", (changes: StateChange[]) => this.emit("stateDiff", record.id, changes));
    this.connections.set(record.id, conn);
    this.emit("cameraAdded", conn.toSummary());
    return conn;
  }

  private findByHost(host: string): CameraConnection | undefined {
    return [...this.connections.values()].find((c) => c.record.host === host);
  }

  private require(id: string): CameraConnection {
    const conn = this.connections.get(id);
    if (!conn) throw new Error(`Unknown camera: ${id}`);
    return conn;
  }

  private persistRecords(): void {
    this.persist([...this.connections.values()].map((c) => c.record));
  }
}

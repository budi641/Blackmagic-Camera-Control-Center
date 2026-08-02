import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import {
  asArray,
  asNumber,
  isRecord,
  type AppNotification,
  type CameraSummary,
  type MediaWorkingset,
  type NotificationSeverity,
  type RecordState,
  type StateChange,
} from "@bmcc/shared";
import type { CameraManager } from "../cameras/CameraManager.js";

const HISTORY_LIMIT = 200;

/**
 * Turns camera state changes and connection events into user-facing
 * notifications. Threshold rules fire on band crossings so they do not spam.
 */
export class NotificationEngine extends EventEmitter {
  private history: AppNotification[] = [];
  private cameraNames = new Map<string, string>();
  private storageBand = new Map<string, number>();
  private batteryBand = new Map<string, number>();
  private recording = new Map<string, boolean>();

  constructor(manager: CameraManager) {
    super();

    manager.on("cameraSummary", (summary: CameraSummary) => {
      this.cameraNames.set(summary.id, summary.name);
    });

    manager.on("cameraStatus", (cameraId: string, status: string) => {
      const name = this.cameraNames.get(cameraId) ?? cameraId;
      if (status === "connected") {
        this.push({ cameraId, severity: "success", title: `Connected to ${name}` });
      } else if (status === "error") {
        this.push({ cameraId, severity: "warning", title: `Connection lost: ${name}`, message: "Attempting to reconnect automatically." });
      }
    });

    manager.on("stateDiff", (cameraId: string, changes: StateChange[]) => {
      for (const change of changes) this.applyRule(cameraId, change);
    });
  }

  list(): AppNotification[] {
    return [...this.history];
  }

  markRead(ids?: string[]): void {
    for (const n of this.history) {
      if (!ids || ids.includes(n.id)) n.read = true;
    }
    this.emit("notifications", this.list());
  }

  clear(): void {
    this.history = [];
    this.emit("notifications", this.list());
  }

  notify(input: {
    cameraId?: string;
    severity: NotificationSeverity;
    title: string;
    message?: string;
  }): void {
    this.push(input);
  }

  private push(input: {
    cameraId?: string;
    severity: NotificationSeverity;
    title: string;
    message?: string;
  }): void {
    const notification: AppNotification = {
      id: randomUUID(),
      ts: Date.now(),
      cameraId: input.cameraId,
      cameraName: input.cameraId ? this.cameraNames.get(input.cameraId) : undefined,
      severity: input.severity,
      title: input.title,
      message: input.message,
      read: false,
    };
    this.history.push(notification);
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
    this.emit("notification", notification);
  }

  private applyRule(cameraId: string, change: StateChange): void {
    const name = this.cameraNames.get(cameraId) ?? "Camera";

    if (change.path === "/transports/0/record") {
      const recording = (change.value as RecordState | null)?.recording === true;
      const prev = this.recording.get(cameraId);
      if (prev !== undefined && prev !== recording) {
        this.push({
          cameraId,
          severity: recording ? "success" : "info",
          title: recording ? `Recording started on ${name}` : `Recording stopped on ${name}`,
        });
      }
      this.recording.set(cameraId, recording);
    }

    if (change.path === "/media/workingset") {
      const ws = change.value as MediaWorkingset | null;
      const devices = asArray(ws?.workingset).filter(isRecord);
      let minPercent: number | undefined;
      for (const d of devices) {
        const total = asNumber(d.totalSpace);
        const remaining = asNumber(d.remainingSpace);
        if (total && remaining !== undefined && total > 0) {
          const pct = (remaining / total) * 100;
          minPercent = minPercent === undefined ? pct : Math.min(minPercent, pct);
        }
      }
      if (minPercent !== undefined) {
        const band = minPercent < 5 ? 2 : minPercent < 15 ? 1 : 0;
        const prev = this.storageBand.get(cameraId) ?? 0;
        if (band > prev) {
          this.push({
            cameraId,
            severity: band === 2 ? "error" : "warning",
            title: band === 2 ? `Storage critically low on ${name}` : `Storage low on ${name}`,
            message: `${minPercent.toFixed(0)}% remaining.`,
          });
        }
        this.storageBand.set(cameraId, band);
      }
    }

    if (change.path === "/camera/power") {
      const batteries = asArray((change.value as { batteries?: unknown[] } | null)?.batteries);
      for (const b of batteries) {
        const pct = asNumber((b as { chargeRemainingPercent?: unknown }).chargeRemainingPercent);
        if (pct === undefined) continue;
        const band = pct < 10 ? 2 : pct < 20 ? 1 : 0;
        const prev = this.batteryBand.get(cameraId) ?? 0;
        if (band > prev) {
          this.push({
            cameraId,
            severity: band === 2 ? "error" : "warning",
            title: band === 2 ? `Battery critically low on ${name}` : `Battery low on ${name}`,
            message: `${pct}% remaining.`,
          });
        }
        this.batteryBand.set(cameraId, band);
      }
    }

    if (change.path === "/livestreams/0") {
      const status = isRecord(change.value)
        ? String(change.value.status ?? change.value.mode ?? "")
        : "";
      const prevKey = `stream:${cameraId}`;
      const prev = this.recording.get(prevKey);
      const active = /stream|live|active/i.test(status);
      if (prev !== undefined && prev !== active) {
        this.push({
          cameraId,
          severity: "info",
          title: active ? `Livestream started on ${name}` : `Livestream stopped on ${name}`,
        });
      }
      this.recording.set(prevKey, active);
    }
  }
}

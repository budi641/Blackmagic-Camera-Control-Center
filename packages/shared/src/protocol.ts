/**
 * Protocol between the Control Center backend and the web frontend:
 * REST routes under /api plus a multiplexed websocket at /api/stream.
 */

import type { CameraStateMap, StateChange } from "./state.js";
import type { ProductInfo } from "./api-types.js";

// ---------- Cameras ----------

export type CameraSource = "manual" | "discovery" | "mock";
export type CameraScheme = "http" | "https";

export interface CameraRecordInput {
  name: string;
  host: string;
  port?: number;
  scheme?: CameraScheme;
  source?: CameraSource;
  autoConnect?: boolean;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface CameraSummary {
  id: string;
  name: string;
  host: string;
  port: number;
  scheme: CameraScheme;
  source: CameraSource;
  status: ConnectionStatus;
  error?: string;
  /** Round-trip time of the last health probe in ms. */
  rttMs?: number;
  product?: ProductInfo;
  /** Paths confirmed unsupported (404/501 or absent from device docs). */
  unsupportedPaths: string[];
  /** Whether the device documentation was fetched to determine capabilities. */
  capabilitiesKnown: boolean;
  autoConnect: boolean;
  lastSeenAt?: number;
}

// ---------- Notifications ----------

export type NotificationSeverity = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  ts: number;
  cameraId?: string;
  cameraName?: string;
  severity: NotificationSeverity;
  title: string;
  message?: string;
  read: boolean;
}

// ---------- Websocket /api/stream ----------

export type StreamClientMessage =
  | { type: "hello" }
  | { type: "addCamera"; input: CameraRecordInput }
  | { type: "removeCamera"; cameraId: string }
  | { type: "connect"; cameraId: string }
  | { type: "disconnect"; cameraId: string }
  | { type: "markNotificationsRead"; ids?: string[] };

export type StreamServerMessage =
  | { type: "hello"; cameras: CameraSummary[]; notifications: AppNotification[] }
  | { type: "camera"; camera: CameraSummary }
  | { type: "cameraRemoved"; cameraId: string }
  | { type: "state"; cameraId: string; state: CameraStateMap }
  | { type: "stateDiff"; cameraId: string; changes: StateChange[] }
  | { type: "notification"; notification: AppNotification }
  | { type: "notifications"; notifications: AppNotification[] };

// ---------- REST proxy ----------

export interface ProxyResult {
  status: number;
  data: unknown;
}

// ---------- Workspaces & preferences ----------

export interface WorkspaceLayout {
  name: string;
  /** Serialized dockview layout. */
  layout: unknown;
  updatedAt: number;
}

export interface Preferences {
  theme?: "dark" | "light";
  activeWorkspace?: string;
  shortcutsEnabled?: boolean;
  [key: string]: unknown;
}

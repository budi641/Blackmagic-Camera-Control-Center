import type {
  AppNotification,
  CameraRecordInput,
  CameraStateMap,
  CameraSummary,
  Preferences,
  WorkspaceLayout,
} from "@bmcc/shared";

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  cameras: () => request<CameraSummary[]>("GET", "/api/cameras"),
  addCamera: (input: CameraRecordInput) => request<CameraSummary>("POST", "/api/cameras", input),
  removeCamera: (id: string) => request<null>("DELETE", `/api/cameras/${id}`),
  connect: (id: string) => request<CameraSummary>("POST", `/api/cameras/${id}/connect`),
  disconnect: (id: string) => request<CameraSummary>("POST", `/api/cameras/${id}/disconnect`),
  cameraState: (id: string) => request<CameraStateMap>("GET", `/api/cameras/${id}/state`),

  /** Transparent proxy to any camera REST endpoint. */
  cameraRest: <T = unknown>(id: string, method: string, path: string, body?: unknown) =>
    request<T>(method, `/api/cameras/${id}/rest${path}`, body),

  workspaces: () => request<Record<string, WorkspaceLayout>>("GET", "/api/workspaces"),
  saveWorkspace: (name: string, layout: unknown) =>
    request<Record<string, WorkspaceLayout>>("PUT", `/api/workspaces/${encodeURIComponent(name)}`, { layout }),
  deleteWorkspace: (name: string) =>
    request<Record<string, WorkspaceLayout>>("DELETE", `/api/workspaces/${encodeURIComponent(name)}`),

  preferences: () => request<Preferences>("GET", "/api/preferences"),
  savePreferences: (prefs: Preferences) => request<Preferences>("PUT", "/api/preferences", prefs),

  notifications: () => request<AppNotification[]>("GET", "/api/notifications"),
  clearNotifications: () => request<AppNotification[]>("DELETE", "/api/notifications"),
};

import { create } from "zustand";
import { toast } from "sonner";
import {
  applyStateChanges,
  type AppNotification,
  type CameraRecordInput,
  type CameraStateMap,
  type CameraSummary,
  type Preferences,
  type StreamServerMessage,
} from "@bmcc/shared";
import { api, ApiError } from "@/lib/api";

export type WsStatus = "connecting" | "open" | "closed";

interface AppStore {
  wsStatus: WsStatus;
  cameras: Record<string, CameraSummary>;
  states: Record<string, CameraStateMap>;
  selectedCameraId: string | null;
  notifications: AppNotification[];
  theme: "dark" | "light";
  shortcutsHelpOpen: boolean;

  handleStreamMessage: (msg: StreamServerMessage) => void;
  setWsStatus: (status: WsStatus) => void;
  setTheme: (theme: "dark" | "light") => void;
  setShortcutsHelpOpen: (open: boolean) => void;
  selectCamera: (id: string | null) => void;

  addCamera: (input: CameraRecordInput) => Promise<void>;
  removeCamera: (id: string) => Promise<void>;
  connectCamera: (id: string) => Promise<void>;
  disconnectCamera: (id: string) => Promise<void>;

  /** Write to the camera through the proxy with optimistic local state + rollback. */
  write: (cameraId: string, method: string, path: string, body?: unknown) => Promise<boolean>;
  /** Explicitly re-read a camera path through the proxy. */
  refresh: (cameraId: string, path: string) => Promise<void>;
  setLocal: (cameraId: string, path: string, value: unknown) => void;

  markNotificationsRead: (ids?: string[]) => void;
  clearNotifications: () => Promise<void>;
  loadPreferences: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  wsStatus: "connecting",
  cameras: {},
  states: {},
  selectedCameraId: null,
  notifications: [],
  theme: "dark",
  shortcutsHelpOpen: false,

  setWsStatus: (wsStatus) => set({ wsStatus }),

  handleStreamMessage: (msg) => {
    switch (msg.type) {
      case "hello": {
        const cameras = Object.fromEntries(msg.cameras.map((c) => [c.id, c]));
        set((s) => ({
          cameras,
          notifications: msg.notifications,
          selectedCameraId:
            s.selectedCameraId && cameras[s.selectedCameraId]
              ? s.selectedCameraId
              : msg.cameras.find((c) => c.status === "connected")?.id ?? msg.cameras[0]?.id ?? null,
        }));
        break;
      }
      case "camera": {
        set((s) => ({
          cameras: { ...s.cameras, [msg.camera.id]: msg.camera },
          selectedCameraId:
            s.selectedCameraId ??
            (msg.camera.status === "connected" ? msg.camera.id : s.selectedCameraId),
        }));
        break;
      }
      case "cameraRemoved": {
        set((s) => {
          const cameras = { ...s.cameras };
          delete cameras[msg.cameraId];
          const states = { ...s.states };
          delete states[msg.cameraId];
          return {
            cameras,
            states,
            selectedCameraId:
              s.selectedCameraId === msg.cameraId ? Object.keys(cameras)[0] ?? null : s.selectedCameraId,
          };
        });
        break;
      }
      case "state": {
        set((s) => ({ states: { ...s.states, [msg.cameraId]: msg.state } }));
        break;
      }
      case "stateDiff": {
        set((s) => {
          const current = s.states[msg.cameraId] ?? {};
          const { next } = applyStateChanges(current, msg.changes);
          return { states: { ...s.states, [msg.cameraId]: next } };
        });
        break;
      }
      case "notification": {
        set((s) => ({ notifications: [...s.notifications, msg.notification].slice(-200) }));
        const n = msg.notification;
        const toastFn =
          n.severity === "error"
            ? toast.error
            : n.severity === "warning"
              ? toast.warning
              : n.severity === "success"
                ? toast.success
                : toast.info;
        toastFn(n.title, { description: n.message });
        break;
      }
      case "notifications": {
        set({ notifications: msg.notifications });
        break;
      }
    }
  },

  setTheme: (theme) => {
    set({ theme });
    document.documentElement.classList.toggle("dark", theme === "dark");
    void api.savePreferences({ theme }).catch(() => undefined);
  },

  setShortcutsHelpOpen: (shortcutsHelpOpen) => set({ shortcutsHelpOpen }),

  selectCamera: (selectedCameraId) => set({ selectedCameraId }),

  addCamera: async (input) => {
    const camera = await api.addCamera(input);
    set((s) => ({ cameras: { ...s.cameras, [camera.id]: camera }, selectedCameraId: camera.id }));
  },

  removeCamera: async (id) => {
    await api.removeCamera(id);
  },

  connectCamera: async (id) => {
    try {
      await api.connect(id);
    } catch (err) {
      toast.error("Failed to connect", { description: (err as Error).message });
    }
  },

  disconnectCamera: async (id) => {
    await api.disconnect(id);
  },

  write: async (cameraId, method, path, body) => {
    const prev = get().states[cameraId]?.[path];
    const optimistic = method !== "DELETE" && body !== undefined && typeof body === "object";
    if (optimistic) get().setLocal(cameraId, path, body);
    try {
      await api.cameraRest(cameraId, method, path, body);
      return true;
    } catch (err) {
      if (optimistic) get().setLocal(cameraId, path, prev);
      const description =
        err instanceof ApiError && err.body && typeof err.body === "object"
          ? JSON.stringify(err.body)
          : (err as Error).message;
      toast.error(`Failed to set ${path}`, { description });
      return false;
    }
  },

  refresh: async (cameraId, path) => {
    try {
      const data = await api.cameraRest(cameraId, "GET", path);
      get().setLocal(cameraId, path, data);
    } catch {
      // unsupported or transient — leave state as-is
    }
  },

  setLocal: (cameraId, path, value) =>
    set((s) => {
      const current = s.states[cameraId] ?? {};
      const { next } = applyStateChanges(current, [{ path, value }]);
      return { states: { ...s.states, [cameraId]: next } };
    }),

  markNotificationsRead: (ids) => {
    set((s) => ({
      notifications: s.notifications.map((n) => (ids && !ids.includes(n.id) ? n : { ...n, read: true })),
    }));
  },

  clearNotifications: async () => {
    set({ notifications: [] });
    await api.clearNotifications().catch(() => undefined);
  },

  loadPreferences: async () => {
    try {
      const prefs: Preferences = await api.preferences();
      const theme = prefs.theme === "light" ? "light" : "dark";
      set({ theme });
      document.documentElement.classList.toggle("dark", theme === "dark");
    } catch {
      // keep default dark
    }
  },
}));

export function useSelectedCamera(): CameraSummary | undefined {
  return useAppStore((s) => (s.selectedCameraId ? s.cameras[s.selectedCameraId] : undefined));
}

export function useCameraState(cameraId: string | null | undefined): CameraStateMap | undefined {
  return useAppStore((s) => (cameraId ? s.states[cameraId] : undefined));
}

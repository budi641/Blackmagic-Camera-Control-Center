import fs from "node:fs";
import path from "node:path";
import type { Preferences, WorkspaceLayout } from "@bmcc/shared";
import type { CameraRecord } from "../cameras/CameraConnection.js";

export interface PersistedData {
  cameras: CameraRecord[];
  workspaces: Record<string, WorkspaceLayout>;
  preferences: Preferences;
}

const DEFAULTS: PersistedData = {
  cameras: [],
  workspaces: {},
  preferences: { theme: "dark" },
};

/** JSON-file persistence with debounced atomic writes. */
export class Store {
  private data: PersistedData;
  private saveTimer: NodeJS.Timeout | null = null;
  private readonly file: string;

  constructor(dataDir: string) {
    this.file = path.join(dataDir, "bmcc-data.json");
    fs.mkdirSync(dataDir, { recursive: true });
    this.data = this.load();
  }

  private load(): PersistedData {
    try {
      const raw = fs.readFileSync(this.file, "utf8");
      return { ...DEFAULTS, ...(JSON.parse(raw) as PersistedData) };
    } catch {
      return structuredClone(DEFAULTS);
    }
  }

  get snapshot(): PersistedData {
    return this.data;
  }

  setCameras(cameras: CameraRecord[]): void {
    // Discovery-sourced cameras are not persisted; they are rediscovered.
    this.data.cameras = cameras.filter((c) => c.source !== "discovery");
    this.scheduleSave();
  }

  setWorkspace(name: string, layout: unknown): void {
    this.data.workspaces[name] = { name, layout, updatedAt: Date.now() };
    this.scheduleSave();
  }

  deleteWorkspace(name: string): void {
    delete this.data.workspaces[name];
    this.scheduleSave();
  }

  setPreferences(prefs: Preferences): void {
    this.data.preferences = { ...this.data.preferences, ...prefs };
    this.scheduleSave();
  }

  flush(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 500);
    this.saveTimer.unref();
  }
}

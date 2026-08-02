import type { DockviewApi } from "dockview";
import { api as rest } from "@/lib/api";
import { toast } from "sonner";

/**
 * Bridge between the dockview workspace instance and app-level controls
 * (top bar, keyboard shortcuts). The workspace registers itself here.
 */
class WorkspaceBridge {
  api: DockviewApi | null = null;

  register(api: DockviewApi | null): void {
    this.api = api;
  }

  async saveCurrentAs(name: string): Promise<void> {
    if (!this.api) return;
    await rest.saveWorkspace(name, this.api.toJSON());
    toast.success(`Workspace "${name}" saved`);
  }

  async applyWorkspace(name: string): Promise<void> {
    if (!this.api) return;
    try {
      const workspaces = await rest.workspaces();
      const ws = workspaces[name];
      if (!ws) throw new Error(`Workspace "${name}" not found`);
      this.api.clear();
      this.api.fromJSON(ws.layout as never);
    } catch (err) {
      toast.error("Failed to apply workspace", { description: (err as Error).message });
    }
  }

  async deleteWorkspace(name: string): Promise<void> {
    await rest.deleteWorkspace(name);
  }

  async autosave(): Promise<void> {
    if (!this.api) return;
    try {
      await rest.saveWorkspace("__current__", this.api.toJSON());
    } catch {
      // autosave is best-effort
    }
  }

  focusPanel(id: string): void {
    if (!this.api) return;
    const existing = this.api.getPanel(id);
    if (existing) {
      existing.focus();
      return;
    }
    this.api.addPanel({
      id,
      component: id,
      title: "Events",
      position: { direction: "below" },
    });
  }
}

export const workspaceBridge = new WorkspaceBridge();

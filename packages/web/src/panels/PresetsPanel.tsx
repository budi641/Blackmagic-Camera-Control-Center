import { useState } from "react";
import { asArray, asString, isRecord } from "@bmcc/shared";
import { Check, Plus, Trash2 } from "lucide-react";
import { useAppStore, useCameraState } from "@/state/store";
import { isPathUnsupported } from "@/lib/camera-state";
import { PanelEmpty } from "@/components/controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function PresetsPanel({ cameraId }: { cameraId: string }) {
  const state = useCameraState(cameraId);
  const camera = useAppStore((s) => s.cameras[cameraId]);
  const write = useAppStore((s) => s.write);
  const refresh = useAppStore((s) => s.refresh);
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (!state) return <PanelEmpty>Camera is not connected.</PanelEmpty>;
  if (isPathUnsupported(camera, "/presets")) {
    return <PanelEmpty>Presets are not supported on this camera.</PanelEmpty>;
  }

  const presets = asArray<string>(
    (state["/presets"] as { presets?: string[] } | undefined)?.presets,
  );
  const active = isRecord(state["/presets/active"]) ? asString(state["/presets/active"]!.preset) : undefined;

  const apply = async (preset: string) => {
    await write(cameraId, "PUT", "/presets/active", { preset });
  };

  const saveCurrentAs = async () => {
    const name = newName.trim();
    if (!name) return;
    const ok = await write(cameraId, "PUT", `/presets/${encodeURIComponent(name)}`);
    if (ok) {
      setNewName("");
      await refresh(cameraId, "/presets");
    }
  };

  const deletePreset = async (preset: string) => {
    const ok = await write(cameraId, "DELETE", `/presets/${encodeURIComponent(preset)}`);
    if (ok) {
      setDeleteTarget(null);
      await refresh(cameraId, "/presets");
    }
  };

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Camera Presets
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {presets.length === 0 ? (
          <PanelEmpty>No presets stored on this camera.</PanelEmpty>
        ) : (
          <div className="flex flex-col gap-1 pr-2">
            {presets.map((preset) => (
              <div
                key={preset}
                className={cn(
                  "group flex items-center gap-2 rounded-md border px-3 py-2",
                  active === preset && "border-emerald-600/50 bg-emerald-600/10",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{preset}</div>
                  {active === preset && <div className="text-xs text-emerald-500">Active</div>}
                </div>
                {active !== preset && (
                  <Button variant="outline" size="sm" onClick={() => void apply(preset)}>
                    <Check /> Apply
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  onClick={() => setDeleteTarget(preset)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="mt-3 flex gap-2">
        <Input
          placeholder="New preset name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void saveCurrentAs()}
        />
        <Button variant="outline" disabled={!newName.trim()} onClick={() => void saveCurrentAs()}>
          <Plus /> Save current
        </Button>
      </div>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete preset?</DialogTitle>
            <DialogDescription>
              Permanently delete &quot;{deleteTarget}&quot; from the camera. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteTarget && void deletePreset(deleteTarget)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

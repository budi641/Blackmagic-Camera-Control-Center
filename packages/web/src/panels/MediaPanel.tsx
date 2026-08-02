import { useState } from "react";
import { asArray, asNumber, asString, isRecord } from "@bmcc/shared";
import { AlertTriangle } from "lucide-react";
import { useAppStore, useCameraState } from "@/state/store";
import { formatBytes, formatDuration, getActiveDeviceName, getMediaStatuses } from "@/lib/camera-state";
import { PanelEmpty } from "@/components/controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function MediaPanel({ cameraId }: { cameraId: string }) {
  const state = useCameraState(cameraId);
  const write = useAppStore((s) => s.write);
  const refresh = useAppStore((s) => s.refresh);
  const [formatTarget, setFormatTarget] = useState<string | null>(null);

  if (!state) return <PanelEmpty>Camera is not connected.</PanelEmpty>;

  const media = getMediaStatuses(state);
  const activeDevice = getActiveDeviceName(state);
  const clips = asArray<Record<string, unknown>>(
    isRecord(state["/clips"]) ? state["/clips"]!.clips : undefined,
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-3">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Storage Devices
        </div>
        {media.length === 0 ? (
          <div className="text-sm text-muted-foreground">No media devices reported.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {media.map(({ device, percentUsed, remainingSeconds }, index) => {
              const isActive = device.deviceName === activeDevice;
              return (
                <div key={device.deviceName ?? index} className="rounded-md border p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{device.volume ?? device.deviceName ?? "Media"}</span>
                      {isActive && <Badge variant="success">Active</Badge>}
                    </div>
                    <div className="flex gap-2">
                      {!isActive && device.deviceName && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void write(cameraId, "PUT", "/media/active", { workingsetIndex: index })
                          }
                        >
                          Set active
                        </Button>
                      )}
                      {device.deviceName && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setFormatTarget(device.deviceName ?? null)}
                        >
                          Format
                        </Button>
                      )}
                    </div>
                  </div>
                  <Progress
                    value={percentUsed}
                    className="h-1.5"
                    indicatorClassName={
                      percentUsed > 95 ? "bg-destructive" : percentUsed > 85 ? "bg-amber-500" : undefined
                    }
                  />
                  <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>
                      {formatBytes(asNumber(device.remainingSpace))} free of {formatBytes(asNumber(device.totalSpace))}
                    </span>
                    <span>
                      {formatDuration(remainingSeconds)} · {asNumber(device.clipCount) ?? 0} clips
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Clips ({clips.length})
          </span>
          <Button variant="ghost" size="sm" onClick={() => void refresh(cameraId, "/clips")}>
            Refresh
          </Button>
        </div>
        <ScrollArea className="h-40">
          {clips.length === 0 ? (
            <div className="text-sm text-muted-foreground">No clips on active media.</div>
          ) : (
            <div className="flex flex-col gap-1 pr-2">
              {clips.map((clip, i) => (
                <div key={i} className="flex items-center justify-between rounded border px-3 py-1.5 text-sm">
                  <span className="font-mono">{asString(clip.name) ?? asString(clip.clipPath) ?? `Clip ${i + 1}`}</span>
                  <span className="text-xs text-muted-foreground">
                    {asString(clip.durationTimecode) ?? ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <FormatDialog
        cameraId={cameraId}
        deviceName={formatTarget}
        onClose={() => setFormatTarget(null)}
      />
    </div>
  );
}

/**
 * Two-step guarded format: fetch a one-time format key from the camera,
 * require typing the device name to confirm, then PUT the format request.
 */
function FormatDialog({
  cameraId,
  deviceName,
  onClose,
}: {
  cameraId: string;
  deviceName: string | null;
  onClose: () => void;
}) {
  const state = useCameraState(cameraId);
  const refresh = useAppStore((s) => s.refresh);
  const [filesystem, setFilesystem] = useState("");
  const [volume, setVolume] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const filesystems = asArray<string>(
    (state?.["/media/devices/doformatSupportedFilesystems"] as { filesystems?: string[] } | undefined)
      ?.filesystems,
  );
  const fsChoice = filesystem || filesystems[0] || "";

  const doFormat = async () => {
    if (!deviceName || confirmText !== deviceName) return;
    setBusy(true);
    try {
      const keyResponse = await api.cameraRest<{ key?: string }>(
        cameraId,
        "GET",
        `/media/devices/${encodeURIComponent(deviceName)}/doformat`,
      );
      const key = keyResponse && typeof keyResponse === "object" ? (keyResponse as { key?: string }).key : undefined;
      if (!key) throw new Error("Camera did not provide a format key");
      await api.cameraRest(cameraId, "PUT", `/media/devices/${encodeURIComponent(deviceName)}/doformat`, {
        key,
        filesystem: fsChoice,
        volume: volume || deviceName,
      });
      toast.success(`Format of ${deviceName} started`);
      onClose();
      await refresh(cameraId, "/media/workingset");
    } catch (err) {
      toast.error("Format failed", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={deviceName !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Format {deviceName}?
          </DialogTitle>
          <DialogDescription>
            Formatting erases all clips on this media. This cannot be undone. Type{" "}
            <span className="font-mono font-semibold">{deviceName}</span> to confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Filesystem</Label>
            <Select value={fsChoice} onValueChange={setFilesystem}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(filesystems.length > 0 ? filesystems : ["exFAT", "HFS+", "APFS"]).map((fs) => (
                  <SelectItem key={fs} value={fs}>
                    {fs}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Volume name</Label>
            <Input value={volume} onChange={(e) => setVolume(e.target.value)} placeholder={deviceName ?? ""} />
          </div>
          <div className="grid gap-1.5">
            <Label>Confirm device name</Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={deviceName ?? ""}
              className="font-mono"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy || !deviceName || confirmText !== deviceName}
            onClick={() => void doFormat()}
          >
            Format Media
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Battery, HardDrive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAppStore, useCameraState } from "@/state/store";
import {
  formatDuration,
  getBattery,
  getCodecLabel,
  getMediaStatuses,
  getRecording,
  getTimecode,
  getVideoFormatLabel,
} from "@/lib/camera-state";
import { RecordButton } from "@/components/RecordButton";
import { PanelEmpty } from "@/components/controls";
import type { CameraSummary } from "@bmcc/shared";

/**
 * Multi-camera overview grid. Video preview tiles slot into these cards in
 * v1.1 (MediaMTX/WebRTC); today they show at-a-glance telemetry + quick REC.
 */
export function MultiViewPanel() {
  const cameras = useAppStore((s) => s.cameras);
  const connected = Object.values(cameras).filter(
    (c) => c.status === "connected" || c.status === "connecting",
  );

  if (connected.length === 0) {
    return <PanelEmpty>Connect a camera to see it here.</PanelEmpty>;
  }

  return (
    <div
      className={cn(
        "grid h-full auto-rows-min gap-3 overflow-auto p-3",
        connected.length === 1 ? "grid-cols-1" : connected.length <= 4 ? "grid-cols-2" : "grid-cols-3",
      )}
    >
      {connected.map((camera) => (
        <CameraTile key={camera.id} camera={camera} />
      ))}
    </div>
  );
}

function CameraTile({ camera }: { camera: CameraSummary }) {
  const state = useCameraState(camera.id);
  const selectedCameraId = useAppStore((s) => s.selectedCameraId);
  const selectCamera = useAppStore((s) => s.selectCamera);
  const recording = getRecording(state);
  const media = getMediaStatuses(state)[0];
  const battery = getBattery(state);
  const selected = selectedCameraId === camera.id;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => selectCamera(camera.id)}
      onKeyDown={(e) => e.key === "Enter" && selectCamera(camera.id)}
      className={cn(
        "flex cursor-pointer flex-col gap-2 rounded-lg border bg-card p-4 transition-colors hover:border-foreground/30",
        selected && "border-foreground/50 ring-1 ring-foreground/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              camera.status === "connected" ? "bg-emerald-500" : "bg-amber-500 animate-pulse",
            )}
          />
          <span className="truncate font-medium">{camera.name}</span>
        </div>
        <Badge variant={recording ? "record" : "secondary"} className={cn(recording && "animate-pulse-record")}>
          {recording ? "REC" : "IDLE"}
        </Badge>
      </div>

      <div className="font-mono text-2xl font-semibold tabular-nums tracking-wider">
        {getTimecode(state) ?? "--:--:--:--"}
      </div>

      <div className="text-sm text-muted-foreground">
        {getVideoFormatLabel(state)} · {getCodecLabel(state)}
      </div>

      {media && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <HardDrive className="h-3.5 w-3.5 shrink-0" />
          <Progress
            value={media.percentUsed}
            className="h-1.5 flex-1"
            indicatorClassName={cn(
              media.percentUsed > 85 && "bg-amber-500",
              media.percentUsed > 95 && "bg-destructive",
            )}
          />
          <span className="shrink-0 tabular-nums">{formatDuration(media.remainingSeconds)}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {battery?.percent !== undefined && (
            <>
              <Battery className="h-3.5 w-3.5" />
              {battery.percent}%
            </>
          )}
        </div>
        <RecordButton cameraId={camera.id} recording={recording} compact />
      </div>
    </div>
  );
}

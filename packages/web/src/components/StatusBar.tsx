import { Battery, BatteryCharging, Circle, HardDrive, Signal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

/** Compact telemetry strip shown for a camera (recording, timecode, media, battery, link). */
export function StatusBar({ cameraId }: { cameraId: string }) {
  const camera = useAppStore((s) => s.cameras[cameraId]);
  const state = useCameraState(cameraId);
  const recording = getRecording(state);
  const timecode = getTimecode(state);
  const media = getMediaStatuses(state)[0];
  const battery = getBattery(state);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-1">
      <Badge
        variant={recording ? "record" : "secondary"}
        className={cn("gap-1.5 px-2.5 py-1", recording && "animate-pulse-record")}
      >
        <Circle className={cn("h-2 w-2 fill-current")} />
        {recording ? "REC" : "STANDBY"}
      </Badge>

      <div className="font-mono text-xl font-semibold tabular-nums tracking-wider">
        {timecode ?? "--:--:--:--"}
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="text-sm text-muted-foreground">
        {getVideoFormatLabel(state)} · {getCodecLabel(state)}
      </div>

      {media && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1.5 text-sm" title="Storage remaining">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span className={cn(media.percentUsed > 85 && "text-amber-500", media.percentUsed > 95 && "text-destructive")}>
              {(100 - media.percentUsed).toFixed(0)}% free
            </span>
            <span className="text-muted-foreground">({formatDuration(media.remainingSeconds)})</span>
          </div>
        </>
      )}

      {battery?.percent !== undefined && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div
            className={cn(
              "flex items-center gap-1.5 text-sm",
              battery.percent < 20 && "text-amber-500",
              battery.percent < 10 && "text-destructive",
            )}
            title={battery.source}
          >
            {battery.charging ? (
              <BatteryCharging className="h-4 w-4" />
            ) : (
              <Battery className="h-4 w-4" />
            )}
            {battery.percent}%
          </div>
        </>
      )}

      {camera?.rttMs !== undefined && camera.status === "connected" && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground" title="Network round-trip time">
            <Signal className="h-4 w-4" />
            {camera.rttMs} ms
          </div>
        </>
      )}
    </div>
  );
}

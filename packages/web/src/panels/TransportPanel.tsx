import { useCameraState } from "@/state/store";
import { getClipCount, getRecording, getTimecode } from "@/lib/camera-state";
import { RecordButton } from "@/components/RecordButton";
import { StatusBar } from "@/components/StatusBar";
import { PanelEmpty } from "@/components/controls";
import { Separator } from "@/components/ui/separator";

/** Recording workflow: status strip + prominent record control + clip info. */
export function TransportPanel({ cameraId }: { cameraId: string }) {
  const state = useCameraState(cameraId);
  if (!state) return <PanelEmpty>Camera is not connected.</PanelEmpty>;

  const recording = getRecording(state);
  const clipCount = getClipCount(state);

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <StatusBar cameraId={cameraId} />
      <Separator />
      <div className="flex items-center gap-4">
        <RecordButton cameraId={cameraId} recording={recording} />
        <div className="text-sm text-muted-foreground">
          <div>Timecode {getTimecode(state) ?? "--:--:--:--"}</div>
          <div>{clipCount !== undefined ? `${clipCount} clips on media` : ""}</div>
        </div>
      </div>
    </div>
  );
}

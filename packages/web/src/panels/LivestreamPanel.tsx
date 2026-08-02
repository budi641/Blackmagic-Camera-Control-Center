import { asArray, asString, isRecord } from "@bmcc/shared";
import { Radio } from "lucide-react";
import { useAppStore, useCameraState } from "@/state/store";
import { isPathUnsupported } from "@/lib/camera-state";
import { Row, SelectRow, PanelEmpty } from "@/components/controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Platform livestream control (YouTube/Twitch/custom SRT/RTMP configured in the app). */
export function LivestreamPanel({ cameraId }: { cameraId: string }) {
  const state = useCameraState(cameraId);
  const camera = useAppStore((s) => s.cameras[cameraId]);
  const write = useAppStore((s) => s.write);
  const refresh = useAppStore((s) => s.refresh);
  if (!state) return <PanelEmpty>Camera is not connected.</PanelEmpty>;

  const un = (path: string) => isPathUnsupported(camera, path);
  const statusValue = state["/livestreams/0"];
  const status = isRecord(statusValue)
    ? asString(statusValue.status) ?? asString(statusValue.mode)
    : undefined;
  const streaming = status !== undefined && /stream|live|active/i.test(status);
  const platforms = asArray<string>(
    (state["/livestreams/platforms"] as { platforms?: string[] } | undefined)?.platforms,
  );
  const activePlatform = isRecord(state["/livestreams/0/activePlatform"])
    ? asString(state["/livestreams/0/activePlatform"]!.platform)
    : undefined;

  const setStreaming = async (start: boolean) => {
    await write(cameraId, "PUT", start ? "/livestreams/0/start" : "/livestreams/0/stop", {});
    await refresh(cameraId, "/livestreams/0");
  };

  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-2 flex items-center gap-2">
        <Radio className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Livestream
        </span>
        <Badge variant={streaming ? "record" : "secondary"} className={streaming ? "animate-pulse-record" : undefined}>
          {status ?? "Unknown"}
        </Badge>
      </div>

      {un("/livestreams/0") ? (
        <PanelEmpty>Livestreaming is not supported on this camera.</PanelEmpty>
      ) : (
        <>
          <SelectRow
            label="Platform"
            value={activePlatform}
            options={platforms}
            onChange={(v) =>
              void write(cameraId, "PUT", "/livestreams/0/activePlatform", { platform: v })
            }
            unsupported={un("/livestreams/0/activePlatform")}
          />
          <Row label="Broadcast">
            {streaming ? (
              <Button variant="record" size="sm" onClick={() => void setStreaming(false)}>
                Stop Stream
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={status === undefined}
                onClick={() => void setStreaming(true)}
              >
                Start Stream
              </Button>
            )}
          </Row>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Custom RTMP/SRT destinations are configured in the Blackmagic Camera app by importing
            a service XML. Once imported, the destination appears in the platform list here.
          </p>
        </>
      )}
    </div>
  );
}

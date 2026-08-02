import { asArray, asNumber, asString, isRecord, readEnabled } from "@bmcc/shared";
import { useAppStore, useCameraState } from "@/state/store";
import { isPathUnsupported } from "@/lib/camera-state";
import { SelectRow, SliderRow, ToggleRow, PanelEmpty } from "@/components/controls";
import { Separator } from "@/components/ui/separator";

export function AudioPanel({ cameraId }: { cameraId: string }) {
  const state = useCameraState(cameraId);
  const camera = useAppStore((s) => s.cameras[cameraId]);
  const write = useAppStore((s) => s.write);
  if (!state) return <PanelEmpty>Camera is not connected.</PanelEmpty>;

  const un = (path: string) => isPathUnsupported(camera, path);
  const channelCount = asNumber((state["/audio/channels"] as { channels?: number } | undefined)?.channels) ?? 0;

  if (channelCount === 0) {
    return <PanelEmpty>No audio channels reported by this camera.</PanelEmpty>;
  }

  return (
    <div className="h-full overflow-auto p-3">
      {Array.from({ length: channelCount }, (_, i) => {
        const base = `/audio/channel/${i}`;
        const level = state[`${base}/level`];
        const gain = isRecord(level) ? asNumber(level.gain) : undefined;
        const desc = state[`${base}/input/description`];
        const gainMin =
          isRecord(desc) && isRecord(desc.description) && isRecord(desc.description.gainRange)
            ? asNumber(desc.description.gainRange.Min) ?? 0
            : 0;
        const gainMax =
          isRecord(desc) && isRecord(desc.description) && isRecord(desc.description.gainRange)
            ? asNumber(desc.description.gainRange.Max) ?? 40
            : 40;
        const capabilities =
          isRecord(desc) && isRecord(desc.description) && isRecord(desc.description.capabilities)
            ? desc.description.capabilities
            : undefined;
        const phantomCapable = capabilities?.PhantomPower === true;
        const lowCutCapable = capabilities?.LowCutFilter === true;

        const input = asString((state[`${base}/input`] as { input?: string } | undefined)?.input);
        const supported = asArray<{ input?: string; available?: boolean }>(
          state[`${base}/supportedInputs`],
        );
        const inputOptions = supported.length
          ? supported.filter((s) => s.available !== false && s.input).map((s) => s.input as string)
          : asArray<string>(state["/audio/supportedInputs"]);

        const phantom = readEnabled(state[`${base}/phantomPower`]);
        const lowCut = readEnabled(state[`${base}/lowCutFilter`]);

        return (
          <div key={i}>
            {i > 0 && <Separator className="my-3" />}
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Channel {i + 1}
            </div>
            <SelectRow
              label="Input"
              value={input}
              options={inputOptions}
              onChange={(v) => void write(cameraId, "PUT", `${base}/input`, { input: v })}
              unsupported={un(`${base}/input`)}
            />
            <SliderRow
              label="Gain"
              value={gain}
              min={gainMin}
              max={gainMax}
              step={0.5}
              onCommit={(v) => void write(cameraId, "PUT", `${base}/level`, { gain: v })}
              format={(v) => `${v.toFixed(1)} dB`}
              unsupported={un(`${base}/level`)}
            />
            {phantomCapable && (
              <ToggleRow
                label="Phantom power"
                checked={phantom}
                onChange={(enabled) =>
                  void write(cameraId, "PUT", `${base}/phantomPower`, { enabled })
                }
                unsupported={un(`${base}/phantomPower`)}
              />
            )}
            {lowCutCapable && (
              <ToggleRow
                label="Low cut filter"
                checked={lowCut}
                onChange={(enabled) =>
                  void write(cameraId, "PUT", `${base}/lowCutFilter`, { enabled })
                }
                unsupported={un(`${base}/lowCutFilter`)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

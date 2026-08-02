import { asNumber, isRecord } from "@bmcc/shared";
import { useAppStore, useCameraState } from "@/state/store";
import { isPathUnsupported } from "@/lib/camera-state";
import { SliderRow, PanelEmpty } from "@/components/controls";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const CHANNELS = [
  { key: "red", label: "Red" },
  { key: "green", label: "Green" },
  { key: "blue", label: "Blue" },
  { key: "luma", label: "Luma" },
] as const;

const SECTIONS = [
  { path: "/colorCorrection/lift", title: "Lift", min: -1, max: 1, neutral: 0 },
  { path: "/colorCorrection/gamma", title: "Gamma", min: 0, max: 2, neutral: 1 },
  { path: "/colorCorrection/gain", title: "Gain", min: 0, max: 2, neutral: 1 },
  { path: "/colorCorrection/offset", title: "Offset", min: -1, max: 1, neutral: 0 },
] as const;

/** DaVinci-style primary color correction (lift/gamma/gain/offset + contrast/color). */
export function ColorPanel({ cameraId }: { cameraId: string }) {
  const state = useCameraState(cameraId);
  const camera = useAppStore((s) => s.cameras[cameraId]);
  const write = useAppStore((s) => s.write);
  if (!state) return <PanelEmpty>Camera is not connected.</PanelEmpty>;

  const un = (path: string) => isPathUnsupported(camera, path);

  const setChannel = (path: string, channel: string, value: number, min: number) => {
    const current = state[path];
    const body = {
      red: isRecord(current) ? asNumber(current.red) ?? min : min,
      green: isRecord(current) ? asNumber(current.green) ?? min : min,
      blue: isRecord(current) ? asNumber(current.blue) ?? min : min,
      luma: isRecord(current) ? asNumber(current.luma) ?? min : min,
      [channel]: value,
    };
    void write(cameraId, "PUT", path, body);
  };

  const resetSection = (path: string, neutral: number) => {
    void write(cameraId, "PUT", path, { red: neutral, green: neutral, blue: neutral, luma: neutral });
  };

  const contrast = state["/colorCorrection/contrast"];
  const contrastPivot = isRecord(contrast) ? asNumber(contrast.pivot) : undefined;
  const contrastAdjust = isRecord(contrast) ? asNumber(contrast.adjust) : undefined;
  const color = state["/colorCorrection/color"];
  const hue = isRecord(color) ? asNumber(color.hue) : undefined;
  const saturation = isRecord(color) ? asNumber(color.saturation) : undefined;
  const lumaContribution = isRecord(state["/colorCorrection/lumaContribution"])
    ? asNumber(state["/colorCorrection/lumaContribution"]!.lumaContribution)
    : undefined;

  return (
    <div className="h-full overflow-auto p-3">
      {SECTIONS.map(({ path, title, min, max, neutral }) => {
        const value = state[path];
        const supported = value !== undefined || !un(path);
        return (
          <div key={path} className={!supported ? "opacity-40" : undefined}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {title}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => resetSection(path, neutral)}
              >
                Reset
              </Button>
            </div>
            {CHANNELS.map(({ key, label }) => (
              <SliderRow
                key={key}
                label={label}
                value={isRecord(value) ? asNumber(value[key]) : undefined}
                min={min}
                max={max}
                step={0.01}
                onCommit={(v) => setChannel(path, key, v, min)}
                format={(v) => v.toFixed(2)}
                unsupported={un(path)}
              />
            ))}
            <Separator className="my-3" />
          </div>
        );
      })}

      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Contrast & Color
      </div>
      <SliderRow
        label="Pivot"
        value={contrastPivot}
        min={0}
        max={1}
        step={0.005}
        onCommit={(v) =>
          void write(cameraId, "PUT", "/colorCorrection/contrast", { pivot: v, adjust: contrastAdjust ?? 1 })
        }
        format={(v) => v.toFixed(3)}
        unsupported={un("/colorCorrection/contrast")}
      />
      <SliderRow
        label="Adjust"
        value={contrastAdjust}
        min={0}
        max={2}
        step={0.01}
        onCommit={(v) =>
          void write(cameraId, "PUT", "/colorCorrection/contrast", { pivot: contrastPivot ?? 0.435, adjust: v })
        }
        format={(v) => v.toFixed(2)}
        unsupported={un("/colorCorrection/contrast")}
      />
      <SliderRow
        label="Hue"
        value={hue}
        min={-180}
        max={180}
        step={1}
        onCommit={(v) =>
          void write(cameraId, "PUT", "/colorCorrection/color", { hue: v, saturation: saturation ?? 1 })
        }
        format={(v) => `${v}°`}
        unsupported={un("/colorCorrection/color")}
      />
      <SliderRow
        label="Saturation"
        value={saturation}
        min={0}
        max={2}
        step={0.01}
        onCommit={(v) =>
          void write(cameraId, "PUT", "/colorCorrection/color", { hue: hue ?? 0, saturation: v })
        }
        format={(v) => v.toFixed(2)}
        unsupported={un("/colorCorrection/color")}
      />
      <SliderRow
        label="Luma contrib."
        value={lumaContribution}
        min={0}
        max={1}
        step={0.01}
        onCommit={(v) => void write(cameraId, "PUT", "/colorCorrection/lumaContribution", { lumaContribution: v })}
        format={(v) => v.toFixed(2)}
        unsupported={un("/colorCorrection/lumaContribution")}
      />
    </div>
  );
}

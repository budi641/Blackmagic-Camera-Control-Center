import { useState } from "react";
import { asArray, asNumber, asString, isRecord, readEnabled } from "@bmcc/shared";
import { useAppStore, useCameraState } from "@/state/store";
import { isPathUnsupported } from "@/lib/camera-state";
import { SelectRow, SliderRow, ToggleRow, PanelEmpty } from "@/components/controls";
import { Separator } from "@/components/ui/separator";

const DISPLAY_TOGGLES = [
  { key: "zebra", label: "Zebra" },
  { key: "focusAssist", label: "Focus assist" },
  { key: "falseColor", label: "False color" },
  { key: "frameGuide", label: "Frame guide" },
  { key: "frameGrids", label: "Grids" },
  { key: "safeArea", label: "Safe area" },
  { key: "displayLUT", label: "Display LUT" },
  { key: "cleanFeed", label: "Clean feed" },
] as const;

export function MonitoringPanel({ cameraId }: { cameraId: string }) {
  const state = useCameraState(cameraId);
  const camera = useAppStore((s) => s.cameras[cameraId]);
  const write = useAppStore((s) => s.write);
  const displays = asArray<string>(
    (state?.["/monitoring/display"] as { displays?: string[] } | undefined)?.displays,
  );
  const [selectedDisplay, setSelectedDisplay] = useState<string | null>(null);
  const display = selectedDisplay ?? displays[0] ?? "LCD";

  if (!state) return <PanelEmpty>Camera is not connected.</PanelEmpty>;
  const un = (path: string) => isPathUnsupported(camera, path);

  const ratioValue = state["/monitoring/frameGuideRatio"];
  const ratio = isRecord(ratioValue)
    ? asString(ratioValue.ratio) ?? asString(ratioValue.frameGuideRatio)
    : undefined;
  const ratioPresets = asArray<string>(
    (state["/monitoring/frameGuideRatio/presets"] as { presets?: string[] } | undefined)?.presets,
  );
  const safeAreaPercent = isRecord(state["/monitoring/safeAreaPercent"])
    ? asNumber(state["/monitoring/safeAreaPercent"]!.safeAreaPercent) ??
      asNumber(state["/monitoring/safeAreaPercent"]!.percent)
    : undefined;

  return (
    <div className="h-full overflow-auto p-3">
      {displays.length > 1 && (
        <SelectRow
          label="Display"
          value={display}
          options={displays}
          onChange={setSelectedDisplay}
        />
      )}

      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Overlays · {display}
      </div>
      {DISPLAY_TOGGLES.map(({ key, label }) => {
        const path = `/monitoring/${encodeURIComponent(display)}/${key}`;
        return (
          <ToggleRow
            key={key}
            label={label}
            checked={readEnabled(state[path])}
            onChange={(enabled) => void write(cameraId, "PUT", path, { enabled })}
            unsupported={un(path)}
          />
        );
      })}

      <Separator className="my-3" />
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Guide Settings
      </div>
      <SelectRow
        label="Guide ratio"
        value={ratio}
        options={ratioPresets.length > 0 ? ratioPresets : ["16:9", "2.39:1", "4:3"]}
        onChange={(v) => void write(cameraId, "PUT", "/monitoring/frameGuideRatio", { ratio: v })}
        unsupported={un("/monitoring/frameGuideRatio")}
      />
      <SliderRow
        label="Safe area"
        value={safeAreaPercent}
        min={0}
        max={100}
        step={5}
        onCommit={(v) =>
          void write(cameraId, "PUT", "/monitoring/safeAreaPercent", { safeAreaPercent: v })
        }
        format={(v) => `${v}%`}
        unsupported={un("/monitoring/safeAreaPercent")}
      />
    </div>
  );
}

import { asArray, asNumber, asString, isRecord } from "@bmcc/shared";
import { useAppStore, useCameraState } from "@/state/store";
import { isPathUnsupported } from "@/lib/camera-state";
import { SelectRow, SliderRow, PanelEmpty } from "@/components/controls";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const WB_PRESETS = [3200, 4300, 5600, 6500, 7500];

export function ExposurePanel({ cameraId }: { cameraId: string }) {
  const state = useCameraState(cameraId);
  const camera = useAppStore((s) => s.cameras[cameraId]);
  const write = useAppStore((s) => s.write);
  if (!state) return <PanelEmpty>Camera is not connected.</PanelEmpty>;

  const un = (path: string) => isPathUnsupported(camera, path);

  const iso = asNumber((state["/video/iso"] as { iso?: number } | undefined)?.iso);
  const supportedIsos = asArray<number>(
    (state["/video/supportedISOs"] as { supportedISOs?: number[] } | undefined)?.supportedISOs,
  );

  const shutter = state["/video/shutter"];
  const shutterAngle = isRecord(shutter) ? asNumber(shutter.shutterAngle) : undefined;
  const shutterSpeed = isRecord(shutter) ? asNumber(shutter.shutterSpeed) : undefined;
  const measurement = asString(
    (state["/video/shutter/measurement"] as { measurement?: string } | undefined)?.measurement,
  );
  const supportedShutters = state["/video/supportedShutters"];
  const shutterAngles = asArray<number>(
    isRecord(supportedShutters) ? supportedShutters.shutterAngles : undefined,
  );
  const shutterSpeeds = asArray<number>(
    isRecord(supportedShutters) ? supportedShutters.shutterSpeeds : undefined,
  );

  const wb = asNumber((state["/video/whiteBalance"] as { whiteBalance?: number } | undefined)?.whiteBalance);
  const wbDesc = state["/video/whiteBalance/description"];
  const wbMin = isRecord(wbDesc) && isRecord(wbDesc.whiteBalance) ? asNumber(wbDesc.whiteBalance.min) ?? 2300 : 2300;
  const wbMax = isRecord(wbDesc) && isRecord(wbDesc.whiteBalance) ? asNumber(wbDesc.whiteBalance.max) ?? 10000 : 10000;

  const tint = asNumber(
    (state["/video/whiteBalanceTint"] as { whiteBalanceTint?: number } | undefined)?.whiteBalanceTint,
  );
  const tintDesc = state["/video/whiteBalanceTint/description"];
  const tintMin = isRecord(tintDesc) && isRecord(tintDesc.whiteBalanceTint) ? asNumber(tintDesc.whiteBalanceTint.min) ?? -50 : -50;
  const tintMax = isRecord(tintDesc) && isRecord(tintDesc.whiteBalanceTint) ? asNumber(tintDesc.whiteBalanceTint.max) ?? 50 : 50;

  const ndStop = asNumber((state["/video/ndFilter"] as { stop?: number } | undefined)?.stop);
  const ndStops = asArray<number>(
    (state["/video/supportedNDFilters"] as { supportedStops?: number[] } | undefined)?.supportedStops,
  );

  const aeMode = asString((state["/video/autoExposure"] as { mode?: string } | undefined)?.mode);
  const gain = asNumber((state["/video/gain"] as { gain?: number } | undefined)?.gain);
  const supportedGains = asArray<number>(
    (state["/video/supportedGains"] as { supportedGains?: number[] } | undefined)?.supportedGains,
  );

  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exposure</div>

      {supportedIsos.length > 0 ? (
        <SelectRow
          label="ISO"
          value={iso !== undefined ? String(iso) : undefined}
          options={supportedIsos}
          onChange={(v) => void write(cameraId, "PUT", "/video/iso", { iso: Number(v) })}
          unsupported={un("/video/iso")}
        />
      ) : (
        <SliderRow
          label="ISO"
          value={iso}
          min={100}
          max={6400}
          step={100}
          onCommit={(v) => void write(cameraId, "PUT", "/video/iso", { iso: v })}
          unsupported={un("/video/iso")}
        />
      )}

      <SelectRow
        label="Shutter mode"
        value={measurement}
        options={["ShutterAngle", "ShutterSpeed"]}
        onChange={(v) => void write(cameraId, "PUT", "/video/shutter/measurement", { measurement: v })}
        unsupported={un("/video/shutter/measurement")}
        formatOption={(o) => (o === "ShutterAngle" ? "Angle" : "Speed")}
      />

      {measurement === "ShutterSpeed" ? (
        <SelectRow
          label="Shutter speed"
          value={shutterSpeed !== undefined ? String(shutterSpeed) : undefined}
          options={shutterSpeeds}
          onChange={(v) => void write(cameraId, "PUT", "/video/shutter", { shutterSpeed: Number(v) })}
          unsupported={un("/video/shutter")}
          formatOption={(o) => `1/${o}`}
        />
      ) : (
        <SelectRow
          label="Shutter angle"
          value={shutterAngle !== undefined ? String(shutterAngle) : undefined}
          options={shutterAngles.length > 0 ? shutterAngles : [180]}
          onChange={(v) => void write(cameraId, "PUT", "/video/shutter", { shutterAngle: Number(v) })}
          unsupported={un("/video/shutter")}
          formatOption={(o) => `${o}°`}
        />
      )}

      {ndStops.length > 0 && (
        <SelectRow
          label="ND filter"
          value={ndStop !== undefined ? String(ndStop) : undefined}
          options={ndStops}
          onChange={(v) => void write(cameraId, "PUT", "/video/ndFilter", { stop: Number(v) })}
          unsupported={un("/video/ndFilter")}
          formatOption={(o) => `${o} stops`}
        />
      )}

      <SelectRow
        label="Auto exposure"
        value={aeMode}
        options={["Off", "Continuous", "OneShot"]}
        onChange={(v) => void write(cameraId, "PUT", "/video/autoExposure", { mode: v })}
        unsupported={un("/video/autoExposure")}
      />

      {supportedGains.length > 0 && (
        <SelectRow
          label="Gain"
          value={gain !== undefined ? String(gain) : undefined}
          options={supportedGains}
          onChange={(v) => void write(cameraId, "PUT", "/video/gain", { gain: Number(v) })}
          unsupported={un("/video/gain")}
          formatOption={(o) => `${o} dB`}
        />
      )}

      <Separator className="my-3" />
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">White Balance</span>
        <Button
          variant="outline"
          size="sm"
          disabled={wb === undefined}
          onClick={() => void write(cameraId, "PUT", "/video/whiteBalance/doAuto", {})}
        >
          Auto WB
        </Button>
      </div>

      <SliderRow
        label="Temperature"
        value={wb}
        min={wbMin}
        max={wbMax}
        step={100}
        onCommit={(v) => void write(cameraId, "PUT", "/video/whiteBalance", { whiteBalance: v })}
        format={(v) => `${v} K`}
        unsupported={un("/video/whiteBalance")}
      />
      <div className="mb-2 flex flex-wrap gap-1 pl-[8.75rem]">
        {WB_PRESETS.map((k) => (
          <Button
            key={k}
            variant={wb === k ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => void write(cameraId, "PUT", "/video/whiteBalance", { whiteBalance: k })}
          >
            {k}K
          </Button>
        ))}
      </div>

      <SliderRow
        label="Tint"
        value={tint}
        min={tintMin}
        max={tintMax}
        step={1}
        onCommit={(v) => void write(cameraId, "PUT", "/video/whiteBalanceTint", { whiteBalanceTint: v })}
        unsupported={un("/video/whiteBalanceTint")}
      />
    </div>
  );
}

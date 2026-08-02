import { asNumber, isRecord } from "@bmcc/shared";
import { useAppStore, useCameraState } from "@/state/store";
import { isPathUnsupported } from "@/lib/camera-state";
import { Row, SliderRow, ToggleRow, PanelEmpty } from "@/components/controls";
import { Button } from "@/components/ui/button";

export function LensPanel({ cameraId }: { cameraId: string }) {
  const state = useCameraState(cameraId);
  const camera = useAppStore((s) => s.cameras[cameraId]);
  const write = useAppStore((s) => s.write);
  if (!state) return <PanelEmpty>Camera is not connected.</PanelEmpty>;

  const un = (path: string) => isPathUnsupported(camera, path);

  const focusDesc = state["/lens/focus/description"];
  const focusControllable = isRecord(focusDesc) ? focusDesc.controllable !== false : true;
  const focus = isRecord(state["/lens/focus"]) ? asNumber(state["/lens/focus"]!.normalised) : undefined;

  const zoomDesc = state["/lens/zoom/description"];
  const zoomControllable = isRecord(zoomDesc) ? zoomDesc.controllable !== false : true;
  const zoomMin = isRecord(zoomDesc) && isRecord(zoomDesc.focalLength) ? asNumber(zoomDesc.focalLength.min) ?? 13 : 13;
  const zoomMax = isRecord(zoomDesc) && isRecord(zoomDesc.focalLength) ? asNumber(zoomDesc.focalLength.max) ?? 120 : 120;
  const focalLength = isRecord(state["/lens/zoom"]) ? asNumber(state["/lens/zoom"]!.focalLength) : undefined;

  const irisDesc = state["/lens/iris/description"];
  const irisControllable = isRecord(irisDesc) ? irisDesc.controllable !== false : true;
  const irisMin = isRecord(irisDesc) && isRecord(irisDesc.apertureStop) ? asNumber(irisDesc.apertureStop.min) ?? 1.4 : 1.4;
  const irisMax = isRecord(irisDesc) && isRecord(irisDesc.apertureStop) ? asNumber(irisDesc.apertureStop.max) ?? 16 : 16;
  const iris = state["/lens/iris"];
  const apertureStop = isRecord(iris) ? asNumber(iris.apertureStop) : undefined;
  const irisAuto = isRecord(iris) ? iris.continuousApertureAutoExposure === true : false;

  const ois = isRecord(state["/lens/opticalImageStabilization"])
    ? state["/lens/opticalImageStabilization"]!.enabled === true
    : undefined;

  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lens</div>

      <Row label="Autofocus" unsupported={un("/lens/focus/doAutoFocus") || !focusControllable}>
        <Button
          variant="outline"
          size="sm"
          disabled={focus === undefined || !focusControllable}
          onClick={() => void write(cameraId, "PUT", "/lens/focus/doAutoFocus", {})}
        >
          Trigger AF
        </Button>
      </Row>

      <SliderRow
        label="Focus"
        value={focus}
        min={0}
        max={1}
        step={0.005}
        onCommit={(v) => void write(cameraId, "PUT", "/lens/focus", { normalised: v })}
        format={(v) => v.toFixed(2)}
        unsupported={un("/lens/focus") || !focusControllable}
      />

      <SliderRow
        label="Zoom"
        value={focalLength}
        min={zoomMin}
        max={zoomMax}
        step={1}
        onCommit={(v) => void write(cameraId, "PUT", "/lens/zoom", { focalLength: v })}
        format={(v) => `${v.toFixed(0)} mm`}
        unsupported={un("/lens/zoom") || !zoomControllable}
      />

      <SliderRow
        label="Iris"
        value={apertureStop}
        min={irisMin}
        max={irisMax}
        step={0.1}
        onCommit={(v) => void write(cameraId, "PUT", "/lens/iris", { apertureStop: v })}
        format={(v) => `f/${v.toFixed(1)}`}
        unsupported={un("/lens/iris") || !irisControllable || irisAuto}
        disabled={irisAuto}
      />

      <ToggleRow
        label="Stabilization"
        checked={ois}
        onChange={(enabled) =>
          void write(cameraId, "PUT", "/lens/opticalImageStabilization", { enabled })
        }
        unsupported={un("/lens/opticalImageStabilization")}
      />
    </div>
  );
}

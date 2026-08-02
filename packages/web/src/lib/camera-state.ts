/**
 * Defensive selectors over the flat per-camera state map. Camera payloads
 * vary by device; these helpers normalize common shapes for the UI.
 */
import {
  asArray,
  asNumber,
  asString,
  isRecord,
  type CameraPower,
  type CameraStateMap,
  type CodecFormat,
  type MediaDevice,
  type MediaWorkingset,
  type RecordState,
  type Timecode,
  type VideoFormat,
} from "@bmcc/shared";

export function getRecording(state: CameraStateMap | undefined): boolean | undefined {
  const rec = state?.["/transports/0/record"] as RecordState | undefined;
  return rec?.recording;
}

export function getTimecode(state: CameraStateMap | undefined): string | undefined {
  const tc = state?.["/transports/0/timecode"] as Timecode | undefined;
  return asString(tc?.display) ?? asString(tc?.timeline);
}

export function getTransportMode(state: CameraStateMap | undefined): string | undefined {
  const t = state?.["/transports/0"];
  return isRecord(t) ? asString(t.mode) : undefined;
}

export function getVideoFormat(state: CameraStateMap | undefined): VideoFormat | undefined {
  const vf = state?.["/system/videoFormat"] as VideoFormat | undefined;
  return vf && typeof vf === "object" ? vf : undefined;
}

export function getVideoFormatLabel(state: CameraStateMap | undefined): string {
  const vf = getVideoFormat(state);
  if (!vf) return "—";
  const parts = [vf.name, vf.frameRate ? `${vf.frameRate}p` : undefined].filter(Boolean);
  return parts.join(" ") || "—";
}

export function getCodec(state: CameraStateMap | undefined): CodecFormat | undefined {
  return state?.["/system/codecFormat"] as CodecFormat | undefined;
}

export function getCodecLabel(state: CameraStateMap | undefined): string {
  const codec = getCodec(state);
  return codec?.codec ?? "—";
}

export interface MediaStatus {
  device: MediaDevice;
  percentUsed: number;
  remainingSeconds?: number;
}

export function getMediaStatuses(state: CameraStateMap | undefined): MediaStatus[] {
  const ws = state?.["/media/workingset"] as MediaWorkingset | undefined;
  return asArray(ws?.workingset)
    .filter((d): d is MediaDevice => isRecord(d))
    .map((device) => {
      const total = asNumber(device.totalSpace) ?? 0;
      const remaining = asNumber(device.remainingSpace) ?? 0;
      return {
        device,
        percentUsed: total > 0 ? ((total - remaining) / total) * 100 : 0,
        remainingSeconds: asNumber(device.remainingRecordTime),
      };
    });
}

export function getActiveDeviceName(state: CameraStateMap | undefined): string | undefined {
  const active = state?.["/media/active"];
  return isRecord(active) ? asString(active.deviceName) : undefined;
}

export interface BatteryStatus {
  percent?: number;
  source?: string;
  charging?: boolean;
}

export function getBattery(state: CameraStateMap | undefined): BatteryStatus | undefined {
  const power = state?.["/camera/power"] as CameraPower | undefined;
  if (!power || typeof power !== "object") return undefined;
  const battery = asArray(power.batteries).find(isRecord);
  const flags = asArray<string>(battery?.statusFlags);
  return {
    percent: asNumber(battery?.chargeRemainingPercent),
    source: asString(power.source),
    charging: flags.some((f) => /charging/i.test(f)),
  };
}

export function getActivePreset(state: CameraStateMap | undefined): string | undefined {
  const preset = state?.["/presets/active"];
  return isRecord(preset) ? asString(preset.preset) : undefined;
}

export function getClipCount(state: CameraStateMap | undefined): number | undefined {
  const clips = state?.["/clips"];
  if (isRecord(clips) && Array.isArray(clips.clips)) return clips.clips.length;
  const ws = state?.["/media/workingset"] as MediaWorkingset | undefined;
  const device = asArray(ws?.workingset).find(isRecord);
  return asNumber(device?.clipCount);
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return "—";
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(0)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}

export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function isPathUnsupported(camera: { unsupportedPaths: string[] } | undefined, path: string): boolean {
  return camera?.unsupportedPaths.includes(path) ?? false;
}

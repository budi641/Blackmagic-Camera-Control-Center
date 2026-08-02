/**
 * Types for the Blackmagic Camera Control REST API payloads.
 * Field names mirror the camera payloads; everything is optional because
 * devices populate only the values they support.
 */

// ---------- System ----------
export interface CodecFormat {
  codec?: string;
  container?: string;
}

export interface VideoFormat {
  name: string;
  frameRate?: string;
  height?: number;
  width?: number;
  interlaced?: boolean;
}

export interface SystemInfo {
  codecFormat?: CodecFormat;
  videoFormat?: VideoFormat;
}

export interface ProductInfo {
  deviceName?: string;
  productName?: string;
  softwareVersion?: string;
}

export interface SupportedFormatsEntry {
  codecs?: string[];
  frameRates?: string[];
  minOffSpeedFrameRate?: number;
  maxOffSpeedFrameRate?: number;
  recordResolution?: { width?: number; height?: number };
  sensorSpeed?: number;
}

export interface SystemFormat {
  codec?: string;
  container?: string;
  frameRate?: string;
  offSpeedFrameRate?: number;
  recordResolution?: { width?: number; height?: number };
  sensorSpeed?: number;
  dynamicRange?: string;
}

// ---------- Transport ----------
export interface TransportStatus {
  mode?: string;
  speed?: number;
  slotId?: number;
  clipIndex?: number;
  displayClipName?: string;
}

export interface PlaybackState {
  type?: string;
  loop?: boolean;
  singleClip?: boolean;
  speed?: number;
  position?: number;
}

export interface RecordState {
  recording?: boolean;
}

export interface Timecode {
  display?: string;
  timeline?: string;
}

export interface TimecodeSource {
  timecode?: string;
}

export interface ClipIndex {
  clipIndex?: number | null;
}

// ---------- Timeline ----------
export interface TimelineClip {
  clipUniqueId?: number;
  frameCount?: number;
  clipIn?: string;
  inTimecode?: string;
  timelineIn?: string;
  timelineInTimecode?: string;
  durationTimecode?: string;
}

export interface Timeline {
  clips?: TimelineClip[];
}

// ---------- Media ----------
export interface MediaDevice {
  volume?: string;
  deviceName?: string;
  remainingRecordTime?: number;
  totalSpace?: number;
  remainingSpace?: number;
  clipCount?: number;
}

export interface MediaWorkingset {
  size?: number;
  workingset?: (MediaDevice | null)[];
}

export interface ActiveMedia {
  workingsetIndex?: number;
  deviceName?: string;
}

// ---------- Slate ----------
export type ShotType = "None" | "WS" | "MS" | "MCU" | "CU" | "BCU" | "ECU";
export type TakeType = "None" | "PU" | "VFX" | "SER";
export type SceneLocation = "Interior" | "Exterior";
export type SceneTime = "Day" | "Night";

export interface SlateClip {
  clipName?: string;
  reel?: number;
  scene?: string;
  sceneLocation?: SceneLocation | string;
  sceneTime?: SceneTime | string;
  shotType?: ShotType | string;
  slateFor?: string;
  take?: number;
  takeType?: TakeType | string;
  goodTake?: boolean;
}

export interface SlateLens {
  lensType?: string;
  iris?: string;
  focalLength?: string;
  distance?: string;
  filter?: string;
}

export interface SlateProject {
  projectName?: string;
  director?: string;
  camera?: string;
  cameraOperator?: string;
}

export interface Slate {
  clip?: SlateClip;
  lens?: SlateLens;
  project?: SlateProject;
}

// ---------- Presets ----------
export interface PresetList {
  presets?: string[];
}

export interface ActivePreset {
  preset?: string;
}

// ---------- Audio ----------
export interface AudioChannels {
  channels?: number;
}

export interface AudioLevel {
  gain?: number;
  normalised?: number;
}

export interface AudioInput {
  input?: string;
}

export interface AudioInputDescription {
  description?: {
    gainRange?: { Min?: number; Max?: number };
    capabilities?: {
      PhantomPower?: boolean;
      LowCutFilter?: boolean;
      Padding?: { available?: boolean; forced?: boolean; value?: number };
    };
  };
}

export interface AudioSupportedInput {
  input?: string;
  available?: boolean;
}

export interface EnabledState {
  enabled?: boolean;
}

export interface AudioPadding {
  padding?: number;
}

// ---------- Lens ----------
export interface LensIris {
  continuousApertureAutoExposure?: boolean;
  apertureStop?: number;
  normalised?: number;
  apertureNumber?: number;
}

export interface LensZoom {
  focalLength?: number;
  normalised?: number;
}

export interface LensFocus {
  normalised?: number;
}

export interface LensIrisDescription {
  controllable?: boolean;
  apertureStop?: { min?: number; max?: number };
}

export interface LensZoomDescription {
  controllable?: boolean;
  focalLength?: { adjustable?: boolean; min?: number; max?: number };
}

export interface LensFocusDescription {
  controllable?: boolean;
  focusDistance?: { adjustable?: boolean; min?: number; max?: number };
}

// ---------- Video ----------
export interface VideoIso {
  iso?: number;
}

export interface SupportedIsos {
  supportedISOs?: number[];
}

export interface VideoGain {
  gain?: number;
}

export interface WhiteBalance {
  whiteBalance?: number;
}

export interface WhiteBalanceDescription {
  whiteBalance?: { min?: number; max?: number };
}

export interface WhiteBalanceTint {
  whiteBalanceTint?: number;
}

export interface WhiteBalanceTintDescription {
  whiteBalanceTint?: { min?: number; max?: number };
}

export interface NdFilter {
  stop?: number;
}

export interface SupportedNdFilters {
  supportedStops?: number[];
}

export interface NdFilterDisplayMode {
  displayMode?: string;
}

export interface Shutter {
  continuousShutterAutoExposure?: boolean;
  shutterSpeed?: number;
  shutterAngle?: number;
}

export interface ShutterMeasurement {
  measurement?: string;
}

export interface SupportedShutterFormats {
  shutterAngles?: number[];
  shutterSpeeds?: number[];
}

export interface AutoExposure {
  mode?: string;
}

export interface DetailSharpening {
  enabled?: boolean;
}

export interface DetailSharpeningLevel {
  level?: number;
}

// ---------- Camera ----------
export interface CameraPower {
  source?: string;
  milliVolt?: number;
  batteries?: {
    milliVolt?: number;
    chargeRemainingPercent?: number;
    statusFlags?: string[];
  }[];
}

export interface PowerDisplayMode {
  mode?: string;
}

export interface TallyStatus {
  status?: string;
  [key: string]: unknown;
}

export interface TimingReferenceLock {
  locked?: boolean;
}

// ---------- Color correction ----------
export interface ColorComponent {
  red?: number;
  green?: number;
  blue?: number;
  luma?: number;
}

export interface Contrast {
  pivot?: number;
  adjust?: number;
}

export interface ColorCorrectionColor {
  hue?: number;
  saturation?: number;
}

export interface LumaContribution {
  lumaContribution?: number;
}

// ---------- Monitoring ----------
export interface MonitoringDisplays {
  displays?: string[];
}

export interface FrameGuideRatio {
  frameGuideRatio?: string;
  ratio?: string;
}

export interface SafeAreaPercent {
  safeAreaPercent?: number;
  percent?: number;
}

// ---------- Livestream ----------
export interface LivestreamStatus {
  status?: string;
  mode?: string;
  [key: string]: unknown;
}

export interface LivestreamPlatform {
  platform?: string;
  [key: string]: unknown;
}

// ---------- Clips ----------
export interface ClipInfo {
  clipUniqueId?: number;
  name?: string;
  clipPath?: string;
  durationTimecode?: string;
  startTimecode?: string;
  [key: string]: unknown;
}

export interface ClipList {
  clips?: ClipInfo[];
}

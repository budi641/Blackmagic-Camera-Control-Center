/**
 * Registry of known Blackmagic Camera Control REST API endpoints.
 * Used for the initial state sweep, capability fallback, and panel metadata.
 * Paths use {param} templates where applicable.
 */

export type EndpointGroup =
  | "event"
  | "system"
  | "transport"
  | "timeline"
  | "media"
  | "slate"
  | "presets"
  | "audio"
  | "lens"
  | "video"
  | "camera"
  | "colorCorrection"
  | "monitoring"
  | "livestream"
  | "clips"
  | "cloud";

export type HttpMethod = "GET" | "PUT" | "POST" | "DELETE";

export interface EndpointDef {
  path: string;
  methods: HttpMethod[];
  group: EndpointGroup;
  /** GET endpoints with no side effects that seed the state store. */
  seed?: boolean;
}

export const ENDPOINTS: EndpointDef[] = [
  // Event
  { path: "/event/list", methods: ["GET"], group: "event" },
  // System
  { path: "/system", methods: ["GET"], group: "system", seed: true },
  { path: "/system/product", methods: ["GET"], group: "system", seed: true },
  { path: "/system/supportedCodecFormats", methods: ["GET"], group: "system", seed: true },
  { path: "/system/codecFormat", methods: ["GET", "PUT"], group: "system", seed: true },
  { path: "/system/videoFormat", methods: ["GET", "PUT"], group: "system", seed: true },
  { path: "/system/supportedVideoFormats", methods: ["GET"], group: "system", seed: true },
  { path: "/system/supportedFormats", methods: ["GET"], group: "system", seed: true },
  { path: "/system/format", methods: ["GET", "PUT"], group: "system", seed: true },
  // Transport
  { path: "/transports/0", methods: ["GET", "PUT"], group: "transport", seed: true },
  { path: "/transports/0/stop", methods: ["POST"], group: "transport" },
  { path: "/transports/0/play", methods: ["POST"], group: "transport" },
  { path: "/transports/0/playback", methods: ["GET", "PUT"], group: "transport", seed: true },
  { path: "/transports/0/record", methods: ["GET", "PUT", "POST"], group: "transport", seed: true },
  { path: "/transports/0/clipIndex", methods: ["GET"], group: "transport", seed: true },
  { path: "/transports/0/timecode", methods: ["GET"], group: "transport", seed: true },
  { path: "/transports/0/timecode/source", methods: ["GET"], group: "transport", seed: true },
  // Timeline
  { path: "/timelines/0", methods: ["GET", "POST", "DELETE"], group: "timeline", seed: true },
  { path: "/timelines/0/add", methods: ["POST"], group: "timeline" },
  { path: "/timelines/0/clear", methods: ["POST"], group: "timeline" },
  { path: "/timelines/0/clips/{timelineClipIndex}", methods: ["DELETE"], group: "timeline" },
  // Media
  { path: "/media/workingset", methods: ["GET"], group: "media", seed: true },
  { path: "/media/active", methods: ["GET", "PUT"], group: "media", seed: true },
  { path: "/media/devices/doformatSupportedFilesystems", methods: ["GET"], group: "media", seed: true },
  { path: "/media/devices/{deviceName}", methods: ["GET"], group: "media" },
  { path: "/media/devices/{deviceName}/doformat", methods: ["GET", "PUT"], group: "media" },
  // Slate
  { path: "/slates/nextClip", methods: ["GET", "PUT"], group: "slate", seed: true },
  { path: "/slates/nextClip/resetProjectData", methods: ["POST"], group: "slate" },
  { path: "/slates/nextClip/resetLensData", methods: ["POST"], group: "slate" },
  { path: "/slates/clips/{deviceName}/{path}", methods: ["GET", "PUT"], group: "slate" },
  { path: "/slates/clips/{deviceName}/{path}/resetProjectData", methods: ["POST"], group: "slate" },
  { path: "/slates/clips/{deviceName}/{path}/resetLensData", methods: ["POST"], group: "slate" },
  // Presets
  { path: "/presets", methods: ["GET", "POST"], group: "presets", seed: true },
  { path: "/presets/active", methods: ["GET", "PUT"], group: "presets", seed: true },
  { path: "/presets/{presetName}", methods: ["GET", "PUT", "DELETE"], group: "presets" },
  // Audio
  { path: "/audio/channels", methods: ["GET"], group: "audio", seed: true },
  { path: "/audio/supportedInputs", methods: ["GET"], group: "audio", seed: true },
  { path: "/audio/channel/{channelIndex}/input", methods: ["GET", "PUT"], group: "audio" },
  { path: "/audio/channel/{channelIndex}/input/description", methods: ["GET"], group: "audio" },
  { path: "/audio/channel/{channelIndex}/supportedInputs", methods: ["GET"], group: "audio" },
  { path: "/audio/channel/{channelIndex}/level", methods: ["GET", "PUT"], group: "audio" },
  { path: "/audio/channel/{channelIndex}/phantomPower", methods: ["GET", "PUT"], group: "audio" },
  { path: "/audio/channel/{channelIndex}/padding", methods: ["GET", "PUT"], group: "audio" },
  { path: "/audio/channel/{channelIndex}/lowCutFilter", methods: ["GET", "PUT"], group: "audio" },
  { path: "/audio/channel/{channelIndex}/available", methods: ["GET"], group: "audio" },
  // Lens
  { path: "/lens/iris", methods: ["GET", "PUT"], group: "lens", seed: true },
  { path: "/lens/zoom", methods: ["GET", "PUT"], group: "lens", seed: true },
  { path: "/lens/focus", methods: ["GET", "PUT"], group: "lens", seed: true },
  { path: "/lens/focus/doAutoFocus", methods: ["PUT"], group: "lens" },
  { path: "/lens/opticalImageStabilization", methods: ["GET", "PUT"], group: "lens", seed: true },
  { path: "/lens/iris/description", methods: ["GET"], group: "lens", seed: true },
  { path: "/lens/zoom/description", methods: ["GET"], group: "lens", seed: true },
  { path: "/lens/focus/description", methods: ["GET"], group: "lens", seed: true },
  // Video
  { path: "/video/iso", methods: ["GET", "PUT"], group: "video", seed: true },
  { path: "/video/supportedISOs", methods: ["GET"], group: "video", seed: true },
  { path: "/video/gain", methods: ["GET", "PUT"], group: "video", seed: true },
  { path: "/video/supportedGains", methods: ["GET"], group: "video", seed: true },
  { path: "/video/whiteBalance", methods: ["GET", "PUT"], group: "video", seed: true },
  { path: "/video/whiteBalance/description", methods: ["GET"], group: "video", seed: true },
  { path: "/video/whiteBalance/doAuto", methods: ["PUT"], group: "video" },
  { path: "/video/whiteBalanceTint", methods: ["GET", "PUT"], group: "video", seed: true },
  { path: "/video/whiteBalanceTint/description", methods: ["GET"], group: "video", seed: true },
  { path: "/video/ndFilter", methods: ["GET", "PUT"], group: "video", seed: true },
  { path: "/video/supportedNDFilters", methods: ["GET"], group: "video", seed: true },
  { path: "/video/supportedNDFilterDisplayModes", methods: ["GET"], group: "video", seed: true },
  { path: "/video/ndFilter/displayMode", methods: ["GET", "PUT"], group: "video", seed: true },
  { path: "/video/ndFilterSelectable", methods: ["GET"], group: "video", seed: true },
  { path: "/video/shutter", methods: ["GET", "PUT"], group: "video", seed: true },
  { path: "/video/shutter/measurement", methods: ["GET", "PUT"], group: "video", seed: true },
  { path: "/video/supportedShutters", methods: ["GET"], group: "video", seed: true },
  { path: "/video/flickerFreeShutters", methods: ["GET"], group: "video", seed: true },
  { path: "/video/autoExposure", methods: ["GET", "PUT"], group: "video", seed: true },
  { path: "/video/detailSharpening", methods: ["GET", "PUT"], group: "video", seed: true },
  { path: "/video/detailSharpeningLevel", methods: ["GET", "PUT"], group: "video", seed: true },
  // Camera
  { path: "/camera/colorBars", methods: ["GET", "PUT"], group: "camera", seed: true },
  { path: "/camera/programFeedDisplay", methods: ["GET", "PUT"], group: "camera", seed: true },
  { path: "/camera/tallyStatus", methods: ["GET"], group: "camera", seed: true },
  { path: "/camera/power", methods: ["GET"], group: "camera", seed: true },
  { path: "/camera/power/displayMode", methods: ["GET", "PUT"], group: "camera", seed: true },
  { path: "/camera/timingReferenceLock", methods: ["GET"], group: "camera", seed: true },
  // Color correction
  { path: "/colorCorrection/lift", methods: ["GET", "PUT"], group: "colorCorrection", seed: true },
  { path: "/colorCorrection/gamma", methods: ["GET", "PUT"], group: "colorCorrection", seed: true },
  { path: "/colorCorrection/gain", methods: ["GET", "PUT"], group: "colorCorrection", seed: true },
  { path: "/colorCorrection/offset", methods: ["GET", "PUT"], group: "colorCorrection", seed: true },
  { path: "/colorCorrection/contrast", methods: ["GET", "PUT"], group: "colorCorrection", seed: true },
  { path: "/colorCorrection/color", methods: ["GET", "PUT"], group: "colorCorrection", seed: true },
  { path: "/colorCorrection/lumaContribution", methods: ["GET", "PUT"], group: "colorCorrection", seed: true },
  // Monitoring
  { path: "/monitoring/display", methods: ["GET"], group: "monitoring", seed: true },
  { path: "/monitoring/{displayName}/cleanFeed", methods: ["GET", "PUT"], group: "monitoring" },
  { path: "/monitoring/{displayName}/displayLUT", methods: ["GET", "PUT"], group: "monitoring" },
  { path: "/monitoring/{displayName}/zebra", methods: ["GET", "PUT"], group: "monitoring" },
  { path: "/monitoring/{displayName}/focusAssist", methods: ["GET", "PUT"], group: "monitoring" },
  { path: "/monitoring/{displayName}/frameGuide", methods: ["GET", "PUT"], group: "monitoring" },
  { path: "/monitoring/{displayName}/frameGrids", methods: ["GET", "PUT"], group: "monitoring" },
  { path: "/monitoring/{displayName}/safeArea", methods: ["GET", "PUT"], group: "monitoring" },
  { path: "/monitoring/{displayName}/falseColor", methods: ["GET", "PUT"], group: "monitoring" },
  { path: "/monitoring/focusAssist", methods: ["GET", "PUT"], group: "monitoring", seed: true },
  { path: "/monitoring/frameGuideRatio", methods: ["GET", "PUT"], group: "monitoring", seed: true },
  { path: "/monitoring/frameGuideRatio/presets", methods: ["GET"], group: "monitoring", seed: true },
  { path: "/monitoring/frameGrids", methods: ["GET", "PUT"], group: "monitoring", seed: true },
  { path: "/monitoring/safeAreaPercent", methods: ["GET", "PUT"], group: "monitoring", seed: true },
  // Livestream
  { path: "/livestreams/0", methods: ["GET"], group: "livestream", seed: true },
  { path: "/livestreams/0/start", methods: ["GET", "PUT"], group: "livestream" },
  { path: "/livestreams/0/stop", methods: ["GET", "PUT"], group: "livestream" },
  { path: "/livestreams/0/activePlatform", methods: ["GET", "PUT"], group: "livestream", seed: true },
  { path: "/livestreams/platforms", methods: ["GET"], group: "livestream", seed: true },
  { path: "/livestreams/platforms/{platformName}", methods: ["GET"], group: "livestream" },
  { path: "/livestreams/customPlatforms", methods: ["GET", "DELETE"], group: "livestream", seed: true },
  { path: "/livestreams/customPlatforms/{filename}", methods: ["GET", "PUT", "DELETE"], group: "livestream" },
  // Clips
  { path: "/clips", methods: ["GET"], group: "clips", seed: true },
  // Cloud
  { path: "/cloud/projects", methods: ["GET"], group: "cloud" },
  { path: "/cloud/projects/active", methods: ["GET"], group: "cloud" },
  { path: "/cloud/clips", methods: ["GET"], group: "cloud" },
  { path: "/cloud/clips/activeUploading", methods: ["GET"], group: "cloud" },
];

/** GET endpoints used to seed the state store on connect. */
export const SEED_ENDPOINTS: string[] = ENDPOINTS.filter((e) => e.seed).map((e) => e.path);

/** Per-channel audio endpoints expanded for the given channel index. */
export function audioChannelEndpoints(channelIndex: number): string[] {
  return [
    `/audio/channel/${channelIndex}/input`,
    `/audio/channel/${channelIndex}/input/description`,
    `/audio/channel/${channelIndex}/supportedInputs`,
    `/audio/channel/${channelIndex}/level`,
    `/audio/channel/${channelIndex}/phantomPower`,
    `/audio/channel/${channelIndex}/padding`,
    `/audio/channel/${channelIndex}/lowCutFilter`,
    `/audio/channel/${channelIndex}/available`,
  ];
}

/** Per-display monitoring endpoints expanded for the given display name. */
export function displayEndpoints(displayName: string): string[] {
  const d = encodeURIComponent(displayName);
  return [
    `/monitoring/${d}/cleanFeed`,
    `/monitoring/${d}/displayLUT`,
    `/monitoring/${d}/zebra`,
    `/monitoring/${d}/focusAssist`,
    `/monitoring/${d}/frameGuide`,
    `/monitoring/${d}/frameGrids`,
    `/monitoring/${d}/safeArea`,
    `/monitoring/${d}/falseColor`,
  ];
}

export const API_BASE_PATH = "/control/api/v1";
export const EVENT_WEBSOCKET_PATH = "/control/api/v1/event/websocket";
export const DOCUMENTATION_PATH = "/control/documentation.html";

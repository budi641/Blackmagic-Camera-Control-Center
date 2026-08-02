import Fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import type { WebSocket } from "ws";
import { API_BASE_PATH, EVENT_WEBSOCKET_PATH } from "@bmcc/shared";

/**
 * A software emulation of a Blackmagic Camera device: the REST API surface,
 * the notification websocket, and plausible live behavior (timecode ticking
 * while recording, storage draining, battery discharging). Enables full
 * development and integration testing without hardware.
 */

interface MockOptions {
  host: string;
  port: number;
}

function toTimecode(totalFrames: number, fps = 24): string {
  const frames = Math.floor(totalFrames % fps);
  const totalSeconds = Math.floor(totalFrames / fps);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600) % 24;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames)}`;
}

export async function createMockCamera(options: MockOptions): Promise<{
  name: string;
  app: FastifyInstance;
  close: () => Promise<void>;
}> {
  const app = Fastify({ logger: false });
  await app.register(websocket);

  // ---------------- Model ----------------

  const model = {
    recording: false,
    timecodeFrames: 24 * 3600 * 24, // 01:00:00:00 @ 24fps
    remainingSpace: 121_000_000_000,
    remainingRecordTime: 4860,
    clipCount: 7,
    batteryPercent: 83,
    streaming: false,
    iso: 400,
    shutterAngle: 172.8,
    shutterSpeed: 48,
    shutterMeasurement: "ShutterAngle",
    whiteBalance: 5600,
    whiteBalanceTint: 0,
    autoExposureMode: "Off",
    gain: 0,
    focus: 0.62,
    zoomFocalLength: 35,
    irisStop: 2.8,
    ois: true,
    videoFormat: { name: "4K DCI", frameRate: "24.00", height: 2160, width: 4096, interlaced: false },
    codecFormat: { codec: "ProRes 422 HQ", container: "MOV" },
    activePreset: "Default",
    presets: ["Default", "Interview", "Daylight Exterior"],
    slate: {
      clip: {
        clipName: "A008C008_260802",
        reel: 1,
        scene: "8",
        sceneLocation: "Exterior",
        sceneTime: "Day",
        shotType: "WS",
        slateFor: "Next Clip",
        take: 1,
        takeType: "None",
        goodTake: false,
      },
      lens: { lensType: "iPhone 15 Pro Main", iris: "f2.8", focalLength: "24mm", distance: "1.2m", filter: "" },
      project: { projectName: "Untitled Project", director: "", camera: "A", cameraOperator: "" },
    },
    displays: ["LCD"],
    displayToggles: {
      cleanFeed: false,
      displayLUT: true,
      zebra: false,
      focusAssist: false,
      frameGuide: true,
      frameGrids: false,
      safeArea: true,
      falseColor: false,
    } as Record<string, boolean>,
    audio: [
      { input: "Internal Mic", gain: 12, phantomPower: false, padding: 0, lowCutFilter: false },
      { input: "Internal Mic", gain: 12, phantomPower: false, padding: 0, lowCutFilter: false },
    ],
    colorBars: false,
  };

  const clients = new Set<WebSocket>();
  const emitProperty = (property: string, value: unknown) => {
    const msg = JSON.stringify({
      type: "event",
      data: { action: "propertyValueChanged", property, value },
    });
    for (const ws of clients) if (ws.readyState === ws.OPEN) ws.send(msg);
  };

  // ---------------- Routes ----------------

  const routes: Record<
    string,
    {
      get?: () => unknown;
      put?: (body: Record<string, unknown>) => void;
      post?: (body: Record<string, unknown>) => void;
      delete?: () => void;
    }
  > = {
    "/system": {
      get: () => ({ codecFormat: model.codecFormat, videoFormat: model.videoFormat }),
    },
    "/system/product": {
      get: () => ({
        deviceName: "Mock iPhone 15 Pro",
        productName: "Blackmagic Camera",
        softwareVersion: "3.4.0",
      }),
    },
    "/system/codecFormat": {
      get: () => model.codecFormat,
      put: (b) => {
        model.codecFormat = { codec: String(b.codec), container: String(b.container ?? "MOV") };
        emitProperty("/system/codecFormat", model.codecFormat);
        emitProperty("/system", { codecFormat: model.codecFormat, videoFormat: model.videoFormat });
      },
    },
    "/system/supportedCodecFormats": {
      get: () => ({
        codecs: [
          { codec: "ProRes 422 HQ", container: "MOV" },
          { codec: "ProRes 422", container: "MOV" },
          { codec: "ProRes 422 LT", container: "MOV" },
          { codec: "ProRes 422 Proxy", container: "MOV" },
          { codec: "H.264", container: "MP4" },
          { codec: "HEVC", container: "MP4" },
        ],
      }),
    },
    "/system/videoFormat": {
      get: () => model.videoFormat,
      put: (b) => {
        model.videoFormat = { ...model.videoFormat, ...(b as object) };
        emitProperty("/system/videoFormat", model.videoFormat);
        emitProperty("/system", { codecFormat: model.codecFormat, videoFormat: model.videoFormat });
      },
    },
    "/system/supportedVideoFormats": {
      get: () => ({
        formats: [
          { name: "4K DCI", frameRate: "24.00", height: 2160, width: 4096, interlaced: false },
          { name: "4K DCI", frameRate: "30.00", height: 2160, width: 4096, interlaced: false },
          { name: "1080p HD", frameRate: "25.00", height: 1080, width: 1920, interlaced: false },
          { name: "1080p HD", frameRate: "60.00", height: 1080, width: 1920, interlaced: false },
        ],
      }),
    },
    "/system/format": {
      get: () => ({
        codec: model.codecFormat.codec,
        frameRate: model.videoFormat.frameRate,
        recordResolution: { width: 4096, height: 2160 },
        dynamicRange: "Apple Log",
      }),
    },
    "/system/supportedFormats": {
      get: () => ({
        supportedFormats: [
          {
            codecs: ["ProRes 422 HQ", "ProRes 422", "H.264", "HEVC"],
            frameRates: ["23.98", "24.00", "25.00", "29.97", "30.00", "50.00", "60.00"],
            recordResolution: { width: 4096, height: 2160 },
          },
        ],
      }),
    },
    "/transports/0": {
      get: () => ({ mode: model.recording ? "InputRecord" : "InputPreview" }),
    },
    "/transports/0/playback": {
      get: () => ({ type: "Play", loop: false, singleClip: false, speed: 0, position: 0 }),
      put: () => undefined,
    },
    "/transports/0/record": {
      get: () => ({ recording: model.recording }),
      put: (b) => setRecording(b.recording === true),
      post: (b) => setRecording(b.recording !== false),
    },
    "/transports/0/stop": { post: () => undefined },
    "/transports/0/play": { post: () => undefined },
    "/transports/0/timecode": {
      get: () => ({
        display: toTimecode(model.timecodeFrames),
        timeline: toTimecode(model.timecodeFrames),
      }),
    },
    "/transports/0/timecode/source": { get: () => ({ timecode: "Clip" }) },
    "/transports/0/clipIndex": { get: () => ({ clipIndex: null }) },
    "/timelines/0": { get: () => ({ clips: [] }) },
    "/media/workingset": {
      get: () => ({
        size: 2,
        workingset: [
          {
            volume: "Internal",
            deviceName: "internal",
            remainingRecordTime: model.remainingRecordTime,
            totalSpace: 256_000_000_000,
            remainingSpace: model.remainingSpace,
            clipCount: model.clipCount,
          },
          null,
        ],
      }),
    },
    "/media/active": {
      get: () => ({ workingsetIndex: 0, deviceName: "internal" }),
      put: () => undefined,
    },
    "/media/devices/doformatSupportedFilesystems": {
      get: () => ({ filesystems: ["APFS", "exFAT", "HFS+"] }),
    },
    "/slates/nextClip": {
      get: () => model.slate,
      put: (b) => {
        model.slate = {
          clip: { ...model.slate.clip, ...((b.clip as object) ?? {}) },
          lens: { ...model.slate.lens, ...((b.lens as object) ?? {}) },
          project: { ...model.slate.project, ...((b.project as object) ?? {}) },
        };
        emitProperty("/slates/nextClip", model.slate);
      },
    },
    "/slates/nextClip/resetProjectData": {
      post: () => {
        model.slate.project = { projectName: "", director: "", camera: "A", cameraOperator: "" };
        emitProperty("/slates/nextClip", model.slate);
      },
    },
    "/slates/nextClip/resetLensData": {
      post: () => {
        model.slate.lens = { lensType: "", iris: "", focalLength: "", distance: "", filter: "" };
        emitProperty("/slates/nextClip", model.slate);
      },
    },
    "/presets": { get: () => ({ presets: model.presets }) },
    "/presets/active": {
      get: () => ({ preset: model.activePreset }),
      put: (b) => {
        model.activePreset = String(b.preset ?? "Default");
        emitProperty("/presets/active", { preset: model.activePreset });
      },
    },
    "/audio/channels": { get: () => ({ channels: model.audio.length }) },
    "/audio/supportedInputs": { get: () => ["Internal Mic", "External Mic", "USB-C Audio"] },
    "/lens/iris": {
      get: () => ({
        continuousApertureAutoExposure: false,
        apertureStop: model.irisStop,
        normalised: (model.irisStop - 1.4) / (16 - 1.4),
        apertureNumber: Math.round(model.irisStop * 10),
      }),
      put: (b) => {
        if (typeof b.apertureStop === "number") model.irisStop = b.apertureStop;
        else if (typeof b.normalised === "number") model.irisStop = 1.4 + b.normalised * (16 - 1.4);
        emitProperty("/lens/iris", routes["/lens/iris"]!.get!());
      },
    },
    "/lens/iris/description": {
      get: () => ({ controllable: true, apertureStop: { min: 1.4, max: 16 } }),
    },
    "/lens/zoom": {
      get: () => ({
        focalLength: model.zoomFocalLength,
        normalised: (model.zoomFocalLength - 24) / (120 - 24),
      }),
      put: (b) => {
        if (typeof b.focalLength === "number") model.zoomFocalLength = b.focalLength;
        else if (typeof b.normalised === "number")
          model.zoomFocalLength = Math.round(24 + b.normalised * (120 - 24));
        emitProperty("/lens/zoom", routes["/lens/zoom"]!.get!());
      },
    },
    "/lens/zoom/description": {
      get: () => ({ controllable: true, focalLength: { adjustable: true, min: 24, max: 120 } }),
    },
    "/lens/focus": {
      get: () => ({ normalised: model.focus }),
      put: (b) => {
        if (typeof b.normalised === "number") model.focus = b.normalised;
        emitProperty("/lens/focus", { normalised: model.focus });
      },
    },
    "/lens/focus/description": {
      get: () => ({ controllable: true, focusDistance: { adjustable: true, min: 300, max: 100000 } }),
    },
    "/lens/focus/doAutoFocus": {
      put: () => {
        model.focus = 0.5;
        emitProperty("/lens/focus", { normalised: model.focus });
      },
    },
    "/lens/opticalImageStabilization": {
      get: () => ({ enabled: model.ois }),
      put: (b) => {
        model.ois = b.enabled === true;
        emitProperty("/lens/opticalImageStabilization", { enabled: model.ois });
      },
    },
    "/video/iso": {
      get: () => ({ iso: model.iso }),
      put: (b) => {
        model.iso = Number(b.iso);
        emitProperty("/video/iso", { iso: model.iso });
      },
    },
    "/video/supportedISOs": {
      get: () => ({ supportedISOs: [100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6400] }),
    },
    "/video/gain": {
      get: () => ({ gain: model.gain }),
      put: (b) => {
        model.gain = Number(b.gain ?? 0);
        emitProperty("/video/gain", { gain: model.gain });
      },
    },
    "/video/supportedGains": { get: () => ({ supportedGains: [0, 6, 12, 18, 24, 30, 36] }) },
    "/video/whiteBalance": {
      get: () => ({ whiteBalance: model.whiteBalance }),
      put: (b) => {
        model.whiteBalance = Number(b.whiteBalance);
        emitProperty("/video/whiteBalance", { whiteBalance: model.whiteBalance });
      },
    },
    "/video/whiteBalance/description": {
      get: () => ({ whiteBalance: { min: 2300, max: 10000 } }),
    },
    "/video/whiteBalance/doAuto": {
      put: () => {
        model.whiteBalance = 5600;
        model.whiteBalanceTint = 0;
        emitProperty("/video/whiteBalance", { whiteBalance: model.whiteBalance });
        emitProperty("/video/whiteBalanceTint", { whiteBalanceTint: model.whiteBalanceTint });
      },
    },
    "/video/whiteBalanceTint": {
      get: () => ({ whiteBalanceTint: model.whiteBalanceTint }),
      put: (b) => {
        model.whiteBalanceTint = Number(b.whiteBalanceTint);
        emitProperty("/video/whiteBalanceTint", { whiteBalanceTint: model.whiteBalanceTint });
      },
    },
    "/video/whiteBalanceTint/description": {
      get: () => ({ whiteBalanceTint: { min: -50, max: 50 } }),
    },
    "/video/shutter": {
      get: () => ({
        continuousShutterAutoExposure: false,
        shutterSpeed: model.shutterSpeed,
        shutterAngle: model.shutterAngle,
      }),
      put: (b) => {
        if (typeof b.shutterAngle === "number") model.shutterAngle = b.shutterAngle;
        if (typeof b.shutterSpeed === "number") model.shutterSpeed = b.shutterSpeed;
        emitProperty("/video/shutter", routes["/video/shutter"]!.get!());
      },
    },
    "/video/shutter/measurement": {
      get: () => ({ measurement: model.shutterMeasurement }),
      put: (b) => {
        model.shutterMeasurement = String(b.measurement ?? "ShutterAngle");
        emitProperty("/video/shutter/measurement", { measurement: model.shutterMeasurement });
      },
    },
    "/video/supportedShutters": {
      get: () => ({
        shutterAngles: [11.2, 15, 22.5, 30, 45, 60, 90, 120, 150, 172.8, 180, 270, 360],
        shutterSpeeds: [24, 25, 30, 40, 48, 50, 60, 96, 100, 120, 250, 500, 1000, 2000, 4000, 8000],
      }),
    },
    "/video/flickerFreeShutters": {
      get: () => ({ shutterAngles: [172.8, 180], shutterSpeeds: [50, 100] }),
    },
    "/video/autoExposure": {
      get: () => ({ mode: model.autoExposureMode }),
      put: (b) => {
        model.autoExposureMode = String(b.mode ?? "Off");
        emitProperty("/video/autoExposure", { mode: model.autoExposureMode });
      },
    },
    "/video/detailSharpening": {
      get: () => ({ enabled: false }),
      put: () => emitProperty("/video/detailSharpening", { enabled: false }),
    },
    "/video/detailSharpeningLevel": {
      get: () => ({ level: 2 }),
      put: () => emitProperty("/video/detailSharpeningLevel", { level: 2 }),
    },
    "/camera/colorBars": {
      get: () => ({ enabled: model.colorBars }),
      put: (b) => {
        model.colorBars = b.enabled === true;
        emitProperty("/camera/colorBars", { enabled: model.colorBars });
      },
    },
    "/camera/power": {
      get: () => ({
        source: "Battery",
        milliVolt: 12400,
        batteries: [
          {
            milliVolt: 12400,
            chargeRemainingPercent: model.batteryPercent,
            statusFlags: ["Battery Is Present"],
          },
        ],
      }),
    },
    "/camera/power/displayMode": {
      get: () => ({ mode: "Percentage" }),
      put: () => emitProperty("/camera/power/displayMode", { mode: "Percentage" }),
    },
    "/camera/timingReferenceLock": { get: () => ({ locked: false }) },
    "/monitoring/display": { get: () => ({ displays: model.displays }) },
    "/monitoring/focusAssist": {
      get: () => ({ method: "Peak", color: "Red" }),
      put: () => emitProperty("/monitoring/focusAssist", { method: "Peak", color: "Red" }),
    },
    "/monitoring/frameGuideRatio": {
      get: () => ({ ratio: "2.39:1" }),
      put: (b) => emitProperty("/monitoring/frameGuideRatio", { ratio: b.ratio ?? "2.39:1" }),
    },
    "/monitoring/frameGuideRatio/presets": {
      get: () => ({ presets: ["4:3", "14:9", "16:9", "1.85:1", "2.35:1", "2.39:1", "2.40:1"] }),
    },
    "/monitoring/frameGrids": {
      get: () => ({ grid: "Thirds" }),
      put: (b) => emitProperty("/monitoring/frameGrids", { grid: b.grid ?? "Thirds" }),
    },
    "/monitoring/safeAreaPercent": {
      get: () => ({ safeAreaPercent: 90 }),
      put: (b) => emitProperty("/monitoring/safeAreaPercent", { safeAreaPercent: b.safeAreaPercent ?? 90 }),
    },
    "/livestreams/0": {
      get: () => ({ status: model.streaming ? "Streaming" : "Idle" }),
    },
    "/livestreams/0/start": {
      put: () => {
        model.streaming = true;
        emitProperty("/livestreams/0", { status: "Streaming" });
      },
    },
    "/livestreams/0/stop": {
      put: () => {
        model.streaming = false;
        emitProperty("/livestreams/0", { status: "Idle" });
      },
    },
    "/livestreams/0/activePlatform": {
      get: () => ({ platform: "Custom SRT" }),
      put: (b) => emitProperty("/livestreams/0/activePlatform", { platform: b.platform ?? "" }),
    },
    "/livestreams/platforms": {
      get: () => ({ platforms: ["YouTube", "Twitch", "Vimeo", "Custom SRT"] }),
    },
    "/livestreams/customPlatforms": { get: () => ({ files: [] }) },
    "/clips": {
      get: () => ({
        clips: [
          { clipUniqueId: 1, name: "A001C001_260802", durationTimecode: "00:02:14:08", startTimecode: "01:00:00:00" },
          { clipUniqueId: 2, name: "A001C002_260802", durationTimecode: "00:00:48:12", startTimecode: "01:02:14:08" },
          { clipUniqueId: 3, name: "A007C003_260802", durationTimecode: "00:05:31:00", startTimecode: "01:03:02:20" },
        ],
      }),
    },
    "/event/list": {
      get: () => ({ events: subscribableProperties() }),
    },
  };

  // Dynamic per-channel audio + per-display monitoring routes.
  for (let i = 0; i < model.audio.length; i++) {
    const ch = model.audio[i]!;
    routes[`/audio/channel/${i}/input`] = {
      get: () => ({ input: ch.input }),
      put: (b) => {
        ch.input = String(b.input ?? ch.input);
        emitProperty(`/audio/channel/${i}/input`, { input: ch.input });
      },
    };
    routes[`/audio/channel/${i}/input/description`] = {
      get: () => ({
        description: {
          gainRange: { Min: 0, Max: 40 },
          capabilities: {
            PhantomPower: false,
            LowCutFilter: true,
            Padding: { available: true, forced: false, value: 0 },
          },
        },
      }),
    };
    routes[`/audio/channel/${i}/supportedInputs`] = {
      get: () => [
        { input: "Internal Mic", available: true },
        { input: "External Mic", available: true },
        { input: "USB-C Audio", available: false },
      ],
    };
    routes[`/audio/channel/${i}/level`] = {
      get: () => ({ gain: ch.gain, normalised: ch.gain / 40 }),
      put: (b) => {
        if (typeof b.gain === "number") ch.gain = b.gain;
        else if (typeof b.normalised === "number") ch.gain = b.normalised * 40;
        emitProperty(`/audio/channel/${i}/level`, { gain: ch.gain, normalised: ch.gain / 40 });
      },
    };
    routes[`/audio/channel/${i}/phantomPower`] = {
      get: () => ({ enabled: ch.phantomPower }),
      put: (b) => {
        ch.phantomPower = b.enabled === true;
        emitProperty(`/audio/channel/${i}/phantomPower`, { enabled: ch.phantomPower });
      },
    };
    routes[`/audio/channel/${i}/padding`] = {
      get: () => ({ padding: ch.padding }),
      put: (b) => {
        ch.padding = Number(b.padding ?? 0);
        emitProperty(`/audio/channel/${i}/padding`, { padding: ch.padding });
      },
    };
    routes[`/audio/channel/${i}/lowCutFilter`] = {
      get: () => ({ enabled: ch.lowCutFilter }),
      put: (b) => {
        ch.lowCutFilter = b.enabled === true;
        emitProperty(`/audio/channel/${i}/lowCutFilter`, { enabled: ch.lowCutFilter });
      },
    };
    routes[`/audio/channel/${i}/available`] = { get: () => ({ available: true }) };
  }
  for (const display of model.displays) {
    for (const key of Object.keys(model.displayToggles)) {
      routes[`/monitoring/${display}/${key}`] = {
        get: () => ({ enabled: model.displayToggles[key] }),
        put: (b) => {
          model.displayToggles[key] = b.enabled === true;
          emitProperty(`/monitoring/${display}/${key}`, { enabled: model.displayToggles[key] });
        },
      };
    }
  }
  for (const section of ["lift", "gamma", "gain", "offset"] as const) {
    const value = { red: section === "lift" ? 0 : 1, green: section === "lift" ? 0 : 1, blue: section === "lift" ? 0 : 1, luma: section === "lift" ? 0 : 1 };
    routes[`/colorCorrection/${section}`] = {
      get: () => value,
      put: (b) => {
        Object.assign(value, b);
        emitProperty(`/colorCorrection/${section}`, value);
      },
    };
  }
  routes["/colorCorrection/contrast"] = {
    get: () => ({ pivot: 0.435, adjust: 1 }),
    put: () => emitProperty("/colorCorrection/contrast", { pivot: 0.435, adjust: 1 }),
  };
  routes["/colorCorrection/color"] = {
    get: () => ({ hue: 0, saturation: 1 }),
    put: () => emitProperty("/colorCorrection/color", { hue: 0, saturation: 1 }),
  };
  routes["/colorCorrection/lumaContribution"] = {
    get: () => ({ lumaContribution: 1 }),
    put: () => emitProperty("/colorCorrection/lumaContribution", { lumaContribution: 1 }),
  };

  function subscribableProperties(): string[] {
    return Object.keys(routes).filter((p) => routes[p]?.get);
  }

  function setRecording(recording: boolean): void {
    if (model.recording === recording) return;
    model.recording = recording;
    if (!recording) {
      model.clipCount += 1;
      model.slate.clip.take += 1;
      model.slate.clip.clipName = `A008C${String(model.slate.clip.take).padStart(3, "0")}_260802`;
      emitProperty("/slates/nextClip", model.slate);
    }
    emitProperty("/transports/0/record", { recording });
    emitProperty("/transports/0", { mode: recording ? "InputRecord" : "InputPreview" });
  }

  // Register HTTP routes.
  app.all(`${API_BASE_PATH}/*`, async (req, reply) => {
    const path = `/${(req.params as Record<string, string>)["*"] ?? ""}`;
    const route = routes[path];
    if (!route) return reply.code(404).send({ error: `Unknown endpoint ${path}` });
    const method = req.method;
    try {
      if (method === "GET" && route.get) return route.get();
      if (method === "PUT" && route.put) {
        route.put((req.body ?? {}) as Record<string, unknown>);
        return reply.code(204).send();
      }
      if (method === "POST" && route.post) {
        route.post((req.body ?? {}) as Record<string, unknown>);
        return reply.code(204).send();
      }
      if (method === "DELETE" && route.delete) {
        route.delete();
        return reply.code(204).send();
      }
      return reply.code(405).send({ error: "Method not allowed" });
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  // OpenAPI documentation (drives the capability registry).
  app.get("/control/documentation.html", async () => {
    return `<!doctype html><html><body><h1>Blackmagic Camera Control API</h1>
      <ul><li><a href="/control/yaml/All.yaml">All.yaml</a></li></ul></body></html>`;
  });
  app.get("/control/yaml/All.yaml", async () => {
    const paths = subscribableProperties()
      .map((p) => `  ${p}:\n    get:\n      summary: mock`)
      .join("\n");
    return `openapi: 3.0.0\ninfo:\n  title: Mock\n  version: 1.0.0\npaths:\n${paths}\n`;
  });

  // Notification websocket.
  app.get(EVENT_WEBSOCKET_PATH, { websocket: true }, (socket) => {
    clients.add(socket);
    socket.send(JSON.stringify({ type: "event", data: { action: "websocketOpened" } }));
    socket.on("message", (raw: Buffer) => {
      let msg: unknown;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      // Accept both {type:"request",data:{action,properties}} and raw ["*"].
      let id: number | undefined;
      if (Array.isArray(msg)) {
        // no-op, treat as subscribe-all
      } else if (typeof msg === "object" && msg !== null && (msg as { type?: string }).type === "request") {
        id = (msg as { id?: number }).id;
      } else {
        return;
      }
      const values: Record<string, unknown> = {};
      for (const p of subscribableProperties()) {
        try {
          values[p] = routes[p]!.get!();
        } catch {
          // skip
        }
      }
      socket.send(
        JSON.stringify({
          type: "response",
          id,
          data: { action: "subscribe", success: true, deviceProperties: subscribableProperties(), values },
        }),
      );
    });
    socket.on("close", () => clients.delete(socket));
  });

  // ---------------- Live behavior ----------------

  const tick = setInterval(() => {
    if (!model.recording) return;
    model.timecodeFrames += 24;
    emitProperty("/transports/0/timecode", {
      display: toTimecode(model.timecodeFrames),
      timeline: toTimecode(model.timecodeFrames),
    });
    model.remainingSpace = Math.max(0, model.remainingSpace - 60_000_000);
    model.remainingRecordTime = Math.max(0, model.remainingRecordTime - 1);
    if (model.timecodeFrames % (24 * 5) === 0) {
      emitProperty("/media/workingset", routes["/media/workingset"]!.get!());
    }
  }, 1000);
  tick.unref();

  const battery = setInterval(() => {
    model.batteryPercent = Math.max(0, model.batteryPercent - 1);
    emitProperty("/camera/power", routes["/camera/power"]!.get!());
  }, 30000);
  battery.unref();

  await app.listen({ port: options.port, host: options.host });

  return {
    name: "Mock Camera",
    app,
    close: async () => {
      clearInterval(tick);
      clearInterval(battery);
      await app.close();
    },
  };
}

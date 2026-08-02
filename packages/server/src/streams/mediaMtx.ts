import { generateServiceXml } from "./serviceXml.js";
import type { PreviewStream, StreamManager } from "./types.js";

export interface MediaMtxConfig {
  /** MediaMTX binary path or docker image reference (v1.1). */
  binaryPath?: string;
  /** Base URL browsers use for WHEP playback (default http://localhost:8889). */
  playbackBaseUrl: string;
  /** Host/port the cameras stream into (default srt://:8890). */
  ingestHost: string;
  ingestPort: number;
}

/**
 * Stub orchestrator for the MediaMTX media server (v1.1). Defines how the
 * backend will run MediaMTX alongside the app, map camera ids to SRT stream
 * paths, and expose WHEP playback URLs to the frontend. Not wired up yet.
 */
export class MediaMtxStreamManager implements StreamManager {
  private streams = new Map<string, PreviewStream>();

  constructor(private readonly config: MediaMtxConfig) {}

  private pathFor(cameraId: string): string {
    return `cam/${cameraId}`;
  }

  async startPreview(cameraId: string): Promise<PreviewStream> {
    // v1.1: ensure MediaMTX is running (spawn binary or docker container),
    // wait for the camera's SRT publish on the ingest path, then report live.
    const stream: PreviewStream = {
      cameraId,
      playbackUrl: `${this.config.playbackBaseUrl}/${this.pathFor(cameraId)}/whep`,
      ingestUrl: `srt://${this.config.ingestHost}:${this.config.ingestPort}?streamid=publish/${this.pathFor(cameraId)}`,
      protocol: "srt",
      state: "stopped",
    };
    this.streams.set(cameraId, stream);
    return stream;
  }

  async stopPreview(cameraId: string): Promise<void> {
    this.streams.delete(cameraId);
  }

  list(): PreviewStream[] {
    return [...this.streams.values()];
  }

  generateServiceXml(cameraId: string): string {
    return generateServiceXml({
      serviceName: `Control Center Preview (${cameraId.slice(0, 6)})`,
      ingestUrl: `srt://${this.config.ingestHost}:${this.config.ingestPort}?streamid=publish/${this.pathFor(cameraId)}`,
    });
  }
}

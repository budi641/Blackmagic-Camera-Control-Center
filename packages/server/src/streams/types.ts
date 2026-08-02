/**
 * v1.1 preview architecture: live video in the multiview tiles.
 *
 * The Blackmagic REST API does not expose a video feed. Instead, the camera
 * app streams SRT/RTMP to a local media server (MediaMTX), which re-serves
 * the stream to browsers over WebRTC. The backend orchestrates that media
 * server and generates the app's custom-platform XML so the phone can import
 * the destination with one tap.
 *
 * This module defines the contract only; the implementation lands in v1.1.
 */

/** A camera's live preview as seen by the frontend. */
export interface PreviewStream {
  cameraId: string;
  /** Playback URL the browser should render (WebRTC/WHEP endpoint). */
  playbackUrl: string;
  /** Ingest URL configured on the camera (SRT/RTMP into MediaMTX). */
  ingestUrl: string;
  protocol: "srt" | "rtmp";
  state: "starting" | "live" | "stalled" | "stopped";
}

export interface StreamManager {
  /** Start (or reuse) a preview pipeline for a camera. */
  startPreview(cameraId: string): Promise<PreviewStream>;
  /** Stop the preview pipeline; the camera keeps streaming to nothing. */
  stopPreview(cameraId: string): Promise<void>;
  /** Current preview state for all cameras. */
  list(): PreviewStream[];
  /** Service XML the camera app imports to add this server as a platform. */
  generateServiceXml(cameraId: string): string;
}

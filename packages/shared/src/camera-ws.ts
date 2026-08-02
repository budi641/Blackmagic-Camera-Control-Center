/**
 * Protocol for the camera's notification websocket at
 * /control/api/v1/event/websocket (AsyncAPI "Notification").
 */

export type CameraWsAction =
  | "subscribe"
  | "unsubscribe"
  | "listSubscriptions"
  | "listProperties"
  | "websocketOpened"
  | "propertyValueChanged";

export interface CameraWsRequest {
  type: "request";
  id?: number;
  data: {
    action: CameraWsAction;
    properties?: string[];
  };
}

export interface CameraWsResponse {
  type: "response";
  id?: number;
  data?: {
    action?: CameraWsAction;
    success?: boolean;
    deviceProperties?: string[];
    values?: Record<string, unknown>;
    properties?: string[];
  };
}

export interface CameraWsEvent {
  type: "event";
  data?: {
    action?: CameraWsAction;
    property?: string;
    value?: unknown;
    values?: Record<string, unknown>;
  };
}

export type CameraWsMessage = CameraWsResponse | CameraWsEvent;

export function isCameraWsEvent(msg: unknown): msg is CameraWsEvent {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as { type?: unknown }).type === "event"
  );
}

export function isCameraWsResponse(msg: unknown): msg is CameraWsResponse {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as { type?: unknown }).type === "response"
  );
}

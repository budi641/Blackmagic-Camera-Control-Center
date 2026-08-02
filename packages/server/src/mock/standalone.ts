import { createMockCamera } from "./mockCamera.js";
import { config } from "../config.js";

const mock = await createMockCamera({ host: config.mockHost, port: config.mockPort });
console.log(
  `[bmcc] mock camera "${mock.name}" on http://${config.mockHost}:${config.mockPort}${"/control/api/v1"}`,
);
console.log("[bmcc] websocket at /control/api/v1/event/websocket");

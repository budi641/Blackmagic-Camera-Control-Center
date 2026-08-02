import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.BMCC_PORT ?? 7600),
  host: process.env.BMCC_HOST ?? "0.0.0.0",
  dataDir: process.env.BMCC_DATA_DIR ?? path.resolve(here, "../data"),
  /** Start an embedded mock camera and auto-connect (dev without hardware). */
  enableMockCamera:
    process.env.BMCC_MOCK === "1" ||
    process.argv.includes("--mock") ||
    process.env.NODE_ENV === "development",
  mockHost: "127.0.0.1",
  mockPort: Number(process.env.BMCC_MOCK_PORT ?? 4510),
  /** Disable mDNS discovery (e.g. in restricted networks / tests). */
  disableDiscovery: process.env.BMCC_NO_DISCOVERY === "1",
};

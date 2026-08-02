import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@bmcc/shared": path.resolve(here, "../shared/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});

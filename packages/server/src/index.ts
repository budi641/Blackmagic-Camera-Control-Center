import { config } from "./config.js";
import { CameraManager } from "./cameras/CameraManager.js";
import { DiscoveryService } from "./discovery/DiscoveryService.js";
import { NotificationEngine } from "./notifications/NotificationEngine.js";
import { Store } from "./persistence/Store.js";
import { buildApp } from "./gateway/app.js";
import { createMockCamera } from "./mock/mockCamera.js";

async function main(): Promise<void> {
  const store = new Store(config.dataDir);
  const manager = new CameraManager((records) => store.setCameras(records));
  manager.loadFromStore(store.snapshot);
  const notifications = new NotificationEngine(manager);

  const discovery = new DiscoveryService();
  if (!config.disableDiscovery) {
    discovery.on("found", (found) => manager.onDiscovered(found));
    discovery.start();
  }

  if (config.enableMockCamera) {
    const mock = await createMockCamera({ host: config.mockHost, port: config.mockPort });
    console.log(`[bmcc] mock camera listening on http://${config.mockHost}:${config.mockPort}`);
    manager.addManual({
      name: mock.name,
      host: config.mockHost,
      port: config.mockPort,
      scheme: "http",
      source: "mock",
      autoConnect: true,
    });
  }

  const app = await buildApp({ manager, notifications, store });
  await app.listen({ port: config.port, host: config.host });
  console.log(`[bmcc] server listening on http://${config.host}:${config.port}`);

  const shutdown = async () => {
    discovery.stop();
    manager.shutdown();
    store.flush();
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

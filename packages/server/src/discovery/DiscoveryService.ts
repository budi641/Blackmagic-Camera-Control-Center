import { EventEmitter } from "node:events";
import Bonjour from "bonjour-service";
import type { DiscoveredCamera } from "../cameras/CameraManager.js";

const BLACKMAGIC_SERVICE_TYPE = "blackmagic"; // _blackmagic._tcp.local.

/**
 * Auto-discovers Blackmagic devices on the LAN via mDNS/Bonjour.
 * Emits "found" (DiscoveredCamera) and "lost" (host).
 */
export class DiscoveryService extends EventEmitter {
  private bonjour: Bonjour | null = null;
  private browser: ReturnType<Bonjour["find"]> | null = null;
  private known = new Map<string, DiscoveredCamera>();

  start(): void {
    try {
      this.bonjour = new Bonjour();
      this.browser = this.bonjour.find({ type: BLACKMAGIC_SERVICE_TYPE });
      this.browser.on("up", (service) => {
        const host = pickAddress(service.addresses ?? []);
        if (!host) return;
        const txt = (service.txt ?? {}) as Record<string, string>;
        const found: DiscoveredCamera = {
          name: txt.name ?? service.name ?? host,
          host,
          port: service.port ?? 4444,
          scheme: service.port === 80 || service.port === 8080 ? "http" : "https",
        };
        this.known.set(host, found);
        this.emit("found", found);
      });
      this.browser.on("down", (service) => {
        const host = pickAddress(service.addresses ?? []);
        if (host && this.known.delete(host)) this.emit("lost", host);
      });
    } catch {
      // mDNS unavailable (sandboxed network etc.) — manual add still works.
    }
  }

  stop(): void {
    this.browser?.stop();
    this.bonjour?.destroy();
    this.browser = null;
    this.bonjour = null;
  }
}

function pickAddress(addresses: string[]): string | undefined {
  return (
    addresses.find((a) => /^\d+\.\d+\.\d+\.\d+$/.test(a)) ??
    addresses.find((a) => !a.includes(":")) ??
    addresses[0]
  );
}

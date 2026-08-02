import yaml from "yaml";
import { DOCUMENTATION_PATH, pathTemplateToRegex } from "@bmcc/shared";
import { CameraClient } from "./CameraClient.js";

/**
 * Determines which endpoints a connected camera supports.
 *
 * Primary source: the device's own OpenAPI documentation served at
 * /control/documentation.html (links YAML specs). This makes the app adapt
 * automatically to new API versions and to differences between the iOS app
 * and hardware cameras. Fallback: assume everything known is supported and
 * mark endpoints unsupported at runtime when they return 404/501.
 */
export class CapabilityRegistry {
  private documented: Set<string> | null = null;
  private documentedRegex: RegExp[] = [];
  private runtimeUnsupported = new Set<string>();

  constructor(private readonly client: CameraClient) {}

  async load(): Promise<void> {
    try {
      const docUrl = `${this.client.baseUrl}${DOCUMENTATION_PATH}`;
      const { data } = await this.client.get<string>(docUrl, 5000);
      const html = typeof data === "string" ? data : "";
      const hrefs = Array.from(html.matchAll(/href=["']([^"']+\.(?:yaml|yml))["']/gi)).map(
        (m) => m[1] as string,
      );
      const paths = new Set<string>();
      await Promise.all(
        hrefs.map(async (href) => {
          try {
            const url = href.startsWith("http")
              ? href
              : `${this.client.baseUrl}${href.startsWith("/") ? href : `/${href}`}`;
            const spec = await this.client.get<string>(url, 5000);
            const parsed = yaml.parse(typeof spec.data === "string" ? spec.data : "") as {
              paths?: Record<string, unknown>;
            } | null;
            for (const p of Object.keys(parsed?.paths ?? {})) paths.add(p);
          } catch {
            // A single unreadable spec must not break capability detection.
          }
        }),
      );
      if (paths.size > 0) {
        this.documented = paths;
        this.documentedRegex = [...paths].map(pathTemplateToRegex);
      }
    } catch {
      this.documented = null;
    }
  }

  markUnsupported(path: string): void {
    this.runtimeUnsupported.add(normalize(path));
  }

  isSupported(path: string): boolean {
    const p = normalize(path);
    if (this.runtimeUnsupported.has(p)) return false;
    if (this.documented) {
      if (this.documented.has(p)) return true;
      return this.documentedRegex.some((re) => re.test(p));
    }
    return true;
  }

  get known(): boolean {
    return this.documented !== null;
  }

  unsupportedPaths(): string[] {
    return [...this.runtimeUnsupported];
  }
}

function normalize(path: string): string {
  return path.split("?")[0] ?? path;
}

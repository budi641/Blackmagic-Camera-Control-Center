import { Agent, fetch as undiciFetch } from "undici";
import { API_BASE_PATH } from "@bmcc/shared";

export class CameraApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "CameraApiError";
  }
}

/** Blackmagic devices use self-signed certificates; we accept them on the LAN. */
const insecureAgent = new Agent({
  connect: { rejectUnauthorized: false, timeout: 5000 },
});

export interface CameraResponse<T = unknown> {
  status: number;
  data: T | null;
}

/**
 * Minimal REST client for one camera. All paths are relative to
 * /control/api/v1 unless they start with "http".
 */
export class CameraClient {
  constructor(
    public readonly baseUrl: string,
    private readonly timeoutMs = 8000,
  ) {}

  apiUrl(path: string): string {
    return `${this.baseUrl}${API_BASE_PATH}${path}`;
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    timeoutMs = this.timeoutMs,
  ): Promise<CameraResponse<T>> {
    const url = path.startsWith("http") ? path : this.apiUrl(path);
    let res;
    try {
      res = await undiciFetch(url, {
        method,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        headers: body !== undefined ? { "content-type": "application/json" } : undefined,
        dispatcher: insecureAgent,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new CameraApiError(0, `Camera unreachable: ${(err as Error).message}`);
    }
    const status = res.status;
    if (status === 204) return { status, data: null };
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (status >= 400) {
      throw new CameraApiError(status, `Camera API ${method} ${path} returned ${status}`, data);
    }
    return { status, data: data as T };
  }

  get<T = unknown>(path: string, timeoutMs?: number) {
    return this.request<T>("GET", path, undefined, timeoutMs);
  }
  put<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, body);
  }
  post<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body);
  }
  delete<T = unknown>(path: string) {
    return this.request<T>("DELETE", path);
  }
}

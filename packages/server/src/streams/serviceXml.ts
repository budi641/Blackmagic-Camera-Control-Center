/**
 * Generates the custom streaming-platform XML that the Blackmagic Camera app
 * imports (Settings → Livestream → Add custom service). Once imported, the
 * destination appears under /livestreams/platforms and can be started from
 * the Livestream panel. v1.1: wire to the orchestrated MediaMTX ingest.
 */
export interface ServiceXmlOptions {
  /** Display name shown in the camera app platform list. */
  serviceName: string;
  /** Ingest URL (e.g. srt://192.168.1.10:8890?streamid=publish/cam1). */
  ingestUrl: string;
}

export function generateServiceXml(options: ServiceXmlOptions): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<streaming>
  <service>
    <name>${escape(options.serviceName)}</name>
    <servers>
      <server>
        <name>Control Center</name>
        <url>${escape(options.ingestUrl)}</url>
      </server>
    </servers>
  </service>
</streaming>
`;
}

import { useCallback, useEffect, useRef, type ComponentType } from "react";
import {
  DockviewReact,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
} from "dockview";
import "dockview/dist/styles/dockview.css";
import { useAppStore } from "@/state/store";
import { api as rest } from "@/lib/api";
import { PanelEmpty } from "@/components/controls";
import { workspaceBridge } from "./workspaceBridge";
import { CameraListPanel } from "@/panels/CameraListPanel";
import { MultiViewPanel } from "@/panels/MultiViewPanel";
import { TransportPanel } from "@/panels/TransportPanel";
import { ExposurePanel } from "@/panels/ExposurePanel";
import { LensPanel } from "@/panels/LensPanel";
import { AudioPanel } from "@/panels/AudioPanel";
import { MonitoringPanel } from "@/panels/MonitoringPanel";
import { SlatePanel } from "@/panels/SlatePanel";
import { PresetsPanel } from "@/panels/PresetsPanel";
import { MediaPanel } from "@/panels/MediaPanel";
import { ColorPanel } from "@/panels/ColorPanel";
import { LivestreamPanel } from "@/panels/LivestreamPanel";
import { NotificationsPanel } from "@/panels/NotificationsPanel";

/** Renders a camera-scoped panel for the currently selected camera. */
function SelectedCameraPanel({
  component: Component,
}: {
  component: ComponentType<{ cameraId: string }>;
}) {
  const selectedCameraId = useAppStore((s) => s.selectedCameraId);
  if (!selectedCameraId) return <PanelEmpty>Select a camera from the list.</PanelEmpty>;
  return <Component cameraId={selectedCameraId} />;
}

const selected =
  (Component: ComponentType<{ cameraId: string }>) =>
  (_props: IDockviewPanelProps) => <SelectedCameraPanel component={Component} />;

const components = {
  cameras: (_props: IDockviewPanelProps) => <CameraListPanel />,
  multiview: (_props: IDockviewPanelProps) => <MultiViewPanel />,
  notifications: (_props: IDockviewPanelProps) => <NotificationsPanel />,
  transport: selected(TransportPanel),
  exposure: selected(ExposurePanel),
  lens: selected(LensPanel),
  audio: selected(AudioPanel),
  monitoring: selected(MonitoringPanel),
  slate: selected(SlatePanel),
  presets: selected(PresetsPanel),
  media: selected(MediaPanel),
  color: selected(ColorPanel),
  livestream: selected(LivestreamPanel),
};

function buildDefaultLayout(api: DockviewReadyEvent["api"]): void {
  api.clear();
  const cameras = api.addPanel({ id: "cameras", component: "cameras", title: "Cameras" });
  const multiview = api.addPanel({
    id: "multiview",
    component: "multiview",
    title: "Multi View",
    position: { referencePanel: "cameras", direction: "right" },
  });
  api.addPanel({
    id: "notifications",
    component: "notifications",
    title: "Events",
    position: { referencePanel: "cameras", direction: "below" },
  });
  const exposure = api.addPanel({
    id: "exposure",
    component: "exposure",
    title: "Exposure",
    position: { referencePanel: "multiview", direction: "right" },
  });
  const tabs: [string, string][] = [
    ["lens", "Lens"],
    ["audio", "Audio"],
    ["color", "Color"],
    ["monitoring", "Monitoring"],
    ["slate", "Slate"],
    ["media", "Media"],
    ["presets", "Presets"],
    ["livestream", "Stream"],
  ];
  for (const [id, title] of tabs) {
    api.addPanel({
      id,
      component: id,
      title,
      position: { referencePanel: "exposure", direction: "within" },
      inactive: true,
    });
  }
  api.addPanel({
    id: "transport",
    component: "transport",
    title: "Recording",
    position: { referencePanel: "multiview", direction: "below" },
  });
  cameras.api.setSize({ width: 280 });
  exposure.api.setSize({ width: 420 });
  multiview.focus();
}

export function Workspace() {
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onReady = useCallback(async (event: DockviewReadyEvent) => {
    const { api } = event;
    workspaceBridge.register(api);

    // Restore previous layout; fall back to the default production layout.
    let restored = false;
    try {
      const workspaces = await rest.workspaces();
      const current = workspaces["__current__"];
      if (current) {
        api.fromJSON(current.layout as never);
        restored = true;
      }
    } catch {
      restored = false;
    }
    if (!restored) buildDefaultLayout(api);

    api.onDidLayoutChange(() => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => void workspaceBridge.autosave(), 1500);
    });
  }, []);

  useEffect(() => {
    const focusEvents = () => workspaceBridge.focusPanel("notifications");
    const reset = () => {
      const api = workspaceBridge.api;
      if (api) buildDefaultLayout(api);
    };
    window.addEventListener("bmcc:focus-notifications", focusEvents);
    window.addEventListener("bmcc:reset-layout", reset);
    return () => {
      window.removeEventListener("bmcc:focus-notifications", focusEvents);
      window.removeEventListener("bmcc:reset-layout", reset);
      workspaceBridge.register(null);
    };
  }, []);

  return (
    <DockviewReact
      className="dockview-theme-dark h-full w-full"
      components={components}
      onReady={(e) => void onReady(e)}
    />
  );
}

import { useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";
import { Square } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/state/store";
import { stream } from "@/lib/ws";
import { getRecording } from "@/lib/camera-state";
import { useHotkeys, type HotkeyBinding } from "@/hooks/useHotkeys";
import { TopBar } from "@/components/TopBar";
import { Workspace } from "@/components/workspace/Workspace";

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: "R", description: "Start / stop recording (stopping asks for confirmation)" },
  { keys: "1–9", description: "Select camera by position in the list" },
  { keys: "F", description: "Toggle fullscreen" },
  { keys: "T", description: "Toggle dark / light theme" },
  { keys: "?", description: "Show keyboard shortcuts" },
];

export default function App() {
  const theme = useAppStore((s) => s.theme);
  const shortcutsHelpOpen = useAppStore((s) => s.shortcutsHelpOpen);
  const setShortcutsHelpOpen = useAppStore((s) => s.setShortcutsHelpOpen);
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);

  useEffect(() => {
    stream.start();
    void useAppStore.getState().loadPreferences();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleRecord = () => {
    const { selectedCameraId, cameras, states, write } = useAppStore.getState();
    if (!selectedCameraId || cameras[selectedCameraId]?.status !== "connected") return;
    if (getRecording(states[selectedCameraId])) {
      setStopConfirmOpen(true);
    } else {
      void write(selectedCameraId, "POST", "/transports/0/record", { recording: true });
    }
  };

  const bindings = useMemo<HotkeyBinding[]>(() => {
    const selectByIndex = (index: number) => () => {
      const { cameras, selectCamera } = useAppStore.getState();
      const camera = Object.values(cameras)[index];
      if (camera) selectCamera(camera.id);
    };
    return [
      { key: "r", handler: toggleRecord, description: "Record" },
      { key: "f", handler: () => {
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen();
        }, description: "Fullscreen" },
      { key: "t", handler: () => {
          const { theme: t, setTheme } = useAppStore.getState();
          setTheme(t === "dark" ? "light" : "dark");
        }, description: "Theme" },
      { key: "?", handler: () => setShortcutsHelpOpen(true), description: "Help" },
      ...Array.from({ length: 9 }, (_, i) => ({
        key: String(i + 1),
        handler: selectByIndex(i),
        description: `Select camera ${i + 1}`,
      })),
    ];
  }, [setShortcutsHelpOpen]);
  useHotkeys(bindings);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopBar />
        <main className="min-h-0 flex-1">
          <Workspace />
        </main>
      </div>

      <Toaster theme={theme} position="top-right" richColors closeButton />

      <Dialog open={shortcutsHelpOpen} onOpenChange={setShortcutsHelpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{s.description}</span>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={stopConfirmOpen} onOpenChange={setStopConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop recording?</DialogTitle>
            <DialogDescription>This will stop the current recording on the selected camera.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopConfirmOpen(false)}>
              Keep Recording
            </Button>
            <Button
              variant="record"
              onClick={() => {
                const { selectedCameraId, write } = useAppStore.getState();
                if (selectedCameraId) {
                  void write(selectedCameraId, "POST", "/transports/0/record", { recording: false });
                }
                setStopConfirmOpen(false);
              }}
            >
              <Square className="fill-current" /> Stop Recording
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

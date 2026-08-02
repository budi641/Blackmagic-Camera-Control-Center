import { useState } from "react";
import { Camera, Plus, Trash2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/state/store";
import type { CameraSummary } from "@bmcc/shared";
import { PanelEmpty } from "@/components/controls";

const STATUS_DOT: Record<CameraSummary["status"], string> = {
  connected: "bg-emerald-500",
  connecting: "bg-amber-500 animate-pulse",
  disconnected: "bg-zinc-500",
  error: "bg-red-500",
};

export function CameraListPanel() {
  const cameras = useAppStore((s) => s.cameras);
  const selectedCameraId = useAppStore((s) => s.selectedCameraId);
  const selectCamera = useAppStore((s) => s.selectCamera);
  const connectCamera = useAppStore((s) => s.connectCamera);
  const disconnectCamera = useAppStore((s) => s.disconnectCamera);
  const removeCamera = useAppStore((s) => s.removeCamera);
  const list = Object.values(cameras);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Cameras</span>
        <AddCameraDialog />
      </div>
      <ScrollArea className="flex-1">
        {list.length === 0 ? (
          <PanelEmpty>
            No cameras yet. Cameras on your network appear automatically, or add one manually.
          </PanelEmpty>
        ) : (
          <div className="flex flex-col p-1">
            {list.map((camera) => (
              <div
                key={camera.id}
                role="button"
                tabIndex={0}
                onClick={() => selectCamera(camera.id)}
                onKeyDown={(e) => e.key === "Enter" && selectCamera(camera.id)}
                className={cn(
                  "group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent",
                  selectedCameraId === camera.id && "bg-accent",
                )}
              >
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", STATUS_DOT[camera.status])} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{camera.name}</span>
                    {camera.source === "discovery" && (
                      <Badge variant="outline" className="px-1 py-0 text-[10px]">
                        found
                      </Badge>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {camera.host}:{camera.port}
                    {camera.rttMs !== undefined && camera.status === "connected"
                      ? ` · ${camera.rttMs} ms`
                      : ""}
                    {camera.status === "error" ? ` · ${camera.error ?? "error"}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {camera.status === "connected" || camera.status === "connecting" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Disconnect"
                      onClick={(e) => {
                        e.stopPropagation();
                        void disconnectCamera(camera.id);
                      }}
                    >
                      <WifiOff />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Connect"
                      onClick={(e) => {
                        e.stopPropagation();
                        void connectCamera(camera.id);
                      }}
                    >
                      <Wifi />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    title="Remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      void removeCamera(camera.id);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function AddCameraDialog() {
  const addCamera = useAppStore((s) => s.addCamera);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("4444");
  const [scheme, setScheme] = useState<"http" | "https">("https");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!host.trim()) {
      setError("Host is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addCamera({
        name: name.trim() || host.trim(),
        host: host.trim(),
        port: Number(port) || 4444,
        scheme,
        autoConnect: true,
      });
      setOpen(false);
      setName("");
      setHost("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Add camera manually">
          <Plus />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Add Camera
          </DialogTitle>
          <DialogDescription>
            Enter the address of a Blackmagic Camera device (iOS app uses HTTPS on port 4444).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="cam-name">Name</Label>
            <Input id="cam-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Camera A" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cam-host">Host / IP address</Label>
            <Input id="cam-host" value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.50" />
          </div>
          <div className="flex gap-3">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="cam-port">Port</Label>
              <Input id="cam-port" value={port} onChange={(e) => setPort(e.target.value)} />
            </div>
            <div className="grid flex-1 gap-1.5">
              <Label>Protocol</Label>
              <Select value={scheme} onValueChange={(v) => setScheme(v as "http" | "https")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="https">HTTPS</SelectItem>
                  <SelectItem value="http">HTTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            Add & Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

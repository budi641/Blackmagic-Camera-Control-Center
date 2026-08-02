import { useEffect, useState } from "react";
import {
  Bell,
  Clapperboard,
  LayoutGrid,
  Maximize,
  Minimize,
  Moon,
  Keyboard,
  RotateCcw,
  Save,
  Sun,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/state/store";
import { api as rest } from "@/lib/api";
import { workspaceBridge } from "./workspace/workspaceBridge";
import { cn } from "@/lib/utils";

export function TopBar() {
  const wsStatus = useAppStore((s) => s.wsStatus);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationsRead = useAppStore((s) => s.markNotificationsRead);
  const setShortcutsHelpOpen = useAppStore((s) => s.setShortcutsHelpOpen);
  const unread = notifications.filter((n) => !n.read).length;

  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  };

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b bg-background px-3">
      <div className="flex items-center gap-2 font-semibold">
        <Clapperboard className="h-4 w-4" />
        <span className="hidden sm:inline">Camera Control Center</span>
        <span className="sm:hidden">BMCC</span>
      </div>

      <div
        className={cn(
          "ml-1 h-2 w-2 rounded-full",
          wsStatus === "open" ? "bg-emerald-500" : wsStatus === "connecting" ? "bg-amber-500" : "bg-red-500",
        )}
        title={`Backend ${wsStatus}`}
      />

      <div className="flex-1" />

      <WorkspacesMenu />

      <Button
        variant="ghost"
        size="icon"
        title="Reset layout"
        onClick={() => window.dispatchEvent(new CustomEvent("bmcc:reset-layout"))}
      >
        <RotateCcw />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        title="Keyboard shortcuts (?)"
        onClick={() => setShortcutsHelpOpen(true)}
      >
        <Keyboard />
      </Button>

      <Button variant="ghost" size="icon" title="Toggle theme (T)" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        {theme === "dark" ? <Sun /> : <Moon />}
      </Button>

      <Button variant="ghost" size="icon" title="Fullscreen (F)" onClick={toggleFullscreen}>
        {fullscreen ? <Minimize /> : <Maximize />}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="relative"
        title="Events"
        onClick={() => {
          markNotificationsRead();
          window.dispatchEvent(new CustomEvent("bmcc:focus-notifications"));
        }}
      >
        <Bell />
        {unread > 0 && (
          <Badge variant="record" className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]">
            {unread > 99 ? "99+" : unread}
          </Badge>
        )}
      </Button>
    </header>
  );
}

function WorkspacesMenu() {
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");

  const load = async () => {
    try {
      const all = await rest.workspaces();
      setWorkspaces(Object.keys(all).filter((w) => w !== "__current__").sort());
    } catch {
      // server unreachable
    }
  };

  return (
    <>
      <DropdownMenu onOpenChange={(open) => open && void load()}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" title="Workspaces">
            <LayoutGrid /> <span className="hidden md:inline">Workspaces</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Saved workspaces</DropdownMenuLabel>
          {workspaces.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">No saved layouts yet.</div>
          )}
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws}
              className="justify-between"
              onSelect={() => void workspaceBridge.applyWorkspace(ws)}
            >
              <span className="truncate">{ws}</span>
              <span
                role="button"
                className="ml-2 rounded p-0.5 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  void workspaceBridge.deleteWorkspace(ws).then(load);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setSaveOpen(true)}>
            <Save /> Save current layout…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.dispatchEvent(new CustomEvent("bmcc:reset-layout"))}>
            <RotateCcw /> Reset to default
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save workspace</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Workspace name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                void workspaceBridge.saveCurrentAs(name.trim()).then(() => setSaveOpen(false));
                setName("");
              }
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              disabled={!name.trim()}
              onClick={() => {
                void workspaceBridge.saveCurrentAs(name.trim()).then(() => setSaveOpen(false));
                setName("");
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

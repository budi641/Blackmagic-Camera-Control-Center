import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { useAppStore } from "@/state/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { NotificationSeverity } from "@bmcc/shared";
import { PanelEmpty } from "@/components/controls";

const ICONS: Record<NotificationSeverity, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const COLORS: Record<NotificationSeverity, string> = {
  info: "text-sky-500",
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-red-500",
};

export function NotificationsPanel() {
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationsRead = useAppStore((s) => s.markNotificationsRead);
  const clearNotifications = useAppStore((s) => s.clearNotifications);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Events</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => markNotificationsRead()}>
            Mark read
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void clearNotifications()}>
            Clear
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        {notifications.length === 0 ? (
          <PanelEmpty>No events yet. Recording, storage, battery, and connection events appear here.</PanelEmpty>
        ) : (
          <div className="flex flex-col-reverse p-1">
            {[...notifications].reverse().map((n) => {
              const Icon = ICONS[n.severity];
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-2.5 rounded-md px-3 py-2",
                    !n.read && "bg-accent/50",
                  )}
                >
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", COLORS[n.severity])} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{n.title}</div>
                    {n.message && <div className="text-xs text-muted-foreground">{n.message}</div>}
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(n.ts).toLocaleTimeString()}
                      {n.cameraName ? ` · ${n.cameraName}` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

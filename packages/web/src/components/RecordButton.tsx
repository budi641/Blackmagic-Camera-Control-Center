import { useState } from "react";
import { Circle, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/state/store";

/**
 * Record toggle. Starting is immediate; stopping asks for confirmation to
 * prevent accidental clip termination (destructive-action guard).
 */
export function RecordButton({
  cameraId,
  recording,
  compact,
}: {
  cameraId: string;
  recording: boolean | undefined;
  compact?: boolean;
}) {
  const write = useAppStore((s) => s.write);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    await write(cameraId, "POST", "/transports/0/record", { recording: true });
    setBusy(false);
  };

  const stop = async () => {
    setBusy(true);
    await write(cameraId, "POST", "/transports/0/record", { recording: false });
    setBusy(false);
    setConfirmOpen(false);
  };

  const onClick = () => {
    if (recording) setConfirmOpen(true);
    else void start();
  };

  return (
    <>
      <Button
        variant={recording ? "record" : "secondary"}
        size={compact ? "sm" : "default"}
        disabled={busy || recording === undefined}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(recording && "animate-pulse-record")}
      >
        {recording ? <Square className="fill-current" /> : <Circle className="fill-current" />}
        {compact ? (recording ? "STOP" : "REC") : recording ? "Stop Recording" : "Record"}
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop recording?</DialogTitle>
            <DialogDescription>
              This will stop the current recording on this camera.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep Recording
            </Button>
            <Button variant="record" onClick={() => void stop()} disabled={busy}>
              <Square className="fill-current" /> Stop Recording
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

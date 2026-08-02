import { useEffect, useState } from "react";
import { isRecord, type Slate } from "@bmcc/shared";
import { useAppStore, useCameraState } from "@/state/store";
import { isPathUnsupported } from "@/lib/camera-state";
import { PanelEmpty } from "@/components/controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, RotateCcw, Save } from "lucide-react";

const SHOT_TYPES = ["None", "WS", "MS", "MCU", "CU", "BCU", "ECU"];
const TAKE_TYPES = ["None", "PU", "VFX", "SER"];
const SCENE_LOCATIONS = ["Interior", "Exterior"];
const SCENE_TIMES = ["Day", "Night"];

/** Digital slate editor for the next clip: scene/take metadata + project info. */
export function SlatePanel({ cameraId }: { cameraId: string }) {
  const state = useCameraState(cameraId);
  const camera = useAppStore((s) => s.cameras[cameraId]);
  const write = useAppStore((s) => s.write);
  const refresh = useAppStore((s) => s.refresh);
  const remote = state?.["/slates/nextClip"] as Slate | undefined;

  const [draft, setDraft] = useState<Slate>({});
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty && remote) setDraft(remote);
  }, [remote, dirty]);

  if (!state) return <PanelEmpty>Camera is not connected.</PanelEmpty>;
  if (isPathUnsupported(camera, "/slates/nextClip")) {
    return <PanelEmpty>Digital slate is not supported on this camera.</PanelEmpty>;
  }

  const update = (section: "clip" | "lens" | "project", key: string, value: unknown) => {
    setDraft((d) => ({ ...d, [section]: { ...(d[section] ?? {}), [key]: value } }));
    setDirty(true);
  };

  const save = async () => {
    const ok = await write(cameraId, "PUT", "/slates/nextClip", {
      clip: draft.clip,
      lens: draft.lens,
      project: draft.project,
    });
    if (ok) {
      setDirty(false);
      await refresh(cameraId, "/slates/nextClip");
    }
  };

  const bumpTake = () => {
    const take = (draft.clip?.take ?? 0) + 1;
    update("clip", "take", take);
  };

  const clip = draft.clip ?? {};
  const lens = draft.lens ?? {};
  const project = draft.project ?? {};

  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Next Clip Slate
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void write(cameraId, "POST", "/slates/nextClip/resetLensData", {}).then(() => setDirty(false))}
          >
            <RotateCcw /> Lens
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void write(cameraId, "POST", "/slates/nextClip/resetProjectData", {}).then(() => setDirty(false))}
          >
            <RotateCcw /> Project
          </Button>
          <Button size="sm" disabled={!dirty} onClick={() => void save()}>
            <Save /> Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Clip name">
          <Input value={clip.clipName ?? ""} readOnly disabled className="font-mono" />
        </Field>
        <div className="flex gap-2">
          <Field label="Reel" className="flex-1">
            <Input
              type="number"
              value={clip.reel ?? ""}
              onChange={(e) => update("clip", "reel", Number(e.target.value))}
            />
          </Field>
          <Field label="Take" className="flex-1">
            <div className="flex gap-1">
              <Input
                type="number"
                value={clip.take ?? ""}
                onChange={(e) => update("clip", "take", Number(e.target.value))}
              />
              <Button variant="outline" size="icon" className="shrink-0" onClick={bumpTake} title="Increment take">
                <Plus />
              </Button>
            </div>
          </Field>
        </div>
        <Field label="Scene">
          <Input value={clip.scene ?? ""} onChange={(e) => update("clip", "scene", e.target.value)} />
        </Field>
        <Field label="Shot type">
          <Select value={clip.shotType ?? "None"} onValueChange={(v) => update("clip", "shotType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SHOT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Take type">
          <Select value={clip.takeType ?? "None"} onValueChange={(v) => update("clip", "takeType", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TAKE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Location">
          <Select value={clip.sceneLocation ?? "Interior"} onValueChange={(v) => update("clip", "sceneLocation", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SCENE_LOCATIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Time of day">
          <Select value={clip.sceneTime ?? "Day"} onValueChange={(v) => update("clip", "sceneTime", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SCENE_TIMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Good take">
          <div className="flex h-9 items-center">
            <Switch checked={clip.goodTake ?? false} onCheckedChange={(v) => update("clip", "goodTake", v)} />
          </div>
        </Field>
      </div>

      <Separator className="my-4" />
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lens</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Lens type">
          <Input value={lens.lensType ?? ""} onChange={(e) => update("lens", "lensType", e.target.value)} />
        </Field>
        <Field label="Iris">
          <Input value={lens.iris ?? ""} onChange={(e) => update("lens", "iris", e.target.value)} placeholder="f/2.8" />
        </Field>
        <Field label="Focal length">
          <Input value={lens.focalLength ?? ""} onChange={(e) => update("lens", "focalLength", e.target.value)} />
        </Field>
        <Field label="Focus distance">
          <Input value={lens.distance ?? ""} onChange={(e) => update("lens", "distance", e.target.value)} />
        </Field>
        <Field label="Filter">
          <Input value={lens.filter ?? ""} onChange={(e) => update("lens", "filter", e.target.value)} />
        </Field>
      </div>

      <Separator className="my-4" />
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Project name">
          <Input value={project.projectName ?? ""} onChange={(e) => update("project", "projectName", e.target.value)} />
        </Field>
        <Field label="Director">
          <Input value={project.director ?? ""} onChange={(e) => update("project", "director", e.target.value)} />
        </Field>
        <Field label="Camera">
          <Input value={project.camera ?? ""} onChange={(e) => update("project", "camera", e.target.value)} />
        </Field>
        <Field label="Camera operator">
          <Input value={project.cameraOperator ?? ""} onChange={(e) => update("project", "cameraOperator", e.target.value)} />
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {isRecord(children) ? children : children}
    </div>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Standard label/control/value row used by every control panel. */
export function Row({
  label,
  children,
  value,
  unsupported,
  className,
}: {
  label: string;
  children?: ReactNode;
  value?: ReactNode;
  unsupported?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-1.5",
        unsupported && "pointer-events-none opacity-40",
        className,
      )}
    >
      <div className="w-32 shrink-0 truncate text-sm text-muted-foreground" title={label}>
        {label}
        {unsupported ? " · n/a" : ""}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
      {value !== undefined && (
        <div className="w-24 shrink-0 text-right font-mono text-sm tabular-nums">{value}</div>
      )}
    </div>
  );
}

export function ToggleRow({
  label,
  checked,
  onChange,
  unsupported,
  disabled,
}: {
  label: string;
  checked: boolean | undefined;
  onChange: (checked: boolean) => void;
  unsupported?: boolean;
  disabled?: boolean;
}) {
  return (
    <Row label={label} unsupported={unsupported}>
      <Switch
        checked={checked ?? false}
        onCheckedChange={onChange}
        disabled={disabled || checked === undefined}
      />
    </Row>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onCommit,
  format,
  unsupported,
  disabled,
}: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  step?: number;
  onCommit: (value: number) => void;
  format?: (value: number) => string;
  unsupported?: boolean;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(value ?? min);
  useEffect(() => {
    if (value !== undefined) setLocal(value);
  }, [value]);
  const display = format ?? ((v: number) => String(v));
  return (
    <Row label={label} unsupported={unsupported} value={display(local)}>
      <Slider
        value={[Number.isFinite(local) ? local : min]}
        min={min}
        max={max}
        step={step}
        disabled={disabled || value === undefined}
        onValueChange={([v]) => setLocal(v ?? min)}
        onValueCommit={([v]) => onCommit(v ?? min)}
      />
    </Row>
  );
}

export function SelectRow({
  label,
  value,
  options,
  onChange,
  unsupported,
  disabled,
  formatOption,
}: {
  label: string;
  value: string | undefined;
  options: (string | number)[];
  onChange: (value: string) => void;
  unsupported?: boolean;
  disabled?: boolean;
  formatOption?: (option: string | number) => string;
}) {
  const fmt = formatOption ?? ((o: string | number) => String(o));
  return (
    <Row label={label} unsupported={unsupported}>
      <Select value={value} onValueChange={onChange} disabled={disabled || value === undefined}>
        <SelectTrigger className="h-8">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={String(option)} value={String(option)}>
              {fmt(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Row>
  );
}

export function PanelEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

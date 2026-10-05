import type { TargetInfo } from "@/lib/targets";
import type { Priority } from "@/lib/triage";
import { PRIORITY_LABEL } from "@/lib/view";

export const RAIL: Record<Priority, string> = {
  CRITICAL: "border-l-crit",
  HIGH: "border-l-high",
  NORMAL: "border-l-norm",
  LOW: "border-l-low",
};

export const PRIORITY_BAR: Record<Priority, string> = {
  CRITICAL: "bg-crit-solid",
  HIGH: "bg-high",
  NORMAL: "bg-norm",
  LOW: "bg-low",
};

const CHIP: Record<Priority, string> = {
  CRITICAL: "bg-crit-solid text-white",
  HIGH: "bg-high-bg text-high border border-high/40",
  NORMAL: "bg-norm-bg text-norm border border-norm/30",
  LOW: "bg-low-bg text-low border border-low/30",
};

export function PriorityChip({ priority }: { priority: Priority }) {
  return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${CHIP[priority]}`}>{PRIORITY_LABEL[priority]}</span>;
}

export function StatusChip({ label, tone = "plain" }: { label: string; tone?: "plain" | "warn" | "alert" }) {
  const tones = {
    plain: "bg-canvas text-ink border-line",
    warn: "bg-high-bg text-high border-high/30",
    alert: "bg-crit-bg text-crit border-crit/30",
  };
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{label}</span>;
}

/** Thin progress bar showing how much of the response target has been used. */
export function TargetMeter({ info }: { info: TargetInfo }) {
  if (info.state === "none") return null;
  const fill = { overdue: "bg-crit-solid", "due-soon": "bg-high", ok: "bg-norm", met: "bg-low" }[info.state];
  const text = { overdue: "text-crit font-semibold", "due-soon": "text-high font-medium", ok: "text-muted", met: "text-low" }[info.state];
  const width = info.state === "met" ? 100 : Math.min(100, Math.round(info.pct * 100));
  return (
    <div className="mt-1.5 flex items-center gap-2 text-xs">
      <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded bg-line" role="img" aria-label={`Response target: ${info.label}`}>
        <div className={`h-full rounded ${fill} transition-[width] duration-500`} style={{ width: `${width}%` }} />
      </div>
      <span className={text}>{info.label}</span>
    </div>
  );
}

export const btnPrimary =
  "inline-flex items-center justify-center rounded bg-steel px-3 py-1.5 text-sm font-semibold text-on-steel hover:bg-steel-hover disabled:cursor-not-allowed disabled:opacity-50";
export const btnSecondary =
  "inline-flex items-center justify-center rounded border border-line bg-panel px-3 py-1.5 text-sm font-medium text-ink hover:border-steel disabled:cursor-not-allowed disabled:opacity-50";
export const fieldClass = "w-full rounded border border-line bg-panel px-2.5 py-1.5 text-sm text-ink";

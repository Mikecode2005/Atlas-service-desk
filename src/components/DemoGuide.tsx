"use client";

import type { GuideStep } from "@/lib/demoScript";
import { btnPrimary, btnSecondary } from "./ui";

export function DemoGuide({
  step,
  steps,
  done,
  pending,
  onAction,
  onBack,
  onNext,
  onClose,
}: {
  step: number;
  steps: GuideStep[];
  done: boolean;
  pending: boolean;
  onAction: () => void;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const s = steps[step];
  const last = step === steps.length - 1;
  const isIntro = s.kind === "intro";
  return (
    <section
      aria-label="Guided demo"
      className="drawer fixed bottom-4 left-4 right-4 z-40 rounded border border-steel bg-panel p-4 shadow-xl sm:right-auto sm:w-[370px]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Guided demo, step {step + 1} of {steps.length}
        </p>
        <button type="button" className="-mr-1 -mt-1 rounded px-2 py-0.5 text-sm text-muted hover:text-ink" onClick={onClose} aria-label="Exit guided demo">
          Exit
        </button>
      </div>
      <div className="mt-1 flex gap-1" aria-hidden>
        {steps.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded ${i <= step ? "bg-steel" : "bg-line"}`} />
        ))}
      </div>
      <h2 className="mt-3 text-lg font-bold leading-snug">{s.title}</h2>
      <p className="mt-1 text-sm">{s.text}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {s.action && (
          <button type="button" className={btnPrimary} disabled={pending || done} onClick={onAction}>
            {done ? "Done" : s.action}
          </button>
        )}
        {!isIntro && (
          <button type="button" className={btnSecondary} onClick={onBack} disabled={step === 0}>
            Back
          </button>
        )}
        {!isIntro && (
          <button type="button" className={last || !s.action ? btnPrimary : btnSecondary} onClick={last ? onClose : onNext}>
            {last ? "Finish" : "Next"}
          </button>
        )}
      </div>
    </section>
  );
}

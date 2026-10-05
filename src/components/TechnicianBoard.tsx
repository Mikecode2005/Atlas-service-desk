"use client";

import { useState } from "react";
import { startTransition, useTransition } from "react";
import type { BoardData, RequestDTO } from "@/lib/view";
import { nextAction, statusLabel, fmtDateTime, RAIL } from "@/lib/view";
import { PriorityChip, StatusChip, btnPrimary, fieldClass } from "./ui";
import { StatusTransitionDialog } from "./StatusTransitionDialog";

interface TechnicianBoardProps {
  data: BoardData;
  technicianId: string;
}

export function TechnicianBoard({ data, technicianId }: TechnicianBoardProps) {
  const [selected, setSelected] = useState<RequestDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const act = async (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    successMessage?: string
  ) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong");
      else if (successMessage) setToast(successMessage);
    });
  };

  // toast auto dismiss
  if (toast) {
    setTimeout(() => setToast(null), 3000);
  }

  const requests = data.requests;

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="border-b border-line bg-panel px-4 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold">Technician {technicianId}</h1>
          <span className="text-sm text-muted">{requests.length} active request(s)</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {requests.length === 0 ? (
          <div className="max-w-3xl mx-auto text-center text-muted py-12">
            No active requests assigned.
          </div>
        ) : (
          <ul className="max-w-3xl mx-auto space-y-3">
            {requests.map((r, idx) => (
              <TechnicianCard key={r.id} r={r} now={data.now} index={idx} onOpen={() => setSelected(r)} />
            ))}
          </ul>
        )}
      </main>

      {selected && (
        <StatusTransitionDialog
          request={selected}
          technicianId={technicianId}
          onClose={() => setSelected(null)}
          act={act}
          pending={pending}
        />
      )}

      {error && (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-crit/90 text-crit-on px-4 py-2 rounded shadow-lg text-sm"
        >
          {error}
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-steel text-on-steel px-4 py-2 rounded shadow-lg text-sm font-semibold"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function TechnicianCard({
  r,
  now,
  index,
  onOpen,
}: {
  r: RequestDTO;
  now: string;
  index: number;
  onOpen: () => void;
}) {
  const actionLabel = nextAction(r);
  const info = r.scheduledFor ? `Scheduled ${fmtDateTime(r.scheduledFor)}` : "";
  return (
    <li className="row-in" style={{ "--i": Math.min(index, 8) } as React.CSSProperties}>
      <button
        type="button"
        onClick={onOpen}
        className={`flex w-full flex-col gap-2 rounded border border-line border-l-4 bg-panel px-3 py-2.5 text-left transition-shadow hover:border-steel hover:shadow-sm sm:flex-row sm:items-start sm:gap-3 ${RAIL[r.priority]}`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-bold">{r.id}</span>
            <PriorityChip priority={r.priority} />
            <StatusChip label={statusLabel(r)} tone="plain" />
          </span>
          <span className="mt-1 block font-medium">{r.message.slice(0, 80)}{r.message.length > 80 ? "…" : ""}</span>
          <span className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted">
            <span>Customer {r.customerId}</span>
            <span>{r.channel}</span>
            <span className="tnum">Received {fmtDateTime(r.receivedAt)}</span>
          </span>
          {info && <span className="mt-1 text-sm text-high">{info}</span>}
        </span>
        <span className="shrink-0 self-start rounded bg-steel px-3 py-1.5 text-sm font-semibold text-on-steel sm:self-center">{actionLabel}</span>
      </button>
    </li>
  );
}
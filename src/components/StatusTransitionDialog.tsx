"use client";

import { useState } from "react";
import type { RequestDTO } from "@/lib/view";
import { scheduleAction, statusAction } from "@/app/actions";
import { btnPrimary, btnSecondary, fieldClass } from "./ui";

interface Props {
  request: RequestDTO;
  technicianId: string;
  onClose: () => void;
  act: (fn: () => Promise<{ ok: boolean; error?: string }>, successMessage?: string) => void;
  pending: boolean;
}

export function StatusTransitionDialog({
  request,
  technicianId,
  onClose,
  act,
  pending,
}: Props) {
  const [visitAt, setVisitAt] = useState("");

  const handleSchedule = () => {
    if (!visitAt) return;
    act(
      () => scheduleAction(request.id, visitAt),
      `Visit scheduled for ${new Date(visitAt).toLocaleString()}`
    );
    onClose();
  };

  const handleStatus = (newStatus: string) => {
    act(
      () => statusAction(request.id, newStatus as any),
      `Status changed to ${newStatus}`
    );
    onClose();
  };

  const transitions: { label: string; action: () => void }[] = [];
  switch (request.status) {
    case "ASSIGNED":
    case "TRIAGED":
    case "NEW":
      // schedule visit handled via input
      break;
    case "SCHEDULED":
      transitions.push({ label: "Start work", action: () => handleStatus("IN_PROGRESS") });
      break;
    case "IN_PROGRESS":
      transitions.push({ label: "Mark resolved", action: () => handleStatus("RESOLVED") });
      break;
    case "WAITING":
      transitions.push({ label: "Mark resolved", action: () => handleStatus("RESOLVED") });
      break;
    case "RESOLVED":
      transitions.push({ label: "Close request", action: () => handleStatus("CLOSED") });
      break;
    default:
      break;
  }

  const showSchedule = ["ASSIGNED", "TRIAGED", "NEW"].includes(request.status);

  return (
    <dialog
      className="m-auto w-[min(92vw,480px)] rounded border border-line bg-panel p-0 backdrop:bg-scrim/50"
      open
      onClose={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="space-y-3 p-4">
        <h2 className="text-xl font-bold">{request.id} – Next action</h2>
        <p className="text-sm text-muted">{request.message}</p>
        <p className="text-sm">Customer {request.customerId} • {request.channel}</p>

        {showSchedule ? (
          <div className="space-y-2">
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Visit date & time (UTC)</span>
              <input
                type="datetime-local"
                className={fieldClass}
                value={visitAt}
                onChange={(e) => setVisitAt(e.target.value)}
                required
              />
            </label>
            <button className={btnPrimary} onClick={handleSchedule} disabled={pending || !visitAt}>
              Confirm schedule
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {transitions.map((t, i) => (
              <button key={i} className={btnPrimary} onClick={t.action} disabled={pending}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <button className={btnSecondary} onClick={onClose}>
          Cancel
        </button>
      </div>
    </dialog>
  );
}
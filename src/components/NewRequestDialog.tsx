"use client";

import { useEffect, useRef, useState } from "react";
import { createRequestAction } from "@/app/actions";
import { toInputValue } from "@/lib/format";
import { findDuplicate, triage } from "@/lib/triage";
import { PRIORITY_LABEL, type BoardData } from "@/lib/view";
import { PriorityChip, btnPrimary, btnSecondary, fieldClass } from "./ui";

const CHANNELS = ["Email", "WhatsApp", "Phone"];
const EXAMPLES = [
  "Walk-in freezer is warm and the alarm is sounding. Stock will spoil if it is not fixed tonight.",
  "Please book our annual maintenance visit for next week.",
];

export function NewRequestDialog({
  data,
  onClose,
  onCreated,
}: {
  data: BoardData;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [customerId, setCustomerId] = useState(data.customers[0]?.id ?? "");
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [receivedAt, setReceivedAt] = useState(() => toInputValue(data.now));
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);

  const preview = message.trim() ? triage(message) : null;
  const dup =
    preview &&
    findDuplicate(
      { customerId, category: preview.category, receivedAt: new Date(`${receivedAt}:00Z`) },
      data.requests.filter((r) => r.customerId === customerId),
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await createRequestAction({ customerId, channel, message, receivedAt });
    setSaving(false);
    if (res.ok && typeof res.data === "string") onCreated(res.data);
    else if (!res.ok) setError(res.error);
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto w-[min(92vw,560px)] rounded border border-line bg-panel p-0 text-ink backdrop:bg-scrim/50"
    >
      <form onSubmit={submit} className="space-y-3 p-4">
        <h2 className="text-xl font-bold">New request</h2>
        <p className="text-sm text-muted">Simulates an incoming message. Atlas sets the priority, status, duplicates and missing information for you.</p>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Customer</span>
            <select className={fieldClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {data.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Channel</span>
            <select className={fieldClass} value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CHANNELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-muted">Received (UTC)</span>
          <input type="datetime-local" className={fieldClass} value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} required />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-muted">Message</span>
          <textarea className={`${fieldClass} h-24`} value={message} onChange={(e) => setMessage(e.target.value)} required />
        </label>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-muted">Try an example:</span>
          {EXAMPLES.map((ex, i) => (
            <button key={ex} type="button" className="underline underline-offset-2" onClick={() => setMessage(ex)}>
              {i === 0 ? "Urgent fault" : "Routine visit"}
            </button>
          ))}
        </div>

        <div className="min-h-[3.5rem] rounded border border-line bg-canvas/60 px-3 py-2 text-sm" aria-live="polite">
          {preview ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Atlas will set</span>
                <PriorityChip priority={preview.priority} />
                <span>{preview.missingInfo.length ? "Needs info" : "Unassigned"}</span>
              </div>
              <p className="text-muted">
                {PRIORITY_LABEL[preview.priority]}: {preview.reason}
              </p>
              {dup && <p className="text-high">Possible duplicate of {dup.id}. {dup.reason}</p>}
              {preview.missingInfo.length > 0 && <p className="text-muted">Missing: {preview.missingInfo.join(", ")}</p>}
            </>
          ) : (
            <span className="text-muted">Type a message to see how it would be triaged.</span>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-crit">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={saving || !message.trim()}>
            Create request
          </button>
        </div>
      </form>
    </dialog>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  assignAction,
  customerUpdateAction,
  infoReceivedAction,
  keepSeparateAction,
  linkAction,
  priorityAction,
  scheduleAction,
  statusAction,
} from "@/app/actions";
import { duration, fmtDateTime, toInputValue } from "@/lib/format";
import { targetInfo } from "@/lib/targets";
import type { Priority } from "@/lib/triage";
import {
  PRIORITY_LABEL,
  hasDuplicateSuggestion,
  isLinked,
  nextAction,
  relatedTo,
  statusLabel,
  suggestTechnician,
  technicianLoad,
  type BoardData,
  type RequestDTO,
} from "@/lib/view";
import type { Act } from "./Board";
import { PriorityChip, StatusChip, TargetMeter, btnPrimary, btnSecondary, fieldClass } from "./ui";

function defaultVisit(now: string): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(9, 0, 0, 0);
  return toInputValue(d);
}

export function RequestDrawer({
  r,
  data,
  pending,
  act,
  onOpen,
  onClose,
}: {
  r: RequestDTO;
  data: BoardData;
  pending: boolean;
  act: Act;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [visitAt, setVisitAt] = useState(() => (r.scheduledFor ? toInputValue(r.scheduledFor) : defaultVisit(data.now)));
  const [draft, setDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const related = relatedTo(r, data.requests);
  const suggestion = suggestTechnician(data.requests, data.technicians);
  const dup = hasDuplicateSuggestion(r);
  const linked = isLinked(r);
  const closed = r.status === "CLOSED";
  const canAct = !closed && !linked;

  async function generate() {
    const res = await customerUpdateAction(r.id);
    if (res.ok && typeof res.data === "string") {
      setDraft(res.data);
      setCopied(false);
    }
  }

  async function copy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-scrim/45" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Request ${r.id}`}
        className="drawer flex h-full w-full max-w-lg flex-col overflow-y-auto bg-panel shadow-xl"
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-panel px-4 py-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{r.id}</h2>
              <PriorityChip priority={r.priority} />
              <StatusChip label={statusLabel(r)} />
            </div>
            <p className="tnum text-sm text-muted">
              Customer {r.customerId}, {r.channel}, received {fmtDateTime(r.receivedAt)} ({duration(r.receivedAt, data.now)} ago)
            </p>
            <TargetMeter info={targetInfo(r, data.now)} />
          </div>
          <button ref={closeRef} type="button" className={btnSecondary} onClick={onClose}>
            Close
          </button>
        </div>

        <div className="space-y-5 px-4 py-4">
          <blockquote className="rounded border-l-4 border-steel bg-canvas/60 px-3 py-2 text-base">{r.message}</blockquote>

          <section>
            <h3 className="font-semibold">Priority</h3>
            <p className="text-sm">{r.priorityReason}</p>
            {canAct && (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <span className="whitespace-nowrap text-muted">Change priority</span>
                <select
                  className={`${fieldClass} w-auto`}
                  value={r.priority}
                  disabled={pending}
                  onChange={(e) => act(() => priorityAction(r.id, e.target.value as Priority), `${r.id} priority updated`)}
                >
                  {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>

          {dup && (
            <section className="rounded border border-high/40 bg-high-bg px-3 py-2.5">
              <h3 className="font-semibold text-high">Possible duplicate of {r.duplicateSuggestedId}</h3>
              <p className="text-sm">{r.duplicateReason}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} disabled={pending} onClick={() => act(() => linkAction(r.id), `${r.id} linked to ${r.duplicateSuggestedId}`)}>
                  Link to {r.duplicateSuggestedId}
                </button>
                <button type="button" className={btnSecondary} disabled={pending} onClick={() => act(() => keepSeparateAction(r.id), `${r.id} kept separate`)}>
                  Keep separate
                </button>
              </div>
            </section>
          )}

          {linked && (
            <section className="rounded border border-line bg-canvas/60 px-3 py-2.5 text-sm">
              Linked to <strong>{r.duplicateOfId}</strong>. No separate job is needed.
            </section>
          )}

          {r.missingInfo.length > 0 && !closed && (
            <section className="rounded border border-high/40 bg-high-bg px-3 py-2.5">
              <h3 className="font-semibold text-high">Needs information</h3>
              <p className="text-sm">Missing:</p>
              <ul className="list-disc pl-5 text-sm">
                {r.missingInfo.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} disabled={pending} onClick={generate}>
                  Request information
                </button>
                <button type="button" className={btnSecondary} disabled={pending} onClick={() => act(() => infoReceivedAction(r.id), `${r.id} information received`)}>
                  Mark info received
                </button>
              </div>
            </section>
          )}

          {canAct && (
            <section>
              <h3 className="font-semibold">Next action: {nextAction(r)}</h3>

              <div className="mt-2">
                <p className="mb-1 text-sm text-muted">{r.technicianId ? `Owner ${r.technicianId}. Reassign to:` : "Assign a technician:"}</p>
                {!r.technicianId && suggestion && (
                  <p className="mb-2 text-sm">
                    Suggested: <strong>{suggestion.id}</strong>. {suggestion.reason}.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {data.technicians.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={r.technicianId === t.id || (!r.technicianId && suggestion?.id === t.id) ? btnPrimary : btnSecondary}
                      disabled={pending || r.technicianId === t.id}
                      onClick={() => act(() => assignAction(r.id, t.id), `${r.id} assigned to ${t.id}`)}
                    >
                      {t.name} ({technicianLoad(data.requests, t.id).length} open)
                      {!r.technicianId && suggestion?.id === t.id ? " suggested" : ""}
                    </button>
                  ))}
                </div>
              </div>

              {r.technicianId && (
                <div className="mt-3">
                  <label className="mb-1 block text-sm text-muted" htmlFor="visit">
                    Visit time (UTC)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input id="visit" type="datetime-local" className={`${fieldClass} w-auto`} value={visitAt} onChange={(e) => setVisitAt(e.target.value)} />
                    <button type="button" className={btnPrimary} disabled={pending || !visitAt} onClick={() => act(() => scheduleAction(r.id, visitAt), `${r.id} visit scheduled`)}>
                      Schedule visit
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {r.technicianId && ["ASSIGNED", "SCHEDULED"].includes(r.status) && (
                  <button type="button" className={btnSecondary} disabled={pending} onClick={() => act(() => statusAction(r.id, "IN_PROGRESS"), `${r.id} in progress`)}>
                    Start work
                  </button>
                )}
                {r.status !== "WAITING" && r.status !== "RESOLVED" && (
                  <button type="button" className={btnSecondary} disabled={pending} onClick={() => act(() => statusAction(r.id, "WAITING"), `${r.id} marked waiting`)}>
                    Mark waiting
                  </button>
                )}
                {r.status !== "RESOLVED" && (
                  <button type="button" className={btnSecondary} disabled={pending} onClick={() => act(() => statusAction(r.id, "RESOLVED"), `${r.id} resolved`)}>
                    Mark resolved
                  </button>
                )}
                {r.status === "RESOLVED" && (
                  <button type="button" className={btnPrimary} disabled={pending} onClick={() => act(() => statusAction(r.id, "CLOSED"), `${r.id} closed`)}>
                    Close request
                  </button>
                )}
              </div>
            </section>
          )}

          <section>
            <h3 className="font-semibold">Customer update</h3>
            <p className="text-sm text-muted">Writes a message you can copy and send. Nothing is sent automatically.</p>
            <button type="button" className={`${btnSecondary} mt-2`} disabled={pending} onClick={generate}>
              Generate update
            </button>
            {draft && (
              <div className="mt-2">
                <textarea readOnly aria-label="Generated customer update" className={`${fieldClass} h-28`} value={draft} />
                <button type="button" className={`${btnSecondary} mt-1`} onClick={copy}>
                  {copied ? "Copied" : "Copy message"}
                </button>
              </div>
            )}
          </section>

          {related.length > 0 && (
            <section>
              <h3 className="font-semibold">Related requests</h3>
              <ul className="text-sm">
                {related.map((o) => (
                  <li key={o.id}>
                    <button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => onOpen(o.id)}>
                      {o.id}
                    </button>{" "}
                    <span className="text-muted">{statusLabel(o)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="font-semibold">History</h3>
            <ol className="mt-1 space-y-1 border-l-2 border-line pl-3 text-sm">
              {r.events.map((e) => (
                <li key={e.id}>
                  <span className="tnum text-muted">{fmtDateTime(e.createdAt)}</span> {e.description}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </aside>
    </div>
  );
}

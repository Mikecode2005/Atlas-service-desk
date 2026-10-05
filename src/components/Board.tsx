"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ActionResult } from "@/app/action-types";
import { assignAction, linkAction, resetAction, scheduleAction } from "@/app/actions";
import { GUIDE_STEPS, tomorrowNine } from "@/lib/demoScript";
import { duration, fmtDateTime, fmtDay, fmtTime } from "@/lib/format";
import { escalations, targetInfo } from "@/lib/targets";
import type { Priority } from "@/lib/triage";
import {
  PRIORITY_LABEL,
  hasDuplicateSuggestion,
  isActive,
  isLinked,
  isUrgentUnassigned,
  matchesQuery,
  nextAction,
  sortForQueue,
  statusLabel,
  suggestTechnician,
  summary,
  techLoadScore,
  technicianLoad,
  type BoardData,
  type RequestDTO,
} from "@/lib/view";
import { DemoGuide } from "./DemoGuide";
import { NewRequestDialog } from "./NewRequestDialog";
import { RequestDrawer } from "./RequestDrawer";
import { ThemeToggle } from "./ThemeToggle";
import { PRIORITY_BAR, PriorityChip, RAIL, StatusChip, TargetMeter, btnPrimary, btnSecondary, fieldClass } from "./ui";

type Tile = "all" | "urgent" | "info" | "waiting" | "dupes";
type PriorityFilter = Priority | "ALL";

export type Act = (fn: () => Promise<ActionResult<unknown>>, successMessage?: string) => void;

const PRIORITIES: Priority[] = ["CRITICAL", "HIGH", "NORMAL", "LOW"];

export function Board({ data }: { data: BoardData }) {
  const [tile, setTile] = useState<Tile>("all");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<PriorityFilter>("ALL");
  const [owner, setOwner] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const [guide, setGuide] = useState<number | null>(null);
  const [guideDone, setGuideDone] = useState<number[]>([]);

  const act: Act = (fn, successMessage) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else if (successMessage) setToast(successMessage);
    });
  };

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  // Keyboard shortcuts: "/" focuses search, "n" opens the intake form.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "n") {
        e.preventDefault();
        setNewOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { requests, technicians, now } = data;
  const active = requests.filter(isActive);
  const suggestion = suggestTechnician(requests, technicians);
  const alerts = escalations(requests, now);

  const counts = {
    urgent: requests.filter(isUrgentUnassigned).length,
    info: active.filter((r) => r.status === "NEEDS_INFO").length,
    waiting: active.filter((r) => r.status === "WAITING").length,
    dupes: requests.filter(hasDuplicateSuggestion).length,
  };
  const tiles: { id: Exclude<Tile, "all">; label: string; count: number }[] = [
    { id: "urgent", label: "Urgent and unassigned", count: counts.urgent },
    { id: "info", label: "Need information", count: counts.info },
    { id: "waiting", label: "Waiting", count: counts.waiting },
    { id: "dupes", label: "Possible duplicates", count: counts.dupes },
  ];

  const passesToolbar = (r: RequestDTO) =>
    matchesQuery(r, query) &&
    (priority === "ALL" || r.priority === priority) &&
    (owner === "ALL" || (owner === "NONE" ? r.technicianId === null : r.technicianId === owner));

  const passesTile = (r: RequestDTO) => {
    if (tile === "urgent") return isUrgentUnassigned(r);
    if (tile === "info") return isActive(r) && r.status === "NEEDS_INFO";
    if (tile === "waiting") return isActive(r) && r.status === "WAITING";
    if (tile === "dupes") return hasDuplicateSuggestion(r);
    return isActive(r);
  };

  const queue = requests.filter((r) => passesTile(r) && passesToolbar(r)).sort(sortForQueue);
  const tableRows = requests.filter(passesToolbar);
  const filtersActive = tile !== "all" || query !== "" || priority !== "ALL" || owner !== "ALL";
  const urgentUnassigned = requests.filter(isUrgentUnassigned).sort(sortForQueue);
  const selected = requests.find((r) => r.id === selectedId) ?? null;

  const mix = PRIORITIES.map((p) => ({ p, n: active.filter((r) => r.priority === p).length }));
  const mixTotal = mix.reduce((s, m) => s + m.n, 0) || 1;
  const maxLoad = Math.max(6, ...technicians.map((t) => techLoadScore(requests, t.id)));

  const recentEvents = requests
    .flatMap((r) => r.events.map((e) => ({ ...e, requestId: r.id })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id)
    .slice(0, 6);

  function goTo(i: number) {
    setGuide(i);
    setSelectedId(GUIDE_STEPS[i].open ?? null);
  }

  function startGuide() {
    clearFilters();
    setGuideDone([]);
    goTo(0);
  }

  function guideAction(i: number) {
    const kind = GUIDE_STEPS[i].kind;
    const owner = suggestion?.id ?? "T2";
    if (kind === "intro") {
      act(() => resetAction(), "Demo reset to 09:00, 1 October");
      goTo(1);
      return;
    }
    if (kind === "assign") act(() => assignAction("R101", owner), `R101 assigned to ${owner}`);
    if (kind === "link") act(() => linkAction("R104"), "R104 linked to R101");
    if (kind === "schedule") act(() => scheduleAction("R102", tomorrowNine(now)), "R102 visit scheduled");
    setGuideDone((d) => [...d, i]);
  }

  function clearFilters() {
    setTile("all");
    setQuery("");
    setPriority("ALL");
    setOwner("ALL");
  }

  const assignSuggested = (id: string) => suggestion && act(() => assignAction(id, suggestion.id), `${id} assigned to ${suggestion.id}`);

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Atlas Service Desk</h1>
          <p className="text-sm text-muted">What needs attention now, who owns it, and what happens next.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="mr-1 sm:text-right">
            <div className="tnum text-xl font-semibold leading-none">{fmtTime(now)}</div>
            <div className="text-xs text-muted">{fmtDay(now)} (UTC, demo clock)</div>
          </div>
          <ThemeToggle />
          <button type="button" className={btnSecondary} onClick={startGuide}>
            Guided demo
          </button>
          <button
            type="button"
            className={btnSecondary}
            disabled={pending}
            onClick={() => {
              if (window.confirm("Reset all demo data back to 09:00 on 1 October 2026?")) {
                setSelectedId(null);
                clearFilters();
                act(() => resetAction(), "Demo reset to 09:00, 1 October");
              }
            }}
          >
            Reset demo
          </button>
          <button type="button" className={btnPrimary} onClick={() => setNewOpen(true)}>
            New request <kbd className="ml-2 hidden rounded bg-white/20 px-1 text-xs sm:inline">n</kbd>
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="mt-3 rounded border border-crit/40 bg-crit-bg px-3 py-2 text-sm text-crit">
          {error}
        </p>
      )}

      {alerts.length > 0 && (
        <section aria-label="Escalations" className="mt-4 rounded border border-crit/50 bg-crit-bg px-3 py-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-crit">
            <span className="pulse inline-block h-2.5 w-2.5 rounded-full bg-crit-solid" aria-hidden />
            {alerts.length === 1 ? "1 escalation" : `${alerts.length} escalations`}: past response target with no owner
          </h2>
          <ul className="mt-2 space-y-2">
            {alerts.slice(0, 3).map(({ r, info }) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="min-w-0 flex-1 text-sm">
                  <button type="button" className="font-bold underline-offset-2 hover:underline" onClick={() => setSelectedId(r.id)}>
                    {r.id}
                  </button>{" "}
                  <PriorityChip priority={r.priority} /> {summary(r.message)} <span className="font-semibold text-crit">{info.label}</span>
                </span>
                {suggestion && (
                  <button type="button" className={btnPrimary} disabled={pending} onClick={() => assignSuggested(r.id)}>
                    Assign {suggestion.id} ({suggestion.reason.toLowerCase()})
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Response targets (Critical 1h, High 4h, Normal 24h, Low 72h to a named owner) are illustrative defaults, not Atlas policy.
          </p>
        </section>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Quick filters">
        {tiles.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tile === t.id}
            onClick={() => setTile(tile === t.id ? "all" : t.id)}
            className={`rounded border px-3 py-2.5 text-left transition-colors ${
              tile === t.id ? "border-steel bg-steel text-on-steel" : "border-line bg-panel hover:border-steel"
            }`}
          >
            <span className="tnum block text-2xl font-bold leading-none">{t.count}</span>
            <span className={`text-sm ${tile === t.id ? "opacity-90" : "text-muted"}`}>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="queue-h">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="queue-h" className="text-lg font-semibold">
                Action queue
              </h2>
              <span className="text-sm text-muted" aria-live="polite">
                {queue.length} shown{filtersActive ? " (filtered)" : ""}, most urgent first
              </span>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]" role="search">
              <input
                ref={searchRef}
                type="search"
                aria-label="Search requests"
                placeholder="Search requests (press /)"
                className={`${fieldClass} col-span-2 sm:col-span-1`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select aria-label="Filter by priority" className={fieldClass} value={priority} onChange={(e) => setPriority(e.target.value as PriorityFilter)}>
                <option value="ALL">All priorities</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
              <select aria-label="Filter by owner" className={fieldClass} value={owner} onChange={(e) => setOwner(e.target.value)}>
                <option value="ALL">Any owner</option>
                <option value="NONE">Unassigned</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button type="button" className={btnSecondary} onClick={clearFilters} disabled={!filtersActive}>
                Clear
              </button>
            </div>

            {queue.length === 0 ? (
              <p className="rounded border border-dashed border-line bg-panel px-4 py-8 text-center text-muted">
                {filtersActive ? "No requests match these filters." : "Nothing needs action right now."}
              </p>
            ) : (
              <ul className="space-y-2">
                {queue.map((r, i) => (
                  <QueueRow key={r.id} r={r} now={now} index={i} onOpen={() => setSelectedId(r.id)} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="all-h">
            <h2 id="all-h" className="mb-2 text-lg font-semibold">
              All requests
            </h2>
            <div className="overflow-x-auto rounded border border-line bg-panel">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-line bg-canvas/60 text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Request</th>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 font-medium">Priority</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Owner</th>
                    <th className="px-3 py-2 font-medium">Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((r) => (
                    <tr key={r.id} className={`border-b border-line/70 last:border-0 hover:bg-canvas/50 ${isLinked(r) || r.status === "CLOSED" ? "text-muted" : ""}`}>
                      <td className="px-3 py-2 font-semibold">
                        <button type="button" className="underline-offset-2 hover:underline" onClick={() => setSelectedId(r.id)}>
                          {r.id}
                        </button>
                      </td>
                      <td className="px-3 py-2">{r.customerId}</td>
                      <td className="px-3 py-2">
                        <PriorityChip priority={r.priority} />
                      </td>
                      <td className="px-3 py-2">{statusLabel(r)}</td>
                      <td className="px-3 py-2">{r.technicianId ?? "None"}</td>
                      <td className="px-3 py-2">{r.category === "general" ? summary(r.message) : `${r.category.charAt(0).toUpperCase()}${r.category.slice(1).replace("-", " ")}`}</td>
                    </tr>
                  ))}
                  {tableRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-muted">
                        No requests match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-5" aria-label="Capacity and activity">
          <section aria-labelledby="mix-h" className="rounded border border-line bg-panel p-3">
            <h2 id="mix-h" className="mb-2 text-lg font-semibold">
              Open work by priority
            </h2>
            <div className="flex h-3 overflow-hidden rounded bg-line" role="img" aria-label={mix.map((m) => `${m.n} ${PRIORITY_LABEL[m.p]}`).join(", ")}>
              {mix.map((m) => (
                <div key={m.p} className={`${PRIORITY_BAR[m.p]} transition-[width] duration-500`} style={{ width: `${(m.n / mixTotal) * 100}%` }} />
              ))}
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              {mix.map((m) => (
                <li key={m.p} className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-sm ${PRIORITY_BAR[m.p]}`} aria-hidden />
                  <span className="text-muted">{PRIORITY_LABEL[m.p]}</span>
                  <span className="tnum ml-auto font-semibold">{m.n}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="tech-h" className="rounded border border-line bg-panel p-3">
            <h2 id="tech-h" className="mb-2 text-lg font-semibold">
              Technicians
            </h2>
            <ul className="divide-y divide-line/70">
              {technicians.map((t) => {
                const load = technicianLoad(requests, t.id);
                const score = techLoadScore(requests, t.id);
                const next = load[0];
                return (
                  <li key={t.id} className="py-2">
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold">{t.name}</span>
                      {suggestion?.id === t.id ? <span className="text-xs font-semibold text-low">Suggested for next job</span> : <span className="text-sm text-low">Available</span>}
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded bg-line" role="img" aria-label={`${t.name} workload ${score}`}>
                      <div className="h-full rounded bg-steel transition-[width] duration-500" style={{ width: `${Math.round((score / maxLoad) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {load.length} assigned, load {score}
                      {next ? `. Next: ${next.id} (${nextAction(next).toLowerCase()})` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-muted">
              Load weights Critical 3, High 2, Normal and Low 1; waiting jobs are not counted. No skills were supplied, so the suggestion is a hint and assignment stays manual.
            </p>
          </section>

          <section aria-labelledby="urgent-h" className="rounded border border-line bg-panel p-3">
            <h2 id="urgent-h" className="mb-2 text-lg font-semibold">
              Unassigned urgent work
            </h2>
            {urgentUnassigned.length === 0 ? (
              <p className="text-sm text-muted">Every urgent request has an owner.</p>
            ) : (
              <ul className="space-y-3">
                {urgentUnassigned.map((r) => (
                  <li key={r.id}>
                    <div className="flex items-center gap-2">
                      <button type="button" className="font-semibold hover:underline" onClick={() => setSelectedId(r.id)}>
                        {r.id}
                      </button>
                      <PriorityChip priority={r.priority} />
                    </div>
                    <p className="text-sm text-muted">{summary(r.message)}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {technicians.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={suggestion?.id === t.id ? btnPrimary : btnSecondary}
                          disabled={pending}
                          onClick={() => act(() => assignAction(r.id, t.id), `${r.id} assigned to ${t.id}`)}
                          aria-label={`Assign ${t.name} to ${r.id}${suggestion?.id === t.id ? " (suggested)" : ""}`}
                        >
                          Assign {t.name}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="act-h" className="rounded border border-line bg-panel p-3">
            <h2 id="act-h" className="mb-2 text-lg font-semibold">
              Recent activity
            </h2>
            <ul className="space-y-1.5 text-sm">
              {recentEvents.map((e) => (
                <li key={e.id}>
                  <span className="tnum text-muted">{fmtDateTime(e.createdAt)}</span> <span className="font-semibold">{e.requestId}</span> {e.description}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {selected && (
        <RequestDrawer key={selected.id} r={selected} data={data} pending={pending} act={act} onOpen={setSelectedId} onClose={() => setSelectedId(null)} />
      )}
      {newOpen && (
        <NewRequestDialog
          data={data}
          onClose={() => setNewOpen(false)}
          onCreated={(id) => {
            setNewOpen(false);
            setSelectedId(id);
            setToast(`${id} created and triaged`);
          }}
        />
      )}

      {guide !== null && (
        <DemoGuide
          step={guide}
          steps={GUIDE_STEPS}
          done={guideDone.includes(guide)}
          pending={pending}
          onAction={() => guideAction(guide)}
          onBack={() => goTo(Math.max(0, guide - 1))}
          onNext={() => goTo(Math.min(GUIDE_STEPS.length - 1, guide + 1))}
          onClose={() => setGuide(null)}
        />
      )}

      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
        {toast && <div className="toast rounded bg-steel px-4 py-2 text-sm font-semibold text-on-steel shadow-lg">{toast}</div>}
      </div>
    </main>
  );
}

function QueueRow({ r, now, index, onOpen }: { r: RequestDTO; now: string; index: number; onOpen: () => void }) {
  const info = targetInfo(r, now);
  const tone = r.status === "NEEDS_INFO" || hasDuplicateSuggestion(r) ? "warn" : info.state === "overdue" ? "alert" : "plain";
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
            <StatusChip label={statusLabel(r)} tone={tone} />
          </span>
          <span className="mt-1 block font-medium">{summary(r.message)}</span>
          <span className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted">
            <span>Customer {r.customerId}</span>
            <span>{r.channel}</span>
            <span className="tnum">Received {fmtDateTime(r.receivedAt)}</span>
            <span className="tnum">{duration(r.receivedAt, now)} old</span>
          </span>
          <TargetMeter info={info} />
        </span>
        <span className="shrink-0 self-start rounded bg-steel px-3 py-1.5 text-sm font-semibold text-on-steel sm:self-center">{nextAction(r)}</span>
      </button>
    </li>
  );
}

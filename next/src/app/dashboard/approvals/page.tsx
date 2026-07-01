"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Inbox, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, updateScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { canApproveAmount, requiredApproverLabel, approvalLimitFor } from "@/lib/procurement";
import { Badge } from "@/components/ui/badge";

type Pr = {
  id: string;
  desc?: string;
  amount?: number;
  requester?: string;
  siteId?: string;
  createdBy?: string;
  stage?: string;
  priority?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  requiredBy?: string;
};

type Site = { id: string; name?: string };

const PRIORITY_CLS: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-chart-1/15 text-chart-1",
  High: "bg-destructive/15 text-destructive",
};

const fmtOMR = (n?: number) => `${(Number(n) || 0).toFixed(3)} OMR`;

export default function ApprovalsPage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<Pr[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [prs, siteRows] = await Promise.all([
        fetchScoped<Pr>("prs", app.asSession()),
        fetchScoped<Site>("sites", app.asSession()).catch(() => [] as Site[]),
      ]);
      // The inbox only holds requests still awaiting a decision.
      setRows(prs.filter((p) => (p.stage || "Submitted") === "Submitted"));
      setSites(siteRows);
    } catch {
      toast.error("Could not load the approval inbox");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  const siteName = useMemo(() => {
    const m = new Map(sites.map((s) => [s.id, s.name || s.id]));
    return (id?: string) => (id ? m.get(id) || id : "—");
  }, [sites]);

  const isAdmin = !!app.session?.isAdmin;
  const role = app.session?.role;
  const uid = app.session?.uid;
  const canApprove = perms.can("purchase_requests", "approve") || isAdmin;

  async function decide(pr: Pr, stage: "Approved" | "Rejected") {
    setBusy(pr.id);
    try {
      await updateScoped("prs", pr.id, { stage }, app.asSession());
      setRows((r) => r.filter((x) => x.id !== pr.id));
      toast.success(stage === "Approved" ? "Request approved" : "Request rejected");
    } catch {
      toast.error("Could not update request");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approval Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} request{rows.length === 1 ? "" : "s"} awaiting a decision
        </p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-subtle grid place-items-center rounded-3xl px-6 py-16 text-center">
          <div className="max-w-xs">
            <div className="glass glass-specular mx-auto grid size-12 place-items-center rounded-2xl">
              <Inbox className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">You’re all caught up</p>
            <p className="mt-1 text-xs text-muted-foreground">
              New purchase requests needing approval will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => {
            const amount = Number(p.amount) || 0;
            const isOwn = !!p.createdBy && p.createdBy === uid;
            const withinLimit = canApproveAmount(role, amount, isAdmin);
            const working = busy === p.id;
            return (
              <div key={p.id} className="glass glass-specular rounded-3xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-snug">{p.desc || "—"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {siteName(p.siteId)} · {p.requester || "—"}
                      {p.quantity ? ` · ${p.quantity}${p.unit ? ` ${p.unit}` : ""}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold">{fmtOMR(amount)}</div>
                    {p.priority ? (
                      <Badge
                        variant="secondary"
                        className={`mt-1 ${PRIORITY_CLS[p.priority] ?? ""}`}
                      >
                        {p.priority}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-muted-foreground">
                  Needs {requiredApproverLabel(amount)} approval
                </div>

                {canApprove ? (
                  isOwn ? (
                    // Segregation of duties — the raiser cannot self-approve.
                    <div className="mt-3 text-[11px] font-medium text-muted-foreground">
                      You raised this — another approver must sign off
                    </div>
                  ) : withinLimit ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => decide(p, "Approved")}
                        disabled={working}
                        className="flex items-center gap-1 rounded-lg bg-chart-3/15 px-3 py-1.5 text-xs font-semibold text-chart-3 transition hover:bg-chart-3/25 disabled:opacity-50"
                      >
                        {working ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                        Approve
                      </button>
                      <button
                        onClick={() => decide(p, "Rejected")}
                        disabled={working}
                        className="flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
                      >
                        <X className="size-3.5" /> Reject
                      </button>
                    </div>
                  ) : (
                    // Delegation of authority — above this approver's signing limit.
                    <div className="mt-3 text-[11px] font-medium text-chart-4">
                      Above your limit ({approvalLimitFor(role).toLocaleString()} OMR) — needs{" "}
                      {requiredApproverLabel(amount)}
                    </div>
                  )
                ) : (
                  <div className="mt-3 text-[11px] font-medium text-muted-foreground">
                    View only — you don’t have approval rights
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

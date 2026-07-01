"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped, updateScoped, removeScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { canApproveAmount, requiredApproverLabel, approvalLimitFor } from "@/lib/procurement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Field } from "@/components/forms/field";
import { Textarea } from "@/components/ui/textarea";
import {
  RangeChips,
  ViewToggle,
  loadView,
  saveView,
  type ViewMode,
} from "@/components/shell/collection-controls";
import { inRange, fmtDay } from "@/lib/recency";

type Pr = {
  id: string;
  desc?: string;
  amount?: number;
  requester?: string;
  materialId?: string;
  siteId?: string;
  poId?: string;
  createdBy?: string;
  stage?: string;
  procType?: string;
  priority?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  requiredBy?: string;
  notes?: string;
  createdAt?: number;
};

type Material = { id: string; name?: string; price?: number };

type Draft = {
  desc: string;
  amount: string;
  requester: string;
  materialId: string;
  site: string;
  procType: string;
  priority: string;
  category: string;
  quantity: string;
  unit: string;
  requiredBy: string;
  notes: string;
};

const PRIORITIES = ["Low", "Medium", "High"] as const;
const PROC_TYPES = ["Material", "Service"] as const;

const STAGES = ["Submitted", "Approved", "Ordered", "Received", "Rejected"] as const;

const DOT: Record<string, string> = {
  Submitted: "bg-chart-1",
  Approved: "bg-chart-3",
  Ordered: "bg-chart-4",
  Received: "bg-chart-3",
  Rejected: "bg-destructive",
};

const emptyDraft: Draft = {
  desc: "", amount: "", requester: "", materialId: "", site: "",
  procType: "Material", priority: "Medium", category: "", quantity: "", unit: "", requiredBy: "", notes: "",
};

const PRIORITY_CLS: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-chart-1/15 text-chart-1",
  High: "bg-destructive/15 text-destructive",
};

const fmtOMR = (n?: number) => `${(Number(n) || 0).toFixed(3)} OMR`;

export default function PurchaseRequestsPage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<Pr[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [range, setRange] = useState("all");
  const [form, setForm] = useState<Draft>(emptyDraft);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<Pr>("prs", app.asSession());
      setRows(data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    } catch {
      toast.error("Could not load purchase requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  useEffect(() => {
    setView(loadView("nexus_view_prs", "grid"));
  }, []);

  // Materials are a global catalogue — load them so a request can be picked
  // from the list instead of typed by hand.
  useEffect(() => {
    if (!app.ready) return;
    fetchScoped<Material>("materials", app.asSession()).then(setMaterials).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready]);

  // When the form opens, default the site to the active site (or the only one
  // available) so a request always has a project to attach to.
  useEffect(() => {
    if (open && !form.site) {
      const def = app.resolveSite() || (app.sites[0]?.id ?? "");
      if (def) setForm((f) => ({ ...f, site: def }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!inRange(r.createdAt, range)) return false;
      if (!t) return true;
      return [r.desc, r.requester].filter(Boolean).some((v) => String(v).toLowerCase().includes(t));
    });
  }, [rows, q, range]);

  const set =
    (key: keyof Draft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  // A request's own raiser may not approve it (segregation of duties).
  const isOwnRequest = (p: Pr) => !!p.createdBy && p.createdBy === app.session?.uid;

  // Picking a material fills the description (and amount, if blank) from the
  // catalogue, while keeping the link to the material id.
  function pickMaterial(id: string) {
    const m = materials.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      materialId: id,
      desc: m?.name || f.desc,
      amount: f.amount || (m?.price != null ? String(m.price) : f.amount),
    }));
  }

  async function save() {
    if (!form.desc.trim()) return toast.error("Enter a description");
    const siteId = form.site || app.resolveSite();
    if (!siteId) {
      return toast.error(
        app.sites.length === 0
          ? "Create a site/project first (Projects), then raise the request"
          : "Pick a site / project for this request"
      );
    }
    setSaving(true);
    try {
      await addScoped(
        "prs",
        {
          desc: form.desc.trim(),
          amount: Number(form.amount) || 0,
          requester: form.requester || app.session?.name || "—",
          materialId: form.materialId || null,
          procType: form.procType,
          priority: form.priority,
          category: form.category.trim() || null,
          quantity: Number(form.quantity) || null,
          unit: form.unit.trim() || null,
          requiredBy: form.requiredBy || null,
          notes: form.notes.trim() || null,
          stage: "Submitted",
        },
        app.asSession(),
        siteId
      );
      toast.success("Request submitted");
      setOpen(false);
      setForm(emptyDraft);
      await load();
    } catch {
      toast.error("Could not save request — check you have access to this site");
    } finally {
      setSaving(false);
    }
  }

  async function remove(pr: Pr) {
    if (!window.confirm("Delete this purchase request?")) return;
    try {
      await removeScoped("prs", pr.id);
      setRows((r) => r.filter((x) => x.id !== pr.id));
      toast.success("Request deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  // Procurement approval: move a submitted request to Approved / Rejected.
  // Only shown to roles with the "approve" capability on purchase_requests.
  async function setStage(pr: Pr, stage: string) {
    try {
      await updateScoped("prs", pr.id, { stage }, app.asSession());
      setRows((r) => r.map((x) => (x.id === pr.id ? { ...x, stage } : x)));
      toast.success(stage === "Approved" ? "Request approved" : "Request rejected");
    } catch {
      toast.error("Could not update request");
    }
  }

  // Close the loop: turn an APPROVED request into a Purchase Order. The PO is
  // pre-filled from the request and linked back to it (fromPrId), and the
  // request advances to "Ordered" so the chain PR -> PO is traceable.
  async function createPo(pr: Pr) {
    if (pr.poId) return toast.info("A purchase order already exists for this request");
    const amount = Number(pr.amount) || 0;
    const vat = Number((amount * 0.05).toFixed(3));
    try {
      const ref = await addScoped(
        "purchase_orders",
        {
          poNumber: `PO-${Date.now()}`,
          supplier: "",
          fromPrId: pr.id,
          fromPrDesc: pr.desc || "",
          materialId: pr.materialId || null,
          items: [{ desc: pr.desc || "Item", unit: "", qty: 1, unitPrice: amount, lineTotal: amount }],
          subtotal: amount,
          vat,
          total: Number((amount + vat).toFixed(3)),
          status: "draft",
        },
        app.asSession(),
        pr.siteId || app.resolveSite()
      );
      await updateScoped("prs", pr.id, { stage: "Ordered", poId: ref.id }, app.asSession());
      setRows((r) => r.map((x) => (x.id === pr.id ? { ...x, stage: "Ordered", poId: ref.id } : x)));
      toast.success("Purchase order created — open Purchase Orders to add the supplier & send");
    } catch {
      toast.error("Could not create the purchase order");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchase Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} request{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search requests"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          <RangeChips value={range} onChange={setRange} />
          <ViewToggle
            value={view}
            onChange={(v) => {
              setView(v);
              saveView("nexus_view_prs", v);
            }}
            gridLabel="Board"
          />
          {perms.can("purchase_requests", "create") ? (
            <PrSheet
              open={open}
              setOpen={setOpen}
              form={form}
              set={set}
              materials={materials}
              onPickMaterial={pickMaterial}
              sites={app.sites}
              onSite={(id) => setForm((f) => ({ ...f, site: id }))}
              onField={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
              saving={saving}
              onSave={save}
            />
          ) : null}
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-subtle grid place-items-center rounded-3xl px-6 py-16 text-center">
          <div className="max-w-xs">
            <div className="glass glass-specular mx-auto grid size-12 place-items-center rounded-2xl">
              <ClipboardList className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No purchase requests yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create your first request to start the approval flow.
            </p>
          </div>
        </div>
      ) : view === "list" ? (
        <div className="space-y-2">
          {filtered.map((p) => {
            const stage = p.stage || "Submitted";
            const amount = Number(p.amount) || 0;
            const canAppr =
              (perms.can("purchase_requests", "approve") || app.session?.isAdmin) && stage === "Submitted";
            return (
              <div
                key={p.id}
                className="glass glass-specular flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 shrink-0 rounded-full ${DOT[stage] ?? "bg-muted"}`} />
                    <span className="truncate text-sm font-medium">{p.desc || "—"}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {stage} · {fmtOMR(amount)} · {p.requester || "—"} · {fmtDay(p.createdAt)}
                  </div>
                </div>
                {canAppr &&
                !isOwnRequest(p) &&
                canApproveAmount(app.session?.role, amount, !!app.session?.isAdmin) ? (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setStage(p, "Approved")}
                      className="rounded-lg bg-chart-3/15 px-2.5 py-1 text-xs font-semibold text-chart-3 transition hover:bg-chart-3/25"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setStage(p, "Rejected")}
                      className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive/20"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
                {perms.can("purchase_orders", "create") && stage === "Approved" && !p.poId ? (
                  <button
                    onClick={() => createPo(p)}
                    className="flex items-center gap-1 rounded-lg bg-chart-1/15 px-2.5 py-1 text-xs font-semibold text-chart-1 transition hover:bg-chart-1/25"
                  >
                    <ShoppingCart className="size-3.5" /> PO
                  </button>
                ) : null}
                {p.poId ? <span className="text-[11px] font-medium text-chart-1">→ PO</span> : null}
                {perms.can("purchase_requests", "delete") ? (
                  <button
                    onClick={() => remove(p)}
                    aria-label="Delete"
                    className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
            {STAGES.map((stage) => {
              const items = filtered.filter((p) => (p.stage || "Submitted") === stage);
              return (
                <div key={stage} className="glass-subtle min-w-[260px] flex-1 rounded-3xl p-3">
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <span className={`size-2.5 rounded-full ${DOT[stage] ?? "bg-muted"}`} />
                    <span className="text-sm font-semibold">{stage}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {items.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {items.map((p) => (
                      <div key={p.id} className="glass group relative rounded-2xl p-3">
                        {perms.can("purchase_requests", "delete") ? (
                          <button
                            onClick={() => remove(p)}
                            aria-label="Delete"
                            className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        ) : null}
                        <div className="pr-7 text-sm font-medium leading-snug">
                          {p.desc || "—"}
                        </div>
                        <div
                          className={
                            stage === "Received"
                              ? "mt-2 text-sm font-semibold text-chart-3"
                              : "mt-2 text-sm font-semibold"
                          }
                        >
                          {fmtOMR(p.amount)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {p.requester || "—"}
                        </div>
                        {(p.stage || "Submitted") === "Submitted" ? (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            Needs {requiredApproverLabel(Number(p.amount) || 0)} approval
                          </div>
                        ) : null}
                        {(perms.can("purchase_requests", "approve") || app.session?.isAdmin) &&
                        (p.stage || "Submitted") === "Submitted" ? (
                          isOwnRequest(p) ? (
                            // Segregation of duties: the person who raised a
                            // request must not approve it — another approver does.
                            <div className="mt-2 text-[11px] font-medium text-muted-foreground">
                              You raised this — another approver must sign off
                            </div>
                          ) : canApproveAmount(
                              app.session?.role,
                              Number(p.amount) || 0,
                              !!app.session?.isAdmin
                            ) ? (
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => setStage(p, "Approved")}
                                className="rounded-lg bg-chart-3/15 px-2.5 py-1 text-xs font-semibold text-chart-3 transition hover:bg-chart-3/25"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setStage(p, "Rejected")}
                                className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive/20"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            // Delegation of authority: amount exceeds this
                            // approver's signing limit — route to higher authority.
                            <div className="mt-2 text-[11px] font-medium text-chart-4">
                              Above your limit ({approvalLimitFor(app.session?.role).toLocaleString()} OMR) —
                              needs {requiredApproverLabel(Number(p.amount) || 0)}
                            </div>
                          )
                        ) : null}
                        {perms.can("purchase_orders", "create") &&
                        (p.stage || "") === "Approved" &&
                        !p.poId ? (
                          <button
                            onClick={() => createPo(p)}
                            className="mt-2 flex items-center gap-1 rounded-lg bg-chart-1/15 px-2.5 py-1 text-xs font-semibold text-chart-1 transition hover:bg-chart-1/25"
                          >
                            <ShoppingCart className="size-3.5" /> Create PO
                          </button>
                        ) : null}
                        {p.poId ? (
                          <div className="mt-2 text-[11px] font-medium text-chart-1">
                            → Purchase order created
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
      )}
    </div>
  );
}

function PrSheet({
  open,
  setOpen,
  form,
  set,
  materials,
  onPickMaterial,
  sites,
  onSite,
  onField,
  saving,
  onSave,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  form: Draft;
  set: (
    key: keyof Draft
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  materials: Material[];
  onPickMaterial: (id: string) => void;
  sites: { id: string; name?: string }[];
  onSite: (id: string) => void;
  onField: (key: keyof Draft, value: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="glassPrimary" className="rounded-full">
          <Plus className="size-4" /> New request
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New purchase request</SheetTitle>
          <SheetDescription>Describe what you need and the estimated amount.</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-4">
          <Field label="Site / project *" htmlFor="pr-site">
            {sites.length === 0 ? (
              <p className="glass-subtle rounded-xl px-3 py-2 text-xs text-muted-foreground">
                No sites/projects yet — create one in <span className="font-medium">Projects</span> first.
              </p>
            ) : (
              <select
                id="pr-site"
                value={form.site}
                onChange={(e) => onSite(e.target.value)}
                className="glass-subtle h-10 w-full rounded-xl border-0 bg-transparent px-3 text-sm outline-none"
              >
                <option value="">— Choose a site / project —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.id}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Procurement type">
            <div className="glass-subtle flex gap-1 rounded-xl p-1">
              {PROC_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onField("procType", t)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    form.procType === t
                      ? "glass glass-specular text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
          {materials.length > 0 ? (
            <Field label="Material (pick from list)" htmlFor="material">
              <select
                id="material"
                value={form.materialId}
                onChange={(e) => onPickMaterial(e.target.value)}
                className="glass-subtle h-10 w-full rounded-xl border-0 bg-transparent px-3 text-sm outline-none"
              >
                <option value="">— Choose a material —</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || "Unnamed material"}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="Description *" htmlFor="desc">
            <Input
              id="desc"
              value={form.desc}
              onChange={set("desc")}
              placeholder={materials.length > 0 ? "Auto-filled from the material — add quantity / notes" : "What needs to be purchased?"}
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <Field label="Category" htmlFor="category">
            <Input
              id="category"
              value={form.category}
              onChange={set("category")}
              placeholder="e.g. Concrete & Foundation, Electrical, HVAC"
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity" htmlFor="quantity">
              <Input
                id="quantity"
                type="number"
                value={form.quantity}
                onChange={set("quantity")}
                placeholder="0"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Unit" htmlFor="unit">
              <Input
                id="unit"
                value={form.unit}
                onChange={set("unit")}
                placeholder="pcs, m³, ton…"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
          <Field label="Amount (OMR)" htmlFor="amount">
            <Input
              id="amount"
              type="number"
              value={form.amount}
              onChange={set("amount")}
              placeholder="0.000"
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <div className="glass-subtle flex gap-1 rounded-xl p-1">
                {PRIORITIES.map((pr) => (
                  <button
                    key={pr}
                    type="button"
                    onClick={() => onField("priority", pr)}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                      form.priority === pr
                        ? `glass glass-specular ${PRIORITY_CLS[pr]}`
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {pr}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Required by" htmlFor="requiredBy">
              <Input
                id="requiredBy"
                type="date"
                value={form.requiredBy}
                onChange={set("requiredBy")}
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
          <Field label="Requester" htmlFor="requester">
            <Input
              id="requester"
              value={form.requester}
              onChange={set("requester")}
              placeholder="defaults to you"
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <Field label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              value={form.notes}
              onChange={set("notes")}
              placeholder="Any extra detail for the approver or vendor"
              className="glass-subtle min-h-20 rounded-xl border-0"
            />
          </Field>
        </div>

        <SheetFooter className="flex-row gap-2">
          <SheetClose asChild>
            <Button variant="glass" className="flex-1 rounded-full">
              Cancel
            </Button>
          </SheetClose>
          <Button
            variant="glassPrimary"
            className="flex-1 rounded-full"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save request"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped, updateScoped, removeScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
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

type Pr = {
  id: string;
  desc?: string;
  amount?: number;
  requester?: string;
  materialId?: string;
  stage?: string;
};

type Material = { id: string; name?: string; price?: number };

type Draft = { desc: string; amount: string; requester: string; materialId: string; site: string };

const STAGES = ["Submitted", "Approved", "Ordered", "Received", "Rejected"] as const;

const DOT: Record<string, string> = {
  Submitted: "bg-chart-1",
  Approved: "bg-chart-3",
  Ordered: "bg-chart-4",
  Received: "bg-chart-3",
  Rejected: "bg-destructive",
};

const emptyDraft: Draft = { desc: "", amount: "", requester: "", materialId: "", site: "" };

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
  const [form, setForm] = useState<Draft>(emptyDraft);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<Pr>("prs", app.asSession());
      setRows(data);
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
    if (!t) return rows;
    return rows.filter((r) =>
      [r.desc, r.requester]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const set =
    (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

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
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search requests"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
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
      ) : (
        <>
          {rows.length === 0 ? (
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
          ) : null}

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
                        {perms.can("purchase_requests", "approve") &&
                        (p.stage || "Submitted") === "Submitted" ? (
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
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
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
  saving,
  onSave,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  form: Draft;
  set: (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  materials: Material[];
  onPickMaterial: (id: string) => void;
  sites: { id: string; name?: string }[];
  onSite: (id: string) => void;
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
          <Field label="Requester" htmlFor="requester">
            <Input
              id="requester"
              value={form.requester}
              onChange={set("requester")}
              placeholder="defaults to you"
              className="glass-subtle rounded-xl border-0"
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

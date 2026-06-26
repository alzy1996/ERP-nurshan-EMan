"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSignature, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped, removeScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type Contract = {
  id: string;
  title?: string;
  supplier?: string;
  value?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
};

type Draft = Record<string, string>;

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  pending: { label: "Pending", cls: "bg-chart-4/15 text-chart-4" },
  active: { label: "Active", cls: "bg-chart-3/15 text-chart-3" },
  expired: { label: "Expired", cls: "bg-muted text-muted-foreground" },
};

const fmtOMR = (n?: number) =>
  (Number(n) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const emptyDraft: Draft = { status: "draft" };
const NO_SUPPLIER = "__none__";

export default function ContractsPage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Draft>(emptyDraft);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  async function load() {
    setLoading(true);
    try {
      const session = app.asSession();
      const [data, sups] = await Promise.all([
        fetchScoped<Contract>("contracts", session),
        fetchScoped<{ name?: string }>("suppliers", session),
      ]);
      setRows(data.sort((a, b) => (a.title || "").localeCompare(b.title || "")));
      setSuppliers(
        sups
          .map((s) => ({ id: s.id, name: (s.name || "").trim() }))
          .filter((s) => s.name)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch {
      toast.error("Could not load contracts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.title, r.supplier]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    if (!String(form.title || "").trim()) return toast.error("Enter a contract title");
    setSaving(true);
    try {
      await addScoped(
        "contracts",
        { ...form, value: Number(form.value) || 0 },
        app.asSession(),
        app.resolveSite()
      );
      toast.success(`${form.title} added`);
      setOpen(false);
      setForm(emptyDraft);
      await load();
    } catch {
      toast.error("Could not save contract");
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Contract) {
    if (!window.confirm(`Delete contract "${c.title}"?`)) return;
    try {
      await removeScoped("contracts", c.id);
      setRows((r) => r.filter((x) => x.id !== c.id));
      toast.success("Contract deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contracts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} contract{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search contracts"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          {perms.can("contracts", "create") ? (
            <ContractSheet
              open={open}
              setOpen={setOpen}
              form={form}
              setForm={setForm}
              set={set}
              suppliers={suppliers}
              saving={saving}
              onSave={save}
            />
          ) : null}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-subtle grid place-items-center rounded-3xl px-6 py-20 text-center">
          <div className="max-w-xs">
            <div className="glass glass-specular mx-auto grid size-12 place-items-center rounded-2xl">
              <FileSignature className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No contracts yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your first contract to track value, status and renewal dates.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const status = STATUS[c.status || "draft"] ?? STATUS.draft;
            return (
              <div key={c.id} className="glass glass-specular group relative rounded-3xl p-5">
                {perms.can("contracts", "delete") ? (
                  <button
                    onClick={() => remove(c)}
                    aria-label="Delete"
                    className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}

                <div className="min-w-0 pr-7">
                  <div className="truncate text-sm font-semibold">{c.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.supplier || "—"}
                  </div>
                </div>

                <div className="my-3 text-base font-semibold">
                  {fmtOMR(c.value)}{" "}
                  <span className="text-[11px] font-medium text-muted-foreground">OMR</span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={status.cls} variant="secondary">
                    {status.label}
                  </Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {c.startDate || "?"} → {c.endDate || "?"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContractSheet({
  open,
  setOpen,
  form,
  setForm,
  set,
  suppliers,
  saving,
  onSave,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  form: Draft;
  setForm: React.Dispatch<React.SetStateAction<Draft>>;
  set: (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  suppliers: { id: string; name: string }[];
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="glassPrimary" className="rounded-full">
          <Plus className="size-4" /> Add contract
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New contract</SheetTitle>
          <SheetDescription>Contract terms, value and dates.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contract title *" htmlFor="title" className="col-span-2">
                <Input
                  id="title"
                  value={String(form.title ?? "")}
                  onChange={set("title")}
                  placeholder="Asphalt supply agreement"
                  className="glass-subtle rounded-xl border-0"
                />
              </Field>
              <Field
                label="Supplier"
                className="col-span-2"
                hint={
                  suppliers.length === 0
                    ? "No suppliers yet — you can still add this contract"
                    : "Optional — pick from your suppliers"
                }
              >
                {suppliers.length === 0 ? (
                  <div className="glass-subtle rounded-xl px-3 py-2.5 text-sm text-muted-foreground">
                    No suppliers available
                  </div>
                ) : (
                  <Select
                    value={form.supplier ? form.supplier : NO_SUPPLIER}
                    onValueChange={(v) =>
                      setForm((s) => ({ ...s, supplier: v === NO_SUPPLIER ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_SUPPLIER}>— No supplier —</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
              <Field label="Value (OMR)" htmlFor="value">
                <Input
                  id="value"
                  type="number"
                  value={String(form.value ?? "")}
                  onChange={set("value")}
                  placeholder="0.000"
                  className="glass-subtle rounded-xl border-0"
                />
              </Field>
              <Field label="Status">
                <Select
                  value={String(form.status || "draft")}
                  onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Start date" htmlFor="startDate">
                <Input
                  id="startDate"
                  type="date"
                  value={String(form.startDate ?? "")}
                  onChange={set("startDate")}
                  className="glass-subtle rounded-xl border-0"
                />
              </Field>
              <Field label="End date" htmlFor="endDate">
                <Input
                  id="endDate"
                  type="date"
                  value={String(form.endDate ?? "")}
                  onChange={set("endDate")}
                  className="glass-subtle rounded-xl border-0"
                />
              </Field>
            </div>
          </section>
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save contract"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

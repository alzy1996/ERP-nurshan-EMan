"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, Loader2, Paperclip, Plus, Search, Trash2, Wrench, X } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped, removeScoped } from "@/lib/data";
import { uploadFile } from "@/lib/cloudinary";
import { useApp } from "@/context/app-context";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/forms/field";

type Service = {
  id: string;
  code?: string;
  name?: string;
  unit?: string;
  rate?: number;
  supplier?: string;
  fileUrl?: string;
};

type Draft = {
  code?: string;
  name?: string;
  unit?: string;
  rate?: string;
  supplier?: string;
  fileUrl?: string;
};

const FIELDS: { key: keyof Draft; label: string; placeholder?: string; required?: boolean; full?: boolean }[] = [
  { key: "code", label: "Code", placeholder: "SRV-001", required: true },
  { key: "name", label: "Service / Equipment", placeholder: "Excavator hire", required: true },
  { key: "unit", label: "Unit", placeholder: "day, hour, m³" },
  { key: "rate", label: "Rate (OMR)", placeholder: "0.000" },
];

const emptyDraft: Draft = {};
const NO_SUPPLIER = "__none__";

export default function ServicesPage() {
  const app = useApp();
  const [rows, setRows] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Draft>(emptyDraft);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  async function load() {
    setLoading(true);
    try {
      const session = app.asSession();
      const [data, sups] = await Promise.all([
        fetchScoped<Service>("services", session),
        fetchScoped<{ name?: string }>("suppliers", session),
      ]);
      setRows(data.sort((a, b) => (a.code || "").localeCompare(b.code || "")));
      setSuppliers(
        sups
          .map((s) => ({ id: s.id, name: (s.name || "").trim() }))
          .filter((s) => s.name)
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch {
      toast.error("Could not load services");
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
      [r.code, r.name, r.supplier]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadFile(file, "contracts");
      setForm((f) => ({ ...f, fileUrl: url }));
      toast.success("File uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!String(form.code || "").trim()) return toast.error("Enter a code");
    if (!String(form.name || "").trim()) return toast.error("Enter a name");
    setSaving(true);
    try {
      await addScoped(
        "services",
        { ...form, rate: Number(form.rate) || 0 },
        app.asSession(),
        app.resolveSite()
      );
      toast.success(`${form.name} added`);
      setOpen(false);
      setForm(emptyDraft);
      await load();
    } catch {
      toast.error("Could not save service");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Service) {
    if (!window.confirm(`Delete service "${s.name || s.code}"?`)) return;
    try {
      await removeScoped("services", s.id);
      setRows((r) => r.filter((x) => x.id !== s.id));
      toast.success("Service deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} service{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search services"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ServiceSheet
            open={open}
            setOpen={setOpen}
            form={form}
            setForm={setForm}
            set={set}
            suppliers={suppliers}
            saving={saving}
            uploading={uploading}
            onFile={onFile}
            onSave={save}
          />
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
              <Wrench className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No services yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your first service or piece of equipment to build the catalog.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className="glass glass-specular group relative rounded-3xl p-5">
              <button
                onClick={() => remove(s)}
                aria-label="Delete"
                className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>

              <Badge variant="secondary" className="font-mono">
                {s.code || "—"}
              </Badge>

              <div className="mt-3 min-w-0">
                <div className="truncate text-sm font-semibold">{s.name || "—"}</div>
                <div className="truncate text-xs text-muted-foreground">{s.unit || "—"}</div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{(s.rate || 0).toFixed(3)} OMR</span>
                {s.fileUrl ? (
                  <Button variant="glass" size="sm" className="rounded-full" asChild>
                    <a href={s.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Paperclip className="size-3.5" /> Contract
                    </a>
                  </Button>
                ) : null}
              </div>

              <div className="mt-2 truncate text-xs text-muted-foreground">{s.supplier || "—"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceSheet({
  open,
  setOpen,
  form,
  setForm,
  set,
  suppliers,
  saving,
  uploading,
  onFile,
  onSave,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  form: Draft;
  setForm: React.Dispatch<React.SetStateAction<Draft>>;
  set: (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  suppliers: { id: string; name: string }[];
  saving: boolean;
  uploading: boolean;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="glassPrimary" className="rounded-full">
          <Plus className="size-4" /> Add service
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New service</SheetTitle>
          <SheetDescription>Catalog entry with tracking code and contract.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <Field
                  key={f.key}
                  label={f.required ? `${f.label} *` : f.label}
                  htmlFor={f.key}
                  className={f.full ? "col-span-2" : ""}
                >
                  <Input
                    id={f.key}
                    type={f.key === "rate" ? "number" : "text"}
                    value={String(form[f.key] ?? "")}
                    onChange={set(f.key)}
                    placeholder={f.placeholder}
                    className="glass-subtle rounded-xl border-0"
                  />
                </Field>
              ))}
            </div>

            {/* Supplier — picked from existing suppliers (optional) */}
            <Field
              label="Supplier"
              hint={
                suppliers.length === 0
                  ? "No suppliers yet — you can still add this service"
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
          </section>

          {/* Contract file */}
          <section className="space-y-3">
            <Field label="Contract file (jpg/png/pdf, ≤5MB)">
              {form.fileUrl ? (
                <div className="glass-subtle flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">Attached</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, fileUrl: undefined }))}
                    aria-label="Remove file"
                    className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <label className="glass-subtle flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition hover:bg-foreground/5">
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Paperclip className="size-4" />
                  )}
                  {uploading ? "Uploading…" : "Upload contract"}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={onFile}
                    disabled={uploading}
                    className="sr-only"
                  />
                </label>
              )}
            </Field>
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save service"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

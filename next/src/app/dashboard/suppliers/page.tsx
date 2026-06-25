"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped, removeScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

type Supplier = {
  id: string;
  name?: string;
  category?: string;
  website?: string;
  contactPerson?: string;
  phone?: string;
  secondaryPhone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  crNumber?: string;
  vatNumber?: string;
  paymentTerms?: string;
  bankName?: string;
  bankAccount?: string;
  rating?: number;
  status?: string;
  tags?: string;
  notes?: string;
  preferred?: boolean;
};

type Draft = Record<string, string | boolean>;

const GROUPS: { title: string; fields: { key: string; label: string; placeholder?: string; required?: boolean; full?: boolean }[] }[] = [
  {
    title: "Company",
    fields: [
      { key: "name", label: "Company / Supplier name", placeholder: "BRIGHT LIGHT Trading", required: true, full: true },
      { key: "category", label: "Category / Trade", placeholder: "Bitumen, Aggregate…" },
      { key: "website", label: "Website", placeholder: "https://" },
    ],
  },
  {
    title: "Contact",
    fields: [
      { key: "contactPerson", label: "Contact person", placeholder: "Ahmed Al-Balushi" },
      { key: "phone", label: "Phone", placeholder: "+968 …", required: true },
      { key: "secondaryPhone", label: "Secondary phone", placeholder: "+968 …" },
      { key: "email", label: "Email", placeholder: "name@company.com" },
    ],
  },
  {
    title: "Address",
    fields: [
      { key: "address", label: "Address", placeholder: "Street, building", full: true },
      { key: "city", label: "City", placeholder: "Muscat" },
      { key: "region", label: "Region", placeholder: "Muscat Governorate" },
      { key: "country", label: "Country", placeholder: "Oman" },
    ],
  },
  {
    title: "Compliance & finance",
    fields: [
      { key: "crNumber", label: "CR number", placeholder: "Commercial registration" },
      { key: "vatNumber", label: "VAT number", placeholder: "OM…" },
      { key: "paymentTerms", label: "Payment terms", placeholder: "Net 30" },
      { key: "bankName", label: "Bank", placeholder: "Bank Muscat" },
      { key: "bankAccount", label: "Account / IBAN", placeholder: "OM…", full: true },
    ],
  },
];

const STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-chart-3/15 text-chart-3" },
  pending: { label: "Pending", cls: "bg-chart-4/15 text-chart-4" },
  blacklisted: { label: "Blacklisted", cls: "bg-destructive/15 text-destructive" },
};

const emptyDraft: Draft = { status: "active", rating: "4", preferred: false };

export default function SuppliersPage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Draft>(emptyDraft);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<Supplier>("suppliers", app.asSession());
      setRows(data.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    } catch {
      toast.error("Could not load suppliers");
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
      [r.name, r.category, r.contactPerson, r.phone, r.city]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    if (!String(form.name || "").trim()) return toast.error("Enter a supplier name");
    if (!String(form.phone || "").trim()) return toast.error("Enter a phone number");
    setSaving(true);
    try {
      await addScoped(
        "suppliers",
        { ...form, rating: Number(form.rating) || null, score: "B", orders: 0, onTime: 0 },
        app.asSession(),
        app.resolveSite()
      );
      toast.success(`${form.name} added`);
      setOpen(false);
      setForm(emptyDraft);
      await load();
    } catch {
      toast.error("Could not save supplier");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Supplier) {
    if (!window.confirm(`Delete supplier "${s.name}"?`)) return;
    try {
      await removeScoped("suppliers", s.id);
      setRows((r) => r.filter((x) => x.id !== s.id));
      toast.success("Supplier deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vendor intelligence — {rows.length} supplier{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search suppliers"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          {perms.can("suppliers", "create") ? (
            <SupplierSheet
              open={open}
              setOpen={setOpen}
              form={form}
              setForm={setForm}
              set={set}
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
              <Building2 className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No suppliers yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your first vendor to start collecting offers and scoring performance.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const status = STATUS[s.status || "active"] ?? STATUS.active;
            return (
              <div key={s.id} className="glass glass-specular group relative rounded-3xl p-5">
                {perms.can("suppliers", "delete") ? (
                  <button
                    onClick={() => remove(s)}
                    aria-label="Delete"
                    className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">
                    {(s.name || "?").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.category || "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Badge className={status.cls} variant="secondary">
                    {status.label}
                  </Badge>
                  {s.preferred ? (
                    <Badge variant="outline" className="gap-1">
                      <Star className="size-3 fill-chart-4 text-chart-4" /> Preferred
                    </Badge>
                  ) : null}
                  <span className="ml-auto flex items-center gap-0.5 text-xs text-muted-foreground">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={
                          i < (s.rating || 0)
                            ? "size-3 fill-chart-4 text-chart-4"
                            : "size-3 text-muted-foreground/30"
                        }
                      />
                    ))}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-3.5" /> {s.phone || "—"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3.5" /> {s.email || "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SupplierSheet({
  open,
  setOpen,
  form,
  setForm,
  set,
  saving,
  onSave,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  form: Draft;
  setForm: React.Dispatch<React.SetStateAction<Draft>>;
  set: (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="glassPrimary" className="rounded-full">
          <Plus className="size-4" /> Add supplier
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New supplier</SheetTitle>
          <SheetDescription>Vendor details, compliance and finance.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          {GROUPS.map((group) => (
            <section key={group.title} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.title}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {group.fields.map((f) => (
                  <Field
                    key={f.key}
                    label={f.required ? `${f.label} *` : f.label}
                    htmlFor={f.key}
                    className={f.full ? "col-span-2" : ""}
                  >
                    <Input
                      id={f.key}
                      value={String(form[f.key] ?? "")}
                      onChange={set(f.key)}
                      placeholder={f.placeholder}
                      className="glass-subtle rounded-xl border-0"
                    />
                  </Field>
                ))}
              </div>
            </section>
          ))}

          {/* Meta */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Classification
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <Select
                  value={String(form.status || "active")}
                  onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="blacklisted">Blacklisted</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Rating">
                <Select
                  value={String(form.rating || "4")}
                  onValueChange={(v) => setForm((s) => ({ ...s, rating: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {"★".repeat(n)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tags" className="col-span-2" hint="Comma-separated">
                <Input
                  value={String(form.tags ?? "")}
                  onChange={set("tags")}
                  placeholder="quarry, bitumen, fuel"
                  className="glass-subtle rounded-xl border-0"
                />
              </Field>
              <Field label="Notes" className="col-span-2">
                <Textarea
                  value={String(form.notes ?? "")}
                  onChange={set("notes")}
                  placeholder="Internal notes…"
                />
              </Field>
            </div>
            <label className="glass-subtle flex items-center justify-between rounded-xl px-3.5 py-2.5">
              <span className="text-sm font-medium">Preferred supplier</span>
              <Switch
                checked={Boolean(form.preferred)}
                onCheckedChange={(v) => setForm((s) => ({ ...s, preferred: v }))}
              />
            </label>
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save supplier"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

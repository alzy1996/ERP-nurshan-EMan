"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped, removeScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
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

type Offer = {
  id: string;
  item: string;
  supplier?: string;
  price?: number;
  valid?: string;
  status?: string;
};

type RawOffer = {
  id: string;
  item?: string;
  material?: string;
  supplier?: string;
  price?: number;
  validity?: string;
  valid?: string;
  status?: string;
};

type Draft = {
  item: string;
  supplier: string;
  price: string;
  valid: string;
  status: string;
};

const emptyDraft: Draft = { item: "", supplier: "", price: "", valid: "", status: "New" };

const FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "active", label: "Active" },
  { id: "expiring", label: "Expiring" },
  { id: "expired", label: "Expired" },
];

const STATUS_BADGE: Record<string, string> = {
  New: "bg-chart-1/15 text-chart-1",
  Accepted: "bg-chart-3/15 text-chart-3",
  Expired: "bg-muted text-muted-foreground",
};

const daysUntil = (d?: string): number => {
  if (!d) return 9999;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return 9999;
  return Math.ceil((t - Date.now()) / 86400000);
};

function normalize(o: RawOffer): Offer {
  return {
    id: o.id,
    item: o.item || o.material || "",
    supplier: o.supplier,
    price: o.price || 0,
    valid: o.validity || o.valid || "",
    status: o.status || "New",
  };
}

export default function OffersPage() {
  const app = useApp();
  const [rows, setRows] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState<Draft>(emptyDraft);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<RawOffer>("offers", app.asSession());
      setRows(data.map(normalize));
    } catch {
      toast.error("Could not load offers");
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
    return rows.filter((o) => {
      if (t && ![o.item, o.supplier].filter(Boolean).some((v) => String(v).toLowerCase().includes(t)))
        return false;
      const d = daysUntil(o.valid);
      if (filter === "new") return o.status === "New";
      if (filter === "active") return o.status === "Active" || o.status === "New";
      if (filter === "expiring") return d >= 0 && d <= 5 && o.status !== "Expired";
      if (filter === "expired") return o.status === "Expired" || d < 0;
      return true;
    });
  }, [rows, q, filter]);

  const set =
    (key: keyof Draft) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    if (!form.item.trim()) return toast.error("Enter an item");
    setSaving(true);
    try {
      await addScoped(
        "offers",
        {
          item: form.item,
          supplier: form.supplier,
          price: Number(form.price) || 0,
          validity: form.valid,
          status: form.status,
        },
        app.asSession(),
        app.resolveSite()
      );
      toast.success(`${form.item} added`);
      setOpen(false);
      setForm(emptyDraft);
      await load();
    } catch {
      toast.error("Could not save offer");
    } finally {
      setSaving(false);
    }
  }

  async function remove(o: Offer) {
    if (!window.confirm("Delete this offer?")) return;
    try {
      await removeScoped("offers", o.id);
      setRows((r) => r.filter((x) => x.id !== o.id));
      toast.success("Offer deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  async function convert(o: Offer) {
    try {
      await addScoped(
        "prs",
        {
          desc: o.item,
          amount: o.price,
          supplier: o.supplier,
          requester: app.session?.name || "—",
          stage: "Submitted",
          offerId: o.id,
        },
        app.asSession(),
        app.resolveSite()
      );
      toast.success("Converted to a Purchase Request");
    } catch {
      toast.error("Could not convert");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Offers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} offer{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search offers"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          <OfferSheet
            open={open}
            setOpen={setOpen}
            form={form}
            setForm={setForm}
            set={set}
            saving={saving}
            onSave={save}
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={
              filter === f.id
                ? "glass rounded-full px-3.5 py-1.5 text-xs font-medium"
                : "glass-subtle rounded-full px-3.5 py-1.5 text-xs text-muted-foreground"
            }
          >
            {f.label}
          </button>
        ))}
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
              <FileText className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No offers yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add an offer to start tracking supplier pricing and validity.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => {
            const d = daysUntil(o.valid);
            const expired = o.status === "Expired" || d < 0;
            const vTone = expired || d <= 2
              ? "bg-destructive/15 text-destructive"
              : d <= 5
                ? "bg-chart-4/15 text-chart-4"
                : "bg-chart-3/15 text-chart-3";
            const statusCls = STATUS_BADGE[o.status || "New"] ?? "bg-muted text-muted-foreground";
            return (
              <div key={o.id} className="glass glass-specular group relative rounded-3xl p-5">
                <button
                  onClick={() => remove(o)}
                  aria-label="Delete"
                  className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>

                <div className="flex items-start justify-between gap-2 pr-6">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{o.item}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {o.supplier || "—"}
                    </div>
                  </div>
                  <Badge className={statusCls} variant="secondary">
                    {o.status}
                  </Badge>
                </div>

                <div className="mt-3 text-base font-semibold">
                  {(o.price || 0).toFixed(3)}{" "}
                  <span className="text-[11px] font-medium text-muted-foreground">OMR</span>
                </div>

                {o.valid ? (
                  <div className="mt-2">
                    <Badge className={vTone} variant="secondary">
                      {expired ? "Expired" : `Expires in ${d}d`}
                    </Badge>
                  </div>
                ) : null}

                <div className="mt-4">
                  <Button variant="glass" size="sm" className="rounded-full" onClick={() => convert(o)}>
                    Convert to PR
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OfferSheet({
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
  set: (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="glassPrimary" className="rounded-full">
          <Plus className="size-4" /> Add offer
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New offer</SheetTitle>
          <SheetDescription>Supplier quote, price and validity.</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Item *" htmlFor="item" className="col-span-2">
              <Input
                id="item"
                value={form.item}
                onChange={set("item")}
                placeholder="Bitumen 60/70"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Supplier" htmlFor="supplier" className="col-span-2">
              <Input
                id="supplier"
                value={form.supplier}
                onChange={set("supplier")}
                placeholder="BRIGHT LIGHT Trading"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Price (OMR)" htmlFor="price">
              <Input
                id="price"
                type="number"
                value={form.price}
                onChange={set("price")}
                placeholder="0.000"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Valid until" htmlFor="valid">
              <Input
                id="valid"
                type="date"
                value={form.valid}
                onChange={set("valid")}
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Status" className="col-span-2">
              <Select
                value={form.status}
                onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save offer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

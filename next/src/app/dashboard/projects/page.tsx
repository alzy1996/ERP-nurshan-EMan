"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FolderKanban, Loader2, MapPin, Plus, Search, User } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped } from "@/lib/data";
import { demoSession } from "@/lib/session";
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

type Project = {
  id: string;
  name?: string;
  code?: string;
  client?: string;
  status?: string;
  location?: string;
  manager?: string;
  budget?: string | number;
  currency?: string;
  startDate?: string;
  endDate?: string;
};

type Draft = Record<string, string>;

const FIELDS: { key: string; label: string; placeholder?: string; required?: boolean; full?: boolean; type?: string }[] = [
  { key: "name", label: "Project name", placeholder: "Hadbin Road & Infrastructure", required: true, full: true },
  { key: "code", label: "Project code", placeholder: "HRI-2026" },
  { key: "client", label: "Client", placeholder: "Ministry of Transport" },
  { key: "location", label: "Location", placeholder: "Muscat, Oman", full: true },
  { key: "manager", label: "Project manager", placeholder: "Salim Al-Hinai" },
  { key: "budget", label: "Budget (OMR)", placeholder: "2,500,000" },
  { key: "startDate", label: "Start date", type: "date" },
  { key: "endDate", label: "End date", type: "date" },
];

const STATUS: Record<string, { label: string; cls: string }> = {
  planning: { label: "Planning", cls: "bg-chart-1/15 text-chart-1" },
  active: { label: "Active", cls: "bg-chart-3/15 text-chart-3" },
  "on-hold": { label: "On hold", cls: "bg-chart-4/15 text-chart-4" },
  completed: { label: "Completed", cls: "bg-muted text-muted-foreground" },
};

const emptyDraft: Draft = { status: "active", currency: "OMR" };

export default function ProjectsPage() {
  const [rows, setRows] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Draft>(emptyDraft);

  async function load() {
    setLoading(true);
    try {
      // Projects are modelled on the existing `sites` collection (extended).
      const data = await fetchScoped<Project>("sites", demoSession);
      setRows(data.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    } catch {
      toast.error("Could not load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.name, r.code, r.client, r.location, r.manager]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    if (!String(form.name || "").trim()) return toast.error("Enter a project name");
    setSaving(true);
    try {
      await addScoped("sites", { ...form, currency: form.currency || "OMR" }, demoSession);
      toast.success(`${form.name} added`);
      setOpen(false);
      setForm(emptyDraft);
      await load();
    } catch {
      toast.error("Could not save project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sites &amp; programmes — {rows.length} project{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="glassPrimary" className="rounded-full">
                <Plus className="size-4" /> New project
              </Button>
            </SheetTrigger>
            <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
              <SheetHeader>
                <SheetTitle>New project</SheetTitle>
                <SheetDescription>A construction site or programme.</SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-4 pb-4">
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
                        type={f.type}
                        value={form[f.key] ?? ""}
                        onChange={set(f.key)}
                        placeholder={f.placeholder}
                        className="glass-subtle rounded-xl border-0"
                      />
                    </Field>
                  ))}
                  <Field label="Status" className="col-span-2">
                    <Select
                      value={form.status || "active"}
                      onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on-hold">On hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
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
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : "Save project"}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-24 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-subtle grid place-items-center rounded-3xl px-6 py-20 text-center">
          <div className="max-w-xs">
            <div className="glass glass-specular mx-auto grid size-12 place-items-center rounded-2xl">
              <FolderKanban className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No projects yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create your first site to scope materials, suppliers and approvals to it.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((p) => {
            const status = STATUS[p.status || "active"] ?? STATUS.active;
            return (
              <div key={p.id} className="glass glass-specular rounded-3xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{p.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.code || "—"} {p.client ? `· ${p.client}` : ""}
                    </div>
                  </div>
                  <Badge className={status.cls} variant="secondary">
                    {status.label}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> {p.location || "—"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User className="size-3.5" /> {p.manager || "—"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" /> {p.startDate || "—"}
                  </span>
                  <span className="font-medium text-foreground">
                    {p.budget ? `${p.budget} ${p.currency || "OMR"}` : "—"}
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

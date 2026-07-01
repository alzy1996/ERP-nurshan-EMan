"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ListTodo, Loader2, Plus, Search, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped, updateScoped, removeScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

type Task = {
  id: string;
  title?: string;
  description?: string;
  type?: string;
  assignee?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  siteId?: string;
  createdBy?: string;
  createdAt?: number;
};

type Draft = {
  site: string;
  title: string;
  description: string;
  type: string;
  assignee: string;
  priority: string;
  dueDate: string;
  status: string;
};

const TYPES = ["Task", "RFI"] as const;
const PRIORITIES = ["Low", "Medium", "High"] as const;

const COLUMNS: { key: string; label: string; dot: string }[] = [
  { key: "todo", label: "To do", dot: "bg-chart-1" },
  { key: "in_progress", label: "In progress", dot: "bg-chart-4" },
  { key: "done", label: "Done", dot: "bg-chart-3" },
];

// The single contextual action per column, and where it moves the card.
const ADVANCE: Record<string, { to: string; label: string } | undefined> = {
  todo: { to: "in_progress", label: "Start" },
  in_progress: { to: "done", label: "Complete" },
  done: { to: "todo", label: "Reopen" },
};

const PRIORITY_CLS: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-chart-1/15 text-chart-1",
  High: "bg-destructive/15 text-destructive",
};

const TYPE_CLS: Record<string, string> = {
  Task: "bg-chart-1/15 text-chart-1",
  RFI: "bg-chart-4/15 text-chart-4",
};

const emptyDraft: Draft = {
  site: "",
  title: "",
  description: "",
  type: "Task",
  assignee: "",
  priority: "Medium",
  dueDate: "",
  status: "todo",
};

export default function TasksPage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Draft>(emptyDraft);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<Task>("tasks", app.asSession());
      setRows(data);
    } catch {
      toast.error("Could not load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

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
      [r.title, r.assignee, r.type, r.description]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    if (!form.title.trim()) return toast.error("Enter a title");
    const siteId = form.site || app.resolveSite();
    if (!siteId) {
      return toast.error(
        app.sites.length === 0
          ? "Create a site/project first (Projects), then add a task"
          : "Pick a site / project for this item"
      );
    }
    setSaving(true);
    try {
      await addScoped(
        "tasks",
        {
          title: form.title.trim(),
          description: form.description.trim() || null,
          type: form.type,
          assignee: form.assignee.trim() || null,
          priority: form.priority,
          dueDate: form.dueDate || null,
          status: form.status,
        },
        app.asSession(),
        siteId
      );
      toast.success(`${form.type} added`);
      setOpen(false);
      setForm(emptyDraft);
      await load();
    } catch {
      toast.error("Could not save — check you have access to this site");
    } finally {
      setSaving(false);
    }
  }

  async function move(t: Task) {
    const adv = ADVANCE[t.status || "todo"];
    if (!adv) return;
    try {
      await updateScoped("tasks", t.id, { status: adv.to }, app.asSession());
      setRows((r) => r.map((x) => (x.id === t.id ? { ...x, status: adv.to } : x)));
    } catch {
      toast.error("Could not update task");
    }
  }

  async function remove(t: Task) {
    if (!window.confirm("Delete this item?")) return;
    try {
      await removeScoped("tasks", t.id);
      setRows((r) => r.filter((x) => x.id !== t.id));
      toast.success("Deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  const canUpdate = perms.can("tasks", "update");
  const canDelete = perms.can("tasks", "delete");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Task board &amp; RFIs — {rows.length} item{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass-subtle flex items-center gap-2 rounded-full px-3.5 py-2 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tasks"
              className="w-40 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          {perms.can("tasks", "create") ? (
            <TaskSheet
              open={open}
              setOpen={setOpen}
              form={form}
              set={set}
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
              <ListTodo className="size-5" />
            </div>
            <p className="mt-4 text-sm font-medium">No tasks yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add tasks and RFIs to plan and track site work to completion.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLUMNS.map((col) => {
            const items = filtered.filter((t) => (t.status || "todo") === col.key);
            return (
              <div key={col.key} className="glass-subtle min-w-[280px] flex-1 rounded-3xl p-3">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className={`size-2.5 rounded-full ${col.dot}`} />
                  <span className="text-sm font-semibold">{col.label}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {items.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {items.map((t) => (
                    <div key={t.id} className="glass group relative rounded-2xl p-3">
                      {canDelete ? (
                        <button
                          onClick={() => remove(t)}
                          aria-label="Delete"
                          className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : null}
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className={TYPE_CLS[t.type || "Task"] ?? ""}>
                          {t.type || "Task"}
                        </Badge>
                        {t.priority ? (
                          <Badge variant="secondary" className={PRIORITY_CLS[t.priority] ?? ""}>
                            {t.priority}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 pr-6 text-sm font-medium leading-snug">{t.title}</div>
                      {t.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {t.assignee ? (
                          <span className="flex items-center gap-1">
                            <User className="size-3" /> {t.assignee}
                          </span>
                        ) : null}
                        {t.dueDate ? (
                          <span className="flex items-center gap-1">
                            <CalendarClock className="size-3" /> {t.dueDate}
                          </span>
                        ) : null}
                      </div>
                      {canUpdate && ADVANCE[t.status || "todo"] ? (
                        <button
                          onClick={() => move(t)}
                          className="mt-2 rounded-lg bg-foreground/5 px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-foreground/10"
                        >
                          {ADVANCE[t.status || "todo"]!.label}
                        </button>
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

function TaskSheet({
  open,
  setOpen,
  form,
  set,
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
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
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
          <Plus className="size-4" /> New task
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New task / RFI</SheetTitle>
          <SheetDescription>Plan site work or raise a request for information.</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-4">
          <Field label="Site / project *" htmlFor="tk-site">
            {sites.length === 0 ? (
              <p className="glass-subtle rounded-xl px-3 py-2 text-xs text-muted-foreground">
                No sites/projects yet — create one in <span className="font-medium">Projects</span> first.
              </p>
            ) : (
              <select
                id="tk-site"
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
          <Field label="Type">
            <div className="glass-subtle flex gap-1 rounded-xl p-1">
              {TYPES.map((ty) => (
                <button
                  key={ty}
                  type="button"
                  onClick={() => onField("type", ty)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    form.type === ty
                      ? `glass glass-specular ${TYPE_CLS[ty]}`
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {ty}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Title *" htmlFor="tk-title">
            <Input
              id="tk-title"
              value={form.title}
              onChange={set("title")}
              placeholder={form.type === "RFI" ? "Structural column anchor detail" : "Install Level 4 HVAC ducts"}
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <Field label="Description" htmlFor="tk-desc">
            <Textarea
              id="tk-desc"
              value={form.description}
              onChange={set("description")}
              placeholder="Details, scope or the question being raised…"
              className="glass-subtle min-h-16 rounded-xl border-0"
            />
          </Field>
          <Field label={form.type === "RFI" ? "Raised to" : "Assignee"} htmlFor="tk-assignee">
            <Input
              id="tk-assignee"
              value={form.assignee}
              onChange={set("assignee")}
              placeholder={form.type === "RFI" ? "Arch-Solutions" : "Crew / person"}
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
                    className={`flex-1 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition ${
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
            <Field label="Due date" htmlFor="tk-due">
              <Input
                id="tk-due"
                type="date"
                value={form.dueDate}
                onChange={set("dueDate")}
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </div>
          <Field label="Column">
            <div className="glass-subtle flex gap-1 rounded-xl p-1">
              {COLUMNS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onField("status", c.key)}
                  className={`flex-1 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition ${
                    form.status === c.key
                      ? "glass glass-specular text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

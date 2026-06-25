"use client";

import { useEffect, useState } from "react";
import { Clock, HardHat, Loader2, Plus, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped, removeScoped, updateScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/forms/field";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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

type Draft = Record<string, string>;

type SupTs = {
  id: string;
  supplier?: string;
  workerName?: string;
  date?: string;
  timeIn?: string;
  timeOut?: string;
  hours?: number;
  noWorkReason?: string;
};

type EqLog = {
  id: string;
  supplier?: string;
  equipmentCode?: string;
  date?: string;
  meterStart?: number;
  meterEnd?: number;
  hours?: number;
  note?: string;
};

type IntTs = {
  id: string;
  user?: string;
  date?: string;
  hours?: number;
  task?: string;
  status?: string;
  approvedByHR?: string;
};

type FieldDef = {
  key: string;
  label: string;
  type?: string;
  placeholder?: string;
  full?: boolean;
};

// ---------------------------------------------------------------------------
// Reusable add-form Sheet. Renders the trigger Button + a Sheet of Inputs.
// ---------------------------------------------------------------------------
function AddSheet({
  title,
  description,
  triggerLabel,
  fields,
  initial,
  saving,
  onSave,
}: {
  title: string;
  description: string;
  triggerLabel: string;
  fields: FieldDef[];
  initial: Draft;
  saving: boolean;
  onSave: (form: Draft) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Draft>(initial);

  // Reset the form to its defaults whenever the sheet is (re)opened.
  useEffect(() => {
    if (open) setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set =
    (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSave() {
    const ok = await onSave(form);
    if (ok) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="glassPrimary" className="rounded-full">
          <Plus className="size-4" /> {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          {fields.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              htmlFor={f.key}
              className={f.full ? "col-span-2" : ""}
            >
              <Input
                id={f.key}
                type={f.type || "text"}
                value={form[f.key] ?? ""}
                onChange={set(f.key)}
                placeholder={f.placeholder}
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          ))}
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
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="glass-subtle grid place-items-center rounded-2xl px-6 py-12 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="grid place-items-center py-16 text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Delete"
      className="ml-auto grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// TAB 1 — Supplier timesheets
// ---------------------------------------------------------------------------
function SupplierTab() {
  const app = useApp();
  const [rows, setRows] = useState<SupTs[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<SupTs>("supplier_timesheets", app.asSession());
      setRows(data.sort((a, b) => (b.date || "").localeCompare(a.date || "")));
    } catch {
      toast.error("Could not load supplier timesheets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  async function save(form: Draft): Promise<boolean> {
    if (!String(form.workerName || "").trim()) {
      toast.error("Enter a worker name");
      return false;
    }
    setSaving(true);
    try {
      await addScoped(
        "supplier_timesheets",
        { ...form, hours: Number(form.hours) || 0 },
        app.asSession(),
        app.resolveSite()
      );
      toast.success("Timesheet added");
      await load();
      return true;
    } catch {
      toast.error("Could not save timesheet");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: SupTs) {
    if (!window.confirm(`Delete timesheet for "${r.workerName || "worker"}"?`)) return;
    try {
      await removeScoped("supplier_timesheets", r.id);
      setRows((x) => x.filter((y) => y.id !== r.id));
      toast.success("Timesheet deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddSheet
          title="New supplier timesheet"
          description="Worker hours logged against a supplier."
          triggerLabel="Add"
          saving={saving}
          initial={{}}
          onSave={save}
          fields={[
            { key: "supplier", label: "Supplier", placeholder: "Supplier name" },
            { key: "workerName", label: "Worker name", placeholder: "Full name" },
            { key: "date", label: "Date", type: "date" },
            { key: "timeIn", label: "Time in", type: "time" },
            { key: "timeOut", label: "Time out", type: "time" },
            { key: "hours", label: "Hours", type: "number", placeholder: "0" },
            { key: "noWorkReason", label: "No-work reason", placeholder: "Optional", full: true },
          ]}
        />
      </div>

      {loading ? (
        <LoadingRow />
      ) : rows.length === 0 ? (
        <EmptyHint label="No entries yet" />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="glass group rounded-2xl p-3 flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Clock className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {r.workerName || "—"}
                  {r.supplier ? (
                    <span className="text-muted-foreground"> · {r.supplier}</span>
                  ) : null}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {r.date || "—"}
                  {r.timeIn || r.timeOut ? (
                    <span>
                      {" · "}
                      {r.timeIn || "—"}–{r.timeOut || "—"}
                    </span>
                  ) : null}
                  {r.noWorkReason ? <span> · {r.noWorkReason}</span> : null}
                </div>
              </div>
              <Badge variant="secondary" className="ml-auto shrink-0">
                {r.hours ?? 0}h
              </Badge>
              <DeleteButton onClick={() => remove(r)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 2 — Equipment logs
// ---------------------------------------------------------------------------
function EquipmentTab() {
  const app = useApp();
  const [rows, setRows] = useState<EqLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<EqLog>("equipment_logs", app.asSession());
      setRows(data.sort((a, b) => (b.date || "").localeCompare(a.date || "")));
    } catch {
      toast.error("Could not load equipment logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  async function save(form: Draft): Promise<boolean> {
    if (!String(form.equipmentCode || "").trim()) {
      toast.error("Enter an equipment code");
      return false;
    }
    setSaving(true);
    try {
      await addScoped(
        "equipment_logs",
        {
          ...form,
          meterStart: Number(form.meterStart) || 0,
          meterEnd: Number(form.meterEnd) || 0,
          hours: Number(form.hours) || 0,
        },
        app.asSession(),
        app.resolveSite()
      );
      toast.success("Equipment log added");
      await load();
      return true;
    } catch {
      toast.error("Could not save log");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: EqLog) {
    if (!window.confirm(`Delete log for "${r.equipmentCode || "equipment"}"?`)) return;
    try {
      await removeScoped("equipment_logs", r.id);
      setRows((x) => x.filter((y) => y.id !== r.id));
      toast.success("Log deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddSheet
          title="New equipment log"
          description="Meter readings & hours for a machine."
          triggerLabel="Add"
          saving={saving}
          initial={{}}
          onSave={save}
          fields={[
            { key: "equipmentCode", label: "Equipment code", placeholder: "EXC-01" },
            { key: "supplier", label: "Supplier", placeholder: "Supplier name" },
            { key: "date", label: "Date", type: "date" },
            { key: "meterStart", label: "Meter start", type: "number", placeholder: "0" },
            { key: "meterEnd", label: "Meter end", type: "number", placeholder: "0" },
            { key: "hours", label: "Hours", type: "number", placeholder: "0" },
            { key: "note", label: "Note", placeholder: "Optional", full: true },
          ]}
        />
      </div>

      {loading ? (
        <LoadingRow />
      ) : rows.length === 0 ? (
        <EmptyHint label="No entries yet" />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="glass group rounded-2xl p-3 flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <HardHat className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  <Badge variant="outline" className="font-mono">
                    {r.equipmentCode || "—"}
                  </Badge>
                  {r.supplier ? (
                    <span className="text-muted-foreground"> · {r.supplier}</span>
                  ) : null}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {r.date || "—"}
                  {r.meterStart != null || r.meterEnd != null ? (
                    <span>
                      {" · "}
                      {r.meterStart ?? 0}→{r.meterEnd ?? 0}
                    </span>
                  ) : null}
                  {r.note ? <span> · {r.note}</span> : null}
                </div>
              </div>
              <Badge variant="secondary" className="ml-auto shrink-0">
                {r.hours ?? 0}h
              </Badge>
              <DeleteButton onClick={() => remove(r)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 3 — Internal timesheets (with HR approval)
// ---------------------------------------------------------------------------
const INT_STATUS: Record<string, string> = {
  pending: "bg-chart-4/15 text-chart-4",
  approved: "bg-chart-3/15 text-chart-3",
};

function InternalTab() {
  const app = useApp();
  const [rows, setRows] = useState<IntTs[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canApprove =
    !!app.session?.isAdmin || /hr/i.test(app.session?.jobType || "");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<IntTs>("internal_timesheets", app.asSession());
      setRows(data.sort((a, b) => (b.date || "").localeCompare(a.date || "")));
    } catch {
      toast.error("Could not load internal timesheets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  async function save(form: Draft): Promise<boolean> {
    if (!String(form.user || "").trim()) {
      toast.error("Enter a user");
      return false;
    }
    setSaving(true);
    try {
      await addScoped(
        "internal_timesheets",
        { ...form, hours: Number(form.hours) || 0, status: form.status || "pending" },
        app.asSession(),
        app.resolveSite()
      );
      toast.success("Timesheet added");
      await load();
      return true;
    } catch {
      toast.error("Could not save timesheet");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function approve(r: IntTs) {
    try {
      await updateScoped(
        "internal_timesheets",
        r.id,
        {
          status: "approved",
          approvedByHR: app.session?.name || "HR",
        },
        app.asSession()
      );
      setRows((x) =>
        x.map((y) =>
          y.id === r.id
            ? { ...y, status: "approved", approvedByHR: app.session?.name || "HR" }
            : y
        )
      );
      toast.success("Approved");
    } catch {
      toast.error("Could not approve");
    }
  }

  async function remove(r: IntTs) {
    if (!window.confirm(`Delete timesheet for "${r.user || "user"}"?`)) return;
    try {
      await removeScoped("internal_timesheets", r.id);
      setRows((x) => x.filter((y) => y.id !== r.id));
      toast.success("Timesheet deleted");
    } catch {
      toast.error("Could not delete");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddSheet
          title="New internal timesheet"
          description="Internal staff hours & tasks."
          triggerLabel="Add"
          saving={saving}
          initial={{ user: app.session?.name || "", status: "pending" }}
          onSave={save}
          fields={[
            { key: "user", label: "User", placeholder: "Full name" },
            { key: "date", label: "Date", type: "date" },
            { key: "hours", label: "Hours", type: "number", placeholder: "0" },
            { key: "task", label: "Task", placeholder: "What was worked on", full: true },
          ]}
        />
      </div>

      {loading ? (
        <LoadingRow />
      ) : rows.length === 0 ? (
        <EmptyHint label="No entries yet" />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const status = r.status || "pending";
            return (
              <div key={r.id} className="glass group rounded-2xl p-3 flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <UserCog className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{r.user || "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {r.date || "—"}
                    {r.task ? <span> · {r.task}</span> : null}
                  </div>
                </div>
                <Badge variant="secondary" className="ml-auto shrink-0">
                  {r.hours ?? 0}h
                </Badge>
                <Badge
                  variant="secondary"
                  className={`shrink-0 capitalize ${INT_STATUS[status] || INT_STATUS.pending}`}
                >
                  {status}
                </Badge>
                {status === "pending" && canApprove ? (
                  <Button
                    variant="glass"
                    size="sm"
                    className="shrink-0 rounded-full"
                    onClick={() => approve(r)}
                  >
                    Approve
                  </Button>
                ) : null}
                <DeleteButton onClick={() => remove(r)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function TimesheetsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Timesheets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Supplier, equipment &amp; internal
        </p>
      </div>

      <Tabs defaultValue="supplier" className="space-y-4">
        <TabsList className="glass-subtle rounded-full">
          <TabsTrigger value="supplier" className="rounded-full">
            Supplier
          </TabsTrigger>
          <TabsTrigger value="equipment" className="rounded-full">
            Equipment
          </TabsTrigger>
          <TabsTrigger value="internal" className="rounded-full">
            Internal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="supplier">
          <SupplierTab />
        </TabsContent>
        <TabsContent value="equipment">
          <EquipmentTab />
        </TabsContent>
        <TabsContent value="internal">
          <InternalTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

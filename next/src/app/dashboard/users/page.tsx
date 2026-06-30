"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Ban, Loader2, MapPin, ShieldCheck, SlidersHorizontal, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase";
import { useApp, type PermOverrides } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import {
  ALL_MODULES,
  MODULE_LABELS,
  ROLE_LABELS,
  can as canForRole,
  isValidRole,
  legacyRoleFor,
  type Capability,
  type ModuleKey,
  type Role,
} from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
} from "@/components/ui/sheet";
import { Field } from "@/components/forms/field";

type UserRow = {
  id: string;
  username?: string;
  name?: string;
  jobType?: string;
  role?: Role;
  isAdmin?: boolean;
  sites?: string[];
  extraModules?: ModuleKey[];
  blockedModules?: ModuleKey[];
  permOverrides?: PermOverrides;
  status?: string;
};

const CAPS: { key: Capability; label: string }[] = [
  { key: "read", label: "View" },
  { key: "create", label: "Add" },
  { key: "update", label: "Edit" },
  { key: "delete", label: "Del" },
  { key: "approve", label: "Appr" },
];

function overrideCount(u: UserRow): number {
  const fromGrid = Object.values(u.permOverrides || {}).reduce(
    (n, caps) => n + Object.keys(caps || {}).length,
    0
  );
  return fromGrid + (u.extraModules || []).length + (u.blockedModules || []).length;
}

const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as Role[];

// Sections an admin can grant/deny per user. Dashboard & Notifications are a
// baseline for everyone; Users & Settings stay admin-only — so none of those
// four are overridable here.
const OVERRIDE_MODULES: ModuleKey[] = ALL_MODULES.filter(
  (m) => !["dashboard", "notifications", "users", "settings"].includes(m)
);

function roleOf(u: UserRow): Role {
  return isValidRole(u.role) ? u.role : legacyRoleFor(u.jobType, u.isAdmin);
}

function initials(value: string | undefined): string {
  return (value || "?").slice(0, 2).toUpperCase();
}

export default function UsersPage() {
  const app = useApp();
  const perms = usePermissions();
  const canEdit = perms.can("users", "update");
  const canCreate = perms.can("users", "create");

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingSites, setEditingSites] = useState<UserRow | null>(null);
  const [editingAccess, setEditingAccess] = useState<UserRow | null>(null);

  async function load() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "nexus_users"));
      const mapped = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<UserRow, "id">) }));
      mapped.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setRows(mapped);
    } catch {
      toast.error("Could not load users");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready]);

  async function changeRole(u: UserRow, role: Role) {
    if (u.id === app.session?.uid) return toast.error("You can't change your own role");
    setSavingId(u.id);
    try {
      await app.updateUser(u.id, { role });
      setRows((r) => r.map((x) => (x.id === u.id ? { ...x, role, isAdmin: role === "admin" } : x)));
      toast.success(`${u.name || u.username} → ${ROLE_LABELS[role]}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update role");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleSuspend(u: UserRow) {
    if (u.id === app.session?.uid) return toast.error("You can't suspend your own account");
    const next = !u.status || u.status === "Active" ? "Suspended" : "Active";
    setSavingId(u.id);
    try {
      await app.updateUser(u.id, { status: next });
      setRows((r) => r.map((x) => (x.id === u.id ? { ...x, status: next } : x)));
      toast.success(next === "Suspended" ? "User suspended" : "User reactivated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update user");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign roles — {rows.length} user{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        {canCreate ? <AddUserSheet sites={app.sites} onCreated={load} /> : null}
      </div>

      {rows.length === 0 ? (
        <div className="glass-subtle grid place-items-center rounded-3xl px-6 py-16 text-center">
          <div className="glass glass-specular mx-auto grid size-12 place-items-center rounded-2xl">
            <Users className="size-5" />
          </div>
          <p className="mt-4 text-sm font-medium">No users yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((u) => {
            const active = !u.status || u.status === "Active";
            const isSelf = u.id === app.session?.uid;
            return (
              <div key={u.id} className="glass glass-specular flex items-center gap-3 rounded-2xl p-3">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                    {initials(u.name || u.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {u.name || u.username || "—"}
                    {u.isAdmin ? <ShieldCheck className="size-3.5 text-chart-1" /> : null}
                    {isSelf ? (
                      <span className="text-[11px] font-normal text-muted-foreground">(you)</span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">@{u.username || "—"}</div>
                </div>

                {!active ? (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    Suspended
                  </Badge>
                ) : null}

                <Select
                  value={roleOf(u)}
                  onValueChange={(v) => changeRole(u, v as Role)}
                  disabled={!canEdit || isSelf || savingId === u.id}
                >
                  <SelectTrigger className="w-52 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {canEdit && !u.isAdmin ? (
                  <button
                    onClick={() => setEditingSites(u)}
                    aria-label="Assign sites"
                    title={`Assigned sites: ${(u.sites || []).length}`}
                    className="relative grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
                  >
                    <MapPin className="size-4" />
                    {(u.sites || []).length > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                        {(u.sites || []).length}
                      </span>
                    ) : null}
                  </button>
                ) : null}
                {canEdit && !u.isAdmin ? (
                  <button
                    onClick={() => setEditingAccess(u)}
                    aria-label="Custom access"
                    title="Customise what this user can access"
                    className="relative grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
                  >
                    <SlidersHorizontal className="size-4" />
                    {overrideCount(u) > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-chart-4 px-1 text-[10px] font-semibold leading-none text-white">
                        {overrideCount(u)}
                      </span>
                    ) : null}
                  </button>
                ) : null}
                {canEdit && !isSelf ? (
                  <button
                    onClick={() => toggleSuspend(u)}
                    aria-label={active ? "Suspend" : "Reactivate"}
                    disabled={savingId === u.id}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <Ban className="size-4" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <EditSitesSheet
        user={editingSites}
        sites={app.sites}
        onClose={() => setEditingSites(null)}
        onSaved={(uid, sites) => setRows((r) => r.map((x) => (x.id === uid ? { ...x, sites } : x)))}
      />

      <EditAccessSheet
        user={editingAccess}
        onClose={() => setEditingAccess(null)}
        onSaved={(uid, permOverrides) =>
          setRows((r) =>
            r.map((x) =>
              x.id === uid ? { ...x, permOverrides, extraModules: [], blockedModules: [] } : x
            )
          )
        }
      />
    </div>
  );
}

function EditAccessSheet({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  onClose: () => void;
  onSaved: (uid: string, permOverrides: PermOverrides) => void;
}) {
  const app = useApp();
  const [saving, setSaving] = useState(false);
  const [ov, setOv] = useState<PermOverrides>({});

  useEffect(() => {
    if (!user) return;
    // Start from saved per-capability overrides, then fold in any legacy
    // module-level grants/denies so existing settings are preserved.
    const next: PermOverrides = JSON.parse(JSON.stringify(user.permOverrides || {}));
    for (const m of user.blockedModules || []) next[m] = { read: false, ...(next[m] || {}) };
    for (const m of user.extraModules || [])
      next[m] = { read: true, create: true, update: true, ...(next[m] || {}) };
    setOv(next);
  }, [user]);

  const role: Role = user ? roleOf(user) : "buyer";

  function cycle(m: ModuleKey, c: Capability) {
    setOv((prev) => {
      const cur = prev[m]?.[c];
      const nextVal = cur === undefined ? true : cur === true ? false : undefined;
      const mod: Partial<Record<Capability, boolean>> = { ...(prev[m] || {}) };
      if (nextVal === undefined) delete mod[c];
      else mod[c] = nextVal;
      const out: PermOverrides = { ...prev };
      if (Object.keys(mod).length === 0) delete out[m];
      else out[m] = mod;
      return out;
    });
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      // One source going forward: write the grid, clear the legacy lists.
      await app.updateUser(user.id, { permOverrides: ov, extraModules: [], blockedModules: [] });
      toast.success(`Access updated for ${user.name || user.username || "user"}`);
      onSaved(user.id, ov);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update access");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={!!user} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Custom access</SheetTitle>
          <SheetDescription>
            {user
              ? `Per-section access for ${user.name || user.username} (role: ${ROLE_LABELS[role]}). Tap a cell to cycle Default → Allow → Deny.`
              : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4">
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm bg-foreground/15" /> Default (role)</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm bg-chart-3/40" /> Allow</span>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-sm bg-destructive/40" /> Deny</span>
          </div>
          <div className="flex items-center gap-1 px-1 pb-1 text-[10px] font-semibold text-muted-foreground">
            <div className="flex-1">Section</div>
            {CAPS.map((c) => (
              <div key={c.key} className="w-8 text-center">{c.label}</div>
            ))}
          </div>
          {OVERRIDE_MODULES.map((m) => (
            <div key={m} className="flex items-center gap-1 border-t border-foreground/5 py-1.5">
              <div className="min-w-0 flex-1 truncate text-xs font-medium">{MODULE_LABELS[m]}</div>
              {CAPS.map((c) => {
                const v = ov[m]?.[c.key];
                const roleHas = canForRole(role, m, c.key);
                const cls =
                  v === true
                    ? "bg-chart-3/30 text-chart-3"
                    : v === false
                    ? "bg-destructive/25 text-destructive"
                    : roleHas
                    ? "bg-foreground/10 text-foreground/70"
                    : "text-muted-foreground/40";
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => cycle(m, c.key)}
                    title={`${MODULE_LABELS[m]} — ${c.label}: ${
                      v === true
                        ? "Allowed"
                        : v === false
                        ? "Denied"
                        : roleHas
                        ? "Default (role allows)"
                        : "Default (role hides)"
                    }`}
                    className={`grid h-7 w-8 place-items-center rounded-md text-[11px] font-bold transition ${cls}`}
                  >
                    {v === true ? "✓" : v === false ? "✕" : "·"}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <SheetFooter className="flex-row gap-2">
          <SheetClose asChild>
            <Button variant="glass" className="flex-1 rounded-full" onClick={onClose}>
              Cancel
            </Button>
          </SheetClose>
          <Button variant="glassPrimary" className="flex-1 rounded-full" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save access"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function EditSitesSheet({
  user,
  sites,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  sites: { id: string; name?: string }[];
  onClose: () => void;
  onSaved: (uid: string, sites: string[]) => void;
}) {
  const app = useApp();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setSelected(user?.sites || []);
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await app.updateUser(user.id, { sites: selected });
      toast.success(`Sites updated for ${user.name || user.username || "user"}`);
      onSaved(user.id, selected);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update sites");
    } finally {
      setSaving(false);
    }
  }

  function toggle(id: string, checked: boolean) {
    setSelected((cur) => (checked ? [...cur, id] : cur.filter((x) => x !== id)));
  }

  return (
    <Sheet open={!!user} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Assign sites</SheetTitle>
          <SheetDescription>
            {user ? `${user.name || user.username} will see data for the selected site(s).` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2 px-4 pb-4">
          {sites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sites yet — add sites first.</p>
          ) : (
            sites.map((s) => (
              <label key={s.id} className="glass-subtle flex items-center gap-2 rounded-xl px-3 py-2">
                <Checkbox
                  checked={selected.includes(s.id)}
                  onCheckedChange={(v) => toggle(s.id, v === true)}
                />
                <span className="text-sm">{s.name || s.id}</span>
              </label>
            ))
          )}
        </div>

        <SheetFooter className="flex-row gap-2">
          <SheetClose asChild>
            <Button variant="glass" className="flex-1 rounded-full" onClick={onClose}>
              Cancel
            </Button>
          </SheetClose>
          <Button variant="glassPrimary" className="flex-1 rounded-full" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save sites"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function AddUserSheet({ sites, onCreated }: { sites: { id: string; name?: string }[]; onCreated: () => void }) {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("buyer");
  const [selectedSites, setSelectedSites] = useState<string[]>([]);

  const isAdmin = role === "admin";

  function reset() {
    setName("");
    setUsername("");
    setPassword("");
    setRole("buyer");
    setSelectedSites([]);
  }

  async function save() {
    if (!name.trim()) return toast.error("Enter a full name");
    if (!username.trim()) return toast.error("Enter a username");
    if (!password) return toast.error("Enter a password");
    setSaving(true);
    try {
      await app.createUser({
        name: name.trim(),
        username: username.trim(),
        password,
        role,
        sites: isAdmin ? [] : selectedSites,
      });
      toast.success(`${name} added`);
      setOpen(false);
      reset();
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create user");
    } finally {
      setSaving(false);
    }
  }

  function toggleSite(id: string, checked: boolean) {
    setSelectedSites((cur) => (checked ? [...cur, id] : cur.filter((x) => x !== id)));
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button variant="glassPrimary" className="rounded-full" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" /> Add user
      </Button>
      <SheetContent side="right" className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New user</SheetTitle>
          <SheetDescription>Creates a Firebase Auth account and assigns a role.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <Field label="Full name *" htmlFor="nu-name">
            <Input
              id="nu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ahmed Al-Balushi"
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <Field label="Username *" htmlFor="nu-username">
            <Input
              id="nu-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ahmed"
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <Field label="Password *" htmlFor="nu-password">
            <Input
              id="nu-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password"
              className="glass-subtle rounded-xl border-0"
            />
          </Field>
          <Field label="Role">
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {!isAdmin && sites.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Sites / projects
              </h3>
              <div className="space-y-2">
                {sites.map((s) => (
                  <label
                    key={s.id}
                    className="glass-subtle flex items-center gap-2 rounded-xl px-3 py-2"
                  >
                    <Checkbox
                      checked={selectedSites.includes(s.id)}
                      onCheckedChange={(v) => toggleSite(s.id, v === true)}
                    />
                    <span className="text-sm">{s.name || s.id}</span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <SheetFooter className="flex-row gap-2">
          <SheetClose asChild>
            <Button variant="glass" className="flex-1 rounded-full">
              Cancel
            </Button>
          </SheetClose>
          <Button variant="glassPrimary" className="flex-1 rounded-full" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Create user"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

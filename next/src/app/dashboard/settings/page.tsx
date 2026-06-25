"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  Ban,
  Building2,
  Loader2,
  LogOut,
  Pencil,
  Shield,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { fetchScoped } from "@/lib/data";
import { db } from "@/lib/firebase";
import {
  SECTIONS,
  ALL_SECTION_IDS,
  ROLE_NAMES,
  sectionsForRole,
  levelForRole,
} from "@/lib/roles";
import { useApp } from "@/context/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Field } from "@/components/forms/field";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { LanguageSwitcher } from "@/components/shell/language-switcher";

type Site = { id: string; name?: string };

type User = {
  id: string;
  username?: string;
  name?: string;
  jobType?: string;
  isAdmin?: boolean;
  sites?: string[];
  sections?: Record<string, boolean>;
  approvalLevel?: number;
  status?: string;
};

function initials(value: string | undefined): string {
  return (value || "?").slice(0, 2).toUpperCase();
}

function newDraft(): Record<string, any> {
  return {
    jobType: ROLE_NAMES[0],
    isAdmin: false,
    approvalLevel: levelForRole(ROLE_NAMES[0]),
    sections: sectionsForRole(ROLE_NAMES[0]),
    sites: [],
    status: "Active",
  };
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Workspace administration</p>
      </div>

      <Tabs defaultValue="general" className="gap-6">
        <TabsList className="glass-subtle h-10 w-full justify-start gap-1 rounded-full p-1">
          <TabsTrigger value="general" className="rounded-full">
            General
          </TabsTrigger>
          <TabsTrigger value="sites" className="rounded-full">
            Sites
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-full">
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab />
        </TabsContent>
        <TabsContent value="sites">
          <SitesTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralTab() {
  const app = useApp();
  const session = app.session;

  return (
    <div className="space-y-4">
      {/* Profile */}
      <div className="glass glass-specular rounded-3xl p-5">
        <h2 className="text-sm font-semibold">Profile</h2>
        <div className="mt-4 flex items-center gap-4">
          <Avatar className="size-12">
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
              {initials(session?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{session?.name || "—"}</div>
            <div className="truncate text-xs text-muted-foreground">
              @{session?.username || "—"}
            </div>
            <div className="mt-1 truncate text-xs text-muted-foreground">
              {session?.jobType || "—"}
            </div>
          </div>
          {session?.isAdmin ? (
            <Badge variant="secondary" className="ml-auto gap-1 bg-chart-1/15 text-chart-1">
              <ShieldCheck className="size-3" /> Admin
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Preferences */}
      <div className="glass glass-specular rounded-3xl p-5">
        <h2 className="text-sm font-semibold">Preferences</h2>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-medium">Theme</span>
          <ThemeToggle className="glass-subtle grid size-10 place-items-center rounded-xl text-foreground" />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm font-medium">Language</span>
          <LanguageSwitcher className="glass-subtle grid size-10 place-items-center rounded-xl text-foreground" />
        </div>
      </div>

      {/* Sign out */}
      <div className="glass glass-specular rounded-3xl p-5">
        <h2 className="text-sm font-semibold">Session</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Sign out of this workspace on this device.
        </p>
        <Button variant="glass" className="mt-4 rounded-full" onClick={app.logout}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

function SitesTab() {
  const app = useApp();
  const [rows, setRows] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!app.ready) return;
    let active = true;
    setLoading(true);
    fetchScoped<Record<string, unknown>>("sites", app.asSession())
      .then((data) => {
        if (!active) return;
        const mapped = data.map((d) => ({ id: d.id, name: d.name as string | undefined }));
        mapped.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setRows(mapped);
      })
      .catch(() => {
        if (active) setRows([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  if (loading) {
    return (
      <div className="grid place-items-center py-20 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="glass-subtle grid place-items-center rounded-3xl px-6 py-16 text-center">
        <div className="glass glass-specular mx-auto grid size-12 place-items-center rounded-2xl">
          <Building2 className="size-5" />
        </div>
        <p className="mt-4 text-sm font-medium">No sites yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((s) => (
        <div
          key={s.id}
          className="glass glass-specular flex items-center gap-3 rounded-2xl px-4 py-3"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground">
            {initials(s.name)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{s.name || "Untitled site"}</div>
            <div className="truncate text-xs text-muted-foreground">{s.id}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const app = useApp();
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>(newDraft());

  async function load() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "nexus_users"));
      const mapped = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<User, "id">) }));
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
    if (!app.ready) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready]);

  function siteName(id: string): string {
    return app.sites.find((s) => s.id === id)?.name || id;
  }

  function openCreate() {
    setEditingId(null);
    setForm(newDraft());
    setOpen(true);
  }

  function openEdit(u: User) {
    setEditingId(u.id);
    setForm({
      name: u.name || "",
      username: u.username || "",
      password: "",
      jobType: u.jobType || ROLE_NAMES[0],
      isAdmin: !!u.isAdmin,
      approvalLevel: u.approvalLevel ?? 0,
      sections: u.sections || sectionsForRole(u.jobType || ROLE_NAMES[0]),
      sites: u.sites || [],
      status: u.status || "Active",
    });
    setOpen(true);
  }

  async function save() {
    const name = String(form.name || "").trim();
    const username = String(form.username || "").trim();
    const password = String(form.password || "");
    const isAdmin = !!form.isAdmin;

    if (!name) return toast.error("Enter a full name");
    if (!username) return toast.error("Enter a username");
    if (!editingId && !password) return toast.error("Enter a password");

    setSaving(true);
    try {
      const draft = {
        username: username.toLowerCase(),
        name,
        password,
        jobType: isAdmin ? "Administrator" : String(form.jobType || ROLE_NAMES[0]),
        isAdmin,
        sites: isAdmin ? [] : (form.sites as string[]) || [],
        sections: isAdmin
          ? Object.fromEntries(ALL_SECTION_IDS.map((id) => [id, true]))
          : (form.sections as Record<string, boolean>) || {},
        approvalLevel: isAdmin ? 5 : Number(form.approvalLevel) || 0,
        status: String(form.status || "Active"),
      };

      if (editingId) {
        // Note: a Firebase Auth password can't be changed from the client; edits
        // update the profile/permissions only.
        await app.updateUser(editingId, draft);
        toast.success(`${name} updated`);
      } else {
        await app.createUser(draft);
        toast.success(`${name} added`);
      }
      setOpen(false);
      setForm(newDraft());
      setEditingId(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save user");
    } finally {
      setSaving(false);
    }
  }

  // Firestore rules block deleting user docs, so we suspend/reactivate instead.
  async function toggleSuspend(u: User) {
    if (u.id === app.session?.uid) return toast.error("You can't suspend your own account");
    const next = !u.status || u.status === "Active" ? "Suspended" : "Active";
    try {
      await app.updateUser(u.id, {
        name: u.name,
        username: u.username,
        jobType: u.jobType,
        isAdmin: u.isAdmin,
        sites: u.sites,
        sections: u.sections,
        approvalLevel: u.approvalLevel,
        status: next,
      });
      toast.success(next === "Suspended" ? "User suspended" : "User reactivated");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update user");
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Users</h2>
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            {rows.length}
          </Badge>
        </div>
        <Button variant="glassPrimary" className="rounded-full" onClick={openCreate}>
          <UserPlus className="size-4" /> Add user
        </Button>
      </div>

      {/* List */}
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
            const activeUser = !u.status || u.status === "Active";
            const sites = u.sites || [];
            const sitesLabel = u.isAdmin
              ? "All sites"
              : sites.length === 0
              ? "No sites"
              : sites.length <= 2
              ? sites.map(siteName).join(", ")
              : `${sites.length} sites`;
            return (
              <div key={u.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                    {initials(u.name || u.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{u.name || u.username || "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    @{u.username || "—"} · {sitesLabel}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {u.isAdmin ? (
                    <Badge variant="secondary" className="gap-1 bg-chart-1/15 text-chart-1">
                      <Shield className="size-3" /> Admin
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      {u.jobType || "User"}
                    </Badge>
                  )}
                  {!u.isAdmin && (u.approvalLevel || 0) > 0 ? (
                    <Badge variant="outline">L{u.approvalLevel}</Badge>
                  ) : null}
                  <Badge
                    variant="secondary"
                    className={
                      activeUser ? "bg-chart-3/15 text-chart-3" : "bg-muted text-muted-foreground"
                    }
                  >
                    {u.status || "Active"}
                  </Badge>
                  <button
                    onClick={() => openEdit(u)}
                    aria-label="Edit"
                    className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/10 hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => toggleSuspend(u)}
                    aria-label={activeUser ? "Suspend" : "Reactivate"}
                    className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Ban className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <UserSheet
        open={open}
        setOpen={setOpen}
        editing={!!editingId}
        form={form}
        setForm={setForm}
        sites={app.sites}
        saving={saving}
        onSave={save}
      />
    </div>
  );
}

function UserSheet({
  open,
  setOpen,
  editing,
  form,
  setForm,
  sites,
  saving,
  onSave,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  editing: boolean;
  form: Record<string, any>;
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  sites: { id: string; name?: string }[];
  saving: boolean;
  onSave: () => void;
}) {
  const isAdmin = !!form.isAdmin;
  const sections: Record<string, boolean> = form.sections || {};
  const selectedSites: string[] = form.sites || [];

  const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function onRoleChange(value: string) {
    setForm((f) => ({
      ...f,
      jobType: value,
      sections: sectionsForRole(value),
      approvalLevel: levelForRole(value),
    }));
  }

  function toggleSection(id: string, checked: boolean) {
    setForm((f) => ({
      ...f,
      sections: { ...(f.sections || {}), [id]: checked },
    }));
  }

  function toggleSite(id: string, checked: boolean) {
    setForm((f) => {
      const cur: string[] = f.sites || [];
      const next = checked ? [...cur, id] : cur.filter((x) => x !== id);
      return { ...f, sites: next };
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="glass-strong w-full gap-0 overflow-y-auto border-l-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit user" : "New user"}</SheetTitle>
          <SheetDescription>
            Roles, per-section access, approval level and site membership.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          {/* Identity */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Identity
            </h3>
            <Field label="Full name *" htmlFor="u-name">
              <Input
                id="u-name"
                value={String(form.name ?? "")}
                onChange={setField("name")}
                placeholder="Ahmed Al-Balushi"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field label="Username *" htmlFor="u-username">
              <Input
                id="u-username"
                value={String(form.username ?? "")}
                onChange={setField("username")}
                placeholder="ahmed"
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
            <Field
              label="Password"
              htmlFor="u-password"
              hint={editing ? "Leave blank to keep current" : undefined}
            >
              <Input
                id="u-password"
                type="password"
                value={String(form.password ?? "")}
                onChange={setField("password")}
                placeholder={editing ? "••••••••" : "Set a password"}
                className="glass-subtle rounded-xl border-0"
              />
            </Field>
          </section>

          {/* Role & access */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Role & access
            </h3>
            <Field label="Role">
              <Select value={String(form.jobType || ROLE_NAMES[0])} onValueChange={onRoleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_NAMES.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <label className="glass-subtle flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5">
              <span className="text-sm font-medium">
                Administrator (god mode — all sites &amp; sections)
              </span>
              <Switch
                checked={isAdmin}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isAdmin: v }))}
              />
            </label>

            {!isAdmin ? (
              <Field label="Approval level">
                <Select
                  value={String(form.approvalLevel ?? 0)}
                  onValueChange={(v) => setForm((f) => ({ ...f, approvalLevel: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n === 0 ? "None" : `Level ${n}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
          </section>

          {/* Sections */}
          {!isAdmin ? (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Sections
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {SECTIONS.map((s) => (
                  <label
                    key={s.id}
                    className="glass-subtle flex items-center gap-2 rounded-xl px-3 py-2"
                  >
                    <Checkbox
                      checked={!!sections[s.id]}
                      onCheckedChange={(v) => toggleSection(s.id, v === true)}
                    />
                    <span className="text-sm">{s.label}</span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          {/* Sites */}
          {!isAdmin ? (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Sites
              </h3>
              {sites.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sites yet</p>
              ) : (
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
              )}
            </section>
          ) : null}

          {/* Status */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Status
            </h3>
            <Field label="Status">
              <Select
                value={String(form.status || "Active")}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

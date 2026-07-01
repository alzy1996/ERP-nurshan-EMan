"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Boxes,
  CalendarClock,
  Check,
  ClipboardList,
  FolderKanban,
  Globe,
  HardHat,
  Home,
  Inbox,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  NotebookPen,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  ScrollText,
  Settings,
  Sparkles,
  Tag,
  UserCog,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { MODULE_LABELS, MODULE_ROUTES, type ModuleKey } from "@/lib/roles";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COLLAPSE_KEY = "nexus_sidebar_collapsed";

// Icon per RBAC module (only modules with a real page appear in nav).
const ICONS: Partial<Record<ModuleKey, LucideIcon>> = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  site_logs: NotebookPen,
  suppliers: Users,
  materials: Package,
  inventory: Boxes,
  services: Wrench,
  offers: Tag,
  purchase_requests: ClipboardList,
  purchase_orders: ReceiptText,
  approvals: Inbox,
  contracts: ScrollText,
  analytics: BarChart3,
  notifications: Bell,
  timesheets: CalendarClock,
  attendance: MapPin,
  workforce: HardHat,
  users: UserCog,
};

const GROUPS: { label: string; modules: ModuleKey[] }[] = [
  {
    label: "Workspace",
    modules: [
      "dashboard",
      "projects",
      "site_logs",
      "suppliers",
      "materials",
      "inventory",
      "services",
      "offers",
      "purchase_requests",
      "purchase_orders",
      "approvals",
      "contracts",
    ],
  },
  { label: "Insights", modules: ["analytics", "notifications", "timesheets", "attendance", "workforce"] },
  { label: "Admin", modules: ["users"] },
];

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { session, sites, activeSite, isAdmin, switchSite, logout, t, ALL } = useApp();
  const perms = usePermissions();

  // Default folded; remembered per device.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(COLLAPSE_KEY) !== "0";
  });

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  if (!session) return null;

  const activeSiteLabel =
    activeSite === ALL ? t("All sites") : sites.find((s) => s.id === activeSite)?.name || "—";

  const visibleGroups = GROUPS.map((g) => ({
    label: g.label,
    modules: g.modules.filter((m) => ICONS[m] && perms.canSee(m)),
  })).filter((g) => g.modules.length > 0);

  const railModules = visibleGroups.flatMap((g) => g.modules);

  const accountMenu = (
    <DropdownMenuContent align="end" side="right" className="glass-strong w-60">
      <DropdownMenuLabel className="flex flex-col">
        <span>{session.name}</span>
        <span className="text-xs font-normal text-muted-foreground">
          @{session.username} · {session.jobType}
        </span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {isAdmin ? (
        <DropdownMenuItem onClick={() => switchSite(ALL)}>
          <Globe className="size-4" /> {t("All sites")}
          {activeSite === ALL ? <Check className="ml-auto size-4" /> : null}
        </DropdownMenuItem>
      ) : null}
      {sites.map((s) => (
        <DropdownMenuItem key={s.id} onClick={() => switchSite(s.id)}>
          <FolderKanban className="size-4" />
          <span className="truncate">{s.name || s.id}</span>
          {activeSite === s.id ? <Check className="ml-auto size-4" /> : null}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={logout}>
        <LogOut className="size-4" /> {t("Sign out")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <aside className="hidden shrink-0 items-stretch gap-3 lg:flex">
      {/* Dark rounded rail — always visible */}
      <div className="glass-rail flex w-[64px] flex-col items-center rounded-[26px] py-4">
        <span className="mb-2 grid size-9 place-items-center rounded-2xl bg-white/10 text-white">
          <Sparkles className="size-4" />
        </span>
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
          className="mb-3 grid size-10 place-items-center rounded-2xl text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
        </button>

        <ScrollArea className="w-full flex-1">
          <div className="flex flex-col items-center gap-2">
            {railModules.map((m) => {
              const Icon = ICONS[m]!;
              const href = MODULE_ROUTES[m];
              const active = href === pathname;
              return (
                <Link
                  key={m}
                  href={href}
                  aria-label={t(MODULE_LABELS[m])}
                  title={t(MODULE_LABELS[m])}
                  className={cn(
                    "grid size-10 place-items-center rounded-2xl text-white/60 transition-colors hover:text-white",
                    active && "bg-white/15 text-white shadow-inner"
                  )}
                >
                  <Icon className="size-[18px]" />
                </Link>
              );
            })}
          </div>
        </ScrollArea>

        <div className="mt-2 flex flex-col items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label="Account" className="grid size-10 place-items-center rounded-2xl">
                <Avatar className="size-9 ring-2 ring-white/30">
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                    {initials(session.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            {accountMenu}
          </DropdownMenu>
          <LanguageSwitcher className="grid size-10 place-items-center rounded-2xl text-white/60 transition-colors hover:text-white" />
          <ThemeToggle className="grid size-10 place-items-center rounded-2xl text-white/60 transition-colors hover:text-white" />
          {perms.canSee("settings") ? (
            <Link
              href="/dashboard/settings"
              aria-label={t("Settings")}
              className="grid size-10 place-items-center rounded-2xl bg-white/10 text-white/80 transition-colors hover:text-white"
            >
              <Settings className="size-[18px]" />
            </Link>
          ) : null}
        </div>
      </div>

      {/* Frosted labelled panel — only when expanded */}
      {!collapsed ? (
        <div className="glass-strong flex w-[262px] flex-col rounded-[26px] p-4">
          <div className="mb-4 flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>

          <div className="mb-4 px-1">
            <div className="truncate text-sm font-semibold">{session.name}</div>
            <div className="truncate text-xs text-muted-foreground">{activeSiteLabel}</div>
          </div>

          <ScrollArea className="-mx-1 flex-1 px-1">
            {visibleGroups.length === 0 ? (
              <div className="glass-subtle mt-6 grid place-items-center rounded-2xl px-4 py-10 text-center">
                <Lock className="size-5 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">{t("No access yet")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("Contact your administrator")}</p>
              </div>
            ) : (
              visibleGroups.map((group) => (
                <div key={group.label} className="mb-4">
                  <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    {t(group.label)}
                  </p>
                  <div className="space-y-0.5">
                    {group.modules.map((m) => {
                      const Icon = ICONS[m]!;
                      const href = MODULE_ROUTES[m];
                      const active = href === pathname;
                      return (
                        <Link
                          key={m}
                          href={href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground",
                            active && "glass-subtle font-medium text-foreground"
                          )}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="flex-1 truncate">{t(MODULE_LABELS[m])}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </div>
      ) : null}
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardList,
  FolderKanban,
  Globe,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  ReceiptText,
  ScrollText,
  Settings,
  Sparkles,
  Tag,
  Users,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "@/context/app-context";
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

const rail = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: FolderKanban, label: "Projects", href: "/dashboard/projects" },
  { icon: Users, label: "Suppliers", href: "/dashboard/suppliers" },
  { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
  { icon: Bell, label: "Notifications", href: "/dashboard/notifications" },
];

type NavItem = { label: string; href: string; icon: typeof Home; section?: string };

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "dashboard" },
      { label: "Projects", href: "/dashboard/projects", icon: FolderKanban, section: "projects" },
      { label: "Suppliers", href: "/dashboard/suppliers", icon: Users, section: "suppliers" },
      { label: "Materials", href: "/dashboard/materials", icon: Package, section: "materials" },
      { label: "Services", href: "/dashboard/services", icon: Wrench, section: "services" },
      { label: "Offers", href: "/dashboard/offers", icon: Tag, section: "offers" },
      {
        label: "Purchase Requests",
        href: "/dashboard/purchase-requests",
        icon: ClipboardList,
        section: "purchaserequests",
      },
      {
        label: "Purchase Orders",
        href: "/dashboard/purchase-orders",
        icon: ReceiptText,
        section: "purchaseorders",
      },
      { label: "Contracts", href: "/dashboard/contracts", icon: ScrollText, section: "contracts" },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3, section: "analytics" },
      {
        label: "Notifications",
        href: "/dashboard/notifications",
        icon: Bell,
        section: "notifications",
      },
      { label: "Timesheets", href: "/dashboard/timesheets", icon: CalendarClock, section: "timesheets" },
      { label: "Attendance", href: "/dashboard/attendance", icon: MapPin, section: "attendance" },
    ],
  },
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
  const { session, sites, activeSite, isAdmin, switchSite, logout, canSee, t, ALL } = useApp();

  if (!session) return null;

  const activeSiteLabel =
    activeSite === ALL ? t("All sites") : sites.find((s) => s.id === activeSite)?.name || "—";

  return (
    <aside className="hidden shrink-0 items-stretch gap-3 lg:flex">
      {/* Dark rounded rail */}
      <div className="glass-rail flex w-[64px] flex-col items-center justify-between rounded-[26px] py-4">
        <div className="flex flex-col items-center gap-2">
          <span className="mb-2 grid size-9 place-items-center rounded-2xl bg-white/10 text-white">
            <Sparkles className="size-4" />
          </span>
          {rail.map((r) => {
            const active = r.href === pathname;
            return (
              <Link
                key={r.label}
                href={r.href}
                aria-label={r.label}
                className={cn(
                  "grid size-10 place-items-center rounded-2xl text-white/60 transition-colors hover:text-white",
                  active && "bg-white/15 text-white shadow-inner"
                )}
              >
                <r.icon className="size-[18px]" />
              </Link>
            );
          })}
        </div>
        <div className="flex flex-col items-center gap-2">
          <LanguageSwitcher className="grid size-10 place-items-center rounded-2xl text-white/60 transition-colors hover:text-white" />
          <ThemeToggle className="grid size-10 place-items-center rounded-2xl text-white/60 transition-colors hover:text-white" />
          <Link
            href="/dashboard/settings"
            aria-label={t("Settings")}
            className="grid size-10 place-items-center rounded-2xl bg-white/10 text-white/80 transition-colors hover:text-white"
          >
            <Settings className="size-[18px]" />
          </Link>
        </div>
      </div>

      {/* Frosted nav panel */}
      <div className="glass-strong flex w-[262px] flex-col rounded-[26px] p-4">
        <div className="mb-4 flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="mb-5 flex items-center gap-3 rounded-2xl p-1 text-left transition-colors hover:bg-foreground/5">
              <Avatar className="size-10 ring-2 ring-white/60">
                <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                  {initials(session.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <span className="truncate">{session.name}</span>
                  <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                </div>
                <div className="truncate text-xs text-muted-foreground">{activeSiteLabel}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="glass-strong w-60">
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
        </DropdownMenu>

        <ScrollArea className="-mx-1 flex-1 px-1">
          {groups.map((group) => {
            const items = group.items.filter((item) => !item.section || canSee(item.section));
            if (items.length === 0) return null;
            return (
              <div key={group.label} className="mb-4">
                <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {t(group.label)}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = item.href === pathname;
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground",
                          active && "glass-subtle font-medium text-foreground"
                        )}
                      >
                        <item.icon className="size-4 shrink-0" />
                        <span className="flex-1 truncate">{t(item.label)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </ScrollArea>
      </div>
    </aside>
  );
}

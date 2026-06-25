"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  Box,
  ChevronDown,
  Clock,
  FolderClosed,
  Globe,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  Library,
  Plus,
  Search,
  Settings,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

const rail = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Globe, label: "Explore", href: "#" },
  { icon: Sparkles, label: "AI", href: "#" },
  { icon: Share2, label: "Shared", href: "#" },
  { icon: ImageIcon, label: "Media", href: "#" },
  { icon: Box, label: "Modules", href: "#" },
];

type NavItem = { label: string; href: string; icon: typeof Home; count?: number };

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Projects",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, count: 0 },
      { label: "Library", href: "#", icon: Library },
      { label: "Shared Projects", href: "#", icon: Share2 },
    ],
  },
  {
    label: "Status",
    items: [
      { label: "New", href: "#", icon: Sparkles, count: 3 },
      { label: "Updates", href: "#", icon: Clock, count: 2 },
      { label: "Team Review", href: "#", icon: Users },
    ],
  },
  {
    label: "History",
    items: [
      { label: "Recently Edited", href: "#", icon: Clock },
      { label: "Archive", href: "#", icon: Archive },
    ],
  },
];

const documents = [
  { name: "System Management's", count: 12, depth: 0 },
  { name: "2025 Update's", count: 2, depth: 1 },
  { name: "Hiring Process", count: 4, depth: 2 },
  { name: "Billing Process", count: 3, depth: 2 },
  { name: "Fundamentals", count: 4, depth: 1 },
  { name: "Off Grid Servers", count: 5, depth: 1 },
];

export function Sidebar() {
  const pathname = usePathname();

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
        <Link
          href="#"
          aria-label="Settings"
          className="grid size-10 place-items-center rounded-2xl bg-white/10 text-white/80 transition-colors hover:text-white"
        >
          <Settings className="size-[18px]" />
        </Link>
      </div>

      {/* Frosted nav panel */}
      <div className="glass-strong flex w-[262px] flex-col rounded-[26px] p-4">
        {/* window dots */}
        <div className="mb-4 flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>

        {/* profile */}
        <button className="mb-5 flex items-center gap-3 rounded-2xl p-1 text-left transition-colors hover:bg-foreground/5">
          <Avatar className="size-10 ring-2 ring-white/60">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
              JD
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-sm font-semibold">
              John Doe <ChevronDown className="size-3.5 text-muted-foreground" />
            </div>
            <div className="truncate text-xs text-muted-foreground">customerpop@gmail.com</div>
          </div>
        </button>

        <ScrollArea className="-mx-1 flex-1 px-1">
          {groups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
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
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.count !== undefined ? (
                        <span className="text-xs text-muted-foreground">{item.count}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Documents */}
          <div className="mb-2 mt-1 flex items-center justify-between px-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
              Documents
            </p>
            <button
              aria-label="Add document"
              className="grid size-5 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <div className="glass-subtle mb-3 flex items-center gap-2 rounded-xl px-2.5 py-2">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              placeholder="Search"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-0.5 pb-2">
            {documents.map((d) => (
              <button
                key={d.name}
                className="flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                style={{ paddingLeft: `${8 + d.depth * 14}px` }}
              >
                <FolderClosed className="size-4 shrink-0 text-muted-foreground/80" />
                <span className="flex-1 truncate text-left">{d.name}</span>
                <span className="text-xs text-muted-foreground">{d.count}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}

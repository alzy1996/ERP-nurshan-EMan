"use client";

import { Languages } from "lucide-react";

import { useApp } from "@/context/app-context";
import { LANGS } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useApp();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={className} aria-label="Language">
        <Languages className="size-[18px]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="glass-strong w-44">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className={lang === l.code ? "font-semibold text-foreground" : ""}
          >
            <span dir={l.dir} className="flex-1">
              {l.label}
            </span>
            {lang === l.code ? <span className="text-chart-1">●</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

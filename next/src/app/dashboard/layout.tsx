import { Maximize2, Sparkles } from "lucide-react";

import { Sidebar } from "@/components/shell/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen gap-3 p-3">
      <Sidebar />
      <main className="glass relative min-h-[calc(100vh-1.5rem)] min-w-0 flex-1 overflow-hidden rounded-[26px] p-5 sm:p-7">
        {children}
      </main>

      {/* Floating actions (reference images 1 & 3) */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        <button
          aria-label="Expand"
          className="glass glass-specular grid size-12 place-items-center rounded-2xl text-foreground transition-transform hover:-translate-y-0.5"
        >
          <Maximize2 className="size-5" />
        </button>
        <button
          aria-label="AI assistant"
          className="glass-specular grid size-12 place-items-center rounded-2xl text-white shadow-lg transition-transform hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg, oklch(0.62 0.19 260), oklch(0.6 0.16 300))" }}
        >
          <Sparkles className="size-5" />
        </button>
      </div>
    </div>
  );
}

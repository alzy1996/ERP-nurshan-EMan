import { Sidebar } from "@/components/shell/sidebar";
import { AuthGuard } from "@/components/shell/auth-guard";
import { AssistantLauncher } from "@/components/assistant/assistant-launcher";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen gap-3 p-3">
        {/* Same glowing orb as the login screen, for a consistent look. */}
        <div
          aria-hidden
          className="pointer-events-none fixed left-1/2 top-1/4 -z-10 size-[40rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(150,180,255,0.35), rgba(220,200,255,0.22) 45%, transparent 70%)",
          }}
        />
        <Sidebar />
      <main className="glass relative min-h-[calc(100vh-1.5rem)] min-w-0 flex-1 overflow-hidden rounded-[26px] p-5 sm:p-7">
        {children}
      </main>

      {/* Draggable Ask Nexus button (self-positioning). */}
      <AssistantLauncher />
      </div>
    </AuthGuard>
  );
}

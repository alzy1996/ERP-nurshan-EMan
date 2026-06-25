import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ready = [
  "Next.js 16 (App Router) + React 19 + TypeScript",
  "Tailwind CSS v4 + shadcn/ui (neutral palette)",
  "Firebase wired to the same project as / and /app",
  "Theme provider, toasts, base UI primitives",
];

const pending = [
  "App shell (sidebar / nav) — awaiting UI/UX examples",
  "Projects module",
  "Suppliers module (extended fields)",
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">
          N
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">ERP Nexus — Next.js</h1>
          <p className="text-sm text-muted-foreground">Migration scaffold</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Foundation ready</CardTitle>
          <CardDescription>
            Screens are intentionally not built yet — they&apos;re waiting on your UI/UX examples.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Badge variant="secondary">Ready</Badge>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {ready.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="text-foreground">✓</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <Badge variant="outline">Pending design sign-off</Badge>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {pending.map((p) => (
                <li key={p} className="flex gap-2">
                  <span>•</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        The vanilla app (<code>/</code>) and the Vite app (<code>/app</code>) stay live until this
        reaches parity. See <code>NEXTJS-MIGRATION.md</code>.
      </p>
    </main>
  );
}

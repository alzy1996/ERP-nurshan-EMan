"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";
import { ALL_MODULES, MODULE_ROUTES, type ModuleKey } from "@/lib/roles";

/** The RBAC module a path belongs to (longest matching route prefix), or null. */
function moduleForPath(path: string): ModuleKey | null {
  let best: ModuleKey | null = null;
  let bestLen = -1;
  for (const m of ALL_MODULES) {
    const r = MODULE_ROUTES[m];
    if ((path === r || path.startsWith(r + "/")) && r.length > bestLen) {
      best = m;
      bestLen = r.length;
    }
  }
  return best;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, session } = useApp();
  const perms = usePermissions();
  const pathname = usePathname();
  const router = useRouter();

  const moduleKey = useMemo(() => moduleForPath(pathname || ""), [pathname]);
  const denied = !!moduleKey && !!session && !perms.canSee(moduleKey);

  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);

  useEffect(() => {
    if (ready && denied && pathname !== "/dashboard") router.replace("/dashboard");
  }, [ready, denied, pathname, router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return null;

  if (denied) {
    // Brief "not authorized" panel while the redirect effect runs (no content flash).
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="glass glass-specular rounded-3xl px-8 py-10">
          <Lock className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Not authorized</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You don’t have access to this section.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

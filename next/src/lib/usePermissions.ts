"use client";

import { useApp } from "@/context/app-context";
import {
  can as canFor,
  scopeFor as scopeForRole,
  canSeeModule,
  navModulesFor,
  type Capability,
  type ModuleKey,
  type Role,
  type Scope,
} from "@/lib/roles";

export type Permissions = {
  loading: boolean;
  role: Role | null;
  uid: string | null;
  /** Modules the current role may see, in canonical order. */
  nav: ModuleKey[];
  canSee: (module: ModuleKey) => boolean;
  can: (module: ModuleKey, capability: Capability) => boolean;
  scopeFor: (module: ModuleKey) => Scope;
};

/**
 * Role-based permissions for the current session. The single source of truth is
 * lib/roles.ts; this hook just binds it to the logged-in user's role.
 */
export function usePermissions(): Permissions {
  const app = useApp();
  const role = (app.session?.role ?? null) as Role | null;

  return {
    loading: !app.ready,
    role,
    uid: app.session?.uid ?? null,
    nav: navModulesFor(role),
    canSee: (module) => canSeeModule(role, module),
    can: (module, capability) => canFor(role, module, capability),
    scopeFor: (module) => scopeForRole(role, module),
  };
}

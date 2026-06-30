"use client";

import { useApp } from "@/context/app-context";
import {
  can as canFor,
  scopeFor as scopeForRole,
  ALL_MODULES,
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
 * Permissions for the current session = the role matrix in lib/roles.ts, with
 * the admin-managed PER-USER overrides applied on top, in precedence order:
 *   1. permOverrides[module][capability]: an explicit true/false wins outright
 *      (the fine-grained "what can they see / add / edit" control).
 *   2. blockedModules: a whole section denied (deny always wins over the role).
 *   3. role default.
 *   4. extraModules: a whole section granted (read/create/update) if the role
 *      doesn't include it.
 * Admins are never restricted (their override values are kept empty).
 */
export function usePermissions(): Permissions {
  const app = useApp();
  const role = (app.session?.role ?? null) as Role | null;
  const extra = app.session?.extraModules ?? [];
  const blocked = app.session?.blockedModules ?? [];
  const overrides = app.session?.permOverrides ?? {};

  const can = (module: ModuleKey, capability: Capability) => {
    const o = overrides[module]?.[capability];
    if (typeof o === "boolean") return o; // explicit per-capability override
    if (blocked.includes(module)) return false;
    if (canFor(role, module, capability)) return true;
    // A whole-section grant gives working access (read/create/update); the
    // sensitive delete/approve capabilities still come only from the role.
    if (extra.includes(module) && (capability === "read" || capability === "create" || capability === "update")) {
      return true;
    }
    return false;
  };

  const canSee = (module: ModuleKey) => can(module, "read");

  const scopeFor = (module: ModuleKey): Scope => {
    const s = scopeForRole(role, module);
    // A module granted purely by override has no role scope — default to "all"
    // (still site-filtered downstream in lib/data.ts for non-admins).
    if (s === "none" && extra.includes(module) && !blocked.includes(module)) return "all";
    return s;
  };

  return {
    loading: !app.ready,
    role,
    uid: app.session?.uid ?? null,
    nav: ALL_MODULES.filter(canSee),
    canSee,
    can,
    scopeFor,
  };
}

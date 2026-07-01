// lib/roles.ts
// ============================================================================
// ERP Nexus — Role-Based Access Control (RBAC) — SINGLE SOURCE OF TRUTH
// Used by the Next.js app for nav + route + button gating.
// The matching SERVER lock is firestore.rules (that is the real security).
// ============================================================================

export type Role =
  | "admin"
  | "management"
  | "country_manager"
  | "procurement_manager"
  | "buyer"
  | "finance"
  | "hr"
  | "site_engineer"
  | "warehouse"
  | "inspector"
  | "contractor"
  | "documentation_controller";

export type ModuleKey =
  | "dashboard"
  | "suppliers"
  | "materials"
  | "inventory"
  | "services"
  | "offers"
  | "purchase_requests"
  | "purchase_orders"
  | "approvals"
  | "contracts"
  | "projects"
  | "site_logs"
  | "inspections"
  | "attendance"
  | "timesheets"
  | "workforce"
  | "analytics"
  | "notifications"
  | "settings"
  | "users";

export type Capability = "read" | "create" | "update" | "delete" | "approve";
export type Scope = "all" | "own" | "project" | "none";

export interface Perm {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  approve: boolean;
  scope: Scope;
}

export const ALL_MODULES: ModuleKey[] = [
  "dashboard", "suppliers", "materials", "inventory", "services", "offers", "purchase_requests",
  "purchase_orders", "approvals", "contracts", "projects", "site_logs", "inspections", "attendance",
  "timesheets", "workforce", "analytics", "notifications", "settings", "users",
];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Super Admin",
  management: "Management",
  country_manager: "Country Manager",
  procurement_manager: "Procurement Manager",
  buyer: "Buyer / Procurement Officer",
  finance: "Finance / Accounts",
  hr: "HR",
  site_engineer: "Site / Project Engineer",
  warehouse: "Warehouse / Store",
  inspector: "Inspector (QA / PSI)",
  contractor: "Contractor (external)",
  documentation_controller: "Documentation Controller",
};

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  suppliers: "Suppliers",
  materials: "Materials",
  inventory: "Inventory",
  services: "Services",
  offers: "Offers",
  purchase_requests: "Purchase Requests",
  purchase_orders: "Purchase Orders",
  approvals: "Approvals",
  contracts: "Contracts",
  projects: "Projects",
  site_logs: "Site Log",
  inspections: "Inspections",
  attendance: "Attendance",
  timesheets: "Timesheets",
  workforce: "Workforce",
  analytics: "Analytics",
  notifications: "Notifications",
  settings: "Settings",
  users: "Users",
};

// ---- compact DSL: "level[+appr][:scope]" ---------------------------------
// level : none | view | edit | full
// +appr : also grants approve (e.g. "view+appr")
// :own | :project : limits scope (enforced in firestore.rules + query filters)
function p(code: string): Perm {
  const out: Perm = { read: false, create: false, update: false, delete: false, approve: false, scope: "all" };
  if (!code || code === "none") { out.scope = "none"; return out; }
  const [main, scope] = code.split(":");
  const parts = main.split("+");
  const level = parts[0];
  if (level === "view") out.read = true;
  else if (level === "edit") { out.read = out.create = out.update = true; }
  else if (level === "full") { out.read = out.create = out.update = out.delete = true; }
  if (parts.includes("appr")) { out.read = true; out.approve = true; }
  if (scope === "own") out.scope = "own";
  else if (scope === "project") out.scope = "project";
  return out;
}

// Modules not listed for a role => DENIED (deny by default).
// dashboard + notifications are injected as a "view" baseline for everyone.
const RAW: Record<Role, Partial<Record<ModuleKey, string>>> = {
  admin: {
    suppliers: "full", materials: "full", inventory: "full", services: "full", offers: "full", purchase_requests: "full+appr",
    purchase_orders: "full+appr", approvals: "view", contracts: "full+appr", projects: "full", site_logs: "full", inspections: "full",
    attendance: "full", timesheets: "full", workforce: "full", analytics: "full", settings: "full", users: "full",
  },
  management: {
    suppliers: "view", materials: "view", inventory: "view", services: "view", offers: "view",
    purchase_requests: "view+appr", purchase_orders: "view+appr", approvals: "view", contracts: "view+appr",
    projects: "view", site_logs: "view", inspections: "view", attendance: "view", timesheets: "view", workforce: "view", analytics: "view",
  },
  // Country Manager: senior oversight across the whole country. Sees every
  // operational module and signs off (approves) the procurement chain — but
  // day-to-day data entry stays with the operational roles, and user management
  // stays with Super Admin.
  country_manager: {
    suppliers: "view", materials: "view", inventory: "view", services: "view", offers: "view",
    purchase_requests: "view+appr", purchase_orders: "view+appr", approvals: "view", contracts: "view+appr",
    projects: "view", site_logs: "view", inspections: "view", attendance: "view", timesheets: "view", workforce: "view", analytics: "view",
  },
  procurement_manager: {
    suppliers: "full", materials: "full", inventory: "view", services: "full", offers: "full",
    purchase_requests: "full+appr", purchase_orders: "full+appr", approvals: "view", contracts: "full",
    projects: "view", inspections: "view", attendance: "view", analytics: "view",
  },
  buyer: {
    suppliers: "edit", materials: "view", inventory: "view", services: "edit", offers: "edit",
    purchase_requests: "edit", purchase_orders: "edit", contracts: "view",
    projects: "view", attendance: "edit:own", timesheets: "edit:own",
  },
  finance: {
    suppliers: "view", materials: "view", services: "view", offers: "view",
    purchase_requests: "view+appr", purchase_orders: "view+appr", approvals: "view", contracts: "view+appr",
    projects: "view", attendance: "view", timesheets: "view", analytics: "view",
  },
  hr: {
    attendance: "full", timesheets: "full", workforce: "full", projects: "view", analytics: "view",
  },
  site_engineer: {
    suppliers: "view", materials: "view", inventory: "view", services: "view",
    purchase_requests: "edit:project", purchase_orders: "view", contracts: "view",
    projects: "edit:project", site_logs: "edit:project", inspections: "view", attendance: "edit:own", timesheets: "edit:own", workforce: "edit:project", analytics: "view:own",
  },
  warehouse: {
    suppliers: "view", materials: "full", inventory: "full", services: "view",
    purchase_requests: "view", purchase_orders: "view",
    projects: "view", site_logs: "view", inspections: "view", attendance: "edit:own", timesheets: "edit:own", analytics: "view",
  },
  inspector: {
    suppliers: "view", materials: "view",
    purchase_requests: "view", purchase_orders: "view",
    projects: "view", site_logs: "view", inspections: "full", attendance: "edit:own", timesheets: "edit:own", analytics: "view",
  },
  contractor: {
    contracts: "view:own", projects: "view:own", attendance: "edit:own", timesheets: "edit:own",
  },
  // Documentation Controller: raises material requests (purchase requests) for
  // their site; procurement then approves. Read-only on the catalogues so they
  // know what to request. Cannot approve or delete requests.
  documentation_controller: {
    suppliers: "view", materials: "view", services: "view",
    purchase_requests: "edit:own", purchase_orders: "view",
    projects: "view", attendance: "edit:own", timesheets: "edit:own",
  },
};

function build(): Record<Role, Record<ModuleKey, Perm>> {
  const out = {} as Record<Role, Record<ModuleKey, Perm>>;
  (Object.keys(RAW) as Role[]).forEach((role) => {
    const row = {} as Record<ModuleKey, Perm>;
    ALL_MODULES.forEach((m) => { row[m] = p("none"); });
    row.dashboard = p("view");        // baseline for everyone
    row.notifications = p("view");    // baseline for everyone
    const def = RAW[role];
    (Object.keys(def) as ModuleKey[]).forEach((m) => { row[m] = p(def[m] as string); });
    out[role] = row;
  });
  return out;
}

export const PERMISSIONS = build();

// ---- API -------------------------------------------------------------------
export function can(role: Role | undefined | null, module: ModuleKey, cap: Capability): boolean {
  if (!role || !PERMISSIONS[role]) return false;
  return !!PERMISSIONS[role][module]?.[cap];
}
export function scopeFor(role: Role | undefined | null, module: ModuleKey): Scope {
  if (!role || !PERMISSIONS[role]) return "none";
  return PERMISSIONS[role][module].scope;
}
export function canSeeModule(role: Role | undefined | null, module: ModuleKey): boolean {
  return can(role, module, "read");
}
export function navModulesFor(role: Role | undefined | null): ModuleKey[] {
  if (!role) return [];
  return ALL_MODULES.filter((m) => canSeeModule(role, m));
}
export function isValidRole(r: unknown): r is Role {
  return typeof r === "string" && r in PERMISSIONS;
}

// Suggested default for the Admin "assign role" dropdown (NOT auto-granted).
export const DEFAULT_ROLE: Role = "buyer";

// ============================================================================
// App integration helpers (Next.js specific — not part of the security model)
// ============================================================================

/** Route each module renders at, within the dashboard shell. */
export const MODULE_ROUTES: Record<ModuleKey, string> = {
  dashboard: "/dashboard",
  suppliers: "/dashboard/suppliers",
  materials: "/dashboard/materials",
  inventory: "/dashboard/inventory",
  services: "/dashboard/services",
  offers: "/dashboard/offers",
  purchase_requests: "/dashboard/purchase-requests",
  purchase_orders: "/dashboard/purchase-orders",
  approvals: "/dashboard/approvals",
  contracts: "/dashboard/contracts",
  projects: "/dashboard/projects",
  site_logs: "/dashboard/site-logs",
  inspections: "/dashboard/inspections",
  attendance: "/dashboard/attendance",
  timesheets: "/dashboard/timesheets",
  workforce: "/dashboard/workforce",
  analytics: "/dashboard/analytics",
  notifications: "/dashboard/notifications",
  settings: "/dashboard/settings",
  users: "/dashboard/users",
};

/**
 * Map a legacy account (pre-RBAC: isAdmin + jobType) to a Role, so existing
 * users are never locked out. Admins always become "admin". The result is a
 * sensible default that an administrator can override on the Users screen.
 */
export function legacyRoleFor(jobType?: string | null, isAdmin?: boolean): Role {
  if (isAdmin) return "admin";
  switch (String(jobType || "").toLowerCase()) {
    case "administrator": return "admin";
    case "ceo": return "management";
    case "financial":
    case "finance": return "finance";
    case "hr": return "hr";
    case "project manager": return "procurement_manager";
    case "site engineer": return "site_engineer";
    case "procurement": return "buyer";
    case "inventory": return "warehouse";
    case "hse": return "inspector";
    case "country manager":
    case "country director": return "country_manager";
    case "documentation controller":
    case "document controller":
    case "doc controller": return "documentation_controller";
    default: return DEFAULT_ROLE;
  }
}

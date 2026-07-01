// lib/assistant/tools.ts
// ============================================================================
// The assistant's ACTIONS — read-only, live-data tools that respect the current
// user's permissions. Both brains use these: the AI brain calls them by name
// (OpenAI-style function calling), the free brain picks one from keywords.
//
// Safety: every data tool is gated by canSee(module). The tools never write —
// they read the same site-scoped data the user could already open in the app,
// so the assistant can report but never act beyond the user's authority.
// ============================================================================
import { fetchScoped, type Session } from "@/lib/data";
import {
  ROLE_LABELS,
  MODULE_LABELS,
  MODULE_ROUTES,
  ALL_MODULES,
  type Capability,
  type ModuleKey,
  type Role,
} from "@/lib/roles";
import { approvalLimitFor, canApproveAmount, requiredApproverLabel } from "@/lib/procurement";
import { buildProposal, resolveCreatable, type PendingAction } from "./actions";

export type Rec = Record<string, unknown> & { id: string };

export type ToolCtx = {
  session: Session;
  name?: string;
  role: Role | null;
  isAdmin: boolean;
  sites: string[];
  canSee: (m: ModuleKey) => boolean;
  can: (m: ModuleKey, cap: Capability) => boolean;
  /** Cached loader — returns the site-scoped rows for a module's collection. */
  load: (m: ModuleKey) => Promise<Rec[]>;
  /** Navigate the app to a route (provided by the chat panel). */
  navigate?: (route: string) => void;
};

export type ToolResult = { ok: boolean; title: string; text: string; action?: PendingAction };

/** ModuleKey → Firestore short name used by lib/data.fetchScoped. */
export const MODULE_SHORT: Partial<Record<ModuleKey, string>> = {
  suppliers: "suppliers",
  materials: "materials",
  inventory: "inventory",
  material_usage: "material_usage",
  services: "services",
  offers: "offers",
  purchase_requests: "prs",
  purchase_orders: "pos",
  deliveries: "deliveries",
  contracts: "contracts",
  projects: "sites",
  site_logs: "site_logs",
  safety: "safety",
  tasks: "tasks",
  inspections: "inspections",
  attendance: "attendance",
  timesheets: "timesheets",
  workforce: "workforce",
  equipment: "equipment",
  messages: "messages",
};

/** Modules that have a real collection we can read. */
export const DATA_MODULES = Object.keys(MODULE_SHORT) as ModuleKey[];

/** Synonyms so "vendor", "stock", "order" resolve to the right module. */
const SYNONYMS: Partial<Record<ModuleKey, string[]>> = {
  suppliers: ["supplier", "suppliers", "vendor", "vendors"],
  materials: ["material", "materials", "item", "items", "catalogue", "catalog"],
  inventory: ["inventory", "stock", "warehouse", "store"],
  material_usage: ["usage", "consumed", "consumption"],
  services: ["service", "services"],
  offers: ["offer", "offers", "quote", "quotation", "quotations", "rfq"],
  purchase_requests: ["pr", "prs", "request", "requests", "requisition", "requisitions"],
  purchase_orders: ["po", "pos", "purchase order", "purchase orders", "order", "orders"],
  deliveries: ["delivery", "deliveries", "shipment", "shipments"],
  contracts: ["contract", "contracts"],
  projects: ["project", "projects", "site", "sites"],
  site_logs: ["site log", "site logs", "diary", "daily log"],
  safety: ["safety", "incident", "incidents", "hse", "observation"],
  tasks: ["task", "tasks", "rfi", "rfis", "to-do", "todo"],
  inspections: ["inspection", "inspections", "qa", "qc"],
  attendance: ["attendance", "check-in", "checkin"],
  timesheets: ["timesheet", "timesheets"],
  workforce: ["worker", "workers", "crew", "labour", "labor", "workforce"],
  equipment: ["equipment", "machine", "machines", "plant"],
  messages: ["message", "messages", "chat"],
};

// ---- small field helpers ---------------------------------------------------
function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v.replace(/[^0-9.-]/g, "")) || 0;
  return 0;
}
function str(v: unknown): string {
  return v == null ? "" : String(v);
}
export function labelOf(r: Rec): string {
  const keys = ["name", "title", "ref", "reference", "poNumber", "prNumber", "number", "subject", "item", "itemName", "description", "fullName", "code"];
  for (const k of keys) if (r[k]) return str(r[k]);
  return r.id;
}
function statusOf(r: Rec): string {
  return str(r.status || r.state || r.stage || "");
}
function amountOf(r: Rec): number {
  const keys = ["total", "amount", "value", "grandTotal", "estValue", "estimatedValue", "budget", "price"];
  for (const k of keys) if (r[k] != null) return num(r[k]);
  return 0;
}
function createdOf(r: Rec): number {
  return num(r.createdAt || r.created || r.date || r.at);
}
export function fmtOMR(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 3 }) + " OMR";
}

// Synonyms for EVERY navigable screen (superset of SYNONYMS above).
const NAV_SYN: Partial<Record<ModuleKey, string[]>> = {
  ...SYNONYMS,
  dashboard: ["dashboard", "home", "overview", "main screen"],
  analytics: ["analytics", "reports", "report", "charts", "insights", "statistics", "stats"],
  notifications: ["notifications", "notification", "alerts"],
  settings: ["settings", "preferences", "setting"],
  users: ["users", "user management", "accounts", "team", "staff"],
  timesheets: ["timesheets", "timesheet"],
  attendance: ["attendance", "check-in"],
  inspections: ["inspections", "inspection", "qa", "qc"],
  contracts: ["contracts", "contract"],
  approvals: ["approvals", "approval", "approval queue"],
};

/** Resolve free text to any navigable screen the user can open, or null. */
export function resolveNav(text: string, ctx: ToolCtx): ModuleKey | null {
  const t = text.toLowerCase();
  const pairs: { m: ModuleKey; syn: string }[] = [];
  ALL_MODULES.forEach((m) => {
    if (!MODULE_ROUTES[m]) return;
    (NAV_SYN[m] || [MODULE_LABELS[m].toLowerCase()]).forEach((syn) => pairs.push({ m, syn }));
  });
  pairs.sort((a, b) => b.syn.length - a.syn.length);
  for (const { m, syn } of pairs) {
    if (t.includes(syn) && ctx.canSee(m)) return m;
  }
  return null;
}

/** Resolve free text to a module the user can see, or null. */
export function resolveModule(text: string, ctx: ToolCtx): ModuleKey | null {
  const t = text.toLowerCase();
  // longest synonyms first so "purchase order" beats "order"
  const pairs: { m: ModuleKey; syn: string }[] = [];
  DATA_MODULES.forEach((m) => (SYNONYMS[m] || [m]).forEach((syn) => pairs.push({ m, syn })));
  pairs.sort((a, b) => b.syn.length - a.syn.length);
  for (const { m, syn } of pairs) {
    if (t.includes(syn) && ctx.canSee(m)) return m;
  }
  return null;
}

/** Find records in a module whose label contains `name` (case-insensitive). */
async function findByName(m: ModuleKey, name: string, ctx: ToolCtx): Promise<Rec[]> {
  const q = name.toLowerCase().trim();
  if (!q) return [];
  const rows = await ctx.load(m).catch(() => []);
  return rows.filter((r) => labelOf(r).toLowerCase().includes(q));
}

// ---- shared compute (used by tools AND by report) --------------------------
async function computeCounts(ctx: ToolCtx): Promise<{ m: ModuleKey; n: number }[]> {
  const mods = DATA_MODULES.filter((m) => ctx.canSee(m));
  const rows = await Promise.all(
    mods.map(async (m) => ({ m, n: (await ctx.load(m).catch(() => [])).length }))
  );
  return rows.filter((r) => r.n > 0);
}

async function computePending(ctx: ToolCtx): Promise<Rec[]> {
  const prs = await ctx.load("purchase_requests").catch(() => []);
  const open = /submit|pending|await|review|for approval|raised/i;
  const closed = /approv|reject|order|cancel|complete|paid|draft/i;
  return prs.filter((r) => {
    const s = statusOf(r).toLowerCase();
    if (!s) return false;
    if (closed.test(s)) return false;
    return open.test(s);
  });
}

async function computeLowStock(ctx: ToolCtx): Promise<{ r: Rec; qty: number; min: number }[]> {
  const inv = await ctx.load("inventory").catch(() => []);
  const out: { r: Rec; qty: number; min: number }[] = [];
  for (const r of inv) {
    const qty = num(r.qty ?? r.quantity ?? r.stock ?? r.onHand ?? r.available);
    const min = num(r.min ?? r.reorder ?? r.minQty ?? r.reorderLevel ?? r.threshold ?? r.minimum);
    if (min > 0 && qty <= min) out.push({ r, qty, min });
  }
  return out;
}

async function computeSpend(ctx: ToolCtx): Promise<{ total: number; byStatus: Record<string, number>; count: number }> {
  const pos = await ctx.load("purchase_orders").catch(() => []);
  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const r of pos) {
    const a = amountOf(r);
    total += a;
    const s = statusOf(r) || "Unspecified";
    byStatus[s] = (byStatus[s] || 0) + a;
  }
  return { total, byStatus, count: pos.length };
}

// ---- tool definitions ------------------------------------------------------
export type Tool = {
  name: string;
  description: string;
  module?: ModuleKey; // read gate, if the tool targets one module
  parameters: Record<string, unknown>; // JSON schema for AI function-calling
  run: (args: Record<string, unknown>, ctx: ToolCtx) => Promise<ToolResult>;
};

const noParams = { type: "object", properties: {}, additionalProperties: false };

export const TOOLS: Tool[] = [
  {
    name: "whoami",
    description: "Report the signed-in person's role, sites, approval limit and which modules they can access.",
    parameters: noParams,
    run: async (_a, ctx) => {
      const roleLabel = ctx.role ? ROLE_LABELS[ctx.role] : "User";
      const limit = approvalLimitFor(ctx.role);
      const mods = DATA_MODULES.filter((m) => ctx.canSee(m)).map((m) => MODULE_LABELS[m]);
      const lines = [
        `You are ${ctx.name ? ctx.name + ", " : ""}a ${roleLabel}${ctx.isAdmin ? " (administrator)" : ""}.`,
        `Sites: ${ctx.sites.length ? ctx.sites.join(", ") : "all sites"}.`,
        limit > 0 && limit < Number.MAX_SAFE_INTEGER
          ? `Approval limit: up to ${fmtOMR(limit)}.`
          : limit >= Number.MAX_SAFE_INTEGER
          ? `Approval limit: no limit.`
          : `Approval limit: you cannot approve requests.`,
        `You can open: ${mods.join(", ") || "no modules yet"}.`,
      ];
      return { ok: true, title: "Your access", text: lines.join("\n") };
    },
  },
  {
    name: "navigate",
    description:
      "Open / go to a screen in the app for the user (e.g. suppliers, purchase orders, dashboard, reports, settings). Use whenever the user asks to open, go to, take them to, or bring up a section.",
    parameters: {
      type: "object",
      properties: { module: { type: "string", description: "The screen to open, e.g. suppliers, purchase orders, dashboard." } },
      required: ["module"],
    },
    run: async (args, ctx) => {
      const m = resolveNav(str(args.module), ctx);
      if (!m) return { ok: false, title: "Open", text: "I couldn't find that screen, or you don't have access to it." };
      if (!ctx.navigate) return { ok: false, title: "Open", text: `Go to ${MODULE_LABELS[m]} from the menu.` };
      ctx.navigate(MODULE_ROUTES[m]);
      return { ok: true, title: "Opened", text: `Opening ${MODULE_LABELS[m]} for you.` };
    },
  },
  {
    name: "create_record",
    description:
      "Propose creating a new record — a supplier, material, or purchase request. This does NOT save immediately; the user must confirm it. Use when the user asks to add or create one. Put the details in fields.",
    parameters: {
      type: "object",
      properties: {
        module: { type: "string", description: "suppliers | materials | purchase_requests" },
        fields: {
          type: "object",
          description:
            'The values, e.g. {"name":"BuildCo","email":"a@b.com"} for a supplier, or {"title":"Cement","quantity":100} for a request.',
        },
      },
      required: ["module", "fields"],
    },
    run: async (args, ctx) => {
      const m = resolveCreatable(str(args.module), ctx.can);
      if (!m) {
        return {
          ok: false,
          title: "Add",
          text: "I can only add suppliers, materials or purchase requests right now — and only if your role allows it.",
        };
      }
      const fields = (args.fields && typeof args.fields === "object" ? args.fields : {}) as Record<string, unknown>;
      const { action, error } = buildProposal(m, fields, ctx.can);
      if (error || !action) return { ok: false, title: "Add", text: error || "I couldn't prepare that." };
      return { ok: true, title: "Confirm", text: `Ready to ${action.summary}. Confirm below to save it.`, action };
    },
  },
  {
    name: "delete_record",
    description:
      "Propose DELETING a record by name (e.g. a supplier or material). Does NOT delete — the user must confirm. Use when asked to delete/remove something.",
    parameters: {
      type: "object",
      properties: { module: { type: "string" }, name: { type: "string" } },
      required: ["module", "name"],
    },
    run: async (args, ctx) => {
      const m = resolveModule(str(args.module), ctx);
      if (!m) return { ok: false, title: "Delete", text: "I couldn't find that section, or you don't have access." };
      if (!ctx.can(m, "delete")) return { ok: false, title: "Delete", text: `You don't have permission to delete ${MODULE_LABELS[m]}.` };
      const matches = await findByName(m, str(args.name), ctx);
      if (!matches.length) return { ok: false, title: "Delete", text: `I couldn't find "${str(args.name)}" in ${MODULE_LABELS[m]}.` };
      if (matches.length > 1)
        return { ok: false, title: "Delete", text: `I found ${matches.length}: ${matches.slice(0, 6).map(labelOf).join(", ")}. Which one exactly?` };
      const r = matches[0];
      return {
        ok: true,
        title: "Confirm",
        text: `This permanently deletes "${labelOf(r)}".`,
        action: { verb: "delete", module: m, short: MODULE_SHORT[m]!, id: r.id, fields: {}, summary: `Delete ${MODULE_LABELS[m]} "${labelOf(r)}"` },
      };
    },
  },
  {
    name: "update_record",
    description: "Propose UPDATING a record found by name — set new field values. Does NOT save until the user confirms.",
    parameters: {
      type: "object",
      properties: {
        module: { type: "string" },
        name: { type: "string" },
        fields: { type: "object", description: 'The fields to change, e.g. {"price":5}.' },
      },
      required: ["module", "name", "fields"],
    },
    run: async (args, ctx) => {
      const m = resolveModule(str(args.module), ctx);
      if (!m) return { ok: false, title: "Update", text: "I couldn't find that section, or you don't have access." };
      if (!ctx.can(m, "update")) return { ok: false, title: "Update", text: `You don't have permission to change ${MODULE_LABELS[m]}.` };
      const matches = await findByName(m, str(args.name), ctx);
      if (!matches.length) return { ok: false, title: "Update", text: `I couldn't find "${str(args.name)}" in ${MODULE_LABELS[m]}.` };
      if (matches.length > 1)
        return { ok: false, title: "Update", text: `I found ${matches.length}: ${matches.slice(0, 6).map(labelOf).join(", ")}. Which one?` };
      const fields = (args.fields && typeof args.fields === "object" ? args.fields : {}) as Record<string, unknown>;
      const keys = Object.keys(fields).filter((k) => !["id", "createdBy", "createdAt"].includes(k));
      if (!keys.length) return { ok: false, title: "Update", text: "What should I change?" };
      const r = matches[0];
      const patch: Record<string, unknown> = {};
      keys.forEach((k) => (patch[k] = fields[k]));
      return {
        ok: true,
        title: "Confirm",
        text: `Update "${labelOf(r)}" — ${keys.map((k) => `${k} → ${String(fields[k])}`).join(", ")}.`,
        action: { verb: "update", module: m, short: MODULE_SHORT[m]!, id: r.id, fields: patch, summary: `Update ${MODULE_LABELS[m]} "${labelOf(r)}"` },
      };
    },
  },
  {
    name: "approve_request",
    description: "Propose APPROVING a purchase request found by name. Requires approval authority and the amount within the user's limit.",
    parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    run: async (args, ctx) => {
      const m: ModuleKey = "purchase_requests";
      if (!ctx.can(m, "approve")) return { ok: false, title: "Approve", text: "You don't have approval authority for requests." };
      const matches = await findByName(m, str(args.name), ctx);
      if (!matches.length) return { ok: false, title: "Approve", text: `I couldn't find a request matching "${str(args.name)}".` };
      if (matches.length > 1)
        return { ok: false, title: "Approve", text: `I found ${matches.length}: ${matches.slice(0, 6).map(labelOf).join(", ")}. Which one?` };
      const r = matches[0];
      const amt = amountOf(r);
      if (!canApproveAmount(ctx.role, amt, ctx.isAdmin))
        return { ok: false, title: "Approve", text: `That request is ${fmtOMR(amt)} — above your limit. It needs ${requiredApproverLabel(amt)}.` };
      return {
        ok: true,
        title: "Confirm",
        text: `Approve "${labelOf(r)}"${amt ? ` (${fmtOMR(amt)})` : ""}?`,
        action: { verb: "approve", module: m, short: "prs", id: r.id, fields: {}, summary: `Approve "${labelOf(r)}"${amt ? ` (${fmtOMR(amt)})` : ""}` },
      };
    },
  },
  {
    name: "recent_activity",
    description:
      "What changed recently — records created or updated in the last N days (default 1 = today). Use for 'what changed today', 'since yesterday', 'what's new'.",
    parameters: { type: "object", properties: { days: { type: "number", description: "How many days back (default 1)." } } },
    run: async (args, ctx) => {
      const days = Math.max(1, Math.min(30, num(args.days) || 1));
      const since = Date.now() - days * 86400000;
      const lines: string[] = [];
      for (const m of DATA_MODULES.filter((x) => ctx.canSee(x))) {
        const rows = await ctx.load(m).catch(() => []);
        const created = rows.filter((r) => createdOf(r) >= since).length;
        const updated = rows.filter((r) => num(r.updatedAt) >= since && createdOf(r) < since).length;
        if (created || updated) lines.push(`• ${MODULE_LABELS[m]}: ${created} new${updated ? `, ${updated} updated` : ""}`);
      }
      return lines.length
        ? { ok: true, title: `Changes in the last ${days} day(s)`, text: lines.join("\n") }
        : { ok: true, title: "Changes", text: `Nothing new or updated in the last ${days} day(s).` };
    },
  },
  {
    name: "system_snapshot",
    description: "A quick count of records across every module the user can access.",
    parameters: noParams,
    run: async (_a, ctx) => {
      const counts = await computeCounts(ctx);
      if (!counts.length) return { ok: true, title: "Snapshot", text: "There's no data in your modules yet." };
      const lines = counts.map((c) => `• ${MODULE_LABELS[c.m]}: ${c.n}`);
      return { ok: true, title: "System snapshot", text: lines.join("\n") };
    },
  },
  {
    name: "count",
    description: "Count the records in one module (e.g. how many suppliers, purchase orders, safety incidents).",
    parameters: {
      type: "object",
      properties: { module: { type: "string", description: "Module name, e.g. suppliers, purchase_orders, inventory, safety." } },
      required: ["module"],
    },
    run: async (args, ctx) => {
      const m = resolveModule(str(args.module), ctx);
      if (!m) return { ok: false, title: "Count", text: "I couldn't find that section, or you don't have access to it." };
      const rows = await ctx.load(m);
      return { ok: true, title: MODULE_LABELS[m], text: `There ${rows.length === 1 ? "is 1 record" : `are ${rows.length} records`} in ${MODULE_LABELS[m]}.` };
    },
  },
  {
    name: "list",
    description: "List the most recent records in a module, with amount and status when present.",
    parameters: {
      type: "object",
      properties: {
        module: { type: "string", description: "Module name, e.g. purchase_requests, deliveries, projects." },
        limit: { type: "number", description: "How many to list (default 5, max 15)." },
      },
      required: ["module"],
    },
    run: async (args, ctx) => {
      const m = resolveModule(str(args.module), ctx);
      if (!m) return { ok: false, title: "List", text: "I couldn't find that section, or you don't have access to it." };
      const limit = Math.max(1, Math.min(15, num(args.limit) || 5));
      const rows = [...(await ctx.load(m))].sort((a, b) => createdOf(b) - createdOf(a)).slice(0, limit);
      if (!rows.length) return { ok: true, title: MODULE_LABELS[m], text: `No records in ${MODULE_LABELS[m]} yet.` };
      const lines = rows.map((r) => {
        const a = amountOf(r);
        const s = statusOf(r);
        return `• ${labelOf(r)}${a ? " — " + fmtOMR(a) : ""}${s ? " [" + s + "]" : ""}`;
      });
      return { ok: true, title: `Latest in ${MODULE_LABELS[m]}`, text: lines.join("\n") };
    },
  },
  {
    name: "search",
    description: "Search for a supplier, material, order or any record by a word in its name/text.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The word or name to look for." },
        module: { type: "string", description: "Optional module to limit the search to." },
      },
      required: ["query"],
    },
    run: async (args, ctx) => {
      const q = str(args.query).toLowerCase().trim();
      if (!q) return { ok: false, title: "Search", text: "Tell me what to search for." };
      const only = args.module ? resolveModule(str(args.module), ctx) : null;
      const mods = only ? [only] : DATA_MODULES.filter((m) => ctx.canSee(m));
      const hits: string[] = [];
      for (const m of mods) {
        const rows = await ctx.load(m).catch(() => []);
        for (const r of rows) {
          const hay = Object.values(r).map((v) => (typeof v === "string" ? v.toLowerCase() : "")).join(" ");
          if (hay.includes(q)) {
            hits.push(`• ${labelOf(r)} — ${MODULE_LABELS[m]}${statusOf(r) ? " [" + statusOf(r) + "]" : ""}`);
            if (hits.length >= 12) break;
          }
        }
        if (hits.length >= 12) break;
      }
      return hits.length
        ? { ok: true, title: `Results for "${args.query}"`, text: hits.join("\n") }
        : { ok: true, title: "Search", text: `Nothing found for "${args.query}" in the sections you can access.` };
    },
  },
  {
    name: "pending_approvals",
    description: "List purchase requests that are waiting for approval, with the amount and who should sign off.",
    module: "purchase_requests",
    parameters: noParams,
    run: async (_a, ctx) => {
      const rows = (await computePending(ctx)).sort((a, b) => amountOf(b) - amountOf(a));
      if (!rows.length) return { ok: true, title: "Approvals", text: "Nothing is waiting for approval right now." };
      const lines = rows.slice(0, 12).map((r) => {
        const a = amountOf(r);
        return `• ${labelOf(r)}${a ? " — " + fmtOMR(a) + " → needs " + requiredApproverLabel(a) : ""}${statusOf(r) ? " [" + statusOf(r) + "]" : ""}`;
      });
      return { ok: true, title: `${rows.length} awaiting approval`, text: lines.join("\n") };
    },
  },
  {
    name: "low_stock",
    description: "List inventory items at or below their minimum / reorder level.",
    module: "inventory",
    parameters: noParams,
    run: async (_a, ctx) => {
      const low = await computeLowStock(ctx);
      if (!low.length) return { ok: true, title: "Stock", text: "No items are below their reorder level." };
      const lines = low.slice(0, 15).map((x) => `• ${labelOf(x.r)} — ${x.qty} on hand (min ${x.min})`);
      return { ok: true, title: `${low.length} item(s) low on stock`, text: lines.join("\n") };
    },
  },
  {
    name: "spend_summary",
    description: "Total purchase-order value, broken down by status.",
    module: "purchase_orders",
    parameters: noParams,
    run: async (_a, ctx) => {
      const s = await computeSpend(ctx);
      if (!s.count) return { ok: true, title: "Spend", text: "There are no purchase orders yet." };
      const lines = [`Total across ${s.count} purchase orders: ${fmtOMR(s.total)}.`];
      Object.entries(s.byStatus)
        .sort((a, b) => b[1] - a[1])
        .forEach(([k, v]) => lines.push(`• ${k}: ${fmtOMR(v)}`));
      return { ok: true, title: "Spend summary", text: lines.join("\n") };
    },
  },
  {
    name: "make_report",
    description: "Generate a short report from live data. topic: overview, procurement, inventory, safety or projects.",
    parameters: {
      type: "object",
      properties: { topic: { type: "string", description: "overview | procurement | inventory | safety | projects" } },
    },
    run: async (args, ctx) => {
      const topic = str(args.topic || "overview").toLowerCase();
      const out: string[] = [];
      const want = (t: string) => topic === "overview" || topic.includes(t);

      if (want("procurement") && ctx.canSee("purchase_orders")) {
        const s = await computeSpend(ctx);
        out.push(`**Procurement** — ${s.count} purchase orders, total ${fmtOMR(s.total)}.`);
      }
      if (want("procurement") && ctx.canSee("purchase_requests")) {
        const p = await computePending(ctx);
        out.push(`Pending approvals: ${p.length}.`);
      }
      if (want("inventory") && ctx.canSee("inventory")) {
        const low = await computeLowStock(ctx);
        out.push(`**Inventory** — ${low.length} item(s) at/below reorder level.`);
      }
      if (want("safety") && ctx.canSee("safety")) {
        const rows = await ctx.load("safety").catch(() => []);
        const openN = rows.filter((r) => !/closed|resolved|done/i.test(statusOf(r))).length;
        out.push(`**Safety** — ${rows.length} record(s), ${openN} still open.`);
      }
      if (want("projects") && ctx.canSee("projects")) {
        const rows = await ctx.load("projects").catch(() => []);
        const avg = rows.length ? Math.round(rows.reduce((s, r) => s + num(r.progress), 0) / rows.length) : 0;
        out.push(`**Projects** — ${rows.length} site(s), average progress ${avg}%.`);
      }
      if (topic === "overview") {
        const counts = await computeCounts(ctx);
        if (counts.length) out.push("**Records:** " + counts.map((c) => `${MODULE_LABELS[c.m]} ${c.n}`).join(", ") + ".");
      }
      const stamp = new Date().toLocaleString();
      return out.length
        ? { ok: true, title: "Report", text: `Report (${stamp})\n\n${out.join("\n")}` }
        : { ok: true, title: "Report", text: "There isn't data (or access) for that report yet." };
    },
  },
];

const BY_NAME: Record<string, Tool> = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

/** Run a tool by name with the permission gate applied. */
export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolCtx): Promise<ToolResult> {
  const tool = BY_NAME[name];
  if (!tool) return { ok: false, title: "Unknown", text: `No such tool: ${name}.` };
  if (tool.module && !ctx.canSee(tool.module)) {
    return { ok: false, title: "No access", text: `You don't have access to ${MODULE_LABELS[tool.module]}.` };
  }
  try {
    return await tool.run(args, ctx);
  } catch {
    return { ok: false, title: "Error", text: "I couldn't read that data just now." };
  }
}

/** OpenAI-style tool schema (Kimi / DeepSeek / proxy). */
export function toolSchemas() {
  return TOOLS.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

/** Anthropic (Claude) tool schema — different shape from OpenAI. */
export function anthropicToolSchemas() {
  return TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
}

/** A cached loader bound to a session (one instance per ask). */
export function makeLoader(session: Session) {
  const cache = new Map<ModuleKey, Promise<Rec[]>>();
  return (m: ModuleKey): Promise<Rec[]> => {
    const short = MODULE_SHORT[m];
    if (!short) return Promise.resolve([]);
    if (!cache.has(m)) cache.set(m, fetchScoped<Record<string, unknown>>(short, session) as Promise<Rec[]>);
    return cache.get(m)!;
  };
}

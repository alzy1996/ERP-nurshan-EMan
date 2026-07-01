// lib/assistant/actions.ts
// ============================================================================
// Agent ACTIONS — the safe way the assistant changes data.
// Nothing here writes on its own. A tool builds a PendingAction (a *proposal*),
// the chat shows it with Confirm / Cancel, and only on Confirm does the panel
// call commitAction(). Every write is gated by the user's role (can create) and
// stamped with createdBy/updatedBy by the data layer (built-in audit).
// ============================================================================
import { addScoped, updateScoped, removeScoped, type Session } from "@/lib/data";
import { MODULE_LABELS, type Capability, type ModuleKey } from "@/lib/roles";

export type ActionVerb = "create" | "update" | "delete" | "approve";

export type PendingAction = {
  verb: ActionVerb;
  module: ModuleKey;
  short: string; // Firestore short collection name
  fields: Record<string, unknown>;
  summary: string; // human-readable, e.g. Create Supplier "BuildCo"
  id?: string; // for update / delete / approve
};

type CreateSpec = {
  short: string;
  label: string; // the field used to describe the record
  required: string[];
  allow: string[]; // fields we accept (others are dropped)
};

// The records the agent may create (start small, low-risk catalogues + PR).
const CREATE_SPECS: Partial<Record<ModuleKey, CreateSpec>> = {
  suppliers: {
    short: "suppliers",
    label: "name",
    required: ["name"],
    allow: ["name", "email", "phone", "tier", "category", "country", "contact", "notes"],
  },
  materials: {
    short: "materials",
    label: "name",
    required: ["name"],
    allow: ["name", "unit", "category", "price", "sku", "notes"],
  },
  purchase_requests: {
    short: "prs",
    label: "title",
    required: ["title"],
    allow: ["title", "item", "category", "quantity", "unit", "amount", "priority", "procType", "requiredBy", "status", "notes"],
  },
};

/** Which module a word refers to for creation, gated by can(create). */
export function resolveCreatable(
  text: string,
  can: (m: ModuleKey, c: Capability) => boolean
): ModuleKey | null {
  const t = text.toLowerCase();
  const map: [ModuleKey, RegExp][] = [
    ["suppliers", /supplier|vendor/],
    ["materials", /material|item|catalogue|catalog/],
    ["purchase_requests", /purchase request|request|requisition|\bpr\b/],
  ];
  for (const [m, re] of map) if (re.test(t) && can(m, "create")) return m;
  return null;
}

function clean(v: unknown): unknown {
  return typeof v === "string" ? v.trim() : v;
}

/** Validate + gate a create, returning a proposal or an error message. */
export function buildProposal(
  module: ModuleKey,
  raw: Record<string, unknown>,
  can: (m: ModuleKey, c: Capability) => boolean
): { action?: PendingAction; error?: string } {
  const spec = CREATE_SPECS[module];
  if (!spec) return { error: `I can't create ${MODULE_LABELS[module] || "that"} yet.` };
  if (!can(module, "create")) return { error: `You don't have permission to add ${MODULE_LABELS[module]}.` };

  const fields: Record<string, unknown> = {};
  for (const k of spec.allow) if (raw[k] != null && raw[k] !== "") fields[k] = clean(raw[k]);

  // A purchase request can be described by its item if no title was given.
  if (module === "purchase_requests" && !fields.title && fields.item) fields.title = fields.item;
  if (module === "purchase_requests" && !fields.status) fields.status = "Submitted";

  for (const r of spec.required) {
    if (!fields[r]) return { error: `I need a ${r} to create that. What should it be?` };
  }

  const label = String(fields[spec.label] || "record");
  return {
    action: {
      verb: "create",
      module,
      short: spec.short,
      fields,
      summary: `Create ${MODULE_LABELS[module]} "${label}"`,
    },
  };
}

/** Actually perform a confirmed action. Called by the panel on Confirm. */
export async function commitAction(
  action: PendingAction,
  session: Session
): Promise<{ ok: boolean; id?: string; message: string }> {
  try {
    if (action.verb === "create") {
      const ref = (await addScoped(action.short, action.fields, session)) as { id?: string };
      return { ok: true, id: ref?.id, message: `Done — ${action.summary.replace(/^Create /, "created ")}.` };
    }
    if (action.verb === "update" && action.id) {
      await updateScoped(action.short, action.id, action.fields, session);
      return { ok: true, id: action.id, message: `Done — ${action.summary.replace(/^Update /, "updated ")}.` };
    }
    if (action.verb === "approve" && action.id) {
      await updateScoped(action.short, action.id, { status: "Approved", approvedAt: Date.now(), ...action.fields }, session);
      return { ok: true, id: action.id, message: `Done — ${action.summary.replace(/^Approve /, "approved ")}.` };
    }
    if (action.verb === "delete" && action.id) {
      await removeScoped(action.short, action.id);
      return { ok: true, id: action.id, message: `Done — ${action.summary.replace(/^Delete /, "deleted ")}.` };
    }
    return { ok: false, message: "That action isn't supported." };
  } catch {
    return { ok: false, message: "I couldn't complete that. Please try from the screen." };
  }
}

/** A short, reviewable list of the fields being created. */
export function fieldLines(action: PendingAction): { k: string; v: string }[] {
  return Object.entries(action.fields).map(([k, v]) => ({ k, v: String(v) }));
}

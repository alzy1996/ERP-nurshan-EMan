// lib/assistant/mock.ts
// ============================================================================
// The FREE brain. No API key, works everywhere. It understands our system from
// knowledge.ts and can run the same live-data tools the AI brain uses, by
// matching keywords in the question. It's deliberately simple and honest — if it
// isn't sure, it says what it CAN do.
// ============================================================================
import { knowledgeAnswer } from "./knowledge";
import { runTool, resolveModule, type ToolCtx } from "./tools";
import type { PendingAction } from "./actions";

const GREETING = /^(hi|hey|hello|salam|salaam|marhaba|مرحبا|السلام|selam|merhaba|سلام)\b/i;

export const SUGGESTIONS = [
  "What can you do?",
  "How many suppliers do we have?",
  "What's pending approval?",
  "Show low stock",
  "Give me an overview report",
  "What is a 3-way match?",
];

function help(): string {
  return [
    "I'm Ask Nexus — I know this whole system and I can read live data you're allowed to see.",
    "Try:",
    "• “how many purchase orders?” or “list recent requests”",
    "• “what's pending approval?” · “show low stock” · “spend summary”",
    "• “search for <supplier/material>”",
    "• “open suppliers” · “go to purchase orders” (I'll open the screen)",
    "• “add a supplier called BuildCo” (I'll ask you to confirm before saving)",
    "• “give me an overview report”",
    "• “what is a PO?” · “how does approval work?” · “are the apps synced?”",
  ].join("\n");
}

// Strip command/filler words to get the record name a user meant.
const FILLER = new Set([
  "the", "a", "an", "request", "requests", "purchase", "supplier", "suppliers", "vendor",
  "material", "materials", "item", "project", "site", "called", "named", "delete", "remove",
  "erase", "approve", "please", "record", "for", "named", "to",
]);
function extractName(q: string, _low: string): string {
  const quoted = q.match(/["'“”]([^"'“”]+)["'“”]/);
  if (quoted) return quoted[1].trim();
  const words = q.trim().replace(/[.?!]+$/, "").split(/\s+/);
  return words.filter((w) => !FILLER.has(w.toLowerCase())).join(" ").trim();
}

export async function mockAsk(
  question: string,
  ctx: ToolCtx
): Promise<{ text: string; usedTools: string[]; action?: PendingAction }> {
  const q = question.trim();
  const low = q.toLowerCase();
  const used: string[] = [];

  const run = async (name: string, args: Record<string, unknown> = {}) => {
    used.push(name);
    const r = await runTool(name, args, ctx);
    return r.title ? `${r.title}\n${r.text}` : r.text;
  };

  if (!q || GREETING.test(low)) {
    return { text: `Hello${ctx.name ? " " + ctx.name : ""}! ${help()}`, usedTools: used };
  }

  // Intent: who am I / my access
  if (/(who am i|my role|my access|my permission|what can i (see|do|access)|am i allowed)/.test(low)) {
    return { text: await run("whoami"), usedTools: used };
  }
  // Intent: capabilities
  if (/(what can you do|help|how do you work|who are you|what are you)/.test(low)) {
    return { text: help(), usedTools: used };
  }
  // Intent: create / add a record (proposes; the user confirms before it saves)
  if (/\b(add|create|new|register)\b/.test(low) && !/\breport\b/.test(low)) {
    const mod =
      /supplier|vendor/.test(low) ? "suppliers"
      : /material|item|catalogue|catalog/.test(low) ? "materials"
      : /request|requisition|\bpr\b/.test(low) ? "purchase_requests"
      : null;
    if (mod) {
      const nameM = q.match(/["'“”]([^"'“”]+)["'“”]/) || q.match(/\b(?:called|named|for|:)\s+(.+)$/i);
      const name = nameM ? nameM[1].trim().replace(/[.?!]+$/, "") : "";
      if (!name) {
        return {
          text: `Sure — what should the new ${mod === "purchase_requests" ? "request" : mod.slice(0, -1)} be called?`,
          usedTools: used,
        };
      }
      const field = mod === "purchase_requests" ? "title" : "name";
      used.push("create_record");
      const r = await runTool("create_record", { module: mod, fields: { [field]: name } }, ctx);
      return { text: r.title ? `${r.title}\n${r.text}` : r.text, usedTools: used, action: r.action };
    }
  }
  // Intent: what changed (recent activity by timestamp)
  if (/(what.*(chang|new|happen)|since yesterday|today.*(activ|chang|new|happen)|recent activit|whats new|what's new)/.test(low)) {
    const days = /week/.test(low) ? 7 : /yesterday/.test(low) ? 2 : 1;
    return { text: await run("recent_activity", { days }), usedTools: used };
  }
  // Intent: delete / remove a record (proposes; user confirms)
  if (/\b(delete|remove|erase)\b/.test(low)) {
    const mod =
      /supplier|vendor/.test(low) ? "suppliers"
      : /material|item/.test(low) ? "materials"
      : /request|requisition|\bpr\b/.test(low) ? "purchase_requests"
      : /project|site/.test(low) ? "projects"
      : null;
    if (mod) {
      const name = extractName(q, low);
      if (name) {
        used.push("delete_record");
        const r = await runTool("delete_record", { module: mod, name }, ctx);
        return { text: r.title ? `${r.title}\n${r.text}` : r.text, usedTools: used, action: r.action };
      }
    }
  }
  // Intent: approve a purchase request
  if (/\bapprove\b/.test(low)) {
    const name = extractName(q, low);
    used.push("approve_request");
    const r = await runTool("approve_request", { name }, ctx);
    return { text: r.title ? `${r.title}\n${r.text}` : r.text, usedTools: used, action: r.action };
  }
  // Intent: navigate / open a screen
  if (/\b(open|go ?to|navigate|take me to|bring up|jump to)\b/.test(low)) {
    return { text: await run("navigate", { module: low }), usedTools: used };
  }
  // Intent: reports
  if (/\breport\b|summary of everything|overview/.test(low)) {
    const topic = /procure|purchase|po|pr|spend/.test(low)
      ? "procurement"
      : /stock|inventory/.test(low)
      ? "inventory"
      : /safety|incident/.test(low)
      ? "safety"
      : /project|site/.test(low)
      ? "projects"
      : "overview";
    return { text: await run("make_report", { topic }), usedTools: used };
  }
  // Intent: pending approvals
  if (/(pending|awaiting|waiting).*(approv|sign)|approv.*(pending|queue|waiting)|what needs approval/.test(low)) {
    return { text: await run("pending_approvals"), usedTools: used };
  }
  // Intent: low stock
  if (/low stock|reorder|running (low|out)|below (min|reorder)|out of stock/.test(low)) {
    return { text: await run("low_stock"), usedTools: used };
  }
  // Intent: spend
  if (/(spend|spent|total).*(po|purchase order|order)|purchase order value|how much.*(spent|ordered)/.test(low)) {
    return { text: await run("spend_summary"), usedTools: used };
  }
  // Intent: snapshot
  if (/snapshot|how much data|what's in the system|whats in the system|totals across/.test(low)) {
    return { text: await run("system_snapshot"), usedTools: used };
  }
  // Intent: count
  if (/(how many|number of|count of|count the)\b/.test(low)) {
    const m = resolveModule(low, ctx);
    if (m) return { text: await run("count", { module: m }), usedTools: used };
  }
  // Intent: list / show
  if (/(^|\b)(list|show|recent|latest|display)\b/.test(low)) {
    const m = resolveModule(low, ctx);
    if (m) return { text: await run("list", { module: m }), usedTools: used };
  }
  // Intent: search / find
  const findMatch = low.match(/\b(search|find|look ?up|lookup)\b\s*(for)?\s*(.*)/);
  if (findMatch && findMatch[3]?.trim()) {
    const term = findMatch[3].replace(/["']/g, "").trim();
    return { text: await run("search", { query: term }), usedTools: used };
  }

  // Knowledge / FAQ (what is X, how does Y work, sync, updates, etc.)
  const known = knowledgeAnswer(q);
  if (known) return { text: known, usedTools: used };

  // If it clearly references a module, list it as a best effort.
  const m = resolveModule(low, ctx);
  if (m) return { text: await run("list", { module: m }), usedTools: used };

  return {
    text:
      "I'm not sure about that one yet in free mode. " +
      "I can answer about the system and read your live data — " +
      "try “what's pending approval”, “how many suppliers”, or “what is a 3-way match”. " +
      "Add a Kimi or DeepSeek key in Settings → Assistant for smarter, free-form answers.",
    usedTools: used,
  };
}

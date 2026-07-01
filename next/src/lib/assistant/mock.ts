// lib/assistant/mock.ts
// ============================================================================
// The FREE brain. No API key, works everywhere. It understands our system from
// knowledge.ts and can run the same live-data tools the AI brain uses, by
// matching keywords in the question. It's deliberately simple and honest — if it
// isn't sure, it says what it CAN do.
// ============================================================================
import { knowledgeAnswer } from "./knowledge";
import { runTool, resolveModule, type ToolCtx } from "./tools";

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
    "• “give me an overview report”",
    "• “what is a PO?” · “how does approval work?” · “are the apps synced?”",
  ].join("\n");
}

export async function mockAsk(question: string, ctx: ToolCtx): Promise<{ text: string; usedTools: string[] }> {
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

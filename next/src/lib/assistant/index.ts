// lib/assistant/index.ts
// ============================================================================
// Ask Nexus orchestrator. One entry point the UI calls: askNexus(). It builds a
// permission-aware context for the current user, then routes to the AI brain
// (Kimi/DeepSeek/proxy) when configured, or the free brain otherwise. If the AI
// brain fails, it falls back to the free brain so the assistant never dies.
// ============================================================================
import type { Session } from "@/lib/data";
import type { ModuleKey, Role } from "@/lib/roles";
import { buildSystemPrompt } from "./knowledge";
import { makeLoader, type ToolCtx } from "./tools";
import { getConfig, isAIReady, sourceLabel } from "./config";
import { mockAsk } from "./mock";
import { aiAsk, AssistantError, type ChatMsg } from "./ai";

export type { ChatMsg } from "./ai";
export { SUGGESTIONS } from "./mock";
export { getConfig, setConfig, resetConfig, isAIReady, sourceLabel, PROVIDERS } from "./config";
export type { AssistantConfig, AssistantMode, AssistantProvider } from "./config";

export type AskInput = {
  question: string;
  history: ChatMsg[];
  session: Session;
  name?: string;
  role: Role | null;
  isAdmin: boolean;
  sites: string[];
  visibleModules: ModuleKey[];
  canSee: (m: ModuleKey) => boolean;
  lang?: string;
};

export type AskResult = {
  text: string;
  source: string; // badge: "Free mode" / "Kimi (Moonshot)" / ...
  usedTools: string[];
  fellBack?: boolean; // AI was configured but failed → used free brain
  note?: string;
};

export async function askNexus(input: AskInput): Promise<AskResult> {
  const ctx: ToolCtx = {
    session: input.session,
    name: input.name,
    role: input.role,
    isAdmin: input.isAdmin,
    sites: input.sites,
    canSee: input.canSee,
    load: makeLoader(input.session),
  };

  const cfg = getConfig();

  if (isAIReady(cfg)) {
    try {
      const system = buildSystemPrompt({
        name: input.name,
        role: input.role,
        isAdmin: input.isAdmin,
        sites: input.sites,
        visibleModules: input.visibleModules,
        lang: input.lang,
      });
      const r = await aiAsk(system, input.history, input.question, cfg, ctx);
      return { text: r.text, source: sourceLabel(cfg), usedTools: r.usedTools };
    } catch (e) {
      // AI failed — answer with the free brain and tell the user why.
      const r = await mockAsk(input.question, ctx);
      const why = e instanceof AssistantError ? e.message : "The AI service is unavailable.";
      return {
        text: r.text,
        source: "Free mode",
        usedTools: r.usedTools,
        fellBack: true,
        note: why,
      };
    }
  }

  const r = await mockAsk(input.question, ctx);
  return { text: r.text, source: "Free mode", usedTools: r.usedTools };
}

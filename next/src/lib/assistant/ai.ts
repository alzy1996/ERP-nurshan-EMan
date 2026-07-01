// lib/assistant/ai.ts
// ============================================================================
// The AI brain. Talks to any OpenAI-compatible chat endpoint (Kimi/Moonshot,
// DeepSeek, or a gatekeeper proxy). It runs a tool-calling loop: the model may
// ask to read live data via our tools, we run them (permission-gated) and hand
// the results back, until it produces a final answer. On any failure it throws
// AssistantError so the caller can fall back to the free brain.
// ============================================================================
import type { AssistantConfig } from "./config";
import { runTool, toolSchemas, type ToolCtx } from "./tools";

export class AssistantError extends Error {}

export type ChatMsg = { role: "user" | "assistant"; content: string };

type ApiMsg = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
};

const MAX_ROUNDS = 5;
const TIMEOUT_MS = 30_000;

async function callModel(cfg: AssistantConfig, messages: ApiMsg[]): Promise<ApiMsg> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        tools: toolSchemas(),
        tool_choice: "auto",
        temperature: 0.3,
        stream: false,
      }),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new AssistantError(
      (e as Error)?.name === "AbortError"
        ? "The AI service took too long to answer."
        : "Couldn't reach the AI service (the website may be blocking it — see Settings → Assistant)."
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) throw new AssistantError("The AI key was rejected — check it in Settings → Assistant.");
    if (res.status === 429) throw new AssistantError("The AI service is rate-limited or out of quota right now.");
    throw new AssistantError(`The AI service returned an error (${res.status}). ${body.slice(0, 140)}`);
  }

  const data = (await res.json().catch(() => null)) as
    | { choices?: { message?: ApiMsg }[] }
    | null;
  const msg = data?.choices?.[0]?.message;
  if (!msg) throw new AssistantError("The AI service returned an unexpected response.");
  return msg;
}

/** One-shot connectivity check for Settings → Assistant. Throws AssistantError. */
export async function testAI(cfg: AssistantConfig): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: "user", content: "Reply with the single word: ready" }],
        temperature: 0,
        stream: false,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new AssistantError("Key rejected (401/403). Check the API key.");
      if (res.status === 429) throw new AssistantError("Rate-limited or out of quota (429).");
      throw new AssistantError(`Endpoint returned ${res.status}.`);
    }
    const data = (await res.json().catch(() => null)) as { choices?: { message?: { content?: string } }[] } | null;
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text || "Connected.";
  } catch (e) {
    if (e instanceof AssistantError) throw e;
    throw new AssistantError(
      (e as Error)?.name === "AbortError"
        ? "Timed out reaching the endpoint."
        : "Couldn't reach the endpoint. On the website this is usually the browser's CORS block — use the gatekeeper proxy."
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function aiAsk(
  system: string,
  history: ChatMsg[],
  question: string,
  cfg: AssistantConfig,
  ctx: ToolCtx
): Promise<{ text: string; usedTools: string[] }> {
  const messages: ApiMsg[] = [
    { role: "system", content: system },
    ...history.slice(-8).map((h) => ({ role: h.role, content: h.content } as ApiMsg)),
    { role: "user", content: question },
  ];
  const used: string[] = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const msg = await callModel(cfg, messages);
    const calls = msg.tool_calls || [];
    if (!calls.length) {
      return { text: (msg.content || "").trim() || "…", usedTools: used };
    }
    // Record the assistant's tool-call turn, then answer each call.
    messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: calls });
    for (const c of calls) {
      let args: Record<string, unknown> = {};
      try {
        args = c.function.arguments ? JSON.parse(c.function.arguments) : {};
      } catch {
        args = {};
      }
      used.push(c.function.name);
      const result = await runTool(c.function.name, args, ctx);
      messages.push({
        role: "tool",
        tool_call_id: c.id,
        name: c.function.name,
        content: `${result.title ? result.title + "\n" : ""}${result.text}`,
      });
    }
  }
  // Ran out of rounds — ask for a plain answer without more tools.
  const finalMsg = await callModel({ ...cfg }, [
    ...messages,
    { role: "user", content: "Please give me your best final answer now, in plain words." },
  ]);
  return { text: (finalMsg.content || "").trim() || "…", usedTools: used };
}

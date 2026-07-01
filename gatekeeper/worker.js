// gatekeeper/worker.js
// ============================================================================
// ERP Nexus — AI "gatekeeper" proxy (free Cloudflare Worker).
//
// Why this exists: the website is a static site (no server of its own). Browsers
// block a page from calling api.moonshot.ai / api.deepseek.com directly (the CORS
// rule), and putting the API key in the website would expose it. This tiny proxy
// fixes both: it adds the CORS header the browser needs AND holds the key as a
// server-side secret, so ONE key serves the whole company and never ships to a
// device.
//
// Deploy (5 minutes, free tier):
//   1. Create a free Cloudflare account → Workers & Pages → Create Worker.
//   2. Paste this file as the Worker code and Deploy.
//   3. Settings → Variables → add secrets:
//        UPSTREAM = https://api.moonshot.ai/v1/chat/completions   (or DeepSeek)
//        API_KEY  = <your Kimi/DeepSeek key>
//        ALLOW_ORIGIN = https://procurement-erp-6e271.web.app     (optional lock)
//   4. Copy the Worker URL (e.g. https://erp-nexus-ai.<you>.workers.dev).
//   5. In the app: Settings → Assistant → Connect AI → provider "Gatekeeper",
//      paste the Worker URL as the endpoint. No key needed in the app.
// ============================================================================

const DEFAULT_UPSTREAM = "https://api.moonshot.ai/v1/chat/completions";

export default {
  async fetch(request, env) {
    const allowOrigin = env.ALLOW_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    };

    // Preflight
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    if (request.method !== "POST") {
      return new Response("ERP Nexus AI gatekeeper is running. POST chat/completions here.", {
        status: 200,
        headers: { ...cors, "Content-Type": "text/plain" },
      });
    }

    if (!env.API_KEY) {
      return json({ error: "Gatekeeper missing API_KEY secret." }, 500, cors);
    }

    let body;
    try {
      body = await request.text();
    } catch {
      return json({ error: "Bad request body." }, 400, cors);
    }

    const upstream = env.UPSTREAM || DEFAULT_UPSTREAM;
    let resp;
    try {
      resp = await fetch(upstream, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.API_KEY}`,
        },
        body,
      });
    } catch {
      return json({ error: "Gatekeeper could not reach the AI provider." }, 502, cors);
    }

    // Stream the provider's JSON straight back, with CORS added.
    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: { ...cors, "Content-Type": resp.headers.get("Content-Type") || "application/json" },
    });
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

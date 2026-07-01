# Ask Nexus — AI gatekeeper (optional, for the website)

The **Ask Nexus** assistant works two ways:

| Mode | Key needed? | Where it works | Setup |
|------|-------------|----------------|-------|
| **Free** | No | Web + desktop + phone | Nothing — it's the default. Knows the whole system and reads your live data. |
| **Connect AI (direct key)** | Yes (in Settings) | Desktop **EXE** + phone **APK** | Paste your Kimi/DeepSeek key in *Settings → Assistant*. |
| **Connect AI (gatekeeper)** | Held by the proxy | **Web** + desktop + phone | Deploy `worker.js` (below), paste its URL. |

## Do I need the gatekeeper?

Only for the **website**. A browser refuses to let a web page call
`api.moonshot.ai` / `api.deepseek.com` directly (the **CORS** rule), and a key
placed in a website could be copied by anyone. The desktop and phone apps don't
have that limit, so a pasted key works there without a proxy.

The gatekeeper is a tiny free program (a Cloudflare Worker) that:

- adds the CORS header the browser needs, and
- keeps the API key on the server side, so **one key serves the whole company**
  and never ships to a device.

## Deploy it (about 5 minutes, free)

1. Create a free **Cloudflare** account → **Workers & Pages** → **Create Worker**.
2. Paste the contents of [`worker.js`](./worker.js) as the Worker code → **Deploy**.
3. Open the Worker → **Settings → Variables and Secrets** and add:
   - `UPSTREAM` = `https://api.moonshot.ai/v1/chat/completions` (Kimi) or
     `https://api.deepseek.com/v1/chat/completions` (DeepSeek)
   - `API_KEY` = your Kimi/DeepSeek key *(add as an encrypted secret)*
   - `ALLOW_ORIGIN` = `https://procurement-erp-6e271.web.app` *(optional — locks
     the proxy to your site; leave unset to allow any origin)*
4. Copy the Worker URL, e.g. `https://erp-nexus-ai.<you>.workers.dev`.
5. In the app: **Settings → Assistant → Connect AI → Gatekeeper**, paste the URL
   as the endpoint. Leave the key blank (the proxy holds it). **Save**, then
   **Test connection**.

## Getting a Kimi (Moonshot) key

1. Sign in at the Moonshot/Kimi open-platform console.
2. Create an API key.
3. Either paste it into the app (desktop/phone) **or** into the Worker's
   `API_KEY` secret (web). Default model: `moonshot-v1-8k` (you can switch to a
   larger context model in Settings).

DeepSeek works the same way with `https://api.deepseek.com` and model
`deepseek-chat`.

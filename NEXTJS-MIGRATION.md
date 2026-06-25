# ERP Nexus — Next.js migration

This repo runs **three** front-ends against **one** Firebase project
(`procurement-erp-6e271`), so the live app is never disrupted while we migrate:

| Path | App | Location | Status |
|------|-----|----------|--------|
| `/` | Vanilla HTML/JS (production) | repo root (`*.html`, `nexus-core.js`) | **Live** |
| `/app` | Vite + React (JS) — incremental port | `react/` → builds to `/app/` | **Live** |
| `next/` | **Next.js 16 + React 19 + TS** (this migration) | `next/` | **Scaffolding** |

The vanilla app and the Vite app stay live until the Next.js app reaches
parity; only then do we re-point Firebase Hosting. Nothing in this migration
touches `firebase.json`, the root HTML, or `react/` yet.

## Stack

- **Next.js 16** (App Router, Turbopack by default) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (vendored manually — see note below), **neutral** base palette
- **Firebase** (Firestore + anonymous auth) — same config as `/` and `/app` (`src/lib/firebase.ts`)
- **next-themes** (light default, dark tokens ready), **sonner** toasts, **lucide-react** icons

### UI/UX direction (decided with the product owner)

- **Modernize the current app** toward the supplied frosted-glass dashboard
  reference — evolve the existing look, not a ground-up redesign.
- **Neutral palette** (muted grays/whites, calm) matching the reference screenshot.
- **shadcn/ui + Tailwind** as the component system.
- ⏳ **Screens are gated on UI/UX examples.** No designed screens (shell, dashboard,
  Projects, Suppliers) are built until the owner provides reference designs
  (Figma / more screenshots) or signs off on the single reference shot.

### Why shadcn is vendored manually

The environment's network policy denies `ui.shadcn.com`, so the `shadcn` CLI
cannot fetch component templates. The underlying packages (Radix UI, CVA,
clsx, tailwind-merge, lucide) install fine from npm, so the components in
`src/components/ui/` are vendored directly. `components.json` is present, so
`npx shadcn@latest add <component>` will work if/when that domain is allowed.

## What's in place (foundation)

- `src/app/globals.css` — Tailwind v4 + shadcn neutral theme tokens (light + dark, sidebar/chart tokens)
- `src/app/layout.tsx` + `src/app/providers.tsx` — Geist fonts, ThemeProvider, anon Firebase auth, Toaster
- `src/lib/firebase.ts` — app/db/auth init, `ensureAnonAuth()`, `sha256()` (matches vanilla hashing)
- `src/lib/data.ts` — site-scoped Firestore helpers (`fetchScoped`, `addScoped`, `removeScoped`,
  `wipeCollection`, `sendWhatsApp`) ported from `react/src/lib/data.js`
- `src/components/ui/*` — button (incl. `glass`/`glassPrimary` variants), card, input, label,
  badge, avatar, separator, tabs, dropdown-menu, sheet, scroll-area, sonner, switch, checkbox,
  select, textarea (liquid-glass form controls, reference image 4)

### Liquid-glass UI (built — see reference images)

- **Design system** — `globals.css` adds a frosted glass layer (`.glass`, `.glass-strong`,
  `.glass-subtle`, `.glass-rail`, `.glass-specular`): backdrop-blur, translucency, inner glow,
  specular highlight and soft shadows, plus a soft airy app background. Neutral palette.
- **3D landing page** (`src/app/page.tsx`) — WebGL frosted globe via react-three-fiber + drei
  (procedural Lightformer environment, no network HDR; CSS-sphere fallback), glass nav, hero,
  liquid-glass CTAs, tilted feature panels, floating actions.
- **Dashboard shell** (`src/app/dashboard/`) — dark rounded glass rail + frosted nav panel
  (profile, Projects / Status / History, Documents tree), Executions stat card, tabbed content,
  floating actions. Matches reference image 1.
- **Suppliers** (`/dashboard/suppliers`) — glass card list + slide-in Sheet form with the full
  extended field set (company, contact, address, compliance/finance, status, rating, preferred
  toggle, tags, notes). Reads/writes `nexus_suppliers`.
- **Projects** (`/dashboard/projects`) — glass card list + Sheet form (code, client, status,
  location, manager, budget OMR, dates). Modelled on the existing `sites` collection (extended),
  reads/writes `nexus_sites`.

- **Auth** (`/login` + `src/context/app-context.tsx` + `AuthGuard`) — username/password against
  `nexus_users` (SHA-256), first-run admin bootstrap, localStorage session, site switcher + sign-out
  in the shell, `/dashboard/*` route guard. Suppliers/Projects now read/write through the real
  session (site-scoped via `resolveSite()`).
- **Dark mode** — `next-themes` toggle in the rail; the whole glass system has light + dark tokens.

## Migration order

1. ✅ **App shell** (glass rail + nav panel) + **3D landing page** + **dashboard** — done
2. ✅ **Projects** (extends `sites`) — done
3. ✅ **Suppliers (extended fields)** — done
4. ✅ **Auth/login** + session + site switcher + `/dashboard` route guard — done (dark mode too)
5. Per-section permission gating of nav (using `canSee`), edit existing records, supplier detail (radar/score), offers/WhatsApp request
6. Materials, Offers, Purchase Requests, Analytics, Notifications, Settings, Contracts, Attendance
7. Re-point Firebase Hosting at the Next build; retire `/` and `/app`

## Data models (decided)

### Projects = extended Sites

Decision: **Projects extend the existing `sites` collection** rather than a new entity.
The Projects screen reads/writes `nexus_sites` with these added fields:

```
{ name, code, client, status: "planning|active|on-hold|completed",
  location, manager, budget, currency: "OMR", startDate, endDate,
  siteId, createdBy, createdAt }
```

### Suppliers — extended fields (full set)

Was minimal (`name, phone, email, score, orders, onTime`). Now extended to:

```
name, category, website, contactPerson, phone, secondaryPhone, email,
address, city, region, country, crNumber, vatNumber, paymentTerms,
bankName, bankAccount/IBAN, rating (1–5), status: "active|pending|blacklisted",
preferred (bool), tags, notes  — plus score/orders/onTime kept for compatibility
```

## Dev

```bash
cd next
npm install
npm run dev      # http://localhost:3000
npm run build    # Turbopack production build
```

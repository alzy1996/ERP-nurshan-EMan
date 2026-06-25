# ERP Nexus — Next.js app (migration)

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui.
Talks to the **same** Firebase project (`procurement-erp-6e271`) as the live
vanilla app (`/`) and the Vite app (`/app`), so all three run during migration.

See [`../NEXTJS-MIGRATION.md`](../NEXTJS-MIGRATION.md) for the full plan,
stack decisions, UI/UX direction, and data-model notes.

## Dev

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build

```bash
npm run build    # Turbopack production build → .next
npm run start
```

## Status

- ✅ Foundation: Next 16 + React 19 + TS, Tailwind v4 + shadcn/ui (neutral),
  Firebase + site-scoped data layer, theme provider, base UI primitives. Builds clean.
- ⏳ Screens (shell, Projects, Suppliers extended, …) — **gated on UI/UX examples**.

> Note: shadcn components are vendored in `src/components/ui/` because the
> environment blocks `ui.shadcn.com`. `components.json` is configured so the
> CLI works if that domain is later allowed.

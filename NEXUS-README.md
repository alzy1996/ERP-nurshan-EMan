# ERP Nexus — Procurement & Construction Intelligence Platform

A 2026-ready, PWA-first procurement ERP. Each module is a **single self-contained HTML file** with all CSS and JS inline — no build step, no frameworks, pure vanilla ES6 + Firebase Firestore.

## Modules

| File | Module | Purpose |
|------|--------|---------|
| `dashboard.html` | Command Center | KPI cards, action center, Chart.js analytics, activity feed, global search |
| `materials.html` | Smart Catalog | Card/grid views, inline price edit, bulk PR, filter sidebar, stock bars |
| `suppliers.html` | Vendor Intelligence | Supplier cards, detail modal (4 tabs), radar performance chart, risk alerts, WhatsApp |
| `offers.html` | Offer Comparison Engine | Offer cards, countdown badges, side-by-side compare, AI price insight, convert-to-PR |
| `purchaserequests.html` | Visual Workflow | Kanban board (drag & drop), timeline view, approval modals, delegation, duplicate detection, print |
| `analytics.html` | Business Intelligence | Dashboard builder, pre-built reports, date range, CSV/Excel/PDF export, scheduled reports |
| `notifications.html` | Notification Hub | Priority inbox, category filters, swipe actions, WhatsApp reminders, settings |
| `settings.html` | Admin & Config | Project selector, approval matrix, user management, theme, backup/export |

## Design System (shared, identical across modules)

- **Palette:** primary orange `#E8612C`, blue accent `#2D7DD2`, plus green/amber/red/purple status colors — all via CSS variables.
- **Dark mode:** `[data-theme="dark"]` variable overrides; toggle in every topbar; respects `prefers-color-scheme`.
- **Components:** cards (radius 12px), buttons, badges (pill), modals (glassmorphism backdrop-blur), skeleton shimmer loading, toasts.
- **Layout:** 240px sidebar (desktop) → bottom nav bar (mobile ≤760px). Max content width 1440px.
- **Font:** Inter (Google Fonts).

## Tech & Standards

- **Firebase Firestore** real-time sync (`onSnapshot`), offline persistence enabled, live/offline connection pill.
- **PWA:** `nexus-manifest.json` + `nexus-sw.js` (offline-first cache, network-first for Firestore). Installable.
- **Vanilla JS only** — no React/Vue/Angular. No nested ternaries. `textContent` for dynamic user data (XSS-safe).
- **WhatsApp rule:** message token is written to Firestore *before* opening any `wa.me` link.
- **No OCR libraries** — native `<input capture>` for camera where needed.
- **Accessibility:** semantic HTML, ARIA labels, keyboard shortcuts (`/` or `Ctrl/Cmd+K` for search, `Esc` to close modals).

## Data

Realistic Omani construction data — **Hadbin Road & Infrastructure** project, Muscat/Jabal Akhdar/Sur suppliers (BRIGHT LIGHT, AL MAHA PETROLEUM, JABAL QUARRIES…), materials (Bitumen 60/70, Diesel, Aggregate 20mm, Crawler Crane 150T, Rebar, Cement). Currency: **OMR**.

## Run / Deploy

Static files — serve the folder over any HTTP server (Firebase Hosting recommended). Entry point: `dashboard.html`.

```bash
# local preview
npx serve .        # then open /dashboard.html

# deploy (existing Firebase project: ofm-trucks-movemments-harees)
firebase deploy --only hosting
```

> Note: the legacy `index.html` (OFM Smart Fleet) is retained untouched. ERP Nexus lives alongside it as `dashboard.html` and the seven sibling modules.

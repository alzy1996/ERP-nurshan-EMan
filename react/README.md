# ERP Nexus — React app (incremental migration)

Vite + React (JS) + Tailwind. Talks to the **same** Firebase project (`procurement-erp-6e271`) and Cloudinary as the live vanilla app, so both can run during migration.

## Dev
```bash
cd react
npm install
npm run dev      # http://localhost:5173
```

## Build
```bash
npm run build    # outputs react/dist
npm run preview
```

## Status
- ✅ Foundation: Firebase init + anonymous auth, custom username/password login (Firestore `nexus_users`, SHA-256), session, site scoping, EN/AR + RTL, dark mode, app shell, routing + guards.
- ✅ Pages ported: Login, Dashboard.
- ⏳ Next: Suppliers, Contracts, Attendance, Offers, Materials, Settings, etc.

The vanilla app at the repo root stays live until React reaches parity; then we point Firebase Hosting at `react/dist`.

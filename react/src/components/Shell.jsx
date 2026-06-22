import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

const NAV = [
  { sec: "Overview" },
  { id: "dashboard", label: "Dashboard", ico: "◈", to: "/dashboard" },
  { id: "analytics", label: "Analytics", ico: "📊", to: "/analytics" },
  { sec: "Procurement" },
  { id: "materials", label: "Materials", ico: "📦", to: "/materials" },
  { id: "suppliers", label: "Suppliers", ico: "🏭", to: "/suppliers" },
  { id: "offers", label: "Offers", ico: "🏷️", to: "/offers" },
  { id: "purchaserequests", label: "Purchase Requests", ico: "📋", to: "/purchase-requests" },
  { id: "contracts", label: "Contracts", ico: "📄", to: "/contracts" },
  { id: "attendance", label: "Attendance", ico: "🛂", to: "/attendance" },
  { sec: "Workspace" },
  { id: "notifications", label: "Notifications", ico: "🔔", to: "/notifications" },
  { id: "settings", label: "Settings", ico: "⚙️", to: "/settings" }
];

export default function Shell({ title, children }) {
  const app = useApp();
  const nav = useNavigate();
  const s = app.session;
  const initials = (s?.name || "U").split(" ").map((w) => w[0] || "").slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex h-screen">
      <aside className="w-60 shrink-0 flex flex-col text-white" style={{ background: "linear-gradient(180deg,var(--sidebar-1),var(--sidebar-2))" }}>
        <div className="px-4 py-4 flex items-center gap-3 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-white/15 grid place-items-center font-black">NX</div>
          <div><div className="font-extrabold leading-tight">ERP Nexus</div><div className="text-[10px] text-white/60">Procurement · React</div></div>
        </div>
        <div className="px-3 py-3 flex items-center gap-3 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg bg-white/15 grid place-items-center text-xs font-bold">{initials}</div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold truncate">{s?.name}</div>
            <div className="text-[10px] text-white/60">{s?.isAdmin ? "Administrator" : s?.jobType}</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV.map((n, i) =>
            n.sec ? (
              <div key={i} className="px-4 pt-3 pb-1 text-[10px] font-extrabold tracking-widest text-white/50 uppercase">{app.t(n.sec)}</div>
            ) : app.canSee(n.id) ? (
              <NavLink key={n.id} to={n.to}
                className={({ isActive }) => "mx-2 my-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition " + (isActive ? "bg-white/20 text-white" : "text-white/75 hover:bg-white/10 hover:text-white")}>
                <span className="w-5 text-center text-[17px]">{n.ico}</span>{app.t(n.label)}
              </NavLink>
            ) : null
          )}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-4 px-5 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h1 className="text-[17px] font-extrabold">{app.t(title)}</h1>
          <div className="ms-auto flex items-center gap-2">
            {app.sites.length > 0 && (
              <select value={app.activeSite} onChange={(e) => app.switchSite(e.target.value)}
                className="text-xs font-bold rounded-full px-3 py-1.5 border" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                {app.isAdmin && <option value={app.ALL}>{app.t("All sites")}</option>}
                {app.sites.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
              </select>
            )}
            <button onClick={app.toggleLang} className="w-9 h-9 rounded-lg border font-extrabold" style={{ borderColor: "var(--border)" }}>{app.lang === "ar" ? "EN" : "ع"}</button>
            <button onClick={app.toggleTheme} className="w-9 h-9 rounded-lg border" style={{ borderColor: "var(--border)" }}>{app.theme === "dark" ? "☀️" : "🌙"}</button>
            <button onClick={() => { app.logout(); nav("/login"); }} className="w-9 h-9 rounded-lg border" style={{ borderColor: "var(--border)" }} title={app.t("Sign out")}>⏻</button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </main>
    </div>
  );
}

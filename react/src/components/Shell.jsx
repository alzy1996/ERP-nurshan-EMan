import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

const NAV = [
  { sec: "Overview" },
  { id: "dashboard", label: "Dashboard", ico: "􀎟", emoji: "◈", to: "/dashboard" },
  { id: "analytics", label: "Analytics", emoji: "📊", to: "/analytics" },
  { sec: "Procurement" },
  { id: "materials", label: "Materials", emoji: "📦", to: "/materials" },
  { id: "suppliers", label: "Suppliers", emoji: "🏭", to: "/suppliers" },
  { id: "offers", label: "Offers", emoji: "🏷️", to: "/offers" },
  { id: "purchaserequests", label: "Purchase Requests", emoji: "📋", to: "/purchase-requests" },
  { id: "contracts", label: "Contracts", emoji: "📄", to: "/contracts" },
  { id: "attendance", label: "Attendance", emoji: "🛂", to: "/attendance" },
  { sec: "Workspace" },
  { id: "notifications", label: "Notifications", emoji: "🔔", to: "/notifications" },
  { id: "settings", label: "Settings", emoji: "⚙️", to: "/settings" }
];
const TABS = ["dashboard", "suppliers", "contracts", "attendance"];

function useMedia(qstr) {
  const [m, setM] = useState(() => window.matchMedia(qstr).matches);
  useEffect(() => {
    const mq = window.matchMedia(qstr);
    const h = () => setM(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [qstr]);
  return m;
}

export default function Shell({ title, children }) {
  const app = useApp();
  const nav = useNavigate();
  const desktop = useMedia("(min-width: 768px)");
  const rtl = app.lang === "ar";
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("nexus-rail") === "1");
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { localStorage.setItem("nexus-rail", collapsed ? "1" : "0"); }, [collapsed]);
  useEffect(() => { if (desktop) setDrawer(false); }, [desktop]);

  const s = app.session;
  const initials = (s?.name || "U").split(" ").map((w) => w[0] || "").slice(0, 2).join("").toUpperCase();
  const rail = desktop && collapsed;
  const sidebarW = rail ? 76 : 264;

  function toggleNav() { desktop ? setCollapsed((c) => !c) : setDrawer((d) => !d); }

  const offX = !desktop && !drawer ? (rtl ? "100%" : "-100%") : "0";

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* overlay (mobile) */}
      {!desktop && drawer && <div className="fixed inset-0 z-40" style={{ background: "rgba(8,12,20,.45)", backdropFilter: "blur(2px)" }} onClick={() => setDrawer(false)} />}

      {/* sidebar */}
      <aside
        className="z-50 flex flex-col text-white shrink-0 fixed md:static inset-y-0 transition-[transform,width] duration-300 ease-out"
        style={{
          width: sidebarW, transform: `translateX(${offX})`,
          [rtl ? "right" : "left"]: 0,
          background: "linear-gradient(180deg,var(--sidebar-1),var(--sidebar-2))",
          boxShadow: desktop ? "none" : "0 24px 60px rgba(8,12,20,.5)",
          paddingTop: "env(safe-area-inset-top)"
        }}
      >
        <div className="flex items-center gap-3 px-4 h-16 shrink-0">
          <div className="w-9 h-9 rounded-2xl bg-white/15 grid place-items-center font-black shrink-0">NX</div>
          {!rail && <div className="min-w-0"><div className="font-extrabold leading-tight truncate">ERP Nexus</div><div className="text-[10px] text-white/55">Procurement</div></div>}
        </div>

        <div className={"flex items-center gap-3 mx-2.5 mb-2 rounded-2xl px-2.5 py-2 " + (rail ? "justify-center" : "")} style={{ background: "rgba(255,255,255,.10)" }}>
          <div className="w-8 h-8 rounded-full grid place-items-center text-xs font-bold shrink-0" style={{ background: "rgba(255,255,255,.2)" }}>{initials}</div>
          {!rail && <div className="min-w-0"><div className="text-[13px] font-bold truncate">{s?.name}</div><div className="text-[10px] text-white/55 truncate">{s?.isAdmin ? "Administrator" : s?.jobType}</div></div>}
        </div>

        <nav className="flex-1 overflow-y-auto py-1.5 px-2 no-scrollbar">
          {NAV.map((n, i) =>
            n.sec ? (
              rail ? <div key={i} className="h-px mx-2 my-2" style={{ background: "rgba(255,255,255,.12)" }} />
                : <div key={i} className="px-3 pt-3 pb-1 text-[10px] font-extrabold tracking-widest text-white/45 uppercase">{app.t(n.sec)}</div>
            ) : app.canSee(n.id) ? (
              <NavLink key={n.id} to={n.to} title={app.t(n.label)} onClick={() => setDrawer(false)}
                className={({ isActive }) => "group flex items-center gap-3 rounded-2xl my-0.5 text-[13.5px] font-semibold transition " +
                  (rail ? "justify-center px-0 py-2.5 " : "px-3 py-2.5 ") +
                  (isActive ? "bg-white/20 text-white shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white active:scale-[.98]")}>
                <span className="w-6 text-center text-[18px] shrink-0">{n.emoji}</span>
                {!rail && <span className="truncate">{app.t(n.label)}</span>}
              </NavLink>
            ) : null
          )}
        </nav>

        {desktop && (
          <button onClick={() => setCollapsed((c) => !c)} className="m-2 h-9 rounded-2xl text-white/70 hover:text-white text-sm font-bold transition" style={{ background: "rgba(255,255,255,.08)" }}>
            {rail ? (rtl ? "‹" : "›") : (rtl ? "› Fold" : "‹ Fold")}
          </button>
        )}
      </aside>

      {/* main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 px-4 md:px-5 shrink-0 sticky top-0 z-30"
          style={{ height: 56, paddingTop: "env(safe-area-inset-top)", background: "var(--glass)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)", borderBottom: "1px solid var(--border)" }}>
          <button onClick={toggleNav} aria-label="Menu" className="w-9 h-9 rounded-xl grid place-items-center active:scale-95 transition" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <Burger />
          </button>
          <h1 className="text-[17px] font-extrabold tracking-tight truncate">{app.t(title)}</h1>
          <div className="ms-auto flex items-center gap-2">
            {app.sites.length > 0 && (
              <select value={app.activeSite} onChange={(e) => app.switchSite(e.target.value)}
                className="text-xs font-bold rounded-full px-3 py-1.5 border max-w-[40vw] md:max-w-none" style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }}>
                {app.isAdmin && <option value={app.ALL}>{app.t("All sites")}</option>}
                {app.sites.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
              </select>
            )}
            <IconBtn onClick={app.toggleLang}><b className="text-[12px]">{app.lang === "ar" ? "EN" : "ع"}</b></IconBtn>
            <IconBtn onClick={app.toggleTheme}>{app.theme === "dark" ? "☀️" : "🌙"}</IconBtn>
            <IconBtn onClick={() => { app.logout(); nav("/login"); }} title={app.t("Sign out")}>⏻</IconBtn>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-5 pt-4" style={{ paddingBottom: desktop ? 24 : "calc(76px + env(safe-area-inset-bottom))" }}>
          {children}
        </div>

        {/* iOS-style bottom tab bar (mobile) */}
        {!desktop && (
          <nav className="fixed bottom-0 inset-x-0 z-30 flex justify-around items-stretch"
            style={{ paddingBottom: "env(safe-area-inset-bottom)", background: "var(--glass)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)", borderTop: "1px solid var(--border)" }}>
            {TABS.filter((id) => app.canSee(id)).map((id) => {
              const n = NAV.find((x) => x.id === id);
              return (
                <NavLink key={id} to={n.to} className={({ isActive }) => "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-bold " + (isActive ? "" : "")}
                  style={({ isActive }) => ({ color: isActive ? "var(--primary)" : "var(--muted)" })}>
                  <span className="text-[20px] leading-none">{n.emoji}</span>{app.t(n.label).split(" ")[0]}
                </NavLink>
              );
            })}
            <button onClick={() => setDrawer(true)} className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-bold" style={{ color: "var(--muted)" }}>
              <span className="text-[20px] leading-none">⋯</span>More
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}

function IconBtn({ children, ...p }) {
  return <button {...p} className="w-9 h-9 rounded-xl grid place-items-center active:scale-95 transition" style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}>{children}</button>;
}
function Burger() {
  return <div className="flex flex-col gap-[3px]"><span className="block w-4 h-[2px] rounded-full" style={{ background: "var(--text)" }} /><span className="block w-4 h-[2px] rounded-full" style={{ background: "var(--text)" }} /><span className="block w-4 h-[2px] rounded-full" style={{ background: "var(--text)" }} /></div>;
}

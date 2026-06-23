import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import Shell from "../components/Shell";
import { fetchScoped } from "../lib/data";

export default function Dashboard() {
  const app = useApp();
  const [data, setData] = useState({ suppliers: [], offers: [], prs: [], contracts: [], activity: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    setLoading(true);
    Promise.all(["suppliers", "offers", "prs", "contracts", "activity"].map((n) => fetchScoped(n, app.session)))
      .then(([suppliers, offers, prs, contracts, activity]) => {
        if (on) { setData({ suppliers, offers, prs, contracts, activity }); setLoading(false); }
      })
      .catch(() => on && setLoading(false));
    return () => { on = false; };
  }, [app.activeSite]); // eslint-disable-line

  const pending = data.prs.filter((p) => /Level|Submitted/.test(p.stage || "")).length;
  const activeOffers = data.offers.filter((o) => (o.status || "") === "Active" || (o.status || "") === "New").length;
  const kpis = [
    { lbl: "Pending approvals", val: pending, ico: "📋" },
    { lbl: "Active offers", val: activeOffers, ico: "🏷️" },
    { lbl: "Suppliers count", val: data.suppliers.length, ico: "🏭" },
    { lbl: "Contracts", val: data.contracts.length, ico: "📄" }
  ];

  return (
    <Shell title="Dashboard">
      {loading ? (
        <div style={{ color: "var(--muted)" }}>{app.t("Loading…")}</div>
      ) : (
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
            {kpis.map((k, i) => (
              <div key={i} className="card p-4 rise" style={{ animationDelay: i * 40 + "ms" }}>
                <div className="text-lg mb-2">{k.ico}</div>
                <div className="text-xs font-semibold" style={{ color: "var(--muted)" }}>{app.t(k.lbl)}</div>
                <div className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--primary)" }}>{k.val}</div>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <div className="font-extrabold mb-3">{app.t("Recent activity")}</div>
            {data.activity.length === 0 ? (
              <div className="text-sm" style={{ color: "var(--muted)" }}>No activity yet.</div>
            ) : (
              <ul className="space-y-2">
                {data.activity.slice(0, 8).map((a, i) => (
                  <li key={i} className="text-[13px] border-b last:border-0 pb-2" style={{ borderColor: "var(--border)" }}>
                    <b>{a.ref || a.by || "—"}</b> {a.action || a.html || ""}
                    <span className="ms-2" style={{ color: "var(--muted)" }}>{a.at ? new Date(a.at).toLocaleString() : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}

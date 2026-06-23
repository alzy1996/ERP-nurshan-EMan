import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import Shell from "../components/Shell";
import { Badge } from "../components/ui";
import { fetchScoped } from "../lib/data";

const daysLeft = (d) => (d ? Math.ceil((new Date(d) - new Date()) / 864e5) : 9999);

export default function Notifications() {
  const app = useApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    Promise.all(["offers", "contracts", "activity"].map((n) => fetchScoped(n, app.session)))
      .then(([offers, contracts, activity]) => {
        const out = [];
        offers.filter((o) => (o.status || "") === "New").forEach((o) =>
          out.push({ cat: "Offers", tone: "blue", at: o.createdAt || 0, title: `New offer from ${o.supplierName || o.supplier || "supplier"}`, sub: o.items || o.item || "" }));
        if (app.isAdmin) contracts.filter((c) => c.status !== "Signed" && daysLeft(c.endDate) >= 0 && daysLeft(c.endDate) <= 30).forEach((c) =>
          out.push({ cat: "Alerts", tone: daysLeft(c.endDate) <= 7 ? "red" : "amber", at: 0, title: `Contract "${c.title}" ends in ${daysLeft(c.endDate)}d`, sub: c.contractorName || "" }));
        activity.forEach((a) =>
          out.push({ cat: "System", tone: "grey", at: a.at || 0, title: `${a.ref || ""} ${a.action || ""}`.trim() || "Activity", sub: a.by || "" }));
        out.sort((x, y) => (y.at || 0) - (x.at || 0));
        setItems(out); setLoading(false);
      }).catch(() => setLoading(false));
  }, [app.activeSite]); // eslint-disable-line

  const cats = ["all", "Approvals", "Offers", "Alerts", "System"];
  const shown = filter === "all" ? items : items.filter((i) => i.cat === filter);

  return (
    <Shell title="Notifications">
      <div className="max-w-[860px] mx-auto">
        <div className="flex gap-1 mb-4 p-0.5 rounded-lg w-fit" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          {cats.map((c) => (
            <button key={c} onClick={() => setFilter(c)} className="px-3.5 py-1.5 rounded-md text-xs font-bold"
              style={filter === c ? { background: "var(--primary)", color: "#fff" } : { color: "var(--muted)" }}>{c === "all" ? "All" : c}</button>
          ))}
        </div>
        {loading ? <div style={{ color: "var(--muted)" }}>{app.t("Loading…")}</div> :
          shown.length === 0 ? <div className="card p-10 text-center text-sm" style={{ color: "var(--muted)" }}>Nothing here.</div> :
            <div className="card divide-y" style={{ borderColor: "var(--border)" }}>
              {shown.map((n, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5" style={{ borderColor: "var(--border)" }}>
                  <Badge tone={n.tone}>{n.cat}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold truncate">{n.title}</div>
                    {n.sub && <div className="text-xs truncate" style={{ color: "var(--muted)" }}>{n.sub}</div>}
                  </div>
                  <div className="text-[11px] shrink-0" style={{ color: "var(--muted)" }}>{n.at ? new Date(n.at).toLocaleDateString() : ""}</div>
                </div>
              ))}
            </div>}
      </div>
    </Shell>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import Shell from "../components/Shell";
import { Button, Badge, fmtOMR } from "../components/ui";
import { fetchScoped, addScoped, removeScoped } from "../lib/data";

const daysUntil = (d) => (d ? Math.ceil((new Date(d) - new Date()) / 864e5) : 9999);

function normOffer(o) {
  if (o.item) return o;
  return {
    id: o.id, supplier: o.supplierName || o.supplier || "Supplier", item: o.items || "",
    price: o.price || 0, valid: o.validity || o.valid || "", status: o.status || "New",
    source: o.source || "manual", note: o.note || "", siteId: o.siteId
  };
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "active", label: "Active" },
  { id: "expiring", label: "Expiring soon" },
  { id: "expired", label: "Expired" }
];

export default function Offers() {
  const app = useApp();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = () => {
    setLoading(true);
    fetchScoped("offers", app.session).then((r) => { setList(r.map(normOffer)); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [app.activeSite]); // eslint-disable-line

  const shown = useMemo(() => list.filter((o) => {
    const d = daysUntil(o.valid);
    if (filter === "new") return o.status === "New";
    if (filter === "active") return o.status === "Active" || o.status === "New";
    if (filter === "expiring") return d >= 0 && d <= 5 && o.status !== "Expired";
    if (filter === "expired") return o.status === "Expired" || d < 0;
    return true;
  }), [list, filter]);

  async function convert(o) {
    const site = o.siteId || app.resolveSite();
    if (!site) return alert("Pick a site first");
    await addScoped("prs", { desc: o.item, amount: o.price, supplier: o.supplier, requester: app.session.name, stage: "Submitted", offerId: o.id }, app.session, site);
    alert(`Converted to a Purchase Request (Submitted)`);
  }
  async function del(o) {
    if (!window.confirm("Delete this offer?")) return;
    await removeScoped("offers", o.id); load();
  }

  const kNew = list.filter((o) => o.status === "New").length;
  const kActive = list.filter((o) => o.status === "Active" || o.status === "New").length;
  const kExpiring = list.filter((o) => { const d = daysUntil(o.valid); return d >= 0 && d <= 5 && o.status !== "Expired"; }).length;

  return (
    <Shell title="Offers">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-3 gap-3 mb-3.5">
          <Kpi v={kActive} l="Active offers" />
          <Kpi v={kNew} l="New (from suppliers)" c="#2563EB" />
          <Kpi v={kExpiring} l="Expiring ≤5d" c="#E8930A" />
        </div>

        <div className="flex gap-1 mb-4 p-0.5 rounded-lg w-fit" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className="px-3.5 py-1.5 rounded-md text-xs font-bold"
              style={filter === f.id ? { background: "var(--primary)", color: "#fff" } : { color: "var(--muted)" }}>{f.label}</button>
          ))}
        </div>

        {loading ? <div style={{ color: "var(--muted)" }}>{app.t("Loading…")}</div> :
          shown.length === 0 ? <div className="card p-10 text-center text-sm" style={{ color: "var(--muted)" }}>No offers.</div> :
            <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
              {shown.map((o) => {
                const d = daysUntil(o.valid);
                const vTone = o.status === "Expired" || d < 0 ? "red" : d <= 2 ? "red" : d <= 5 ? "amber" : "green";
                return (
                  <div key={o.id} className="card p-4 rise">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-extrabold text-sm leading-tight">{o.item}</div>
                      <Badge tone={o.status === "New" ? "blue" : o.status === "Accepted" ? "green" : "grey"}>{o.status}</Badge>
                    </div>
                    <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>🏭 {o.supplier}</div>
                    <div className="text-base font-extrabold">{fmtOMR(o.price)} <span className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>OMR</span></div>
                    {o.valid && <div className="mt-1"><Badge tone={vTone}>{d < 0 ? "Expired" : `Expires in ${d}d`}</Badge></div>}
                    <div className="flex gap-1.5 flex-wrap mt-3">
                      {o.status !== "Expired" && d >= 0 && <Button variant="ok" onClick={() => convert(o)}>📋 Convert to PR</Button>}
                      {app.isAdmin && <Button variant="no" onClick={() => del(o)}>🗑️</Button>}
                    </div>
                  </div>
                );
              })}
            </div>}
      </div>
    </Shell>
  );
}

function Kpi({ v, l, c }) {
  return <div className="card p-3.5"><div className="text-2xl font-extrabold" style={{ color: c || "var(--primary)" }}>{v}</div><div className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>{l}</div></div>;
}

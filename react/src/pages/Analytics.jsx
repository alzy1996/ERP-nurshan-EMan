import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { useApp } from "../context/AppContext";
import Shell from "../components/Shell";
import { fetchScoped } from "../lib/data";

const COLORS = ["#2563EB", "#1DB06A", "#E8930A", "#7C3AED", "#E5484D", "#0EA5E9", "#F59E0B", "#10B981"];

export default function Analytics() {
  const app = useApp();
  const [d, setD] = useState({ materials: [], offers: [], prs: [], suppliers: [], contracts: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all(["materials", "offers", "prs", "suppliers", "contracts"].map((n) => fetchScoped(n, app.session)))
      .then(([materials, offers, prs, suppliers, contracts]) => { setD({ materials, offers, prs, suppliers, contracts }); setLoading(false); })
      .catch(() => setLoading(false));
  }, [app.activeSite]); // eslint-disable-line

  const byCat = useMemo(() => {
    const m = {};
    d.materials.forEach((x) => { m[x.cat || "Other"] = (m[x.cat || "Other"] || 0) + (x.price || 0) * (x.stock || 0); });
    return Object.entries(m).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [d.materials]);

  const byStage = useMemo(() => {
    const m = {};
    d.prs.forEach((p) => { const s = p.stage || "Submitted"; m[s] = (m[s] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [d.prs]);

  const trend = useMemo(() => {
    const m = {};
    d.prs.forEach((p) => { if (!p.createdAt) return; const k = new Date(p.createdAt).toLocaleDateString("en", { month: "short" }); m[k] = (m[k] || 0) + (p.amount || 0); });
    return Object.entries(m).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [d.prs]);

  if (loading) return <Shell title="Analytics"><div style={{ color: "var(--muted)" }}>{app.t("Loading…")}</div></Shell>;

  return (
    <Shell title="Analytics">
      <div className="max-w-[1280px] mx-auto grid lg:grid-cols-2 gap-3.5">
        <Card title="Spend by Category (OMR)">
          {byCat.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={byCat} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Purchase Requests by Stage">
          {byStage.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip /><Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="PR Spend Trend (OMR)">
          {trend.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} />
                <Tooltip /><Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Totals">
          <div className="grid grid-cols-2 gap-3 h-[250px] content-center">
            {[["Materials", d.materials.length], ["Suppliers", d.suppliers.length], ["Offers", d.offers.length], ["Contracts", d.contracts.length]].map(([l, v]) => (
              <div key={l} className="border rounded-xl p-4 text-center" style={{ borderColor: "var(--border)" }}>
                <div className="text-3xl font-extrabold" style={{ color: "var(--primary)" }}>{v}</div>
                <div className="text-xs font-semibold" style={{ color: "var(--muted)" }}>{l}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
}

function Card({ title, children }) {
  return <div className="card p-4 rise"><div className="font-extrabold mb-3 text-[13.5px]">{title}</div>{children}</div>;
}
function Empty() {
  return <div className="h-[250px] grid place-items-center text-sm" style={{ color: "var(--muted)" }}>No data yet.</div>;
}

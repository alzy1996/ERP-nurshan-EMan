import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import Shell from "../components/Shell";
import { Button, Badge, Field, Modal, fmtOMR } from "../components/ui";
import { fetchScoped, addScoped, removeScoped } from "../lib/data";

const CAT_ICON = { Bitumen: "🛢️", Fuel: "⛽", Stone: "🪨", Equipment: "🏗️", Steel: "🔩", Cement: "🧱" };
function stockLevel(m) {
  const r = m.reorder || 0;
  if (m.stock < r) return { tone: "red", label: "Critical", pct: r ? Math.min(100, (m.stock / r) * 100) : 0, color: "#E5484D" };
  if (m.stock < r * 1.4) return { tone: "amber", label: "Low", pct: 70, color: "#E8930A" };
  return { tone: "green", label: "OK", pct: 100, color: "#1DB06A" };
}
const EMPTY = { name: "", cat: "", unit: "", price: "", stock: "", reorder: "", supplier: "" };

export default function Materials() {
  const app = useApp();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [msg, setMsg] = useState("");

  const load = () => { setLoading(true); fetchScoped("materials", app.session).then((r) => { setList(r); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(load, [app.activeSite]); // eslint-disable-line

  async function create() {
    setMsg("");
    if (!f.name.trim()) return setMsg("Enter a material name");
    const site = app.resolveSite();
    if (!site) return setMsg("Pick a site in the top bar first");
    await addScoped("materials", { ...f, price: parseFloat(f.price) || 0, stock: parseFloat(f.stock) || 0, reorder: parseFloat(f.reorder) || 0 }, app.session, site);
    setOpen(false); setF(EMPTY); load();
  }
  async function del(m) { if (window.confirm(`Delete "${m.name}"?`)) { await removeScoped("materials", m.id); load(); } }

  return (
    <Shell title="Materials">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-extrabold text-[15px]">{app.t("Materials")}</h2>
          <Button className="ms-auto" onClick={() => { setF(EMPTY); setMsg(""); setOpen(true); }}>＋ New Material</Button>
        </div>
        {loading ? <div style={{ color: "var(--muted)" }}>{app.t("Loading…")}</div> :
          list.length === 0 ? <div className="card p-10 text-center text-sm" style={{ color: "var(--muted)" }}>No materials yet.</div> :
            <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
              {list.map((m) => {
                const lv = stockLevel(m);
                return (
                  <div key={m.id} className="card p-4 rise">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-extrabold text-sm leading-tight">{CAT_ICON[m.cat] || "📦"} {m.name}</div>
                      <Badge tone={lv.tone}>{lv.label}</Badge>
                    </div>
                    <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>{m.cat || "—"} · {m.unit || ""}</div>
                    <div className="text-base font-extrabold">{fmtOMR(m.price)} <span className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>OMR/{m.unit}</span></div>
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] mb-1" style={{ color: "var(--muted)" }}><span>Stock {Number(m.stock).toLocaleString()}</span><span>reorder {m.reorder}</span></div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}><div style={{ width: lv.pct + "%", height: "100%", background: lv.color }} /></div>
                    </div>
                    {app.isAdmin && <div className="mt-3"><Button variant="no" onClick={() => del(m)}>🗑️</Button></div>}
                  </div>
                );
              })}
            </div>}
      </div>
      <Modal open={open} title="New Material" onClose={() => setOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Add Material</Button></>}>
        <Field label="Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" value={f.cat} onChange={(v) => setF({ ...f, cat: v })} />
          <Field label="Unit" value={f.unit} onChange={(v) => setF({ ...f, unit: v })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Price" type="number" value={f.price} onChange={(v) => setF({ ...f, price: v })} />
          <Field label="Stock" type="number" value={f.stock} onChange={(v) => setF({ ...f, stock: v })} />
          <Field label="Reorder" type="number" value={f.reorder} onChange={(v) => setF({ ...f, reorder: v })} />
        </div>
        <Field label="Supplier (optional)" value={f.supplier} onChange={(v) => setF({ ...f, supplier: v })} />
        {msg && <div className="text-xs font-semibold" style={{ color: "#E5484D" }}>{msg}</div>}
      </Modal>
    </Shell>
  );
}

import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import Shell from "../components/Shell";
import { Button, Badge, Field, Modal } from "../components/ui";
import { fetchScoped, addScoped, removeScoped, sendWhatsApp } from "../lib/data";

const SCORE_TONE = { A: "green", B: "blue", C: "amber", D: "red" };

export default function Suppliers() {
  const app = useApp();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    fetchScoped("suppliers", app.session).then((r) => { setList(r); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [app.activeSite]); // eslint-disable-line

  async function create() {
    setMsg("");
    if (!form.name.trim()) return setMsg("Enter a supplier name");
    if (!form.phone.trim()) return setMsg("Enter a phone number");
    const site = app.resolveSite();
    if (!site) return setMsg("Pick a site in the top bar first (or create one in Settings)");
    setBusy(true);
    try {
      await addScoped("suppliers", { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), score: "B", orders: 0, onTime: 0 }, app.session, site);
      setOpen(false); setForm({ name: "", phone: "", email: "" }); load();
    } catch (e) { setMsg(e.message || "Could not save"); } finally { setBusy(false); }
  }

  async function del(s) {
    if (!window.confirm(`Delete supplier "${s.name}"?`)) return;
    await removeScoped("suppliers", s.id); load();
  }

  function requestOffer(s) {
    const site = s.siteId || app.resolveSite();
    if (!site) return alert("Pick a site first");
    const token = "req-" + Date.now().toString(36);
    const base = location.origin + "/";
    const link = `${base}offer-submit.html?supplier=${encodeURIComponent(s.id)}&site=${encodeURIComponent(site)}&name=${encodeURIComponent(s.name)}&token=${token}`;
    const text = `Hello ${s.name}, please submit your best offer using this secure link: ${link}`;
    sendWhatsApp(s.phone, text, { supplierId: s.id, supplierName: s.name, phone: s.phone, siteId: site, token, by: app.session.username, context: "Offer request" });
  }

  return (
    <Shell title="Suppliers">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-extrabold text-[15px]">{app.t("Suppliers")}</h2>
          <Button className="ms-auto" onClick={() => { setMsg(""); setOpen(true); }}>＋ New Supplier</Button>
        </div>

        {loading ? (
          <div style={{ color: "var(--muted)" }}>{app.t("Loading…")}</div>
        ) : list.length === 0 ? (
          <div className="card p-10 text-center text-sm" style={{ color: "var(--muted)" }}>No suppliers yet.</div>
        ) : (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
            {list.map((s) => (
              <div key={s.id} className="card p-4 rise">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="font-extrabold text-sm">{s.name}</div>
                  <Badge tone={SCORE_TONE[s.score] || "grey"}>{s.score || "—"}</Badge>
                </div>
                <div className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>📞 {s.phone || "—"}</div>
                <div className="text-xs mb-3" style={{ color: "var(--muted)" }}>✉️ {s.email || "—"}</div>
                <div className="flex gap-1.5 flex-wrap">
                  <Button variant="ok" onClick={() => requestOffer(s)}>📨 Request Offer</Button>
                  {app.isAdmin && <Button variant="no" onClick={() => del(s)}>🗑️</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={open} title="New Supplier" onClose={() => setOpen(false)}
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={busy} onClick={create}>Add Supplier</Button>
        </>}>
        <Field label="Company / Supplier name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Phone (with country code)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Email (optional)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        {msg && <div className="text-xs font-semibold" style={{ color: "#E5484D" }}>{msg}</div>}
      </Modal>
    </Shell>
  );
}

import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import Shell from "../components/Shell";
import { Button, Badge, Field, Modal, fmtOMR } from "../components/ui";
import { fetchScoped, addScoped, removeScoped, sendWhatsApp } from "../lib/data";
import { uploadFile } from "../lib/cloudinary";

const daysLeft = (d) => (d ? Math.ceil((new Date(d) - new Date()) / 864e5) : 9999);
const EMPTY = { title: "", contractorName: "", contractorPhone: "", value: "", startDate: "", endDate: "", scope: "", terms: "" };

export default function Contracts() {
  const app = useApp();
  const [list, setList] = useState([]);
  const [psi, setPsi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([fetchScoped("contracts", app.session), fetchScoped("psi", app.session)])
      .then(([c, p]) => { setList(c); setPsi(p); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [app.activeSite]); // eslint-disable-line

  async function create() {
    setMsg("");
    if (!form.title.trim()) return setMsg("Enter a contract title");
    if (!form.contractorName.trim()) return setMsg("Enter the contractor name");
    const site = app.resolveSite();
    if (!site) return setMsg("Pick a site in the top bar first");
    setBusy(true);
    try {
      await addScoped("contracts", { ...form, value: parseFloat(form.value) || 0, status: "Draft" }, app.session, site);
      setOpen(false); setForm(EMPTY); load();
    } catch (e) { setMsg(e.message || "Could not save"); } finally { setBusy(false); }
  }

  async function del(c) {
    if (!window.confirm(`Delete contract "${c.title}"?`)) return;
    await removeScoped("contracts", c.id); load();
  }

  function send(c) {
    const phone = (c.contractorPhone || "").replace(/\D/g, "");
    if (!phone) return alert("This contract has no contractor phone");
    const site = c.siteId || app.resolveSite() || "";
    const token = "sign-" + Date.now().toString(36);
    const link = `${location.origin}/contract-sign.html?contract=${encodeURIComponent(c.id)}&site=${encodeURIComponent(site)}&token=${token}`;
    sendWhatsApp(phone, `Hello ${c.contractorName}, please review and sign "${c.title}": ${link}`, { contractId: c.id, to: c.contractorPhone, siteId: site, token, by: app.session.username });
  }

  const expiring = app.isAdmin
    ? list.filter((c) => c.status !== "Signed" && daysLeft(c.endDate) >= 0 && daysLeft(c.endDate) <= 30).sort((a, b) => daysLeft(a.endDate) - daysLeft(b.endDate))
    : [];

  return (
    <Shell title="Contracts">
      <div className="max-w-[1280px] mx-auto">
        {expiring.length > 0 && (
          <div className="card p-4 mb-4" style={{ borderColor: "rgba(232,147,10,.35)" }}>
            <div className="font-extrabold text-[13px] mb-2.5">⏰ Expiry Alerts <span style={{ color: "var(--muted)" }}>— ending within 30 days</span></div>
            {expiring.map((c) => {
              const d = daysLeft(c.endDate);
              return (
                <div key={c.id} className="flex items-center gap-2 border rounded-lg px-3 py-2.5 mb-2" style={{ borderColor: "var(--border)", borderInlineStartWidth: 4, borderInlineStartColor: d <= 7 ? "#E5484D" : "#E8930A" }}>
                  <div><div className="text-[13px] font-bold">{c.title}</div><div className="text-[11px]" style={{ color: "var(--muted)" }}>{c.contractorName} · ends {c.endDate}</div></div>
                  <div className="ms-auto font-extrabold text-xs" style={{ color: d <= 7 ? "#E5484D" : "#E8930A" }}>{d} day{d === 1 ? "" : "s"}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-extrabold text-[15px]">{app.t("Contracts")}</h2>
          <Button className="ms-auto" onClick={() => { setMsg(""); setForm(EMPTY); setOpen(true); }}>＋ New Contract</Button>
        </div>

        {loading ? (
          <div style={{ color: "var(--muted)" }}>{app.t("Loading…")}</div>
        ) : list.length === 0 ? (
          <div className="card p-10 text-center text-sm" style={{ color: "var(--muted)" }}>No contracts yet.</div>
        ) : (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>
            {list.map((c) => (
              <div key={c.id} className="card p-4 rise">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="font-extrabold text-sm leading-tight">{c.title}</div>
                  <Badge tone={c.status === "Signed" ? "green" : "grey"}>{c.status || "Draft"}</Badge>
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>👷 {c.contractorName}</div>
                <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>📅 {c.startDate || "?"} → {c.endDate || "?"}</div>
                <div className="text-base font-extrabold my-2">{fmtOMR(c.value)} <span className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>OMR</span></div>
                <div className="flex gap-1.5 flex-wrap">
                  <Button variant="ghost" onClick={() => setDetail(c)}>View / PSI</Button>
                  {c.status !== "Signed" && <Button variant="ok" onClick={() => send(c)}>📲 Send</Button>}
                  {app.isAdmin && <Button variant="no" onClick={() => del(c)}>🗑️</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={open} title="New Contract" onClose={() => setOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy} onClick={create}>Create Contract</Button></>}>
        <Field label="Contract title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contractor name" value={form.contractorName} onChange={(v) => setForm({ ...form, contractorName: v })} />
          <Field label="Contractor phone" value={form.contractorPhone} onChange={(v) => setForm({ ...form, contractorPhone: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Value (OMR)" type="number" value={form.value} onChange={(v) => setForm({ ...form, value: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Start" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
            <Field label="End" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
          </div>
        </div>
        <Field label="Scope of work" as="textarea" value={form.scope} onChange={(v) => setForm({ ...form, scope: v })} />
        <Field label="Terms & conditions" as="textarea" value={form.terms} onChange={(v) => setForm({ ...form, terms: v })} />
        {msg && <div className="text-xs font-semibold" style={{ color: "#E5484D" }}>{msg}</div>}
      </Modal>

      {detail && <DetailModal contract={detail} psi={psi.filter((p) => p.contractId === detail.id)} onClose={() => setDetail(null)} onSaved={load} />}
    </Shell>
  );
}

function DetailModal({ contract, psi, onClose, onSaved }) {
  const app = useApp();
  const [tab, setTab] = useState("info");
  const [f, setF] = useState({ inspectionDate: new Date().toISOString().slice(0, 10), inspectorName: "", item: "", result: "Pass", notes: "" });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function addPsi() {
    setMsg("");
    if (!f.item.trim()) return setMsg("Enter the item inspected");
    setBusy(true);
    try {
      let photoUrl = null;
      if (file) photoUrl = (await uploadFile(file, "psi")).url;
      await addScoped("psi", { ...f, contractId: contract.id, photoUrl }, app.session, contract.siteId || app.resolveSite());
      onSaved(); onClose();
    } catch (e) { setMsg(e.message || "Could not save"); setBusy(false); }
  }

  return (
    <Modal open title={contract.title} onClose={onClose}>
      <div className="flex gap-1 mb-4 p-0.5 rounded-lg" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        {["info", "psi"].map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className="flex-1 py-1.5 rounded-md text-xs font-bold"
            style={tab === tb ? { background: "var(--primary)", color: "#fff" } : { color: "var(--muted)" }}>
            {tb === "info" ? "Details" : "PSI History"}
          </button>
        ))}
      </div>

      {tab === "info" ? (
        <div className="text-[13px] space-y-2">
          {[["Contractor", contract.contractorName], ["Value", fmtOMR(contract.value) + " OMR"], ["Period", `${contract.startDate || "?"} → ${contract.endDate || "?"}`], ["Status", contract.status || "Draft"], ["Scope", contract.scope], ["Terms", contract.terms]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b pb-1.5" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--muted)" }}>{k}</span><span className="font-semibold text-end">{v || "—"}</span>
            </div>
          ))}
          {contract.status === "Signed" && contract.signatureUrl && (
            <div><div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Signed by {contract.signerName}</div>
              <img src={contract.signatureUrl} alt="signature" className="max-w-[220px] rounded-lg border" style={{ borderColor: "var(--border)", background: "#fff" }} /></div>
          )}
        </div>
      ) : (
        <div>
          <div className="border rounded-lg p-3 mb-3" style={{ borderColor: "var(--border)" }}>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Inspection date" type="date" value={f.inspectionDate} onChange={(v) => setF({ ...f, inspectionDate: v })} />
              <Field label="Inspector" value={f.inspectorName} onChange={(v) => setF({ ...f, inspectorName: v })} />
            </div>
            <Field label="Item inspected" value={f.item} onChange={(v) => setF({ ...f, item: v })} />
            <label className="block mb-3.5">
              <span className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted)" }}>Result</span>
              <select value={f.result} onChange={(e) => setF({ ...f, result: e.target.value })} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)" }}>
                <option>Pass</option><option>Fail</option>
              </select>
            </label>
            <Field label="Notes" as="textarea" value={f.notes} onChange={(v) => setF({ ...f, notes: v })} />
            <label className="block mb-2">
              <span className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted)" }}>Photo (optional)</span>
              <input type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => setFile(e.target.files[0])} className="text-xs" />
            </label>
            {msg && <div className="text-xs font-semibold mb-2" style={{ color: "#E5484D" }}>{msg}</div>}
            <Button disabled={busy} onClick={addPsi}>{busy ? "Uploading…" : "Save PSI"}</Button>
          </div>
          {psi.length === 0 ? <div className="text-center text-sm py-3" style={{ color: "var(--muted)" }}>No PSI records yet.</div> :
            psi.map((p) => (
              <div key={p.id} className="border rounded-lg p-2.5 mb-2" style={{ borderColor: "var(--border)" }}>
                <div className="flex justify-between"><b className="text-[13px]">{p.item}</b><Badge tone={p.result === "Fail" ? "red" : "green"}>{p.result}</Badge></div>
                <div className="text-[11.5px]" style={{ color: "var(--muted)" }}>{p.inspectionDate} · {p.inspectorName}</div>
                {p.notes && <div className="text-xs mt-1">{p.notes}</div>}
                {p.photoUrl && <img src={p.photoUrl} alt="PSI" className="max-w-full rounded-lg mt-2" />}
              </div>
            ))}
        </div>
      )}
    </Modal>
  );
}

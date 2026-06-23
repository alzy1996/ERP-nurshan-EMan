import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useApp } from "../context/AppContext";
import Shell from "../components/Shell";
import { Button, Field, Modal, fmtOMR } from "../components/ui";
import { fetchScoped, addScoped, removeScoped } from "../lib/data";

const STAGES = ["Draft", "Submitted", "Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Approved", "Rejected"];
const DOT = { Draft: "#7B8299", Submitted: "#2563EB", "Level 1": "#2563EB", "Level 2": "#E8930A", "Level 3": "#E8930A", "Level 4": "#7C3AED", "Level 5": "#7C3AED", Approved: "#1DB06A", Rejected: "#E5484D" };

export default function PurchaseRequests() {
  const app = useApp();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ desc: "", amount: "", requester: "" });
  const [drag, setDrag] = useState(null);

  const load = () => { setLoading(true); fetchScoped("prs", app.session).then((r) => { setList(r); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(load, [app.activeSite]); // eslint-disable-line

  async function move(pr, stage) {
    if (pr.stage === stage) return;
    if (pr.stage === "Approved" || pr.stage === "Rejected") return alert(pr.id + " is finalised");
    setList((l) => l.map((x) => (x.id === pr.id ? { ...x, stage } : x))); // optimistic
    await updateDoc(doc(db, "nexus_prs", pr.id), { stage, updatedAt: Date.now() });
  }
  async function create() {
    if (!f.desc.trim()) return;
    const site = app.resolveSite();
    if (!site) return alert("Pick a site first");
    await addScoped("prs", { desc: f.desc.trim(), amount: parseFloat(f.amount) || 0, requester: f.requester || app.session.name, stage: "Submitted" }, app.session, site);
    setOpen(false); setF({ desc: "", amount: "", requester: "" }); load();
  }
  async function del(pr) { if (window.confirm("Delete " + (pr.id) + "?")) { await removeScoped("prs", pr.id); load(); } }

  return (
    <Shell title="Purchase Requests">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-extrabold text-[15px]">{app.t("Purchase Requests")}</h2>
        <Button className="ms-auto" onClick={() => setOpen(true)}>＋ New Request</Button>
      </div>
      {loading ? <div style={{ color: "var(--muted)" }}>{app.t("Loading…")}</div> : (
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ minHeight: "60vh" }}>
          {STAGES.map((st) => {
            const items = list.filter((p) => (p.stage || "Submitted") === st);
            return (
              <div key={st} onDragOver={(e) => e.preventDefault()} onDrop={() => drag && move(drag, st)}
                className="shrink-0 w-60 rounded-xl flex flex-col" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", maxHeight: "100%" }}>
                <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: DOT[st] }} />
                  <span className="text-xs font-extrabold">{st}</span>
                  <span className="ms-auto text-[10.5px] font-extrabold px-2 rounded-lg" style={{ color: "var(--muted)", background: "var(--surface)", border: "1px solid var(--border)" }}>{items.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5">
                  {items.map((p) => (
                    <div key={p.id} draggable onDragStart={() => setDrag(p)} onDragEnd={() => setDrag(null)}
                      className="card p-2.5 cursor-grab" style={{ borderInlineStartWidth: 3, borderInlineStartColor: DOT[st] }}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-extrabold" style={{ color: "var(--primary)" }}>{(p.id || "").slice(0, 6)}</span>
                        <span className="text-xs font-extrabold">{fmtOMR(p.amount)}</span>
                      </div>
                      <div className="text-xs leading-snug mb-1.5">{p.desc}</div>
                      <div className="text-[10.5px]" style={{ color: "var(--muted)" }}>👤 {p.requester || "—"}</div>
                      {/Level|Submitted/.test(st) && (
                        <div className="flex gap-1.5 mt-2">
                          <Button variant="ok" onClick={() => move(p, STAGES[Math.min(STAGES.indexOf(st) + 1, 7)] === "Approved" || STAGES.indexOf(st) >= 6 ? "Approved" : STAGES[STAGES.indexOf(st) + 1])}>✓</Button>
                          <Button variant="no" onClick={() => move(p, "Rejected")}>✕</Button>
                          {app.isAdmin && <Button variant="ghost" onClick={() => del(p)}>🗑️</Button>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal open={open} title="New Purchase Request" onClose={() => setOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Submit Request</Button></>}>
        <Field label="Description" value={f.desc} onChange={(v) => setF({ ...f, desc: v })} />
        <Field label="Amount (OMR)" type="number" value={f.amount} onChange={(v) => setF({ ...f, amount: v })} />
        <Field label="Requester" value={f.requester} onChange={(v) => setF({ ...f, requester: v })} />
      </Modal>
    </Shell>
  );
}

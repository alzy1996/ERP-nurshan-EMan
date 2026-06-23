import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db, sha256 } from "../lib/firebase";
import { useApp } from "../context/AppContext";
import Shell from "../components/Shell";
import { Button, Badge, Field, Modal } from "../components/ui";
import { wipeCollection } from "../lib/data";

const SECTIONS = [
  ["dashboard", "Dashboard"], ["analytics", "Analytics"], ["materials", "Materials"], ["suppliers", "Suppliers"],
  ["offers", "Offers"], ["purchaserequests", "Purchase Requests"], ["contracts", "Contracts"],
  ["attendance", "Attendance"], ["notifications", "Notifications"], ["settings", "Settings"]
];
const JOBS = [
  "Procurement Officer", "Procurement Manager", "Procurement Director",
  "Finance Officer", "Finance Manager", "Accountant",
  "Site Engineer", "Senior Engineer", "QA/QC Inspector",
  "Project Manager", "Project Director", "Operations Manager",
  "Warehouse Staff", "Store Keeper",
  "Contractor", "Consultant",
  "General Manager", "CEO", "Viewer"
];
const LEVELS = [0, 1, 2, 3, 4, 5];
const levelLabel = (n) => (n ? "Level " + n : "None (no approval)");
const TABS = [["sites", "Sites"], ["users", "Users"], ["danger", "Danger Zone"]];

export default function Settings() {
  const app = useApp();
  const [tab, setTab] = useState("sites");

  if (!app.isAdmin) {
    return <Shell title="Settings"><div className="card p-10 text-center" style={{ color: "var(--muted)" }}>🔒 Requires administrator access.</div></Shell>;
  }

  return (
    <Shell title="Settings">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex gap-1 mb-4 p-0.5 rounded-lg w-fit" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className="px-4 py-1.5 rounded-md text-xs font-bold"
              style={tab === id ? { background: "var(--primary)", color: "#fff" } : { color: "var(--muted)" }}>{label}</button>
          ))}
        </div>
        {tab === "sites" && <Sites />}
        {tab === "users" && <Users />}
        {tab === "danger" && <Danger />}
      </div>
    </Shell>
  );
}

/* ---------------- Sites ---------------- */
function Sites() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", location: "" });
  const [msg, setMsg] = useState("");
  const load = () => getDocs(collection(db, "nexus_sites")).then((s) => setList(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  useEffect(() => { load(); }, []);
  async function create() {
    if (!f.name.trim()) return setMsg("Enter a site name");
    await addDoc(collection(db, "nexus_sites"), { name: f.name.trim(), location: f.location.trim(), status: "Active", createdAt: Date.now() });
    setOpen(false); setF({ name: "", location: "" }); setMsg(""); load();
  }
  return (
    <div className="card p-4">
      <div className="flex items-center mb-3"><div className="font-extrabold">Sites</div><Button className="ms-auto" onClick={() => setOpen(true)}>＋ New Site</Button></div>
      {list.length === 0 ? <div className="text-sm" style={{ color: "var(--muted)" }}>No sites yet.</div> :
        <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
          {list.map((s) => (
            <div key={s.id} className="border rounded-xl p-3" style={{ borderColor: "var(--border)" }}>
              <div className="font-bold text-sm">{s.name}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>{s.location || "—"}</div>
              <div className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>{s.latitude != null ? `📍 geofence ${s.radius || 200}m` : "no geofence"}</div>
            </div>
          ))}
        </div>}
      <Modal open={open} title="New Site" onClose={() => setOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Create Site</Button></>}>
        <Field label="Site Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
        <Field label="Location (optional)" value={f.location} onChange={(v) => setF({ ...f, location: v })} />
        {msg && <div className="text-xs font-semibold" style={{ color: "#E5484D" }}>{msg}</div>}
      </Modal>
    </div>
  );
}

/* ---------------- Users ---------------- */
function Users() {
  const app = useApp();
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [open, setOpen] = useState(false);
  const blank = { name: "", username: "", password: "", jobType: JOBS[0], approvalLevel: 0, isAdmin: false, sites: [], sections: { dashboard: true } };
  const [f, setF] = useState(blank);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    getDocs(collection(db, "nexus_users")).then((s) => setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    getDocs(collection(db, "nexus_sites")).then((s) => setSites(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  };
  useEffect(() => { load(); }, []);

  async function create() {
    setMsg("");
    const u = f.username.trim().toLowerCase();
    if (!f.name.trim()) return setMsg("Enter a full name");
    if (!u) return setMsg("Enter a username");
    if (!f.password || f.password.length < 4) return setMsg("Password ≥ 4 chars");
    if (users.some((x) => (x.username || "").toLowerCase() === u)) return setMsg("Username already exists");
    let sections = { ...f.sections };
    if (f.isAdmin) SECTIONS.forEach(([id]) => (sections[id] = true));
    else if (!f.sites.length) return setMsg("Select at least one site");
    setBusy(true);
    try {
      const passwordHash = await sha256(f.password);
      await addDoc(collection(db, "nexus_users"), {
        username: u, passwordHash, name: f.name.trim(), jobType: f.isAdmin ? "Administrator" : f.jobType,
        approvalLevel: f.isAdmin ? 5 : Number(f.approvalLevel) || 0,
        isAdmin: f.isAdmin, sites: f.sites, sections, status: "Active", createdAt: Date.now()
      });
      setOpen(false); setF(blank); load();
    } catch (e) { setMsg(e.message || "Could not create"); } finally { setBusy(false); }
  }
  async function del(u) {
    if (u.id === app.session.uid) return alert("You cannot delete your own account");
    if (!window.confirm(`Delete user "${u.name || u.username}"?`)) return;
    await deleteDoc(doc(db, "nexus_users", u.id)); load();
  }
  const toggle = (key, id) => setF((p) => {
    if (key === "sites") { const has = p.sites.includes(id); return { ...p, sites: has ? p.sites.filter((x) => x !== id) : [...p.sites, id] }; }
    const s = { ...p.sections }; s[id] = !s[id]; return { ...p, sections: s };
  });

  return (
    <div className="card p-4">
      <div className="flex items-center mb-3"><div className="font-extrabold">User Management <span className="font-semibold" style={{ color: "var(--muted)" }}>· {users.length}</span></div>
        <Button className="ms-auto" onClick={() => { setF(blank); setMsg(""); setOpen(true); }}>＋ Create User</Button></div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead><tr>{["Name", "Username", "Job Type", "Level", "Sites", "Status", ""].map((h) => <th key={h} className="text-start font-bold text-[10.5px] uppercase tracking-wide py-2 border-b" style={{ borderColor: "var(--border)" }}>{h}</th>)}</tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-2.5 border-b font-semibold" style={{ borderColor: "var(--border)" }}>{u.name || u.username}</td>
                <td className="border-b" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>{u.username}</td>
                <td className="border-b" style={{ borderColor: "var(--border)" }}>{u.isAdmin ? "Administrator" : u.jobType || "—"}</td>
                <td className="border-b" style={{ borderColor: "var(--border)" }}>{u.isAdmin ? <Badge tone="blue">Admin</Badge> : u.approvalLevel ? <Badge tone="amber">L{u.approvalLevel}</Badge> : <span style={{ color: "var(--muted)" }}>—</span>}</td>
                <td className="border-b text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>{u.isAdmin ? "All sites" : (u.sites || []).map((id) => (sites.find((s) => s.id === id) || {}).name || id).join(", ") || "—"}</td>
                <td className="border-b" style={{ borderColor: "var(--border)" }}><Badge tone="green">{u.status || "Active"}</Badge></td>
                <td className="border-b" style={{ borderColor: "var(--border)" }}>{u.id !== app.session.uid && <Button variant="no" onClick={() => del(u)}>🗑️</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} title="Create User" onClose={() => setOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy} onClick={create}>Create User</Button></>}>
        <Field label="Full Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Username" value={f.username} onChange={(v) => setF({ ...f, username: v })} />
          <Field label="Password" value={f.password} onChange={(v) => setF({ ...f, password: v })} />
        </div>
        <label className="block mb-3.5">
          <span className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted)" }}>Job Type</span>
          <select value={f.jobType} onChange={(e) => setF({ ...f, jobType: e.target.value })} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)" }}>
            {JOBS.map((j) => <option key={j}>{j}</option>)}
          </select>
        </label>
        {!f.isAdmin && (
          <label className="block mb-3.5">
            <span className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted)" }}>Approval Level</span>
            <select value={f.approvalLevel} onChange={(e) => setF({ ...f, approvalLevel: Number(e.target.value) })} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)" }}>
              {LEVELS.map((n) => <option key={n} value={n}>{levelLabel(n)}</option>)}
            </select>
            <span className="block text-[11px] mt-1" style={{ color: "var(--muted)" }}>Can approve a Purchase Request only when it reaches this level.</span>
          </label>
        )}
        <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
          <input type="checkbox" checked={f.isAdmin} onChange={(e) => setF({ ...f, isAdmin: e.target.checked })} /> Administrator (all sites &amp; sections)
        </label>
        {!f.isAdmin && (
          <>
            <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted)" }}>Sites</div>
            <div className="border rounded-lg p-2.5 mb-3 flex flex-col gap-1.5" style={{ borderColor: "var(--border)" }}>
              {sites.length === 0 ? <span className="text-xs" style={{ color: "var(--muted)" }}>No sites yet.</span> :
                sites.map((s) => <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={f.sites.includes(s.id)} onChange={() => toggle("sites", s.id)} /> {s.name}</label>)}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted)" }}>Sections</div>
            <div className="border rounded-lg p-2.5 mb-3 grid grid-cols-2 gap-1.5" style={{ borderColor: "var(--border)" }}>
              {SECTIONS.map(([id, label]) => <label key={id} className="flex items-center gap-1.5 text-[12.5px] cursor-pointer"><input type="checkbox" checked={!!f.sections[id]} onChange={() => toggle("sections", id)} /> {label}</label>)}
            </div>
          </>
        )}
        {msg && <div className="text-xs font-semibold" style={{ color: "#E5484D" }}>{msg}</div>}
      </Modal>
    </div>
  );
}

/* ---------------- Danger Zone ---------------- */
function Danger() {
  const app = useApp();
  const targets = [["suppliers", "Suppliers"], ["offers", "Offers"], ["contracts", "Contracts"], ["psi", "PSI records"], ["prs", "Purchase Requests"], ["attendance", "Attendance"], ["activity", "Activity"]];
  async function wipe(name, label) {
    const where = app.activeSite === app.ALL ? "ALL sites" : "this site";
    if (prompt(`Permanently delete all ${label} for ${where}. Type DELETE to confirm:`) !== "DELETE") return;
    const n = await wipeCollection(name, app.session);
    alert(`Deleted ${n} ${label} record${n === 1 ? "" : "s"}`);
  }
  return (
    <div className="card p-4" style={{ borderColor: "rgba(229,72,77,.4)" }}>
      <div className="font-extrabold mb-1" style={{ color: "#E5484D" }}>⚠️ Danger Zone</div>
      <div className="text-sm mb-3" style={{ color: "var(--muted)" }}>Permanently delete records for {app.activeSite === app.ALL ? "ALL sites" : "the active site"}. Cannot be undone.</div>
      <div className="flex flex-wrap gap-2">
        {targets.map(([n, l]) => <Button key={n} variant="no" onClick={() => wipe(n, l)}>🗑️ Delete all {l}</Button>)}
      </div>
    </div>
  );
}

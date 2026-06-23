import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, limit, query, addDoc } from "firebase/firestore";
import { db, sha256 } from "../lib/firebase";
import { useApp } from "../context/AppContext";

export default function Login() {
  const app = useApp();
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (app.session) { nav("/dashboard"); return; }
    getDocs(query(collection(db, "nexus_users"), limit(1)))
      .then((s) => { if (s.empty) setMode("bootstrap"); })
      .catch(() => {});
  }, []); // eslint-disable-line

  async function submit(e) {
    e.preventDefault();
    setMsg(""); setBusy(true);
    try {
      if (mode === "bootstrap") {
        const sections = {};
        ["dashboard", "analytics", "materials", "suppliers", "offers", "purchaserequests", "contracts", "attendance", "notifications", "settings"].forEach((k) => (sections[k] = true));
        const ph = await sha256(pass);
        const uname = user.trim().toLowerCase();
        await addDoc(collection(db, "nexus_users"), { username: uname, passwordHash: ph, name, jobType: "Administrator", isAdmin: true, sites: [], sections, status: "Active", createdAt: Date.now() });
        await app.login(uname, pass);
      } else {
        await app.login(user, pass);
      }
      nav("/dashboard");
    } catch (err) {
      setMsg(err.message || "Sign in failed");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6" style={{ background: "var(--bg)" }}>
      <form onSubmit={submit} className="card w-full max-w-sm p-7 rise">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl grid place-items-center text-white font-black" style={{ background: "linear-gradient(135deg,var(--primary),#60A5FA)" }}>NX</div>
          <div><div className="text-lg font-extrabold">ERP Nexus</div><div className="text-xs" style={{ color: "var(--muted)" }}>Procurement & Construction</div></div>
        </div>
        <h1 className="text-xl font-extrabold mb-1">{mode === "bootstrap" ? "Create administrator" : "Welcome back"}</h1>
        <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>{mode === "bootstrap" ? "First account — full god-mode access." : "Sign in to your workspace."}</p>

        {mode === "bootstrap" && (
          <Field label="Full name" value={name} onChange={setName} />
        )}
        <Field label="Username" value={user} onChange={setUser} autoComplete="username" />
        <Field label="Password" type="password" value={pass} onChange={setPass} autoComplete="current-password" />

        <button disabled={busy} className="w-full h-11 rounded-xl text-white font-bold mt-2 disabled:opacity-60" style={{ background: "var(--primary)" }}>
          {busy ? "…" : mode === "bootstrap" ? "Create admin & sign in" : "Sign in"}
        </button>
        {msg && <div className="text-center text-sm font-semibold mt-3" style={{ color: "#E5484D" }}>{msg}</div>}
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", autoComplete }) {
  return (
    <label className="block mb-4">
      <span className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted)" }}>{label}</span>
      <input type={type} value={value} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-3.5 rounded-xl border outline-none" style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)" }} />
    </label>
  );
}

import { useEffect, useRef, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc, setDoc } from "firebase/firestore";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { db } from "../lib/firebase";
import { useApp } from "../context/AppContext";
import Shell from "../components/Shell";
import { Button, Badge } from "../components/ui";
import { haversine, getPosition, hhmm, today } from "../lib/geo";

export default function Attendance() {
  const app = useApp();
  return <Shell title="Attendance">{app.isAdmin ? <AdminView /> : <ContractorView />}</Shell>;
}

/* ---------------- contractor ---------------- */
function ContractorView() {
  const app = useApp();
  const site = app.sites.find((s) => s.id === app.activeSite) || app.sites[0];
  const [rec, setRec] = useState(null);
  const [geo, setGeo] = useState(null);

  const id = (app.session.uid + "_" + today());
  const load = () => getDoc(doc(db, "nexus_attendance", id)).then((d) => setRec(d.exists() ? d.data() : null)).catch(() => {});
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function punch(kind) {
    if (!site) return setGeo({ k: "err", t: "No site assigned to your account." });
    if (site.latitude == null) return setGeo({ k: "info", t: "Your site has no GPS boundary yet. Ask the administrator to set it." });
    setGeo({ k: "info", t: "📡 Getting your location…" });
    try {
      const co = await getPosition();
      const dist = haversine(co.latitude, co.longitude, site.latitude, site.longitude);
      const radius = site.radius || 200;
      if (dist > radius) return setGeo({ k: "err", t: `⛔ You are ${Math.round(dist)} m away — ${Math.round(dist - radius)} m outside the ${radius} m boundary. ${kind === "in" ? "Sign-in" : "Sign-out"} blocked.` });
      const data = { contractorUid: app.session.uid, contractorName: app.session.name, siteId: site.id, date: today() };
      if (kind === "in") {
        if (rec && rec.timeIn) return setGeo({ k: "err", t: "Already signed in at " + hhmm(rec.timeIn) });
        Object.assign(data, { timeIn: Date.now(), inLat: co.latitude, inLng: co.longitude });
      } else {
        if (!rec || !rec.timeIn) return setGeo({ k: "err", t: "Please sign in first." });
        if (rec.timeOut) return setGeo({ k: "err", t: "Already signed out at " + hhmm(rec.timeOut) });
        Object.assign(data, { timeOut: Date.now(), outLat: co.latitude, outLng: co.longitude });
      }
      await setDoc(doc(db, "nexus_attendance", id), data, { merge: true });
      setGeo({ k: "ok", t: `✅ ${kind === "in" ? "Signed in" : "Signed out"} at ${hhmm(Date.now())} (${Math.round(dist)} m from centre)` });
      load();
    } catch (e) { setGeo({ k: "err", t: "Location error: " + e.message }); }
  }

  const state = rec && rec.timeIn && rec.timeOut ? "Completed" : rec && rec.timeIn ? "Signed in" : "Not signed in";
  const tone = { err: "#c0292e", ok: "#0e7a4a", info: "var(--primary)" };

  return (
    <div className="max-w-[460px] mx-auto">
      <div className="card p-4">
        <div className="font-extrabold mb-3">📍 {site ? site.name : "Your site"}</div>
        <div className="text-center border rounded-2xl p-5 mb-4" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
          <div className="text-xs" style={{ color: "var(--muted)" }}>Today</div>
          <div className="text-2xl font-extrabold my-1.5">{state}</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {rec && rec.timeIn ? "In: " + hhmm(rec.timeIn) : ""} {rec && rec.timeOut ? " · Out: " + hhmm(rec.timeOut) : ""}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="ok" className="!py-4 !text-[15px]" disabled={!!(rec && rec.timeIn)} onClick={() => punch("in")}>🟢 Sign In</Button>
          <Button variant="no" className="!py-4 !text-[15px]" disabled={!(rec && rec.timeIn) || !!(rec && rec.timeOut)} onClick={() => punch("out")}>🔴 Sign Out</Button>
        </div>
        {geo && <div className="mt-3 text-[12.5px] font-semibold rounded-lg p-3" style={{ color: tone[geo.k], background: "var(--surface-2)" }}>{geo.t}</div>}
      </div>
    </div>
  );
}

/* ---------------- admin ---------------- */
function AdminView() {
  const [sites, setSites] = useState([]);
  const [date, setDate] = useState(today());
  const [siteFilter, setSiteFilter] = useState("__ALL__");
  const [rows, setRows] = useState([]);
  const [recs, setRecs] = useState([]);
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => { getDocs(collection(db, "nexus_sites")).then((s) => setSites(s.docs.map((d) => ({ id: d.id, ...d.data() })))); }, []);

  useEffect(() => { loadDay(); }, [date, siteFilter]); // eslint-disable-line

  async function loadDay() {
    const usersSnap = await getDocs(collection(db, "nexus_users"));
    let roster = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((u) => (u.jobType || "") === "Contractor");
    const attSnap = await getDocs(query(collection(db, "nexus_attendance"), where("date", "==", date)));
    let r = attSnap.docs.map((d) => d.data());
    if (siteFilter !== "__ALL__") { roster = roster.filter((u) => (u.sites || []).includes(siteFilter)); r = r.filter((x) => x.siteId === siteFilter); }
    const byUid = {}; r.forEach((x) => (byUid[x.contractorUid] = x));
    const out = roster.map((u) => statusRow(u.name || u.username, byUid[u.id], sites)) ;
    Object.keys(byUid).forEach((uid) => { if (!roster.find((u) => u.id === uid)) out.push(statusRow(byUid[uid].contractorName, byUid[uid], sites)); });
    setRows(out); setRecs(r);
  }

  // Leaflet
  useEffect(() => {
    if (!mapEl.current) return;
    if (!mapRef.current) {
      mapRef.current = L.map(mapEl.current).setView([23.588, 58.3829], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(mapRef.current);
      layerRef.current = L.layerGroup().addTo(mapRef.current);
    }
    layerRef.current.clearLayers();
    const pts = recs.filter((x) => x.inLat != null);
    pts.forEach((x) => L.circleMarker([x.inLat, x.inLng], { radius: 8, color: "#2563EB", fillColor: "#2563EB", fillOpacity: 0.7 })
      .bindPopup(`<b>${x.contractorName || ""}</b><br>In: ${hhmm(x.timeIn)}`).addTo(layerRef.current));
    if (pts.length) mapRef.current.setView([pts[0].inLat, pts[0].inLng], 13);
    setTimeout(() => mapRef.current.invalidateSize(), 150);
  }, [recs]); // eslint-disable-line

  const present = rows.filter((r) => r.status === "Present").length;
  const incomplete = rows.filter((r) => r.status === "Incomplete").length;
  const absent = rows.filter((r) => r.status === "Absent").length;

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="flex gap-2.5 flex-wrap items-end mb-3.5">
        <Ctrl label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ctrl-in" /></Ctrl>
        <Ctrl label="Site">
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="ctrl-in">
            <option value="__ALL__">All sites</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Ctrl>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3.5">
        <Kpi v={rows.length} l="Contractors" /><Kpi v={present} l="Present" c="#1DB06A" /><Kpi v={incomplete} l="Incomplete" c="#E8930A" /><Kpi v={absent} l="Absent" c="#E5484D" />
      </div>

      <div className="card p-4 mb-3.5">
        <div className="font-extrabold mb-3">Daily attendance — {date}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="text-start" style={{ color: "var(--muted)" }}>
              {["Contractor", "Site", "Time In", "Time Out", "Hours", "Status"].map((h) => <th key={h} className="text-start font-bold text-[10.5px] uppercase tracking-wide py-2 border-b" style={{ borderColor: "var(--border)" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={6} className="text-center py-6" style={{ color: "var(--muted)" }}>No contractors for this site/date.</td></tr> :
                rows.map((r, i) => (
                  <tr key={i}><td className="py-2.5 border-b" style={{ borderColor: "var(--border)" }}>{r.name}</td>
                    <td className="border-b" style={{ borderColor: "var(--border)" }}>{r.site}</td>
                    <td className="border-b" style={{ borderColor: "var(--border)" }}>{r.in}</td>
                    <td className="border-b" style={{ borderColor: "var(--border)" }}>{r.out}</td>
                    <td className="border-b" style={{ borderColor: "var(--border)" }}>{r.hours}</td>
                    <td className="border-b" style={{ borderColor: "var(--border)" }}><Badge tone={r.tone}>{r.status}</Badge></td></tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4 mb-3.5">
        <div className="font-extrabold mb-3">🗺️ Live sign-in map</div>
        <div ref={mapEl} style={{ height: 360, borderRadius: 12, border: "1px solid var(--border)" }} />
      </div>

      <GeofenceSetup sites={sites} onSaved={(s) => setSites(s)} />
      <style>{`.ctrl-in{height:38px;padding:0 11px;border:1.5px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);font-size:13px;outline:none;}`}</style>
    </div>
  );
}

function statusRow(name, rec, sites) {
  let status = "Absent", tone = "red";
  if (rec && rec.timeIn && rec.timeOut) { status = "Present"; tone = "green"; }
  else if (rec && (rec.timeIn || rec.timeOut)) { status = "Incomplete"; tone = "amber"; }
  const site = sites.find((s) => s.id === (rec ? rec.siteId : null));
  const hours = rec && rec.timeIn && rec.timeOut ? ((rec.timeOut - rec.timeIn) / 3.6e6).toFixed(1) : "—";
  return { name, site: site ? site.name : "—", in: hhmm(rec && rec.timeIn), out: hhmm(rec && rec.timeOut), hours, status, tone };
}

function Ctrl({ label, children }) {
  return <div className="flex flex-col gap-1"><label className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</label>{children}</div>;
}
function Kpi({ v, l, c }) {
  return <div className="card p-3.5"><div className="text-2xl font-extrabold" style={{ color: c || "var(--primary)" }}>{v}</div><div className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>{l}</div></div>;
}

function GeofenceSetup({ sites, onSaved }) {
  const [local, setLocal] = useState(sites);
  useEffect(() => setLocal(sites), [sites]);

  async function capture(i) {
    try { const co = await getPosition(); upd(i, { latitude: +co.latitude.toFixed(6), longitude: +co.longitude.toFixed(6) }); }
    catch (e) { alert("Location error: " + e.message); }
  }
  const upd = (i, patch) => setLocal((l) => l.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  async function save(s) {
    if (s.latitude == null || s.longitude == null) return alert("Enter latitude and longitude");
    await setDoc(doc(db, "nexus_sites", s.id), { latitude: +s.latitude, longitude: +s.longitude, radius: +(s.radius || 200) }, { merge: true });
    onSaved(local);
    alert("Geofence saved");
  }

  return (
    <div className="card p-4">
      <div className="font-extrabold mb-3">📐 Site geofence setup</div>
      {local.length === 0 ? <div className="text-sm" style={{ color: "var(--muted)" }}>No sites yet — create sites in Settings first.</div> :
        local.map((s, i) => (
          <div key={s.id} className="flex gap-2 items-center flex-wrap border rounded-lg p-2.5 mb-2" style={{ borderColor: "var(--border)" }}>
            <div className="font-bold text-[13px] min-w-[120px]">{s.name}</div>
            <input className="geo-in" placeholder="Latitude" value={s.latitude ?? ""} onChange={(e) => upd(i, { latitude: e.target.value })} />
            <input className="geo-in" placeholder="Longitude" value={s.longitude ?? ""} onChange={(e) => upd(i, { longitude: e.target.value })} />
            <input className="geo-in" placeholder="Radius m" value={s.radius ?? 200} onChange={(e) => upd(i, { radius: e.target.value })} />
            <Button variant="ghost" onClick={() => capture(i)}>📍 Current location</Button>
            <Button onClick={() => save(s)}>Save</Button>
          </div>
        ))}
      <style>{`.geo-in{width:120px;height:34px;padding:0 9px;border:1.5px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);font-size:12px;}`}</style>
    </div>
  );
}

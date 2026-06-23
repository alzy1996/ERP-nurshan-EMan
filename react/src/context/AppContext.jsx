import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db, sha256 } from "../lib/firebase";
import { t as translate } from "../lib/i18n";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const ALL = "__ALL__";
const SESSION_KEY = "nexus_session";

function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const [lang, setLangState] = useState(() => localStorage.getItem("nexus-lang") || "en");
  const [theme, setThemeState] = useState(() => localStorage.getItem("nexus-theme") || "light");
  const [sites, setSites] = useState([]);

  // apply theme + dir
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("nexus-theme", theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", lang);
    localStorage.setItem("nexus-lang", lang);
  }, [lang]);

  // load sites visible to the user
  useEffect(() => {
    if (!session) return;
    getDocs(collection(db, "nexus_sites")).then((snap) => {
      let all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (!session.isAdmin) all = all.filter((s) => (session.sites || []).includes(s.id));
      setSites(all);
    }).catch(() => {});
  }, [session]);

  const setSessionPersist = useCallback((s) => {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
    setSession(s);
  }, []);

  const login = useCallback(async (username, password) => {
    username = String(username || "").trim().toLowerCase();
    if (!username || !password) throw new Error("Enter username and password");
    const ph = await sha256(password);
    const snap = await getDocs(query(collection(db, "nexus_users"), where("username", "==", username), limit(1)));
    if (snap.empty) throw new Error("Unknown username or password");
    const u = snap.docs[0].data();
    if (u.passwordHash !== ph) throw new Error("Unknown username or password");
    if (u.status && u.status !== "Active") throw new Error("Account is " + u.status);
    const s = {
      uid: snap.docs[0].id, username: u.username, name: u.name || u.username,
      jobType: u.jobType || "User", isAdmin: !!u.isAdmin, sites: u.sites || [],
      sections: u.sections || {}, approvalLevel: u.approvalLevel || 0,
      activeSite: u.isAdmin ? ALL : (u.sites || [])[0] || null
    };
    setSessionPersist(s);
    return s;
  }, [setSessionPersist]);

  const logout = useCallback(() => setSessionPersist(null), [setSessionPersist]);

  const switchSite = useCallback((id) => {
    if (!session) return;
    setSessionPersist({ ...session, activeSite: id });
  }, [session, setSessionPersist]);

  const activeSite = session ? (session.activeSite || ALL) : null;

  /** Concrete site id to write under (auto-resolves single-site; null if ambiguous). */
  const resolveSite = useCallback(() => {
    if (activeSite && activeSite !== ALL) return activeSite;
    if (sites.length === 1) return sites[0].id;
    if (session && (session.sites || []).length === 1) return session.sites[0];
    return null;
  }, [activeSite, sites, session]);

  const canSee = useCallback((navId) => {
    if (!session) return false;
    if (session.isAdmin) return true;
    return !!(session.sections && session.sections[navId] === true);
  }, [session]);

  const t = useCallback((k) => translate(k, lang), [lang]);

  const value = useMemo(() => ({
    ALL, session, sites, lang, theme, activeSite,
    setLang: setLangState, toggleLang: () => setLangState((l) => (l === "ar" ? "en" : "ar")),
    setTheme: setThemeState, toggleTheme: () => setThemeState((x) => (x === "dark" ? "light" : "dark")),
    login, logout, switchSite, resolveSite, canSee, t, isAdmin: !!(session && session.isAdmin)
  }), [session, sites, lang, theme, activeSite, login, logout, switchSite, resolveSite, canSee, t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

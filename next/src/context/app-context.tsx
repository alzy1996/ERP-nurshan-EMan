"use client";

import * as React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

import { db, sha256 } from "@/lib/firebase";
import type { Session } from "@/lib/data";
import { t as translate, dirFor, type Lang } from "@/lib/i18n";

const ALL = "__ALL__";
const SESSION_KEY = "nexus_session";

export type Site = { id: string; name?: string } & Record<string, unknown>;

export type AuthSession = {
  uid: string;
  username: string;
  name: string;
  jobType: string;
  isAdmin: boolean;
  sites: string[];
  sections: Record<string, boolean>;
  approvalLevel: number;
  activeSite: string;
};

type AppCtxValue = {
  ALL: string;
  ready: boolean;
  session: AuthSession | null;
  sites: Site[];
  activeSite: string | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<AuthSession>;
  logout: () => void;
  switchSite: (id: string) => void;
  resolveSite: () => string | null;
  canSee: (navId: string) => boolean;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  /** Loose session shape consumed by the data layer (fetchScoped/addScoped). */
  asSession: () => Session;
};

const AppCtx = createContext<AppCtxValue | null>(null);

export function useApp(): AppCtxValue {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}

function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate session from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    setSession(readSession());
    try {
      const l = localStorage.getItem("nexus-lang") as Lang | null;
      if (l) setLangState(l);
    } catch {}
    setReady(true);
  }, []);

  // Apply text direction (RTL for Arabic/Persian) + lang attribute.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = dirFor(lang);
      document.documentElement.lang = lang;
    }
  }, [lang]);

  // Load the sites this user can see.
  useEffect(() => {
    if (!session) {
      setSites([]);
      return;
    }
    getDocs(collection(db, "nexus_sites"))
      .then((snap) => {
        let all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Site[];
        if (!session.isAdmin) all = all.filter((s) => (session.sites || []).includes(s.id));
        setSites(all);
      })
      .catch(() => {});
  }, [session]);

  const persist = useCallback((s: AuthSession | null) => {
    if (typeof window !== "undefined") {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    }
    setSession(s);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const uname = String(username || "").trim().toLowerCase();
      if (!uname || !password) throw new Error("Enter username and password");
      const ph = await sha256(password);
      const snap = await getDocs(
        query(collection(db, "nexus_users"), where("username", "==", uname), limit(1))
      );
      if (snap.empty) throw new Error("Unknown username or password");
      const u = snap.docs[0].data();
      if (u.passwordHash !== ph) throw new Error("Unknown username or password");
      if (u.status && u.status !== "Active") throw new Error("Account is " + u.status);
      const s: AuthSession = {
        uid: snap.docs[0].id,
        username: u.username,
        name: u.name || u.username,
        jobType: u.jobType || "User",
        isAdmin: !!u.isAdmin,
        sites: u.sites || [],
        sections: u.sections || {},
        approvalLevel: u.approvalLevel || 0,
        activeSite: u.isAdmin ? ALL : (u.sites || [])[0] || ALL,
      };
      persist(s);
      return s;
    },
    [persist]
  );

  const logout = useCallback(() => persist(null), [persist]);

  const switchSite = useCallback((id: string) => {
    setSession((cur) => {
      if (!cur) return cur;
      const next = { ...cur, activeSite: id };
      if (typeof window !== "undefined") localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const activeSite = session ? session.activeSite || ALL : null;

  const resolveSite = useCallback(() => {
    if (activeSite && activeSite !== ALL) return activeSite;
    if (sites.length === 1) return sites[0].id;
    if (session && (session.sites || []).length === 1) return session.sites[0];
    return null;
  }, [activeSite, sites, session]);

  const canSee = useCallback(
    (navId: string) => {
      if (!session) return false;
      if (session.isAdmin) return true;
      return !!(session.sections && session.sections[navId] === true);
    },
    [session]
  );

  const setLang = useCallback((l: Lang) => {
    if (typeof window !== "undefined") localStorage.setItem("nexus-lang", l);
    setLangState(l);
  }, []);

  const t = useCallback((key: string) => translate(key, lang), [lang]);

  const asSession = useCallback(
    (): Session =>
      session
        ? { username: session.username, activeSite: session.activeSite, isAdmin: session.isAdmin }
        : null,
    [session]
  );

  const value = useMemo<AppCtxValue>(
    () => ({
      ALL,
      ready,
      session,
      sites,
      activeSite,
      isAdmin: !!session?.isAdmin,
      login,
      logout,
      switchSite,
      resolveSite,
      canSee,
      lang,
      setLang,
      t,
      asSession,
    }),
    [ready, session, sites, activeSite, login, logout, switchSite, resolveSite, canSee, lang, setLang, t, asSession]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

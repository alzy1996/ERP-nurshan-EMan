"use client";

import * as React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { db, auth, firebaseConfig, userEmail, sha256 } from "@/lib/firebase";
import { t as translate, dirFor, type Lang } from "@/lib/i18n";
import { ALL_SECTION_IDS } from "@/lib/roles";
import type { Session } from "@/lib/data";

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

export type UserDraft = {
  username?: string;
  name?: string;
  password?: string;
  jobType?: string;
  isAdmin?: boolean;
  sites?: string[];
  sections?: Record<string, boolean>;
  approvalLevel?: number | string;
  status?: string;
};

type Profile = Record<string, unknown> & {
  username?: string;
  name?: string;
  jobType?: string;
  isAdmin?: boolean;
  sites?: string[];
  sections?: Record<string, boolean>;
  approvalLevel?: number;
  status?: string;
};

type AppCtxValue = {
  ALL: string;
  ready: boolean;
  session: AuthSession | null;
  sites: Site[];
  activeSite: string | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<AuthSession>;
  bootstrapAdmin: (name: string, username: string, password: string) => Promise<AuthSession>;
  hasAnyUser: () => Promise<boolean>;
  createUser: (data: UserDraft) => Promise<string>;
  updateUser: (uid: string, data: UserDraft) => Promise<void>;
  logout: () => void;
  switchSite: (id: string) => void;
  resolveSite: () => string | null;
  canSee: (navId: string) => boolean;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  asSession: () => Session;
};

const AppCtx = createContext<AppCtxValue | null>(null);

export function useApp(): AppCtxValue {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}

function readStored(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [lang, setLangState] = useState<Lang>("en");

  const persist = useCallback((s: AuthSession | null) => {
    if (typeof window !== "undefined") {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    }
    setSessionState(s);
  }, []);

  const buildSession = useCallback(
    (uid: string, u: Profile, preferredActive?: string): AuthSession => {
      if (u.status && u.status !== "Active") {
        signOut(auth).catch(() => {});
        throw new Error("Account is " + u.status + " — contact your administrator");
      }
      const sitesArr: string[] = u.sites || [];
      const def = u.isAdmin ? ALL : sitesArr[0] || ALL;
      const active =
        preferredActive && (preferredActive === ALL || u.isAdmin || sitesArr.includes(preferredActive))
          ? preferredActive
          : def;
      return {
        uid,
        username: u.username || "",
        name: u.name || u.username || "",
        jobType: u.jobType || "User",
        isAdmin: !!u.isAdmin,
        sites: sitesArr,
        sections: u.sections || {},
        approvalLevel: u.approvalLevel || 0,
        activeSite: active,
      };
    },
    []
  );

  // Firebase Auth is the source of truth for the session.
  useEffect(() => {
    const stored = readStored();
    if (stored) setSessionState(stored); // instant hydrate; reconciled below
    try {
      const l = localStorage.getItem("nexus-lang") as Lang | null;
      if (l) setLangState(l);
    } catch {}

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        try {
          const snap = await getDoc(doc(db, "nexus_users", user.uid));
          if (!snap.exists()) {
            persist(null);
          } else {
            try {
              const s = buildSession(
                user.uid,
                snap.data() as Profile,
                stored?.uid === user.uid ? stored?.activeSite : undefined
              );
              persist(s);
            } catch {
              persist(null); // suspended account
            }
          }
        } catch {
          // offline — keep the hydrated session
        }
      } else if (stored) {
        persist(null);
      }
      setReady(true);
    });
    return () => unsub();
  }, [persist, buildSession]);

  // Text direction (RTL for Arabic/Persian) + lang attribute.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = dirFor(lang);
      document.documentElement.lang = lang;
    }
  }, [lang]);

  // Sites visible to the user.
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

  const loginLegacy = useCallback(
    async (username: string, password: string, email: string) => {
      if (!auth.currentUser) await signInAnonymously(auth).catch(() => {});
      const ph = await sha256(password);
      const snap = await getDocs(
        query(collection(db, "nexus_users"), where("username", "==", username), limit(1))
      );
      if (snap.empty) throw new Error("Unknown username or password");
      const old = snap.docs[0].data() as Profile & { passwordHash?: string };
      if (old.passwordHash !== ph) throw new Error("Unknown username or password");
      if (old.status && old.status !== "Active") throw new Error("Account is " + old.status);
      await signOut(auth);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const profile: Profile = {
        username: old.username,
        name: old.name,
        jobType: old.jobType || "User",
        isAdmin: !!old.isAdmin,
        sites: old.sites || [],
        sections: old.sections || {},
        approvalLevel: old.approvalLevel || 0,
        status: old.status || "Active",
        createdAt: (old.createdAt as number) || Date.now(),
        migratedAt: Date.now(),
      };
      await setDoc(doc(db, "nexus_users", cred.user.uid), profile);
      const s = buildSession(cred.user.uid, profile);
      persist(s);
      return s;
    },
    [persist, buildSession]
  );

  const login = useCallback(
    async (username: string, password: string) => {
      const uname = String(username || "").trim().toLowerCase();
      if (!uname || !password) throw new Error("Enter username and password");
      const email = userEmail(uname);
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const snap = await getDoc(doc(db, "nexus_users", cred.user.uid));
        if (!snap.exists())
          throw new Error("User profile not found — contact your administrator");
        const s = buildSession(cred.user.uid, snap.data() as Profile);
        persist(s);
        return s;
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === "auth/wrong-password" || code === "auth/invalid-credential")
          throw new Error("Unknown username or password");
        if (code === "auth/user-not-found" || code === "auth/invalid-login-credentials")
          return loginLegacy(uname, password, email);
        throw err instanceof Error ? err : new Error("Unknown username or password");
      }
    },
    [persist, buildSession, loginLegacy]
  );

  const bootstrapAdmin = useCallback(
    async (name: string, username: string, password: string) => {
      const uname = String(username || "").trim().toLowerCase();
      if (!name || !uname || !password) throw new Error("All fields are required");
      const email = userEmail(uname);
      const sections = Object.fromEntries(ALL_SECTION_IDS.map((id) => [id, true]));
      await signOut(auth).catch(() => {});
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const profile: Profile = {
          username: uname,
          name,
          jobType: "Administrator",
          isAdmin: true,
          sites: [],
          sections,
          approvalLevel: 5,
          status: "Active",
          createdAt: Date.now(),
        };
        await setDoc(doc(db, "nexus_users", cred.user.uid), profile);
        await setDoc(doc(db, "nexus_meta", "bootstrap_status"), {
          bootstrapped: true,
          at: Date.now(),
        }).catch(() => {});
        const s = buildSession(cred.user.uid, profile);
        persist(s);
        return s;
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === "auth/email-already-in-use") throw new Error("That username is already taken");
        throw err instanceof Error ? err : new Error("Could not create administrator");
      }
    },
    [persist, buildSession]
  );

  const hasAnyUser = useCallback(async () => {
    try {
      const d = await getDoc(doc(db, "nexus_meta", "bootstrap_status"));
      return d.exists();
    } catch {
      return true;
    }
  }, []);

  const createUser = useCallback(
    async (data: UserDraft) => {
      if (!session?.isAdmin) throw new Error("Only administrators can create users");
      const uname = String(data.username || "").trim().toLowerCase();
      if (!uname || !data.password) throw new Error("Username and password are required");
      const email = userEmail(uname);
      const sections = { ...(data.sections || {}) };
      if (data.isAdmin) ALL_SECTION_IDS.forEach((id) => (sections[id] = true));
      // Secondary app so the admin's own session isn't replaced.
      const sec = initializeApp(firebaseConfig, `nexus_uc_${Date.now()}_${Math.floor(Math.random() * 1e6)}`);
      try {
        const cred = await createUserWithEmailAndPassword(getAuth(sec), email, data.password);
        const profile: Profile = {
          username: uname,
          name: data.name || uname,
          jobType: data.isAdmin ? "Administrator" : data.jobType || "User",
          isAdmin: !!data.isAdmin,
          sites: data.isAdmin ? [] : data.sites || [],
          sections,
          approvalLevel: data.isAdmin ? 5 : Number(data.approvalLevel) || 0,
          status: data.status || "Active",
          createdAt: Date.now(),
          createdBy: session.username,
        };
        await setDoc(doc(db, "nexus_users", cred.user.uid), profile);
        await deleteApp(sec).catch(() => {});
        return cred.user.uid;
      } catch (err) {
        await deleteApp(sec).catch(() => {});
        const code = (err as { code?: string })?.code;
        if (code === "auth/email-already-in-use") throw new Error("That username is already taken");
        throw err instanceof Error ? err : new Error("Could not create user");
      }
    },
    [session]
  );

  const updateUser = useCallback(
    async (uid: string, data: UserDraft) => {
      if (!session?.isAdmin) throw new Error("Only administrators can edit users");
      const sections = { ...(data.sections || {}) };
      if (data.isAdmin) ALL_SECTION_IDS.forEach((id) => (sections[id] = true));
      await updateDoc(doc(db, "nexus_users", uid), {
        name: data.name,
        jobType: data.isAdmin ? "Administrator" : data.jobType || "User",
        isAdmin: !!data.isAdmin,
        sites: data.isAdmin ? [] : data.sites || [],
        sections,
        approvalLevel: data.isAdmin ? 5 : Number(data.approvalLevel) || 0,
        status: data.status || "Active",
      });
    },
    [session]
  );

  const logout = useCallback(() => {
    signOut(auth).catch(() => {});
    persist(null);
  }, [persist]);

  const switchSite = useCallback((id: string) => {
    setSessionState((cur) => {
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
      bootstrapAdmin,
      hasAnyUser,
      createUser,
      updateUser,
      logout,
      switchSite,
      resolveSite,
      canSee,
      lang,
      setLang,
      t,
      asSession,
    }),
    [
      ready,
      session,
      sites,
      activeSite,
      login,
      bootstrapAdmin,
      hasAnyUser,
      createUser,
      updateUser,
      logout,
      switchSite,
      resolveSite,
      canSee,
      lang,
      setLang,
      t,
      asSession,
    ]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

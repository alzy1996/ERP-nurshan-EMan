"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, getDocs, limit, query } from "firebase/firestore";
import { Loader2 } from "lucide-react";

import { db, sha256 } from "@/lib/firebase";
import { useApp } from "@/context/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";

const SECTIONS = [
  "dashboard",
  "analytics",
  "materials",
  "suppliers",
  "offers",
  "purchaserequests",
  "contracts",
  "attendance",
  "notifications",
  "settings",
];

export default function LoginPage() {
  const app = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "bootstrap">("login");
  const [name, setName] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (app.ready && app.session) router.replace("/dashboard");
  }, [app.ready, app.session, router]);

  useEffect(() => {
    // First-run bootstrap: if there are no users, offer to create the admin.
    getDocs(query(collection(db, "nexus_users"), limit(1)))
      .then((s) => {
        if (s.empty) setMode("bootstrap");
      })
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      if (mode === "bootstrap") {
        const uname = user.trim().toLowerCase();
        if (!uname || !pass) throw new Error("Enter username and password");
        const sections = Object.fromEntries(SECTIONS.map((k) => [k, true]));
        const passwordHash = await sha256(pass);
        await addDoc(collection(db, "nexus_users"), {
          username: uname,
          passwordHash,
          name,
          jobType: "Administrator",
          isAdmin: true,
          sites: [],
          sections,
          status: "Active",
          createdAt: Date.now(),
        });
        await app.login(uname, pass);
      } else {
        await app.login(user, pass);
      }
      router.replace("/dashboard");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Sign in failed");
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-[36rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(150,180,255,0.4), rgba(220,200,255,0.25) 45%, transparent 70%)",
        }}
      />
      <form
        onSubmit={submit}
        className="glass-strong glass-specular w-full max-w-sm rounded-[28px] p-7"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary text-base font-bold text-primary-foreground">
            N
          </span>
          <div>
            <div className="text-base font-semibold tracking-tight">ERP Nexus</div>
            <div className="text-xs text-muted-foreground">Procurement &amp; Construction</div>
          </div>
        </div>

        <h1 className="text-xl font-semibold tracking-tight">
          {mode === "bootstrap" ? "Create administrator" : "Welcome back"}
        </h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">
          {mode === "bootstrap"
            ? "First account — full god-mode access."
            : "Sign in to your workspace."}
        </p>

        <div className="space-y-4">
          {mode === "bootstrap" ? (
            <Field label="Full name" htmlFor="name">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="glass-subtle h-11 rounded-xl border-0"
              />
            </Field>
          ) : null}
          <Field label="Username" htmlFor="user">
            <Input
              id="user"
              autoComplete="username"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="glass-subtle h-11 rounded-xl border-0"
            />
          </Field>
          <Field label="Password" htmlFor="pass">
            <Input
              id="pass"
              type="password"
              autoComplete="current-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="glass-subtle h-11 rounded-xl border-0"
            />
          </Field>
        </div>

        <Button
          type="submit"
          variant="glassPrimary"
          disabled={busy}
          className="mt-5 h-11 w-full rounded-xl"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : mode === "bootstrap" ? (
            "Create admin & sign in"
          ) : (
            "Sign in"
          )}
        </Button>

        {msg ? (
          <div className="mt-3 text-center text-sm font-medium text-destructive">{msg}</div>
        ) : null}
      </form>
    </div>
  );
}

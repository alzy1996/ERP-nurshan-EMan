"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessagesSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fetchScoped, addScoped, removeScoped } from "@/lib/data";
import { useApp } from "@/context/app-context";
import { usePermissions } from "@/lib/usePermissions";

type Message = {
  id: string;
  text?: string;
  author?: string;
  createdBy?: string;
  createdAt?: number;
  siteId?: string;
};

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function fmtTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function MessagesPage() {
  const app = useApp();
  const perms = usePermissions();
  const [rows, setRows] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const uid = app.session?.uid;
  const canPost = perms.can("messages", "create");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchScoped<Message>("messages", app.asSession());
      data.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setRows(data);
    } catch {
      toast.error("Could not load messages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (app.ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, app.activeSite]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [rows.length]);

  const postSite = useMemo(() => {
    const active = app.resolveSite();
    return active && active !== app.ALL ? active : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.activeSite]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const ref = await addScoped(
        "messages",
        { text: body, author: app.session?.name || "—" },
        app.asSession(),
        postSite
      );
      // Optimistically append so the thread updates instantly.
      setRows((r) => [
        ...r,
        {
          id: ref.id,
          text: body,
          author: app.session?.name || "—",
          createdBy: uid,
          createdAt: Date.now(),
          siteId: postSite ?? undefined,
        },
      ]);
      setText("");
    } catch {
      toast.error("Could not send — check you have a site selected");
    } finally {
      setSending(false);
    }
  }

  async function remove(m: Message) {
    if (!window.confirm("Delete this message?")) return;
    try {
      await removeScoped("messages", m.id);
      setRows((r) => r.filter((x) => x.id !== m.id));
    } catch {
      toast.error("Could not delete");
    }
  }

  const siteLabel =
    app.activeSite === app.ALL
      ? app.t("All sites")
      : app.sites.find((s) => s.id === app.activeSite)?.name || "—";

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Team board · {siteLabel}</p>
      </div>

      {/* Thread */}
      <div className="glass-subtle flex-1 space-y-3 overflow-y-auto rounded-3xl p-4">
        {loading ? (
          <div className="grid h-full place-items-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div className="max-w-xs">
              <div className="glass glass-specular mx-auto grid size-12 place-items-center rounded-2xl">
                <MessagesSquare className="size-5" />
              </div>
              <p className="mt-4 text-sm font-medium">No messages yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start the conversation for this site — everyone on the team can read and reply.
              </p>
            </div>
          </div>
        ) : (
          rows.map((m) => {
            const mine = !!m.createdBy && m.createdBy === uid;
            const canDelete = mine || app.session?.isAdmin;
            return (
              <div key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {initials(m.author || "?")}
                </span>
                <div className={`group max-w-[78%] ${mine ? "items-end text-right" : ""}`}>
                  <div
                    className={`relative rounded-2xl px-3.5 py-2 text-sm ${
                      mine ? "glass-strong" : "glass"
                    }`}
                  >
                    {!mine ? (
                      <div className="mb-0.5 text-[11px] font-semibold text-muted-foreground">
                        {m.author || "—"}
                      </div>
                    ) : null}
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    {canDelete ? (
                      <button
                        onClick={() => remove(m)}
                        aria-label="Delete"
                        className="absolute -right-1 -top-1 hidden size-6 place-items-center rounded-lg bg-background/80 text-muted-foreground transition hover:text-destructive group-hover:grid"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-1 px-1 text-[10px] text-muted-foreground">{fmtTime(m.createdAt)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      {canPost ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Write a message…"
            className="glass-subtle h-11 flex-1 rounded-full px-4 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            aria-label="Send"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
      ) : null}
    </div>
  );
}

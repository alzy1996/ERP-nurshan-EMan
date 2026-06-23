export function Button({ variant = "primary", className = "", ...props }) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-lg font-bold text-xs px-3.5 py-2 transition active:translate-y-0 hover:-translate-y-px disabled:opacity-60";
  const styles = {
    primary: { background: "var(--primary)", color: "#fff" },
    ok: { background: "#1DB06A", color: "#fff" },
    no: { background: "rgba(229,72,77,.12)", color: "#E5484D" },
    ghost: { background: "transparent", color: "var(--muted)", border: "1px solid var(--border)" }
  };
  return <button className={base + " " + className} style={styles[variant]} {...props} />;
}

export function Badge({ children, tone = "grey" }) {
  const map = {
    green: { background: "rgba(29,176,106,.12)", color: "#0e7a4a" },
    amber: { background: "rgba(232,147,10,.13)", color: "#a06003" },
    red: { background: "rgba(229,72,77,.12)", color: "#c0292e" },
    blue: { background: "var(--surface-2)", color: "var(--primary)" },
    grey: { background: "var(--surface-2)", color: "var(--muted)" }
  };
  return <span className="inline-flex items-center gap-1 rounded-full text-[10.5px] font-bold px-2.5 py-1" style={map[tone]}>{children}</span>;
}

export function Field({ label, value, onChange, type = "text", as, ...rest }) {
  const C = as === "textarea" ? "textarea" : "input";
  return (
    <label className="block mb-3.5">
      <span className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted)" }}>{label}</span>
      <C type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border outline-none px-3 py-2.5 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)", minHeight: as === "textarea" ? 74 : 40 }} {...rest} />
    </label>
  );
}

export function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center p-4" style={{ background: "rgba(8,10,16,.45)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="card w-full max-w-lg max-h-[92vh] overflow-y-auto rise" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4.5 py-4 border-b" style={{ borderColor: "var(--border)", padding: "16px 18px" }}>
          <div className="font-extrabold">{title}</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border" style={{ borderColor: "var(--border)" }}>✕</button>
        </div>
        <div className="p-4.5" style={{ padding: 18 }}>{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t" style={{ borderColor: "var(--border)", padding: "14px 18px" }}>{footer}</div>}
      </div>
    </div>
  );
}

export const fmtOMR = (n) => Number(n || 0).toLocaleString("en-OM", { maximumFractionDigits: 3 });

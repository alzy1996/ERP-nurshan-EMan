# Security Memo — ERP Nexus

**For:** Management &nbsp;|&nbsp; **Re:** How the system is secured, backed up, and kept up to date

---

## Summary

The system runs on **Google Firebase**, which provides bank‑grade infrastructure
(encryption in transit and at rest, DDoS protection, automatic platform
patching). Firebase is a **strong foundation, but not a complete security
program on its own** — the application’s own rules, backups, and monitoring must
be configured correctly. The core access control is solid; we have now closed
several gaps and have a clear plan for the rest.

## What protects the system today

- **Server‑enforced access** — every action requires a real signed‑in account,
  and “administrator” is verified on the server, so it **cannot be faked** from a
  browser.
- **Role‑based access** — each person sees and does only what their job allows.
- **Encryption** everywhere (HTTPS + encrypted storage) — handled by Google.
- **Audit trail** — every record stores who created/changed it and when.
- **Hardened web responses** — protection against clickjacking, content‑type
  attacks, and forced‑HTTP downgrades (newly added).
- **No exposed file storage** — uploads go through a managed image service, so
  there is no open file‑storage surface to attack.

## What we just added

| Improvement | Protects against |
|---|---|
| Automated **daily database backup** | Accidental or malicious data loss |
| Web **security headers** | Clickjacking, injection, protocol downgrade |
| **Automated dependency updates** | Known vulnerabilities in libraries |

## Two settings to switch on (console — 10 minutes)

1. **Point‑in‑Time Recovery** — lets us “rewind” the database up to 7 days after
   any bad change.
2. **App Check** — ensures only our real app can talk to the database, blocking
   automated/scripted abuse.

## Roadmap

- **Now:** backups + recovery on, security headers, upload hardening, review
  gate before anything goes live. ✅ (in progress)
- **30 days:** two‑factor login for administrators, automated tests that prove
  the access rules can’t be weakened by mistake, vulnerability scanning.
- **Ongoing:** quarterly access reviews, an annual independent **penetration
  test**, and a written incident‑response plan.

## On “is it tested from many sides?”

Three independent layers: (1) automated rule tests so a future change can’t
silently open the database, (2) automated vulnerability scanning on every
change, and (3) a periodic **professional penetration test** by an outside
party. Together these test the system “from many sides,” not just one.

## On “does it update automatically?”

Yes — and safely. The app deploys automatically once a change is **reviewed and
passes tests**; Google patches the underlying platform automatically; and library
updates are proposed automatically for review. Automatic, with a safety gate.

---

*Prepared by the engineering team. Bottom line: the foundation is strong, the
critical gaps (backups, abuse protection) are being closed now, and the rest is a
short, defined roadmap.*

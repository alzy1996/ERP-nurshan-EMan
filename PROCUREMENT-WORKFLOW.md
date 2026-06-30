# Procurement Workflow — Correct Logic & Controls

*How the Purchase Request → Purchase Order → Receipt → Invoice → Payment flow
**should** work, why, and how it maps onto ERP Nexus. Grounded in a verified
deep‑research pass (sources at the end). This is the design we build toward.*

---

## 0. What's wrong today (your questions, answered)

- **"Why can any user approve?"** — Two things. (1) It is *not* literally any user:
  only roles with the **approve** capability see Approve (Procurement Manager,
  Management, Finance, Country Manager). You're testing as **Super Admin**, who
  can do everything by design. (2) The real gap: **nothing stopped the person who
  raised a request from approving their own request.** That is a recognized
  control failure (a "maker‑checker" / segregation‑of‑duties violation).
  **→ Fixed now:** the raiser of a request can no longer approve it; another
  approver must sign off.
- **"The PR is messy, no logic."** — Correct: there was no enforced *order* (a
  state machine) and no separation of who does what. The model below fixes that.
- **"Should a PR item already be in Materials?"** — Best practice: **yes by
  default** — pick from the Materials catalogue; allow free‑text only as a flagged
  exception that gets extra approval and prompts adding the item to the catalogue.

---

## 1. The correct state machine (gated — each step blocks the next)

```
Requisition (PR)        Purchase Order (PO)     Goods Receipt (GRN)    Invoice / Payment
─────────────────       ───────────────────     ──────────────────     ─────────────────
Draft → Submitted  ──►  (only if PR Approved)   (only if PO Issued)    (only if GRN exists
   → Approved            Draft → Issued          Received / QA pass      AND 3‑way match OK)
   → Ordered  ◄───────── created from PR         → updates PO            → Matched → Paid
   (or Rejected)
```

**Hard rules (an action is blocked until its predecessor is done):**
1. **A PO can only be created from an *Approved* PR.** *(already enforced — the
   "Create PO" button only appears on Approved requests.)*
2. **Goods can only be received against an *Issued* PO** (no receipt without a PO).
3. **An invoice can only be paid after a Goods Receipt exists *and* it passes a
   3‑way match** (PO = Receipt = Invoice within tolerance).
4. A request **cannot skip states** (no Submitted → Ordered without Approved).

> Source basis: Microsoft Dynamics 365 (primary) — "After a purchase requisition
> is approved, a purchase order can be generated…"; NetSuite/Oracle — payment is
> released only after a passed three‑way match.

## 2. Roles & responsibilities (separation of duties)

The golden rule: **the maker is never the checker.** The person who *raises* a
request doesn't *approve* it; the person who *orders* doesn't *receive*; the
person who *receives* doesn't *pay*. Mapped to ERP Nexus roles:

| Step | Who does it (maker) | Who checks / approves |
|---|---|---|
| **Raise PR** | Documentation Controller, Site Engineer, Warehouse, Buyer | — |
| **Approve PR** | — | **Procurement Manager** (+ Finance / Country Manager / Management by value — see §3). **Never the raiser.** |
| **Create & issue PO** | **Buyer / Procurement Officer** | Procurement Manager for higher value (optional PO approval) |
| **Receive goods (GRN)** | **Warehouse / Store** | **Inspector** signs off QA for items that need inspection |
| **Approve invoice & pay** | **Finance / Accounts** | Finance runs the 3‑way match; pays only matched invoices |

> "Some organizations require that purchase requisitions and purchase orders are
> approved by a user other than the person who entered the transaction." — D365.
> Only the **preparer** may edit a requisition; creating one *on behalf of*
> someone else needs explicit permission.

## 3. Approval authority & thresholds (delegation of authority)

Approval should escalate by **amount** — small spend stops at Procurement; large
spend climbs the ladder. **Proposed defaults (you set the real numbers):**

| Request value (OMR) | Approver(s) required |
|---|---|
| ≤ 500 | Procurement Manager |
| 500 – 5,000 | Procurement Manager **+** Finance |
| 5,000 – 25,000 | + **Country Manager** |
| > 25,000 | + **Management** (top sign‑off) |

Thresholds must be **configurable**, not hard‑coded. This is the standard
value‑based release‑strategy / DOA‑matrix pattern (D365, SAP).

## 4. Catalogue discipline (master data)

- **Default:** PR line items are **picked from the Materials catalogue**, and PO
  suppliers from the **approved Suppliers list**. This keeps prices, codes and
  spend clean and reportable.
- **Exception:** free‑text ("non‑catalogue") items are allowed but **flagged**,
  **route for extra approval**, and **prompt adding the item to Materials** (and
  any new vendor to Suppliers, via an onboarding check).
- *(Today the PR form already lets you pick a material; the next step is to flag
  free‑text as non‑catalogue and route it for the extra approval above.)*

## 5. Three‑way match (before paying a supplier)

Before payment, compare three documents on **item, quantity, unit price, and PO
number**:
- **PO** — what we ordered (item, qty, agreed price).
- **Goods Receipt** — what we actually received (received qty).
- **Invoice** — what the supplier is billing.

**Tolerances, not exact equality:** small variances (typical bands **±2% price,
±5% quantity**) auto‑pass; anything out of tolerance goes on **payment hold** and
into an **exception queue** for Finance to investigate — it is *not* paid
automatically.

## 6. Construction specifics

- Route approval by **project role** and **cost‑centre / budget owner** — e.g. the
  **Site/Project Engineer (or Project Manager)** for the project being charged
  must be in the approval chain, alongside procurement. A high‑control setup can
  require **both** the project owner **and** procurement to approve.
- Every PR/PO line should carry a **project/site** (already required) and ideally
  a **cost code**, so spend ties to the **project budget**.
- *Open decision:* whether the system should **hard‑block** a PR/PO that exceeds
  the remaining project budget, **warn**, or **allow with override** (this is
  "commitment/encumbrance" control — a separate budgeting feature).

---

## 7. What's implemented now vs the build plan

**Done now:**
- ✅ Requester **cannot approve their own** request (segregation of duties).
- ✅ PO can only be created from an **Approved** PR (state gate).
- ✅ **Value-based approval limits** (delegation of authority) — an approver can
  only approve up to their signing limit; larger amounts show *"above your limit
  — needs <higher role>"* and each request shows *"Needs <role> approval"*. The
  limits are the §3 defaults and are configurable in `next/src/lib/procurement.ts`.
- ✅ **Goods Receipt** — a PO runs Draft → **Issued** (procurement) → **Received**
  (Warehouse/Inspector only — the orderer isn't the receiver); receiving closes
  the source request (PR → Received).
- ✅ **Invoice + three‑way match + payment** — on a Received PO, Finance records
  the supplier invoice; if it's within ±2% of the order it's **Matched** (payable)
  and can be **Paid**, otherwise it's an **Exception** for review (never auto‑paid).

**Build plan (remaining):**
1. **Catalogue enforcement** — flag free‑text PR items as non‑catalogue + extra
   approval + "add to Materials" prompt.
2. **Server enforcement** of the state machine + "not your own approval" in
   `firestore.rules` (defence in depth, not just the UI).
3. **Refinements** — per‑line received quantities, an Inspector QA pass as an
   explicit gate, and configurable match tolerance.

## 8. Decisions we need from you

1. **Approval thresholds** — confirm the OMR bands and who signs off at each (§3).
2. **Role mapping** — confirm who raises vs approves (§2), and where the
   **Inspector** sits (QA gate on receipt) and the **Country Manager** in the
   approval ladder.
3. **Budget control** — warn, hard‑block, or override‑with‑approval when a
   request exceeds the project budget (§6).
4. **Catalogue strictness** — must every PR item be from Materials, or is flagged
   free‑text acceptable (§4)?

---

### Sources (verified, high‑confidence)
- Microsoft Dynamics 365 — *Purchase requisitions workflow* (primary): state
  machine, roles/segregation of duties, value thresholds, on‑behalf permissions,
  project/cost‑centre expenditure reviewers.
- NetSuite & Oracle — *three‑way matching* and vendor‑bill approval: document
  sequence, compared fields, tolerances, exception/hold path.
- SAP Ariba/MM release strategies; UC Berkeley procurement segregation‑of‑duties
  matrix; industry DOA‑matrix guidance — corroborating the above.

*Companion docs: `ERP-NEXUS-DESIGN-REVIEW.md` (gap analysis), `ERP-NEXUS-SYSTEM-BRIEF.md`
(system overview). Source of truth for roles: `next/src/lib/roles.ts`.*

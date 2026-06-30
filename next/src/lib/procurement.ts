// lib/procurement.ts
// ============================================================================
// Delegation of authority — value-based approval limits for the procurement
// chain. A request can only be approved by someone whose signing limit covers
// its amount, so large spend climbs to higher authority (D365/SAP "spending
// limit" model). These are SENSIBLE DEFAULTS — adjust to your real policy.
// ============================================================================
import type { Role } from "@/lib/roles";

/** Max amount (OMR) each role may approve. Roles not listed = cannot approve. */
export const APPROVAL_LIMITS: Partial<Record<Role, number>> = {
  procurement_manager: 5_000,
  finance: 25_000,
  country_manager: 100_000,
  management: Number.MAX_SAFE_INTEGER, // top sign-off
  admin: Number.MAX_SAFE_INTEGER,      // god mode
};

/** The signing limit for a role (0 if the role has no approval authority). */
export function approvalLimitFor(role: Role | null | undefined): number {
  return (role && APPROVAL_LIMITS[role]) || 0;
}

/** Can this role approve a request of `amount`? Admins are unlimited. */
export function canApproveAmount(
  role: Role | null | undefined,
  amount: number,
  isAdmin = false
): boolean {
  if (isAdmin) return true;
  return (Number(amount) || 0) <= approvalLimitFor(role);
}

/** The lowest-authority role label that can approve this amount (for hints). */
export function requiredApproverLabel(amount: number): string {
  const a = Number(amount) || 0;
  if (a <= 5_000) return "Procurement Manager";
  if (a <= 25_000) return "Finance";
  if (a <= 100_000) return "Country Manager";
  return "Management";
}

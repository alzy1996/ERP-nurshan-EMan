// Job roles and the module sections each can access by default.
// Admins can override per-user in Settings → Users; isAdmin = full god mode.

export const SECTIONS: { id: string; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "projects", label: "Projects" },
  { id: "suppliers", label: "Suppliers" },
  { id: "materials", label: "Materials" },
  { id: "services", label: "Services" },
  { id: "offers", label: "Offers" },
  { id: "purchaserequests", label: "Purchase Requests" },
  { id: "purchaseorders", label: "Purchase Orders" },
  { id: "contracts", label: "Contracts" },
  { id: "analytics", label: "Analytics" },
  { id: "notifications", label: "Notifications" },
  { id: "timesheets", label: "Timesheets" },
  { id: "attendance", label: "Attendance" },
  { id: "settings", label: "Settings" },
];

export const ALL_SECTION_IDS = SECTIONS.map((s) => s.id);

const ALL_MODULES = ALL_SECTION_IDS.filter((id) => id !== "settings");

export type Role = { name: string; level: number; sections: string[] };

export const ROLES: Role[] = [
  { name: "Administrator", level: 5, sections: ALL_SECTION_IDS },
  { name: "CEO", level: 5, sections: ALL_MODULES },
  {
    name: "Financial",
    level: 4,
    sections: ["dashboard", "analytics", "purchaseorders", "purchaserequests", "contracts", "suppliers", "offers"],
  },
  { name: "HR", level: 3, sections: ["dashboard", "timesheets", "attendance", "notifications"] },
  {
    name: "Project Manager",
    level: 3,
    sections: ["dashboard", "projects", "materials", "services", "suppliers", "purchaserequests", "purchaseorders", "timesheets", "attendance", "analytics"],
  },
  {
    name: "Site Engineer",
    level: 1,
    sections: ["dashboard", "projects", "materials", "services", "attendance", "timesheets"],
  },
  {
    name: "Procurement",
    level: 2,
    sections: ["dashboard", "suppliers", "offers", "materials", "services", "purchaserequests", "purchaseorders"],
  },
  { name: "Inventory", level: 0, sections: ["dashboard", "materials", "services"] },
  { name: "HSE", level: 0, sections: ["dashboard", "attendance", "notifications", "timesheets"] },
  { name: "Employee", level: 0, sections: ["dashboard"] },
];

export const ROLE_NAMES = ROLES.map((r) => r.name);

/** Default { sectionId: bool } map for a role. */
export function sectionsForRole(name: string): Record<string, boolean> {
  const role = ROLES.find((r) => r.name === name) || ROLES[ROLES.length - 1];
  return Object.fromEntries(ALL_SECTION_IDS.map((id) => [id, role.sections.includes(id)]));
}

/** Default approval level for a role. */
export function levelForRole(name: string): number {
  return (ROLES.find((r) => r.name === name) || { level: 0 }).level;
}

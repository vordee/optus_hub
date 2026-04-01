export type AppIconName =
  | "dashboard"
  | "companies"
  | "contacts"
  | "leads"
  | "opportunities"
  | "projects"
  | "users"
  | "roles"
  | "audit"
  | "sidebar-open"
  | "sidebar-close"
  | "logout"
  | "add"
  | "spark";

export function AppIcon({ name }: { name: AppIconName }) {
  const commonProps = {
    className: "app-icon-svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return <svg {...commonProps}><path d="M4 5h7v6H4zM13 5h7v10h-7zM4 13h7v6H4zM13 17h7v2h-7z" /></svg>;
    case "companies":
      return <svg {...commonProps}><path d="M4 20V6l8-3 8 3v14" /><path d="M9 20v-4h6v4" /><path d="M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01" /></svg>;
    case "contacts":
      return <svg {...commonProps}><circle cx="8" cy="9" r="3" /><path d="M3.5 18a5 5 0 0 1 9 0" /><path d="M14 7h7" /><path d="M14 11h7" /><path d="M14 15h5" /></svg>;
    case "leads":
      return <svg {...commonProps}><path d="M4 5h16l-6 7v5l-4 2v-7Z" /></svg>;
    case "opportunities":
      return <svg {...commonProps}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" /></svg>;
    case "projects":
      return <svg {...commonProps}><path d="M3 7h18" /><path d="M7 3v4" /><path d="M17 3v4" /><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 11h8M8 15h5" /></svg>;
    case "users":
      return <svg {...commonProps}><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "roles":
      return <svg {...commonProps}><circle cx="8.5" cy="15.5" r="2.5" /><path d="m10.5 13.5 7-7" /><path d="m15.5 6.5 2 2" /><path d="m18.5 3.5 2 2" /></svg>;
    case "audit":
      return <svg {...commonProps}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /><path d="M11 8v3l2 2" /></svg>;
    case "sidebar-open":
      return <svg {...commonProps}><path d="M4 5h16v14H4z" /><path d="M9 5v14" /><path d="m13 12 3-3" /><path d="m13 12 3 3" /></svg>;
    case "sidebar-close":
      return <svg {...commonProps}><path d="M4 5h16v14H4z" /><path d="M15 5v14" /><path d="m11 12-3-3" /><path d="m11 12-3 3" /></svg>;
    case "logout":
      return <svg {...commonProps}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>;
    case "add":
      return <svg {...commonProps}><path d="M12 5v14M5 12h14" /></svg>;
    case "spark":
      return <svg {...commonProps}><path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8Z" /></svg>;
  }
}

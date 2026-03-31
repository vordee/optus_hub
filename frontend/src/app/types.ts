export interface AuthenticatedUser {
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  roles: string[];
  permissions: string[];
}

export interface UserItem {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  roles: string[];
  permissions: string[];
}

export interface RoleItem {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

export interface PermissionItem {
  code: string;
  description: string;
}

export interface AuditEventItem {
  id: number;
  created_at: string;
  action: string;
  status: string;
  actor_email: string | null;
  target_type: string | null;
  target_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
}

export interface CompanyItem {
  id: number;
  legal_name: string;
  trade_name: string | null;
  tax_id: string | null;
  is_active: boolean;
  created_at: string;
  contact_count: number;
  lead_count: number;
}

export interface ContactItem {
  id: number;
  company_id: number | null;
  company_name: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LeadItem {
  id: number;
  company_id: number | null;
  company_name: string | null;
  contact_id: number | null;
  contact_name: string | null;
  title: string;
  description: string | null;
  source: string | null;
  status: string;
  created_at: string;
}

export interface OpportunityItem {
  id: number;
  lead_id: number | null;
  company_id: number | null;
  company_name: string | null;
  contact_id: number | null;
  contact_name: string | null;
  title: string;
  description: string | null;
  status: string;
  amount: number | null;
  created_at: string;
}

export type NavKey =
  | "dashboard"
  | "users"
  | "roles"
  | "audit"
  | "companies"
  | "contacts"
  | "leads"
  | "opportunities";

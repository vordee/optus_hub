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

export interface LeadListResponse {
  items: LeadItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface StatusHistoryItem {
  id: number;
  entity_type: string;
  entity_id: number;
  from_status: string | null;
  to_status: string;
  note: string | null;
  changed_by_email: string | null;
  changed_at: string;
}

export interface LeadDetailItem extends LeadItem {
  history: StatusHistoryItem[];
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

export interface OpportunityListResponse {
  items: OpportunityItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface OpportunityDetailItem extends OpportunityItem {
  next_statuses: string[];
  history: StatusHistoryItem[];
  linked_project: {
    id: number;
    name: string;
    status: string;
  } | null;
  can_open_project: boolean;
}

export interface ProjectItem {
  id: number;
  opportunity_id: number | null;
  company_id: number | null;
  company_name: string | null;
  contact_id: number | null;
  contact_name: string | null;
  name: string;
  status: string;
  description: string | null;
  created_at: string;
}

export interface ProjectListResponse {
  items: ProjectItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ProjectDetailItem extends ProjectItem {
  phases: ProjectPhaseItem[];
  history: StatusHistoryItem[];
}

export interface ProjectPhaseItem {
  id: number;
  project_id: number;
  key: string;
  name: string;
  sequence: number;
  status: string;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ProjectTaskItem {
  id: number;
  project_id: number;
  project_phase_id: number | null;
  project_phase_name: string | null;
  title: string;
  description: string | null;
  status: string;
  assigned_to_email: string | null;
  due_date: string | null;
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
  | "opportunities"
  | "projects";

import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import { formatDateTime } from "../app/format";
import { formatLeadStatus, formatProjectStatus } from "../app/labels";
import type {
  AuditEventItem,
  CompanyItem,
  ContactItem,
  LeadItem,
  OpportunityListResponse,
  ProjectListResponse,
  UserItem,
} from "../app/types";

interface DashboardState {
  loading: boolean;
  error: string | null;
  users: UserItem[];
  auditEvents: AuditEventItem[];
  companies: CompanyItem[];
  contacts: ContactItem[];
  leads: LeadItem[];
  opportunityCount: number;
  projectCount: number;
  recentOpportunities: Array<{ id: number; title: string; status: string; created_at: string }>;
  recentProjects: Array<{ id: number; name: string; status: string; created_at: string }>;
}

export function DashboardPage() {
  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: null,
    users: [],
    auditEvents: [],
    companies: [],
    contacts: [],
    leads: [],
    opportunityCount: 0,
    projectCount: 0,
    recentOpportunities: [],
    recentProjects: [],
  });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const [users, auditEvents, companies, contacts, leads, opportunityResponse, projectResponse] = await Promise.all([
        apiRequest<UserItem[]>("/v1/admin/users"),
        apiRequest<AuditEventItem[]>("/v1/admin/audit-events?limit=8"),
        apiRequest<CompanyItem[]>("/v1/crm/companies"),
        apiRequest<ContactItem[]>("/v1/crm/contacts"),
        apiRequest<LeadItem[]>("/v1/crm/leads"),
        apiRequest<OpportunityListResponse>("/v1/crm/opportunities?page=1&page_size=8"),
        apiRequest<ProjectListResponse>("/v1/projects?page=1&page_size=8"),
      ]);

      setState({
        loading: false,
        error: null,
        users: ensureArray(users),
        auditEvents: ensureArray(auditEvents),
        companies: ensureArray(companies),
        contacts: ensureArray(contacts),
        leads: ensureArray(leads),
        opportunityCount: opportunityResponse.total,
        projectCount: projectResponse.total,
        recentOpportunities: ensureArray(opportunityResponse.items).map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
          created_at: item.created_at,
        })),
        recentProjects: ensureArray(projectResponse.items).map((item) => ({
          id: item.id,
          name: item.name,
          status: item.status,
          created_at: item.created_at,
        })),
      });
    } catch (loadError) {
      setState((current) => ({
        ...current,
        loading: false,
        error: loadError instanceof ApiError ? loadError.message : "Falha ao carregar o dashboard.",
      }));
    }
  }

  const activeCompanies = state.companies.filter((item) => item.is_active).length;
  const activeContacts = state.contacts.filter((item) => item.is_active).length;
  const wonOpportunities = state.recentOpportunities.filter((item) => item.status === "won").length;
  const activeProjects = state.recentProjects.filter((item) => item.status === "active").length;
  const recentContacts = state.contacts.slice(0, 3);
  const recentLeads = state.leads.slice(0, 3);

  return (
    <section className="dashboard-shell">
      <article className="card highlight-card dashboard-hero">
        <div className="section-heading">
          <span className="eyebrow">Estado atual</span>
          <h3>Base pronta para operar com a identidade da Optus</h3>
          <p className="section-copy">
            O painel resume os pontos vivos do sistema para o time trabalhar com contexto: administração, CRM,
            projetos e auditoria.
          </p>
        </div>

        {state.loading && <div className="empty-state-panel">Carregando indicadores...</div>}
        {state.error && <div className="inline-error">{state.error}</div>}

        <div className="metric-grid dashboard-metrics">
          <div className="metric-card">
            <span>Admin</span>
            <strong>{state.users.length}</strong>
            <small>usuários operacionais</small>
          </div>
          <div className="metric-card">
            <span>CRM</span>
            <strong>{state.contacts.length}</strong>
            <small>contatos em base</small>
          </div>
          <div className="metric-card">
            <span>Entrega</span>
            <strong>{activeProjects}</strong>
            <small>projetos ativos</small>
          </div>
          <div className="metric-card">
            <span>Auditoria</span>
            <strong>{state.auditEvents.length}</strong>
            <small>eventos recentes</small>
          </div>
        </div>
      </article>

      <div className="dashboard-grid">
        <article className="card">
          <div className="section-heading">
            <span className="eyebrow">Operação</span>
            <h3>Resumo do fluxo</h3>
          </div>
          <div className="crm-summary-grid">
            <div className="metric-card">
              <span>Empresas ativas</span>
              <strong>{activeCompanies}</strong>
              <small>contas em uso</small>
            </div>
            <div className="metric-card">
              <span>Contatos ativos</span>
              <strong>{activeContacts}</strong>
              <small>pessoas disponíveis</small>
            </div>
            <div className="metric-card">
              <span>Leads</span>
              <strong>{state.leads.length}</strong>
              <small>demandas abertas</small>
            </div>
            <div className="metric-card">
              <span>Ganhas</span>
              <strong>{wonOpportunities}</strong>
              <small>oportunidades fechadas</small>
            </div>
          </div>

          <div className="dashboard-section">
            <div className="section-heading">
              <span className="eyebrow">Entrada</span>
              <h3>Contatos recentes</h3>
            </div>
            <ul className="mini-list">
              {recentContacts.map((contact) => (
                <li key={contact.id} className="mini-list-item">
                  <div>
                    <strong>{contact.full_name}</strong>
                    <p>{contact.company_name || "Sem empresa vinculada"}</p>
                  </div>
                  <small>{formatDateTime(contact.created_at)}</small>
                </li>
              ))}
              {recentContacts.length === 0 && <li className="mini-list-empty">Nenhum contato disponível.</li>}
            </ul>
          </div>
        </article>

        <article className="card">
          <div className="section-heading">
            <span className="eyebrow">Entrega</span>
            <h3>Projetos e leads</h3>
          </div>

          <div className="dashboard-section">
            <ul className="mini-list">
              {state.recentProjects.map((project) => (
                <li key={project.id} className="mini-list-item">
                  <div>
                    <strong>{project.name}</strong>
                    <p>{formatProjectStatus(project.status)}</p>
                  </div>
                  <small>{formatDateTime(project.created_at)}</small>
                </li>
              ))}
              {state.recentProjects.length === 0 && <li className="mini-list-empty">Nenhum projeto disponível.</li>}
            </ul>
          </div>

          <div className="dashboard-section">
            <div className="section-heading">
              <span className="eyebrow">Pipeline</span>
              <h3>Leads recentes</h3>
            </div>
            <ul className="mini-list">
              {recentLeads.map((lead) => (
                <li key={lead.id} className="mini-list-item">
                  <div>
                    <strong>{lead.title}</strong>
                    <p>{lead.company_name || "Sem empresa vinculada"}</p>
                  </div>
                  <div className="mini-badges">
                    <span className={`status-pill status-${lead.status}`}>{formatLeadStatus(lead.status)}</span>
                    <small>{formatDateTime(lead.created_at)}</small>
                  </div>
                </li>
              ))}
              {recentLeads.length === 0 && <li className="mini-list-empty">Nenhum lead disponível.</li>}
            </ul>
          </div>

          <div className="dashboard-section">
            <div className="section-heading">
              <span className="eyebrow">Auditoria</span>
              <h3>Último evento</h3>
            </div>
            {state.auditEvents[0] ? (
              <div className="helper-card">
                <strong>{state.auditEvents[0].action}</strong>
                <p>{state.auditEvents[0].actor_email || "Sistema"}</p>
                <small>{formatDateTime(state.auditEvents[0].created_at)}</small>
              </div>
            ) : (
              <div className="empty-state-panel">
                <strong>Sem auditoria recente</strong>
                <p>Eventos sensíveis aparecem aqui quando houver atividade.</p>
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

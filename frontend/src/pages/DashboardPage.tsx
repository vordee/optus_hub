import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import { formatDateTime } from "../app/format";
import { formatLeadStatus, formatProjectStatus } from "../app/labels";
import type { AuthenticatedUser, DashboardSummaryResponse } from "../app/types";

interface DashboardState {
  loading: boolean;
  error: string | null;
  summary: DashboardSummaryResponse | null;
}

interface DashboardPageProps {
  currentUser: AuthenticatedUser;
}

export function DashboardPage({ currentUser }: DashboardPageProps) {
  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: null,
    summary: null,
  });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const summary = await apiRequest<DashboardSummaryResponse>("/v1/dashboard/summary");
      setState({
        loading: false,
        error: null,
        summary,
      });
    } catch (loadError) {
      setState((current) => ({
        ...current,
        loading: false,
        error: loadError instanceof ApiError ? loadError.message : "Falha ao carregar o dashboard.",
      }));
    }
  }

  const summary = state.summary;
  const recentContacts = ensureArray(summary?.recent_contacts);
  const recentLeads = ensureArray(summary?.recent_leads);
  const recentProjects = ensureArray(summary?.recent_projects);
  const recentAuditEvents = ensureArray(summary?.recent_audit_events);

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
            <span>Empresas ativas</span>
            <strong>{summary?.active_company_count ?? 0}</strong>
            <small>contas em uso</small>
          </div>
          <div className="metric-card">
            <span>Contatos ativos</span>
            <strong>{summary?.active_contact_count ?? 0}</strong>
            <small>pessoas disponíveis</small>
          </div>
          <div className="metric-card">
            <span>Projetos</span>
            <strong>{recentProjects.length}</strong>
            <small>{summary?.active_project_count ?? 0} em andamento</small>
          </div>
          <div className="metric-card">
            <span>Auditoria</span>
            <strong>{recentAuditEvents.length}</strong>
            <small>eventos recentes</small>
          </div>
        </div>

        <div className="helper-card dashboard-session-card">
          <strong>Sessão ativa</strong>
          <p>
            {currentUser.full_name} · {currentUser.email}
          </p>
          <small>
            {currentUser.roles.length} papel(is) · {currentUser.permissions.length} permissão(ões)
            {currentUser.is_superuser ? " · superusuário" : ""}
          </small>
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
              <span>Empresas</span>
              <strong>{summary?.active_company_count ?? 0}</strong>
              <small>cadastros ativos</small>
            </div>
            <div className="metric-card">
              <span>Contatos</span>
              <strong>{summary?.active_contact_count ?? 0}</strong>
              <small>base operacional</small>
            </div>
            <div className="metric-card">
              <span>Leads</span>
              <strong>{summary?.lead_count ?? 0}</strong>
              <small>demandas abertas</small>
            </div>
            <div className="metric-card">
              <span>Ganhas</span>
              <strong>{summary?.won_opportunity_count ?? 0}</strong>
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
              {recentProjects.map((project) => (
                <li key={project.id} className="mini-list-item">
                  <div>
                    <strong>{project.name}</strong>
                    <p>{formatProjectStatus(project.status)}</p>
                  </div>
                  <small>{formatDateTime(project.created_at)}</small>
                </li>
              ))}
              {recentProjects.length === 0 && <li className="mini-list-empty">Nenhum projeto disponível.</li>}
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
            {recentAuditEvents[0] ? (
              <div className="helper-card">
                <strong>{recentAuditEvents[0].action}</strong>
                <p>{recentAuditEvents[0].actor_email || "Sistema"}</p>
                <small>{formatDateTime(recentAuditEvents[0].created_at)}</small>
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

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
  const latestAuditEvent = recentAuditEvents[0] || null;

  return (
    <section className="dashboard-shell">
      <article className="card highlight-card dashboard-hero">
        <div className="dashboard-hero-grid">
          <div className="dashboard-hero-main">
            <div className="section-heading dashboard-heading">
              <span className="eyebrow">Estado atual</span>
              <h3>Base pronta para operar com a identidade da Optus</h3>
              <p className="section-copy dashboard-copy">
                O painel resume os pontos vivos do sistema para o time trabalhar com contexto: administração, CRM,
                projetos e auditoria.
              </p>
            </div>

            {state.loading && <div className="dashboard-empty">Carregando indicadores...</div>}
            {state.error && <div className="inline-error">{state.error}</div>}

            <div className="metric-grid dashboard-metrics">
              <div className="metric-card dashboard-metric-card">
                <span>Empresas ativas</span>
                <strong>{summary?.active_company_count ?? 0}</strong>
                <small>contas em uso</small>
              </div>
              <div className="metric-card dashboard-metric-card">
                <span>Contatos ativos</span>
                <strong>{summary?.active_contact_count ?? 0}</strong>
                <small>pessoas disponíveis</small>
              </div>
              <div className="metric-card dashboard-metric-card">
                <span>Projetos em andamento</span>
                <strong>{summary?.active_project_count ?? 0}</strong>
                <small>{recentProjects.length} projetos recentes</small>
              </div>
              <div className="metric-card dashboard-metric-card">
                <span>Auditoria recente</span>
                <strong>{recentAuditEvents.length}</strong>
                <small>eventos registrados</small>
              </div>
            </div>
          </div>

          <aside className="dashboard-session-card">
            <div className="dashboard-session-head">
              <span className="eyebrow">Sessão ativa</span>
              <h4>{currentUser.full_name}</h4>
              <p>{currentUser.email}</p>
            </div>

            <div className="dashboard-session-stats">
              <div>
                <strong>{currentUser.roles.length}</strong>
                <span>papel(is)</span>
              </div>
              <div>
                <strong>{currentUser.permissions.length}</strong>
                <span>permissão(ões)</span>
              </div>
              <div>
                <strong>{currentUser.is_superuser ? "Sim" : "Não"}</strong>
                <span>superusuário</span>
              </div>
            </div>
          </aside>
        </div>
      </article>

      <div className="dashboard-grid">
        <article className="card dashboard-panel">
          <div className="section-heading dashboard-section-heading">
            <span className="eyebrow">Operação</span>
            <h3>Resumo do fluxo</h3>
            <p className="section-copy dashboard-section-copy">
              Os números abaixo mostram a base operacional que sustenta CRM, projetos e fechamento.
            </p>
          </div>

          <div className="crm-summary-grid dashboard-summary-grid">
            <div className="metric-card dashboard-metric-card">
              <span>Empresas</span>
              <strong>{summary?.active_company_count ?? 0}</strong>
              <small>cadastros ativos</small>
            </div>
            <div className="metric-card dashboard-metric-card">
              <span>Contatos</span>
              <strong>{summary?.active_contact_count ?? 0}</strong>
              <small>base operacional</small>
            </div>
            <div className="metric-card dashboard-metric-card">
              <span>Leads</span>
              <strong>{summary?.lead_count ?? 0}</strong>
              <small>demandas abertas</small>
            </div>
            <div className="metric-card dashboard-metric-card">
              <span>Ganhas</span>
              <strong>{summary?.won_opportunity_count ?? 0}</strong>
              <small>oportunidades fechadas</small>
            </div>
          </div>

          <div className="dashboard-section">
            <div className="section-heading dashboard-section-heading">
              <span className="eyebrow">Entrada</span>
              <h3>Contatos recentes</h3>
            </div>
            <ul className="mini-list dashboard-mini-list">
              {recentContacts.map((contact) => (
                <li key={contact.id} className="mini-list-item dashboard-list-item">
                  <div className="dashboard-list-main">
                    <strong>{contact.full_name}</strong>
                    <p>{contact.company_name || "Sem empresa vinculada"}</p>
                  </div>
                  <small>{formatDateTime(contact.created_at)}</small>
                </li>
              ))}
              {recentContacts.length === 0 && <li className="mini-list-empty dashboard-empty-row">Nenhum contato disponível.</li>}
            </ul>
          </div>
        </article>

        <article className="card dashboard-panel">
          <div className="section-heading dashboard-section-heading">
            <span className="eyebrow">Entrega</span>
            <h3>Projetos, leads e auditoria</h3>
            <p className="section-copy dashboard-section-copy">
              Uma leitura rápida do que entrou no funil, do que está em execução e do último evento sensível.
            </p>
          </div>

          <div className="dashboard-stack">
            <section className="dashboard-section dashboard-section-compact">
              <div className="section-heading dashboard-subheading">
                <span className="eyebrow">Projetos</span>
                <h4>Últimos iniciados</h4>
              </div>
              <ul className="mini-list dashboard-mini-list">
                {recentProjects.map((project) => (
                  <li key={project.id} className="mini-list-item dashboard-list-item">
                    <div className="dashboard-list-main">
                      <strong>{project.name}</strong>
                      <p>{formatProjectStatus(project.status)}</p>
                    </div>
                    <small>{formatDateTime(project.created_at)}</small>
                  </li>
                ))}
                {recentProjects.length === 0 && <li className="mini-list-empty dashboard-empty-row">Nenhum projeto disponível.</li>}
              </ul>
            </section>

            <section className="dashboard-section dashboard-section-compact">
              <div className="section-heading dashboard-subheading">
                <span className="eyebrow">Pipeline</span>
                <h4>Leads recentes</h4>
              </div>
              <ul className="mini-list dashboard-mini-list">
                {recentLeads.map((lead) => (
                  <li key={lead.id} className="mini-list-item dashboard-list-item dashboard-list-item-pipeline">
                    <div className="dashboard-list-main">
                      <strong>{lead.title}</strong>
                      <p>{lead.company_name || "Sem empresa vinculada"}</p>
                    </div>
                    <div className="dashboard-list-meta">
                      <span className={`status-pill status-${lead.status}`}>{formatLeadStatus(lead.status)}</span>
                      <small>{formatDateTime(lead.created_at)}</small>
                    </div>
                  </li>
                ))}
                {recentLeads.length === 0 && <li className="mini-list-empty dashboard-empty-row">Nenhum lead disponível.</li>}
              </ul>
            </section>

            <section className="dashboard-section dashboard-section-compact">
              <div className="section-heading dashboard-subheading">
                <span className="eyebrow">Auditoria</span>
                <h4>Último evento</h4>
              </div>
              {latestAuditEvent ? (
                <div className="helper-card dashboard-audit-card">
                  <strong>{latestAuditEvent.action}</strong>
                  <p>{latestAuditEvent.actor_email || "Sistema"}</p>
                  <small>{formatDateTime(latestAuditEvent.created_at)}</small>
                </div>
              ) : (
                <div className="empty-state-panel dashboard-empty-panel">
                  <strong>Sem auditoria recente</strong>
                  <p>Eventos sensíveis aparecem aqui quando houver atividade.</p>
                </div>
              )}
            </section>
          </div>
        </article>
      </div>
    </section>
  );
}

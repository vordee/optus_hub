import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import { formatDateTime } from "../app/format";
import { formatLeadStatus, formatOpportunityStatus, formatProjectStatus } from "../app/labels";
import type { AuthenticatedUser, DashboardSummaryResponse } from "../app/types";
import {
  DashboardCard,
  DashboardMetricCard,
  DashboardPill,
  DashboardSectionHeader,
} from "../components/tw/dashboard";

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
  const recentOpportunities = ensureArray(summary?.recent_opportunities);
  const recentProjects = ensureArray(summary?.recent_projects);
  const recentAuditEvents = ensureArray(summary?.recent_audit_events);
  const latestAuditEvent = recentAuditEvents[0] || null;

  const heroMetrics = [
    { label: "Empresas", value: summary?.active_company_count ?? 0, hint: "contas ativas" },
    { label: "Contatos", value: summary?.active_contact_count ?? 0, hint: "pessoas disponíveis" },
    { label: "Leads", value: summary?.lead_count ?? 0, hint: "demandas abertas" },
    { label: "Oportunidades", value: recentOpportunities.length, hint: "itens recentes" },
    { label: "Projetos", value: summary?.active_project_count ?? 0, hint: "em andamento" },
    { label: "Auditoria", value: recentAuditEvents.length, hint: "eventos recentes" },
  ];

  return (
    <section className="space-y-6 animate-fade-in">
      <DashboardCard className="overflow-hidden border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-slate-100">
        <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.35fr)_320px] xl:p-8">
          <div className="space-y-6">
            <DashboardSectionHeader
              eyebrow="Estado atual"
              title="Base pronta para operar com a identidade da Optus"
              description="O painel resume os pontos vivos do sistema para o time trabalhar com contexto: administração, CRM, projetos e auditoria."
            />

            {state.loading && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                Carregando indicadores...
              </div>
            )}

            {state.error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
                {state.error}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {heroMetrics.map((metric) => (
                <DashboardMetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  hint={metric.hint}
                />
              ))}
            </div>
          </div>

          <DashboardCard className="flex h-full flex-col justify-between gap-6 border-slate-950/10 bg-slate-950 p-6 text-slate-50 shadow-[0_24px_64px_rgba(15,23,42,0.24)]">
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[11px] font-bold tracking-[0.16em] text-slate-300 uppercase">
                  Sessão ativa
                </span>
                <h4 className="font-heading text-2xl font-bold tracking-tight text-white">
                  {currentUser.full_name}
                </h4>
                <p className="text-sm leading-6 text-slate-300">{currentUser.email}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {currentUser.roles.length > 0 ? (
                  currentUser.roles.map((role) => (
                    <DashboardPill key={role} tone="accent">
                      {role}
                    </DashboardPill>
                  ))
                ) : (
                  <DashboardPill tone="muted">sem papel</DashboardPill>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-[11px] font-bold tracking-[0.14em] text-slate-300 uppercase">
                  Usuários
                </span>
                <strong className="mt-2 block font-heading text-3xl font-bold text-white">
                  {summary?.user_count ?? 0}
                </strong>
                <p className="mt-2 text-sm leading-5 text-slate-300">base cadastrada na plataforma</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-[11px] font-bold tracking-[0.14em] text-slate-300 uppercase">
                  Permissões
                </span>
                <strong className="mt-2 block font-heading text-3xl font-bold text-white">
                  {currentUser.permissions.length}
                </strong>
                <p className="mt-2 text-sm leading-5 text-slate-300">acessos ativos nesta sessão</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
                <span className="text-[11px] font-bold tracking-[0.14em] text-slate-300 uppercase">
                  Superusuário
                </span>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <strong className="font-heading text-2xl font-bold text-white">
                    {currentUser.is_superuser ? "Sim" : "Não"}
                  </strong>
                  <DashboardPill tone={currentUser.is_superuser ? "warning" : "muted"}>
                    {currentUser.is_superuser ? "Acesso total" : "Acesso restrito"}
                  </DashboardPill>
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>
      </DashboardCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <DashboardCard className="border-slate-200/90 bg-white/90 p-6">
          <div className="space-y-6">
            <DashboardSectionHeader
              eyebrow="Operação"
              title="Contatos recentes"
              description="Leitura rápida da base operacional que alimenta o funil e as rotinas do time."
            />

            <div className="grid gap-3">
              {recentContacts.map((contact) => (
                <article
                  key={contact.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-sm"
                >
                  <div className="min-w-0 space-y-1">
                    <h5 className="font-heading text-[15px] font-semibold leading-5 text-slate-900">
                      {contact.full_name}
                    </h5>
                    <p className="truncate text-sm text-slate-600">
                      {contact.company_name || "Sem empresa vinculada"}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-slate-500">
                    {formatDateTime(contact.created_at)}
                  </time>
                </article>
              ))}

              {recentContacts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-sm text-slate-500">
                  Nenhum contato disponível.
                </div>
              )}
            </div>
          </div>
        </DashboardCard>

        <div className="space-y-6">
          <DashboardCard className="border-slate-200/90 bg-white/90 p-6">
            <div className="space-y-6">
              <DashboardSectionHeader
                eyebrow="Fluxo comercial"
                title="Leads e oportunidades"
                description="Os dois lados do funil ficam visíveis sem sair do dashboard."
              />

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold tracking-[0.16em] text-sky-700 uppercase">
                      Leads recentes
                    </span>
                    <DashboardPill tone="muted">{recentLeads.length}</DashboardPill>
                  </div>

                  <div className="space-y-3">
                    {recentLeads.map((lead) => (
                      <article
                        key={lead.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 space-y-1">
                            <h5 className="font-heading text-[15px] font-semibold leading-5 text-slate-900">
                              {lead.title}
                            </h5>
                            <p className="truncate text-sm text-slate-600">
                              {lead.company_name || "Sem empresa vinculada"}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <DashboardPill tone="accent">{formatLeadStatus(lead.status)}</DashboardPill>
                            <time className="text-xs text-slate-500">{formatDateTime(lead.created_at)}</time>
                          </div>
                        </div>
                      </article>
                    ))}

                    {recentLeads.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-sm text-slate-500">
                        Nenhum lead disponível.
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold tracking-[0.16em] text-sky-700 uppercase">
                      Oportunidades
                    </span>
                    <DashboardPill tone="muted">{recentOpportunities.length}</DashboardPill>
                  </div>

                  <div className="space-y-3">
                    {recentOpportunities.map((opportunity) => (
                      <article
                        key={opportunity.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 space-y-1">
                            <h5 className="font-heading text-[15px] font-semibold leading-5 text-slate-900">
                              {opportunity.title}
                            </h5>
                            <p className="truncate text-sm text-slate-600">Negociação registrada no funil</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <DashboardPill tone="navy">
                              {formatOpportunityStatus(opportunity.status)}
                            </DashboardPill>
                            <time className="text-xs text-slate-500">{formatDateTime(opportunity.created_at)}</time>
                          </div>
                        </div>
                      </article>
                    ))}

                    {recentOpportunities.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-sm text-slate-500">
                        Nenhuma oportunidade disponível.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard className="border-slate-200/90 bg-white/90 p-6">
            <div className="space-y-5">
              <DashboardSectionHeader
                eyebrow="Entrega"
                title="Projetos recentes"
                description="Leitura rápida da execução operacional que saiu do comercial."
              />

              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <article
                    key={project.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-sm"
                  >
                    <div className="min-w-0 space-y-1">
                      <h5 className="font-heading text-[15px] font-semibold leading-5 text-slate-900">
                        {project.name}
                      </h5>
                      <p className="truncate text-sm text-slate-600">Projeto em acompanhamento</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <DashboardPill tone="muted">{formatProjectStatus(project.status)}</DashboardPill>
                      <time className="text-xs text-slate-500">{formatDateTime(project.created_at)}</time>
                    </div>
                  </article>
                ))}

                {recentProjects.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-sm text-slate-500">
                    Nenhum projeto disponível.
                  </div>
                )}
              </div>
            </div>
          </DashboardCard>

          <DashboardCard className="border-slate-200/90 bg-white/90 p-6">
            <div className="space-y-5">
              <DashboardSectionHeader
                eyebrow="Auditoria"
                title="Último evento sensível"
                description="Registro final da atividade mais recente na plataforma."
              />

              {latestAuditEvent ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h5 className="font-heading text-[15px] font-semibold leading-5 text-slate-900">
                        {latestAuditEvent.action}
                      </h5>
                      <p className="text-sm text-slate-600">
                        {latestAuditEvent.actor_email || "Sistema"}
                      </p>
                    </div>
                    <DashboardPill tone="warning">
                      {latestAuditEvent.status}
                    </DashboardPill>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{formatDateTime(latestAuditEvent.created_at)}</span>
                    {latestAuditEvent.target_type ? <span>• {latestAuditEvent.target_type}</span> : null}
                    {latestAuditEvent.target_id ? <span>• {latestAuditEvent.target_id}</span> : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-sm text-slate-500">
                  Sem auditoria recente.
                </div>
              )}
            </div>
          </DashboardCard>
        </div>
      </div>
    </section>
  );
}

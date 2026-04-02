import { useEffect, useMemo, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import { storeOpportunityDraftFromLead } from "../app/crmDrafts";
import { ActivityPanel } from "../app/ActivityPanel";
import { formatDateTime } from "../app/format";
import { AppIcon } from "../app/icons";
import { formatLeadStatus, LEAD_STATUSES } from "../app/labels";
import { buildSavedViewPayload, formatCRMViewGroupByLabel, normalizeCRMViewFilters } from "../app/savedViews";
import { createSavedView, loadSavedViews, updateSavedView } from "../app/savedViewsApi";
import { QuickFormModal } from "../app/QuickFormModal";
import type {
  CRMViewFilters,
  CRMViewGroupBy,
  ContactItem,
  LeadDetailItem,
  LeadItem,
  LeadListResponse,
  SavedViewItem,
} from "../app/types";
import {
  PipelineActions,
  PipelineButton,
  PipelineCard,
  PipelineEmpty,
  PipelineField,
  PipelineInput,
  PipelineMetricCard,
  PipelineMetricGrid,
  PipelinePageShell,
  PipelinePill,
  PipelineSectionHeader,
  PipelineSelect,
} from "../components/tw/pipeline";

const PAGE_SIZE = 8;
const LEAD_GROUP_OPTIONS: Array<{ value: CRMViewGroupBy; label: string }> = [
  { value: "none", label: "Sem agrupamento" },
  { value: "status", label: "Por status" },
  { value: "source", label: "Por origem" },
  { value: "company", label: "Por empresa" },
];

type LeadGroup = {
  key: string;
  label: string;
  items: LeadItem[];
};

function getLeadGroupLabel(item: LeadItem, groupBy: CRMViewGroupBy) {
  if (groupBy === "status") {
    return formatLeadStatus(item.status);
  }
  if (groupBy === "source") {
    return item.source || "Origem não informada";
  }
  if (groupBy === "company") {
    return item.company_name || "Sem empresa";
  }
  return "Leads";
}

function buildLeadGroups(items: LeadItem[], groupBy: CRMViewGroupBy): LeadGroup[] {
  if (groupBy === "none") {
    return [{ key: "all", label: "Leads", items }];
  }

  if (groupBy === "status") {
    return LEAD_STATUSES.map((status) => ({
      key: status,
      label: formatLeadStatus(status),
      items: items.filter((item) => item.status === status),
    }));
  }

  const buckets = new Map<string, LeadItem[]>();
  for (const item of items) {
    const key = getLeadGroupLabel(item, groupBy);
    buckets.set(key, [...(buckets.get(key) || []), item]);
  }

  return [...buckets.entries()]
    .map(([key, groupedItems]) => ({
      key,
      label: key,
      items: groupedItems,
    }))
    .sort((left, right) => right.items.length - left.items.length || left.label.localeCompare(right.label, "pt-BR"));
}

function getLeadViewName(filters: CRMViewFilters) {
  if (filters.status && filters.group_by !== "none") {
    return `Leads ${formatLeadStatus(filters.status)} por ${formatCRMViewGroupByLabel(filters.group_by)}`;
  }
  if (filters.status) {
    return `Leads ${formatLeadStatus(filters.status)}`;
  }
  if (filters.group_by !== "none") {
    return `Leads por ${formatCRMViewGroupByLabel(filters.group_by)}`;
  }
  return "Visão de leads";
}

function getLeadTone(status: LeadItem["status"]) {
  if (status === "won") {
    return "navy";
  }
  if (status === "proposal") {
    return "warning";
  }
  if (status === "qualified") {
    return "accent";
  }
  return "muted";
}

export function LeadsPage() {
  const [items, setItems] = useState<LeadItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [savedViews, setSavedViews] = useState<SavedViewItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<LeadDetailItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedViewError, setSavedViewError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [groupBy, setGroupBy] = useState<CRMViewGroupBy>("none");
  const [activeSavedViewId, setActiveSavedViewId] = useState<number | null>(null);
  const [savedViewName, setSavedViewName] = useState("");
  const [savedViewDefault, setSavedViewDefault] = useState(false);
  const [savedViewSubmitting, setSavedViewSubmitting] = useState(false);
  const [savedViewDialogOpen, setSavedViewDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    contact_id: "",
    title: "",
    description: "",
    source: "",
    status: "new",
  });
  const statusStats = useMemo(
    () => ({
      new: items.filter((item) => item.status === "new").length,
      qualified: items.filter((item) => item.status === "qualified").length,
      proposal: items.filter((item) => item.status === "proposal").length,
      won: items.filter((item) => item.status === "won").length,
    }),
    [items],
  );
  const groupedItems = useMemo(() => buildLeadGroups(items, groupBy), [groupBy, items]);
  const currentFilters = useMemo<CRMViewFilters>(
    () => ({
      query,
      status: filterStatus,
      group_by: groupBy,
      list_view: "lista",
    }),
    [filterStatus, groupBy, query],
  );
  const activeSavedView = savedViews.find((view) => view.id === activeSavedViewId) || null;
  const safeContacts = ensureArray(contacts);
  const safeHistory = ensureArray(selectedDetail?.history);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    void loadLeads();
  }, [page, debouncedQuery, filterStatus]);

  useEffect(() => {
    if (!contactsLoaded && !contactsLoading) {
      void loadContacts();
    }
  }, [contactsLoaded, contactsLoading]);

  useEffect(() => {
    void loadLeadViews();
  }, []);

  async function loadLeads() {
    try {
      setError(null);
      const leadResponse = await apiRequest<LeadListResponse>(
        `/v1/crm/leads?page=${page}&page_size=${PAGE_SIZE}&query=${encodeURIComponent(debouncedQuery)}&status=${encodeURIComponent(filterStatus)}`,
      );
      setItems(ensureArray(leadResponse.items));
      setTotal(leadResponse.total);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar leads.");
    }
  }

  async function loadContacts() {
    setContactsLoading(true);
    try {
      const contactItems = await apiRequest<ContactItem[]>("/v1/crm/contacts");
      setContacts(ensureArray(contactItems));
      setContactsLoaded(true);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar contatos.");
    } finally {
      setContactsLoading(false);
    }
  }

  async function loadLeadViews() {
    try {
      setSavedViewError(null);
      const views = await loadSavedViews("leads");
      setSavedViews(views);
      if (activeSavedViewId !== null && !views.some((view) => view.id === activeSavedViewId)) {
        setActiveSavedViewId(null);
      }
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 404) {
        setSavedViews([]);
        return;
      }
      setSavedViewError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar visões salvas.");
    }
  }

  function populate(item: LeadItem) {
    setSelectedId(item.id);
    void loadDetail(item.id);
  }

  function populateForm(item: Pick<LeadItem, "contact_id" | "title" | "description" | "source" | "status">) {
    setForm({
      contact_id: item.contact_id ? String(item.contact_id) : "",
      title: item.title,
      description: item.description || "",
      source: item.source || "",
      status: item.status,
    });
  }

  async function loadDetail(leadId: number) {
    try {
      setError(null);
      setSelectedDetail(await apiRequest<LeadDetailItem>(`/v1/crm/leads/${leadId}`));
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar detalhe do lead.");
    }
  }

  function applySavedView(view: SavedViewItem) {
    const filters = normalizeCRMViewFilters(view.filters_json, "lista");
    setActiveSavedViewId(view.id);
    setQuery(filters.query);
    setDebouncedQuery(filters.query);
    setFilterStatus(filters.status);
    setGroupBy(filters.group_by);
    setPage(1);
    setSavedViewDefault(view.is_default);
  }

  function openSaveViewDialog() {
    const source = activeSavedView ? normalizeCRMViewFilters(activeSavedView.filters_json, "lista") : currentFilters;
    setSavedViewName(activeSavedView?.name || getLeadViewName(source));
    setSavedViewDefault(activeSavedView?.is_default || false);
    setSavedViewDialogOpen(true);
  }

  function resetViewSelection() {
    setActiveSavedViewId(null);
    setSavedViewName("");
    setSavedViewDefault(false);
  }

  async function refreshViews() {
    await loadLeadViews();
  }

  async function handleSaveView(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!savedViewName.trim()) {
      setSavedViewError("Informe um nome para a visão.");
      return;
    }

    setSavedViewSubmitting(true);
    try {
      const payload = buildSavedViewPayload({
        name: savedViewName.trim(),
        module: "leads",
        query,
        status: filterStatus,
        groupBy,
        listView: "lista",
        isDefault: savedViewDefault,
      });

      const savedView = activeSavedViewId
        ? await updateSavedView(activeSavedViewId, payload)
        : await createSavedView(payload);
      setActiveSavedViewId(savedView.id);
      setSavedViewDialogOpen(false);
      await refreshViews();
    } catch (saveError) {
      setSavedViewError(saveError instanceof ApiError ? saveError.message : "Falha ao salvar visão.");
    } finally {
      setSavedViewSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const payload = {
      contact_id: form.contact_id ? Number(form.contact_id) : null,
      title: form.title,
      description: form.description || null,
      source: form.source || null,
      status: form.status,
    };

    try {
      if (selectedId === null) {
        await apiRequest("/v1/crm/leads", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/v1/crm/leads/${selectedId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      setSelectedId(null);
      setSelectedDetail(null);
      setIsModalOpen(false);
      setForm({ contact_id: "", title: "", description: "", source: "", status: "new" });
      await loadLeads();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao salvar lead.");
    }
  }

  function resetForm() {
    setSelectedId(null);
    setSelectedDetail(null);
    setForm({ contact_id: "", title: "", description: "", source: "", status: "new" });
  }

  function openCreateModal() {
    resetForm();
    setIsModalOpen(true);
  }

  function openEditModal() {
    if (selectedDetail) {
      setSelectedId(selectedDetail.id);
      populateForm(selectedDetail);
      setIsModalOpen(true);
      return;
    }

    const selectedItem = items.find((item) => item.id === selectedId);
    if (!selectedItem) {
      return;
    }

    setSelectedId(selectedItem.id);
    populateForm(selectedItem);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function handleCreateOpportunity() {
    if (!selectedDetail) {
      return;
    }

    storeOpportunityDraftFromLead(selectedDetail);
    window.location.hash = "opportunities";
  }

  return (
    <PipelinePageShell
      eyebrow="CRM"
      title="Leads"
      description="Base de entrada, qualificação e leitura comercial com visibilidade por status, origem e empresa."
      actions={
        <PipelineActions>
          <PipelineButton onClick={selectedId !== null ? openEditModal : openCreateModal} variant="primary" type="button">
            <AppIcon name="add" />
            <span>{selectedId !== null ? "Editar lead" : "Novo lead"}</span>
          </PipelineButton>
          {selectedId !== null && (
            <PipelineButton onClick={resetForm} variant="ghost" type="button">
              <AppIcon name="close" />
              <span>Limpar foco</span>
            </PipelineButton>
          )}
          <PipelineButton onClick={openSaveViewDialog} variant="ghost" type="button">
            <AppIcon name="spark" />
            <span>{activeSavedView ? "Atualizar visão" : "Salvar visão"}</span>
          </PipelineButton>
        </PipelineActions>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.9fr)]">
        <PipelineCard className="space-y-6 p-6">
          <PipelineSectionHeader
            eyebrow="Fila comercial"
            title="Leads e visões"
            description="O recorte atual combina busca, filtros, agrupamento e salvamento de visões sem sair da mesma tela."
          />

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {savedViewError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-800">
              {savedViewError}
            </div>
          )}

          <PipelineMetricGrid columns={4}>
            <PipelineMetricCard label="Novos" value={statusStats.new} hint="leads recém-registrados" />
            <PipelineMetricCard label="Qualificados" value={statusStats.qualified} hint="leads prontos para diagnóstico" />
            <PipelineMetricCard label="Em proposta" value={statusStats.proposal} hint="em negociação comercial" />
            <PipelineMetricCard label="Ganhos" value={statusStats.won} hint="convertidos em operação" />
          </PipelineMetricGrid>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <PipelineField label="Buscar por título ou origem">
              <PipelineInput
                placeholder="Buscar por título ou origem"
                value={query}
                onChange={(event) => {
                  setPage(1);
                  resetViewSelection();
                  setQuery(event.target.value);
                }}
              />
            </PipelineField>

            <PipelineField label="Status">
              <PipelineSelect
                value={filterStatus}
                onChange={(event) => {
                  setPage(1);
                  resetViewSelection();
                  setFilterStatus(event.target.value);
                }}
              >
                <option value="">Todos os status</option>
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatLeadStatus(status)}
                  </option>
                ))}
              </PipelineSelect>
            </PipelineField>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <PipelineField label="Visão salva">
              <PipelineSelect
                value={activeSavedViewId ?? ""}
                onChange={(event) => {
                  const nextId = event.target.value ? Number(event.target.value) : null;
                  const nextView = savedViews.find((view) => view.id === nextId) || null;
                  if (nextView) {
                    applySavedView(nextView);
                    return;
                  }
                  resetViewSelection();
                }}
              >
                <option value="">Visão atual</option>
                {savedViews.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.name}
                    {view.is_default ? " (padrão)" : ""}
                  </option>
                ))}
              </PipelineSelect>
            </PipelineField>

            <PipelineField label="Agrupar por">
              <PipelineSelect
                value={groupBy}
                onChange={(event) => {
                  setPage(1);
                  resetViewSelection();
                  setGroupBy(event.target.value as CRMViewGroupBy);
                }}
              >
                {LEAD_GROUP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </PipelineSelect>
            </PipelineField>
          </div>

          <div className="flex flex-wrap gap-2">
            <PipelinePill tone="muted">{filterStatus ? `Filtro: ${formatLeadStatus(filterStatus)}` : "Todos os status"}</PipelinePill>
            <PipelinePill tone="muted">{query ? `Busca: ${query}` : "Busca livre"}</PipelinePill>
            <PipelinePill tone="accent">
              {groupBy === "none" ? "Lista simples" : `Agrupado por ${formatCRMViewGroupByLabel(groupBy)}`}
            </PipelinePill>
            <PipelinePill tone={selectedId !== null ? "navy" : "muted"}>
              {selectedId !== null ? `Lead ativo #${selectedId}` : "Nenhum lead ativo"}
            </PipelinePill>
          </div>

          <div className="space-y-5">
            {groupedItems.map((group) => (
              <section key={group.key} className="space-y-3">
                {groupedItems.length > 1 && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700">
                        Agrupamento
                      </span>
                      <h4 className="font-heading text-xl font-bold text-slate-900">{group.label}</h4>
                    </div>
                    <PipelinePill tone="muted">{group.items.length}</PipelinePill>
                  </div>
                )}

                <div className="grid gap-2">
                  {group.items.map((item) => {
                    const selected = selectedId === item.id;
                    return (
                      <button
                        key={item.id}
                        aria-pressed={selected}
                        className={
                          selected
                            ? "flex w-full flex-col gap-4 rounded-3xl border border-sky-300/60 bg-[linear-gradient(145deg,rgba(3,105,161,0.12),rgba(255,255,255,0.96))] px-4 py-4 text-left shadow-[0_14px_28px_rgba(17,32,49,0.08)] transition hover:-translate-y-0.5"
                            : "flex w-full flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
                        }
                        onClick={() => populate(item)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 space-y-1">
                            <h5 className="font-heading text-[15px] font-semibold leading-5 text-slate-900">
                              {item.title}
                            </h5>
                            <p className="truncate text-sm text-slate-600">
                              {item.company_name || "Sem empresa"}
                            </p>
                          </div>
                          <PipelinePill tone={getLeadTone(item.status)}>{formatLeadStatus(item.status)}</PipelinePill>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <PipelinePill tone="muted">{item.contact_name || "Sem contato"}</PipelinePill>
                          <PipelinePill tone="muted">{item.source || "Origem não informada"}</PipelinePill>
                          {item.next_activity && <PipelinePill tone="accent">{item.next_activity.title}</PipelinePill>}
                          {(item.overdue_activity_count || 0) > 0 && (
                            <PipelinePill tone="warning">{item.overdue_activity_count} atrasada(s)</PipelinePill>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                          <span className="uppercase tracking-[0.14em]">Criado em</span>
                          <span className="font-medium text-slate-700">{formatDateTime(item.created_at)}</span>
                        </div>
                      </button>
                    );
                  })}

                  {group.items.length === 0 && (
                    <PipelineEmpty>
                      <strong className="block font-heading text-sm font-semibold text-slate-900">
                        Nenhum lead encontrado
                      </strong>
                      <span>Ajuste a busca ou o status para abrir outro recorte comercial.</span>
                    </PipelineEmpty>
                  )}
                </div>
              </section>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-600">{total} registros</span>
            <div className="flex flex-wrap items-center gap-3">
              <PipelineButton disabled={page <= 1} onClick={() => setPage((current) => current - 1)} variant="ghost" type="button">
                Anterior
              </PipelineButton>
              <span className="text-sm text-slate-600">Página {page}</span>
              <PipelineButton
                disabled={page * PAGE_SIZE >= total}
                onClick={() => setPage((current) => current + 1)}
                variant="ghost"
                type="button"
              >
                Próxima
              </PipelineButton>
            </div>
          </div>
        </PipelineCard>

        <PipelineCard className="space-y-5 p-6">
          <PipelineSectionHeader
            eyebrow="Painel"
            title={selectedDetail ? selectedDetail.title : "Nenhum lead selecionado"}
            description={
              selectedDetail
                ? "O painel contextual mostra etapa, vínculo comercial, ações e histórico antes de qualquer edição."
                : "Selecione um lead na fila para ver contexto comercial, timeline e ações."
            }
          />

          {selectedDetail ? (
            <div className="space-y-5">
              <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-5 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  <PipelinePill tone={getLeadTone(selectedDetail.status)}>{formatLeadStatus(selectedDetail.status)}</PipelinePill>
                  <PipelinePill tone="muted">{selectedDetail.source || "Origem não informada"}</PipelinePill>
                </div>

                <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700">
                      Painel do lead
                    </span>
                    <p className="max-w-2xl text-sm leading-6 text-slate-600">
                      {selectedDetail.description || "Sem descrição."}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-600">
                    <div className="flex flex-wrap gap-2">
                      <PipelinePill tone="muted">{selectedDetail.company_name || "Sem empresa"}</PipelinePill>
                      <PipelinePill tone="muted">{selectedDetail.contact_name || "Sem contato"}</PipelinePill>
                    </div>
                    <span className="text-right text-xs uppercase tracking-[0.14em] text-slate-500">
                      {formatDateTime(selectedDetail.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <PipelineMetricCard label="Contato" value={selectedDetail.contact_name || "-"} hint="vínculo principal" />
                <PipelineMetricCard label="Empresa" value={selectedDetail.company_name || "-"} hint="conta associada" />
                <PipelineMetricCard label="Eventos" value={safeHistory.length} hint="mudanças registradas" />
              </div>

              <div className="grid gap-3 rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-sm md:grid-cols-3">
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                  <strong className="block font-heading text-lg text-slate-900">Próxima leitura</strong>
                  <p className="text-sm leading-6 text-slate-600">
                    {selectedDetail.status === "new" && "Validar origem e qualificar a necessidade."}
                    {selectedDetail.status === "qualified" && "Entrar em diagnóstico com informações completas."}
                    {selectedDetail.status === "diagnosis" && "Consolidar escopo para avançar à proposta."}
                    {selectedDetail.status === "proposal" && "Negociar e decidir avanço ou perda."}
                    {selectedDetail.status === "won" && "Lead convertido. Siga para oportunidade ou operação."}
                    {selectedDetail.status === "lost" && "Lead encerrado. Registrar aprendizado comercial."}
                  </p>
                </div>

                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                  <strong className="block font-heading text-lg text-slate-900">Contato principal</strong>
                  <p className="text-sm leading-6 text-slate-600">
                    {selectedDetail.contact_name || "Sem contato principal vinculado."}
                  </p>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                  <strong className="block font-heading text-lg text-slate-900">Próximo passo comercial</strong>
                  <p className="text-sm leading-6 text-slate-600">
                    Abra uma oportunidade pré-preenchida a partir deste lead quando o diagnóstico estiver pronto.
                  </p>
                  <PipelineActions>
                    <PipelineButton onClick={openEditModal} variant="ghost" type="button">
                      <AppIcon name="edit" />
                      <span>Editar lead</span>
                    </PipelineButton>
                    <PipelineButton onClick={handleCreateOpportunity} variant="primary" type="button">
                      <AppIcon name="spark" />
                      <span>Abrir oportunidade</span>
                    </PipelineButton>
                  </PipelineActions>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <PipelineMetricCard label="Contato" value={selectedDetail.contact_name || "-"} hint="vínculo principal" />
                <PipelineMetricCard label="Empresa" value={selectedDetail.company_name || "-"} hint="conta associada" />
                <PipelineMetricCard label="Origem" value={selectedDetail.source || "-"} hint="canal capturado" />
                <PipelineMetricCard label="Eventos" value={safeHistory.length} hint="mudanças registradas" />
              </div>

              <div className="space-y-3">
                <PipelineSectionHeader eyebrow="Timeline" title="Histórico do lead" />
                <div className="space-y-3">
                  {safeHistory.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                      <strong className="block font-heading text-sm text-slate-900">
                        {formatLeadStatus(entry.from_status || "new")} → {formatLeadStatus(entry.to_status)}
                      </strong>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{entry.note || entry.changed_by_email || "-"}</p>
                      <small className="mt-2 block text-xs text-slate-500">{formatDateTime(entry.changed_at)}</small>
                    </div>
                  ))}
                </div>
              </div>

              <ActivityPanel
                contextLabel="Atividade do lead para qualificar, retomar ou avançar sem sair do painel."
                emptyMessage="Nenhuma atividade registrada para este lead."
                entityId={selectedDetail.id}
                entityType="lead"
                initialActivities={selectedDetail.activities || []}
                initialNextActivity={selectedDetail.next_activity || null}
                initialOverdueActivityCount={selectedDetail.overdue_activity_count || 0}
                onChanged={() => loadDetail(selectedDetail.id)}
                title="Atividades do lead"
              />
            </div>
          ) : (
            <PipelineEmpty>
              <strong className="block font-heading text-sm font-semibold text-slate-900">
                Selecione um lead na fila
              </strong>
              <span>O painel contextual mostra etapa, vínculo comercial e histórico antes de qualquer edição.</span>
            </PipelineEmpty>
          )}
        </PipelineCard>
      </div>

      <QuickFormModal
        description="Ajuste o lead sem quebrar o contexto da fila comercial."
        onClose={closeModal}
        open={isModalOpen}
        title={selectedId === null ? "Novo lead" : "Editar lead"}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          {contactsLoading && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
              Carregando contatos de apoio...
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <PipelineField label="Contato">
              <PipelineSelect value={form.contact_id} onChange={(event) => setForm((current) => ({ ...current, contact_id: event.target.value }))}>
                <option value="">Sem vínculo</option>
                {safeContacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.full_name}
                  </option>
                ))}
              </PipelineSelect>
            </PipelineField>

            <PipelineField label="Status">
              <PipelineSelect value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatLeadStatus(status)}
                  </option>
                ))}
              </PipelineSelect>
            </PipelineField>
          </div>

          <PipelineField label="Título">
            <PipelineInput value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </PipelineField>

          <div className="grid gap-4 md:grid-cols-2">
            <PipelineField label="Origem">
              <PipelineInput value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} />
            </PipelineField>
            <PipelineField label="Descrição curta">
              <PipelineInput
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </PipelineField>
          </div>

          <PipelineActions>
            <PipelineButton variant="primary" type="submit">
              {selectedId === null ? "Criar lead" : "Salvar ajustes"}
            </PipelineButton>
            <PipelineButton onClick={closeModal} variant="ghost" type="button">
              Cancelar
            </PipelineButton>
          </PipelineActions>
        </form>
      </QuickFormModal>

      <QuickFormModal
        description="Salve o recorte atual para recuperar filtros e agrupamento com um clique."
        onClose={() => setSavedViewDialogOpen(false)}
        open={savedViewDialogOpen}
        title={activeSavedView ? "Atualizar visão" : "Salvar visão"}
      >
        <form className="grid gap-4" onSubmit={handleSaveView}>
          <PipelineField label="Nome da visão">
            <PipelineInput value={savedViewName} onChange={(event) => setSavedViewName(event.target.value)} />
          </PipelineField>

          <PipelineField label="Visão padrão">
            <PipelineSelect value={savedViewDefault ? "yes" : "no"} onChange={(event) => setSavedViewDefault(event.target.value === "yes")}>
              <option value="no">Não</option>
              <option value="yes">Sim</option>
            </PipelineSelect>
          </PipelineField>

          <PipelineActions>
            <PipelineButton disabled={savedViewSubmitting} type="submit" variant="primary">
              <AppIcon name="check" />
              <span>{savedViewSubmitting ? "Salvando..." : "Salvar visão"}</span>
            </PipelineButton>
            <PipelineButton onClick={() => setSavedViewDialogOpen(false)} type="button" variant="ghost">
              <AppIcon name="close" />
              <span>Cancelar</span>
            </PipelineButton>
          </PipelineActions>
        </form>
      </QuickFormModal>
    </PipelinePageShell>
  );
}

import { useEffect, useMemo, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import { consumeOpportunityDraft } from "../app/crmDrafts";
import { ActivityPanel } from "../app/ActivityPanel";
import { formatCurrency, formatDateTime } from "../app/format";
import { AppIcon } from "../app/icons";
import { formatOpportunityStatus, formatProjectStatus, OPPORTUNITY_STATUSES } from "../app/labels";
import { buildSavedViewPayload, formatCRMViewGroupByLabel, normalizeCRMViewFilters } from "../app/savedViews";
import { createSavedView, loadSavedViews, updateSavedView } from "../app/savedViewsApi";
import { QuickFormModal } from "../app/QuickFormModal";
import type {
  CRMViewGroupBy,
  LeadItem,
  LeadListResponse,
  OpportunityDetailItem,
  OpportunityItem,
  OpportunityListResponse,
  SavedViewItem,
} from "../app/types";

const PAGE_SIZE = 8;
const OPPORTUNITY_GROUP_OPTIONS: Array<{ value: CRMViewGroupBy; label: string }> = [
  { value: "none", label: "Sem agrupamento" },
  { value: "status", label: "Por status" },
  { value: "company", label: "Por empresa" },
  { value: "lead", label: "Por lead" },
];

type OpportunityGroup = {
  key: string;
  label: string;
  items: OpportunityItem[];
};

function formatDateOnly(value: string | null) {
  if (!value) {
    return "Sem data";
  }
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function getOpportunityGroupLabel(item: OpportunityItem, groupBy: CRMViewGroupBy) {
  if (groupBy === "status") {
    return formatOpportunityStatus(item.status);
  }
  if (groupBy === "company") {
    return item.company_name || "Sem empresa";
  }
  if (groupBy === "lead") {
    return item.lead_id ? `Lead #${item.lead_id}` : "Sem lead";
  }
  return "Oportunidades";
}

function buildOpportunityGroups(items: OpportunityItem[], groupBy: CRMViewGroupBy): OpportunityGroup[] {
  if (groupBy === "none") {
    return [{ key: "all", label: "Oportunidades", items }];
  }
  if (groupBy === "status") {
    return OPPORTUNITY_STATUSES.map((status) => ({
      key: status,
      label: formatOpportunityStatus(status),
      items: items.filter((item) => item.status === status),
    }));
  }

  const buckets = new Map<string, OpportunityItem[]>();
  for (const item of items) {
    const key = getOpportunityGroupLabel(item, groupBy);
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

function getOpportunityViewName(filters: { status: string; group_by: CRMViewGroupBy }) {
  if (filters.status && filters.group_by !== "none") {
    return `Oportunidades ${formatOpportunityStatus(filters.status)} por ${formatCRMViewGroupByLabel(filters.group_by)}`;
  }
  if (filters.status) {
    return `Oportunidades ${formatOpportunityStatus(filters.status)}`;
  }
  if (filters.group_by !== "none") {
    return `Oportunidades por ${formatCRMViewGroupByLabel(filters.group_by)}`;
  }
  return "Visão de oportunidades";
}

export function OpportunitiesPage() {
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [savedViews, setSavedViews] = useState<SavedViewItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<OpportunityDetailItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedViewError, setSavedViewError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [groupBy, setGroupBy] = useState<CRMViewGroupBy>("status");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [leadsLoaded, setLeadsLoaded] = useState(false);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [transitionNote, setTransitionNote] = useState("");
  const [kickoffSubmitting, setKickoffSubmitting] = useState(false);
  const [listView, setListView] = useState<"lista" | "pipeline">("pipeline");
  const [activeSavedViewId, setActiveSavedViewId] = useState<number | null>(null);
  const [savedViewName, setSavedViewName] = useState("");
  const [savedViewDefault, setSavedViewDefault] = useState(false);
  const [savedViewSubmitting, setSavedViewSubmitting] = useState(false);
  const [savedViewDialogOpen, setSavedViewDialogOpen] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [kickoffForm, setKickoffForm] = useState({
    project_name: "",
    kickoff_owner_email: "",
    kickoff_target_date: "",
    kickoff_notes: "",
  });
  const [form, setForm] = useState({
    lead_id: "",
    title: "",
    description: "",
    status: "open",
    amount: "",
  });
  const amountTotal = useMemo(() => items.reduce((sum, item) => sum + (item.amount || 0), 0), [items]);
  const statusStats = useMemo(
    () => ({
      open: items.filter((item) => item.status === "open").length,
      proposal: items.filter((item) => item.status === "proposal").length,
      won: items.filter((item) => item.status === "won").length,
      lost: items.filter((item) => item.status === "lost").length,
    }),
    [items],
  );
  const selectedListItem = items.find((item) => item.id === selectedId) || null;
  const groupedItems = useMemo(() => buildOpportunityGroups(items, groupBy), [groupBy, items]);
  const shouldShowPipeline = groupBy === "status" || (groupBy === "none" && listView === "pipeline");
  const activeSavedView = savedViews.find((view) => view.id === activeSavedViewId) || null;
  const safeLeads = ensureArray(leads);
  const safeNextStatuses = ensureArray(selectedDetail?.next_statuses);
  const safeHistory = ensureArray(selectedDetail?.history);
  const pipelineItems = useMemo(() => {
    return OPPORTUNITY_STATUSES.map((status) => ({
      status,
      items: items.filter((item) => item.status === status),
    }));
  }, [items]);
  const hasFilters = filterStatus.length > 0 || debouncedQuery.length > 0;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    void loadOpportunities();
  }, [page, debouncedQuery, filterStatus]);

  useEffect(() => {
    if (!leadsLoaded && !leadsLoading) {
      void loadLeads();
    }
  }, [leadsLoaded, leadsLoading]);

  useEffect(() => {
    void loadOpportunityViews();
  }, []);

  useEffect(() => {
    const draft = consumeOpportunityDraft();
    if (!draft) {
      return;
    }

    setSelectedId(null);
    setSelectedDetail(null);
    setForm({
      lead_id: draft.lead_id,
      title: draft.title,
      description: draft.description,
      status: "open",
      amount: draft.amount,
    });
    setDraftNotice("Rascunho trazido do lead selecionado. Revise e salve a oportunidade.");
    setIsModalOpen(true);
  }, []);

  async function loadOpportunities() {
    try {
      setError(null);
      const response = await apiRequest<OpportunityListResponse>(
        `/v1/crm/opportunities?page=${page}&page_size=${PAGE_SIZE}&query=${encodeURIComponent(debouncedQuery)}&status=${encodeURIComponent(filterStatus)}`,
      );
      setItems(ensureArray(response.items));
      setTotal(response.total);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar oportunidades.");
    }
  }

  async function loadLeads() {
    setLeadsLoading(true);
    try {
      const leadResponse = await apiRequest<LeadListResponse>("/v1/crm/leads?page=1&page_size=25");
      const leadItems = ensureArray(leadResponse.items);
      setLeads(ensureArray(leadItems));
      setLeadsLoaded(true);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar leads de apoio.");
    } finally {
      setLeadsLoading(false);
    }
  }

  async function loadOpportunityViews() {
    try {
      setSavedViewError(null);
      const views = await loadSavedViews("opportunities");
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

  async function handleTransition(toStatus: string) {
    if (selectedId === null) {
      return;
    }

    try {
      await apiRequest(`/v1/crm/opportunities/${selectedId}/transition`, {
        method: "POST",
        body: JSON.stringify({
          to_status: toStatus,
          note: transitionNote || null,
        }),
      });
      setTransitionNote("");
      await loadOpportunities();
      await loadDetail(selectedId);
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao executar transição da oportunidade.");
    }
  }

  async function handleKickoff() {
    if (selectedId === null) {
      return;
    }

    setKickoffSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/v1/crm/opportunities/${selectedId}/kickoff`, {
        method: "POST",
        body: JSON.stringify({
          project_name: kickoffForm.project_name || null,
          kickoff_owner_email: kickoffForm.kickoff_owner_email || null,
          kickoff_target_date: kickoffForm.kickoff_target_date || null,
          kickoff_notes: kickoffForm.kickoff_notes || null,
        }),
      });
      await loadOpportunities();
      await loadDetail(selectedId);
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao abrir kickoff da oportunidade.");
    } finally {
      setKickoffSubmitting(false);
    }
  }

  function populate(item: OpportunityItem) {
    setSelectedId(item.id);
    setDraftNotice(null);
    setForm({
      lead_id: item.lead_id ? String(item.lead_id) : "",
      title: item.title,
      description: item.description || "",
      status: item.status,
      amount: item.amount !== null ? String(item.amount) : "",
    });
    setKickoffForm({
      project_name: item.title,
      kickoff_owner_email: "",
      kickoff_target_date: "",
      kickoff_notes: "",
    });
    void loadDetail(item.id);
  }

  function populateForm(item: Pick<OpportunityItem, "lead_id" | "title" | "description" | "status" | "amount">) {
    setForm({
      lead_id: item.lead_id ? String(item.lead_id) : "",
      title: item.title,
      description: item.description || "",
      status: item.status,
      amount: item.amount !== null ? String(item.amount) : "",
    });
  }

  async function loadDetail(opportunityId: number) {
    try {
      setError(null);
      setSelectedDetail(await apiRequest<OpportunityDetailItem>(`/v1/crm/opportunities/${opportunityId}`));
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar detalhe da oportunidade.");
    }
  }

  function applySavedView(view: SavedViewItem) {
    const filters = normalizeCRMViewFilters(view.filters_json, "pipeline");
    setActiveSavedViewId(view.id);
    setQuery(filters.query);
    setDebouncedQuery(filters.query);
    setFilterStatus(filters.status);
    setGroupBy(filters.group_by);
    setListView(filters.list_view || "pipeline");
    setPage(1);
    setSavedViewDefault(view.is_default);
  }

  function openSaveViewDialog() {
    const source = activeSavedView ? normalizeCRMViewFilters(activeSavedView.filters_json, "pipeline") : {
      query,
      status: filterStatus,
      group_by: groupBy,
      list_view: listView,
    };
    setSavedViewName(activeSavedView?.name || getOpportunityViewName(source));
    setSavedViewDefault(activeSavedView?.is_default || false);
    setSavedViewDialogOpen(true);
  }

  function resetViewSelection() {
    setActiveSavedViewId(null);
    setSavedViewName("");
    setSavedViewDefault(false);
  }

  async function refreshViews() {
    await loadOpportunityViews();
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
        module: "opportunities",
        query,
        status: filterStatus,
        groupBy,
        listView,
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

  function resetForm() {
    setSelectedId(null);
    setSelectedDetail(null);
    setIsModalOpen(false);
    setDraftNotice(null);
    setTransitionNote("");
    setForm({ lead_id: "", title: "", description: "", status: "open", amount: "" });
    setKickoffForm({
      project_name: "",
      kickoff_owner_email: "",
      kickoff_target_date: "",
      kickoff_notes: "",
    });
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const payload = {
      lead_id: form.lead_id ? Number(form.lead_id) : null,
      title: form.title,
      description: form.description || null,
      status: form.status,
      amount: form.amount ? Number(form.amount) : null,
    };

    try {
      if (selectedId === null) {
        await apiRequest("/v1/crm/opportunities", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/v1/crm/opportunities/${selectedId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      await loadOpportunities();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao salvar oportunidade.");
    }
  }

  return (
    <section className="page-grid single">
      <section className="crm-console crm-console-wide">
        <article className="card crm-console-main">
          <div className="workspace-header workspace-header-compact workspace-header-with-stats">
            <div className="section-heading section-heading-compact">
              <span className="eyebrow">CRM</span>
              <h3>Oportunidades</h3>
            </div>
            <div className="workspace-stat-strip">
              <div className="workspace-stat-chip">
                <span>Abertas</span>
                <strong>{statusStats.open}</strong>
              </div>
              <div className="workspace-stat-chip">
                <span>Em proposta</span>
                <strong>{statusStats.proposal}</strong>
              </div>
              <div className="workspace-stat-chip">
                <span>Ganhas</span>
                <strong>{statusStats.won}</strong>
              </div>
              <div className="workspace-stat-chip workspace-stat-chip-wide">
                <span>Valor listado</span>
                <strong>{formatCurrency(amountTotal)}</strong>
              </div>
            </div>
            <div className="workspace-actions workspace-actions-tight">
              <button className="primary-button button-with-icon" onClick={selectedId !== null ? openEditModal : openCreateModal} type="button">
                <AppIcon name="add" />
                <span>{selectedId !== null ? "Editar oportunidade" : "Nova oportunidade"}</span>
              </button>
              {selectedId !== null && (
                <button className="ghost-button button-with-icon" onClick={resetForm} type="button">
                  <AppIcon name="close" />
                  <span>Limpar foco</span>
                </button>
              )}
            </div>
          </div>
          {error && <div className="inline-error">{error}</div>}
          {savedViewError && <div className="inline-note">{savedViewError}</div>}
          <div className="toolbar">
            <input
              placeholder="Buscar por título"
              value={query}
              onChange={(event) => {
                setPage(1);
                resetViewSelection();
                setQuery(event.target.value);
              }}
            />
            <select
              value={filterStatus}
              onChange={(event) => {
                setPage(1);
                resetViewSelection();
                setFilterStatus(event.target.value);
              }}
            >
              <option value="">Todos os status</option>
              {OPPORTUNITY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatOpportunityStatus(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="view-controls">
            <label className="view-control">
              <span>Visão salva</span>
              <select
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
              </select>
            </label>
            <label className="view-control">
              <span>Agrupar por</span>
              <select
                value={groupBy}
                onChange={(event) => {
                  setPage(1);
                  resetViewSelection();
                  const nextGroup = event.target.value as CRMViewGroupBy;
                  setGroupBy(nextGroup);
                  if (nextGroup === "status") {
                    setListView("pipeline");
                  }
                }}
              >
                {OPPORTUNITY_GROUP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="view-actions">
              <button className="ghost-button button-with-icon" onClick={openSaveViewDialog} type="button">
                <AppIcon name="spark" />
                <span>{activeSavedView ? "Atualizar visão" : "Salvar visão"}</span>
              </button>
              <button className="ghost-button button-with-icon" onClick={resetViewSelection} type="button">
                <AppIcon name="close" />
                <span>Limpar visão</span>
              </button>
            </div>
          </div>
          {groupBy === "none" && (
            <div className="panel-switcher panel-switcher-compact panel-switcher-wrap">
              <button
                className={listView === "pipeline" ? "ghost-button active-toggle" : "ghost-button"}
                onClick={() => {
                  setPage(1);
                  resetViewSelection();
                  setListView("pipeline");
                }}
                type="button"
              >
                Pipeline
              </button>
              <button
                className={listView === "lista" ? "ghost-button active-toggle" : "ghost-button"}
                onClick={() => {
                  setPage(1);
                  resetViewSelection();
                  setListView("lista");
                }}
                type="button"
              >
                Lista
              </button>
            </div>
          )}
          <div className="table-summary">
            <span>{total} oportunidades</span>
            <span>{hasFilters ? "Recorte filtrado" : "Carteira completa"}</span>
            <span>
              {groupBy === "none" ? (listView === "pipeline" ? "Pipeline" : "Lista") : `Agrupado por ${formatCRMViewGroupByLabel(groupBy)}`}
            </span>
          </div>
          <div className="status-board">
            {OPPORTUNITY_STATUSES.map((status) => (
              <button
                key={status}
                className={filterStatus === status ? "status-board-card active" : "status-board-card"}
                onClick={() => {
                  setPage(1);
                  resetViewSelection();
                  setFilterStatus((current) => (current === status ? "" : status));
                }}
                type="button"
              >
                <span>{formatOpportunityStatus(status)}</span>
                <strong>{statusStats[status]}</strong>
                <small>
                  {status === "open" && "entrada e descoberta"}
                  {status === "proposal" && "propostas em negociação"}
                  {status === "won" && "negócios prontos para operação"}
                  {status === "lost" && "oportunidades encerradas"}
                </small>
              </button>
            ))}
          </div>
          <div className="table-summary">
            <span>{filterStatus ? `Filtro: ${formatOpportunityStatus(filterStatus)}` : "Todos os status"}</span>
            <span>{query ? `Busca: ${query}` : "Busca livre"}</span>
            <span>{selectedId !== null ? `Oportunidade ativa #${selectedId}` : "Nenhuma oportunidade ativa"}</span>
          </div>
          {shouldShowPipeline ? (
            <div className="pipeline-grid">
              {pipelineItems.map((column) => (
                <article key={column.status} className="pipeline-column">
                  <div className="pipeline-column-head">
                    <div>
                      <span className="eyebrow">Etapa</span>
                      <h4>{formatOpportunityStatus(column.status)}</h4>
                    </div>
                    <span className="status-pill">{column.items.length}</span>
                  </div>
                  <div className="pipeline-stack">
                    {column.items.map((item) => (
                      <button
                        key={item.id}
                        className={selectedId === item.id ? "pipeline-card selected" : "pipeline-card"}
                        onClick={() => populate(item)}
                        type="button"
                      >
                        <strong>{item.title}</strong>
                        <span>{item.company_name || "Sem empresa"}</span>
                        <small>{item.contact_name || "Sem contato"}</small>
                        <b>{formatCurrency(item.amount)}</b>
                      </button>
                    ))}
                    {column.items.length === 0 && <div className="pipeline-empty">Sem oportunidades nesta etapa.</div>}
                  </div>
                </article>
              ))}
            </div>
          ) : groupBy !== "none" ? (
            <div className="grouped-records">
              {groupedItems.map((group) => (
                <section key={group.key} className="grouped-records-section">
                  <div className="grouped-records-head">
                    <div>
                      <span className="eyebrow">Agrupamento</span>
                      <h4>{group.label}</h4>
                    </div>
                    <span className="status-pill">{group.items.length}</span>
                  </div>
                  <div className="record-list">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        aria-pressed={selectedId === item.id}
                        className={selectedId === item.id ? "record-list-item selected" : "record-list-item"}
                        onClick={() => populate(item)}
                        type="button"
                      >
                        <div className="record-list-item-main">
                          <div className="record-list-item-head">
                            <strong>{item.title}</strong>
                            <span className={`status-pill status-${item.status}`}>{formatOpportunityStatus(item.status)}</span>
                          </div>
                          <div className="record-list-item-meta">
                            <span>{item.company_name || "Sem empresa"}</span>
                            <span>{item.contact_name || "Sem contato"}</span>
                            <span>{item.lead_id ? `Lead #${item.lead_id}` : "Sem lead"}</span>
                            {item.next_activity && <span>{item.next_activity.title}</span>}
                            {(item.overdue_activity_count || 0) > 0 && <span>{item.overdue_activity_count} atrasada(s)</span>}
                          </div>
                        </div>
                        <div className="record-list-item-side">
                          <small>Valor listado</small>
                          <span>{formatCurrency(item.amount)}</span>
                        </div>
                      </button>
                    ))}
                    {group.items.length === 0 && (
                      <div className="record-list-empty">
                        <strong>Nenhuma oportunidade encontrada</strong>
                        <p>Ajuste a busca ou o status para abrir outro recorte do pipeline.</p>
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="record-list">
              {items.map((item) => (
                <button
                  key={item.id}
                  aria-pressed={selectedId === item.id}
                  className={selectedId === item.id ? "record-list-item selected" : "record-list-item"}
                  onClick={() => populate(item)}
                  type="button"
                >
                  <div className="record-list-item-main">
                    <div className="record-list-item-head">
                      <strong>{item.title}</strong>
                      <span className={`status-pill status-${item.status}`}>{formatOpportunityStatus(item.status)}</span>
                    </div>
                    <div className="record-list-item-meta">
                      <span>{item.company_name || "Sem empresa"}</span>
                      <span>{item.contact_name || "Sem contato"}</span>
                      <span>{item.lead_id ? `Lead #${item.lead_id}` : "Sem lead"}</span>
                      {item.next_activity && <span>{item.next_activity.title}</span>}
                      {(item.overdue_activity_count || 0) > 0 && <span>{item.overdue_activity_count} atrasada(s)</span>}
                    </div>
                  </div>
                  <div className="record-list-item-side">
                    <small>Valor listado</small>
                    <span>{formatCurrency(item.amount)}</span>
                  </div>
                </button>
              ))}
              {items.length === 0 && (
                <div className="record-list-empty">
                  <strong>Nenhuma oportunidade encontrada</strong>
                  <p>Ajuste a busca ou o status para abrir outro recorte do pipeline.</p>
                </div>
              )}
            </div>
          )}
          <div className="pager">
            <span>{total} registros</span>
            <div className="pager-actions">
              <button className="ghost-button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">
                Anterior
              </button>
                <span>Página {page}</span>
                <button className="ghost-button" disabled={page * PAGE_SIZE >= total} onClick={() => setPage((current) => current + 1)} type="button">
                  Próxima
                </button>
              </div>
          </div>
        </article>

        <aside className="card crm-console-side">
          <div className="context-stack">
            {selectedDetail ? (
              <div className="detail-panel detail-panel-standalone">
              <div className="detail-hero">
                <div className="detail-badges">
                  <span className={`status-pill status-${selectedDetail.status}`}>
                    {formatOpportunityStatus(selectedDetail.status)}
                  </span>
                  <span className="status-pill detail-source">
                    {selectedDetail.lead_id ? `Lead #${selectedDetail.lead_id}` : "Sem lead"}
                  </span>
                </div>
                <div className="section-heading">
                  <span className="eyebrow">Registro em trabalho</span>
                  <h3>{selectedDetail.title}</h3>
                </div>
                <div className="detail-meta detail-meta-dense">
                  <span>{selectedDetail.company_name || "Sem empresa"}</span>
                  <span>{selectedDetail.contact_name || "Sem contato"}</span>
                  <span>{formatDateTime(selectedDetail.created_at)}</span>
                </div>
                <p>{selectedDetail.description || "Sem descrição."}</p>
              </div>

              <div className="record-action-bar">
                <div className="helper-card">
                  <strong>Próxima ação</strong>
                  <p>
                    {safeNextStatuses.length > 0
                      ? `Avance o negócio para ${formatOpportunityStatus(safeNextStatuses[0])} quando a negociação estiver pronta.`
                      : "Nenhuma transição adicional disponível para esta oportunidade."}
                  </p>
                </div>
                <div className="helper-card">
                  <strong>Contexto rápido</strong>
                  <p>
                    {selectedListItem?.company_name || "Sem empresa"} · {selectedListItem?.contact_name || "Sem contato"}
                  </p>
                </div>
                <div className="helper-card">
                  <strong>Ação rápida</strong>
                  <p>Faça ajustes comerciais sem desmontar a leitura do pipeline.</p>
                  <button className="ghost-button button-with-icon" onClick={openEditModal} type="button">
                    <AppIcon name="edit" />
                    <span>Editar oportunidade</span>
                  </button>
                </div>
              </div>

              <div className="crm-context-grid crm-context-grid-compact">
                <div className="metric-card">
                  <span>Valor</span>
                  <strong>{formatCurrency(selectedDetail.amount)}</strong>
                  <small>estimativa comercial atual</small>
                </div>
                <div className="metric-card">
                  <span>Próximos passos</span>
                  <strong>{safeNextStatuses.length}</strong>
                  <small>transições permitidas</small>
                </div>
                <div className="metric-card">
                  <span>Histórico</span>
                  <strong>{safeHistory.length}</strong>
                  <small>mudanças registradas</small>
                </div>
                <div className="metric-card">
                  <span>Lead</span>
                  <strong>{selectedDetail.lead_id || "-"}</strong>
                  <small>origem do negócio</small>
                </div>
              </div>

              <div className="detail-section detail-section-compact">
                <div className="section-heading">
                  <span className="eyebrow">Kickoff</span>
                  <h3>Ponte para operação</h3>
                </div>
                <div className="kickoff-card">
                  {selectedDetail.linked_project ? (
                    <>
                      <div>
                        <strong>{selectedDetail.linked_project.name}</strong>
                        <p>Projeto já aberto a partir desta oportunidade.</p>
                      </div>
                      <div className="detail-meta detail-meta-dense">
                        <span>Projeto #{selectedDetail.linked_project.id}</span>
                        <span>Status {formatProjectStatus(selectedDetail.linked_project.status)}</span>
                        <span>{selectedDetail.linked_project.kickoff_owner_email || "Sem responsável"}</span>
                        <span>{formatDateOnly(selectedDetail.linked_project.kickoff_target_date)}</span>
                      </div>
                    </>
                  ) : selectedDetail.can_open_project ? (
                    <>
                      <div>
                        <strong>Oportunidade pronta para kickoff</strong>
                        <p>Negócio ganho sem projeto operacional aberto. Use a ação abaixo para iniciar a entrega.</p>
                      </div>
                      <div className="task-form-grid task-form-grid-2">
                        <label className="field">
                          <span>Nome do projeto</span>
                          <input
                            value={kickoffForm.project_name}
                            onChange={(event) => setKickoffForm((current) => ({ ...current, project_name: event.target.value }))}
                          />
                        </label>
                        <label className="field">
                          <span>Responsável</span>
                          <input
                            value={kickoffForm.kickoff_owner_email}
                            onChange={(event) => setKickoffForm((current) => ({ ...current, kickoff_owner_email: event.target.value }))}
                            placeholder="pm@optus.com"
                          />
                        </label>
                        <label className="field">
                          <span>Data alvo</span>
                          <input
                            value={kickoffForm.kickoff_target_date}
                            onChange={(event) => setKickoffForm((current) => ({ ...current, kickoff_target_date: event.target.value }))}
                            type="date"
                          />
                        </label>
                        <label className="field">
                          <span>Notas iniciais</span>
                          <input
                            value={kickoffForm.kickoff_notes}
                            onChange={(event) => setKickoffForm((current) => ({ ...current, kickoff_notes: event.target.value }))}
                            placeholder="Primeiro alinhamento com operação"
                          />
                        </label>
                      </div>
                      <button className="primary-button button-with-icon" disabled={kickoffSubmitting} onClick={() => void handleKickoff()} type="button">
                        <AppIcon name="spark" />
                        {kickoffSubmitting ? "Abrindo projeto..." : "Abrir projeto"}
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <strong>Kickoff ainda indisponível</strong>
                        <p>O projeto operacional só pode ser aberto quando a oportunidade estiver em status ganho.</p>
                      </div>
                      <span className="status-pill">Aguardando ganho</span>
                    </>
                  )}
                </div>
              </div>

              <div className="detail-section detail-section-compact">
                <div className="section-heading">
                  <span className="eyebrow">Ações</span>
                  <h3>Fluxo comercial guiado</h3>
                </div>
                <label className="field">
                  <span>Nota da transição</span>
                  <textarea
                    value={transitionNote}
                    onChange={(event) => setTransitionNote(event.target.value)}
                    placeholder="Motivo do avanço, perda ou retorno de etapa"
                  />
                </label>
                <div className="form-actions">
                  {safeNextStatuses.map((status) => (
                    <button
                      key={status}
                      className="ghost-button button-with-icon"
                      onClick={() => void handleTransition(status)}
                      type="button"
                    >
                      <AppIcon name="spark" />
                      Ir para {formatOpportunityStatus(status)}
                    </button>
                  ))}
                  </div>
              </div>

              <div className="detail-section detail-section-compact">
                <div className="section-heading">
                  <span className="eyebrow">Timeline</span>
                  <h3>Histórico comercial</h3>
                </div>
                <ul className="history-list history-list-timeline">
                  {safeHistory.map((entry) => (
                    <li key={entry.id}>
                      <strong>
                        {formatOpportunityStatus(entry.from_status || "open")} → {formatOpportunityStatus(entry.to_status)}
                      </strong>
                      <span>{entry.note || entry.changed_by_email || "-"}</span>
                      <small>{formatDateTime(entry.changed_at)}</small>
                    </li>
                  ))}
                </ul>
              </div>
              <ActivityPanel
                contextLabel="Atividades da oportunidade para negociação, follow-up e preparo do próximo passo."
                emptyMessage="Nenhuma atividade registrada para esta oportunidade."
                entityId={selectedDetail.id}
                entityType="opportunity"
                initialActivities={selectedDetail.activities || []}
                initialNextActivity={selectedDetail.next_activity || null}
                initialOverdueActivityCount={selectedDetail.overdue_activity_count || 0}
                onChanged={() => loadDetail(selectedDetail.id)}
                title="Atividades da oportunidade"
              />
              </div>
            ) : (
              <div className="empty-state-panel">
                <strong>Selecione uma oportunidade</strong>
                <p>O painel lateral concentra leitura do negócio, transições e ponte para projeto sem misturar tudo na carteira.</p>
                <button className="primary-button button-with-icon" onClick={openCreateModal} type="button">
                  <AppIcon name="add" />
                  <span>Nova oportunidade</span>
                </button>
              </div>
            )}
          </div>
        </aside>
      </section>

      <QuickFormModal
        description="Edite o negócio sem sair da carteira ou perder o painel lateral."
        onClose={closeModal}
        open={isModalOpen}
        title={selectedId === null ? "Nova oportunidade" : "Editar oportunidade"}
      >
        <form className="form-card opportunity-form-shell" onSubmit={handleSubmit}>
          {draftNotice && <div className="inline-note">{draftNotice}</div>}
          {leadsLoading && <div className="empty-state-panel">Carregando leads de apoio...</div>}
          <div className="task-form-grid task-form-grid-2">
            <label className="field">
              <span>Lead</span>
              <select
                value={form.lead_id}
                onChange={(event) => setForm((current) => ({ ...current, lead_id: event.target.value }))}
              >
                <option value="">Sem lead</option>
                {safeLeads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                {OPPORTUNITY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatOpportunityStatus(status)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Título</span>
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <div className="task-form-grid task-form-grid-2">
            <label className="field">
              <span>Valor</span>
              <input
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                type="number"
              />
            </label>
            <label className="field">
              <span>Descrição curta</span>
              <input
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-button" type="submit">
              {selectedId === null ? "Criar oportunidade" : "Salvar ajustes"}
            </button>
            <button className="ghost-button" onClick={closeModal} type="button">
              Cancelar
            </button>
          </div>
        </form>
      </QuickFormModal>
      <QuickFormModal
        description="Salve o recorte atual com filtros, agrupamento e modo de exibição."
        onClose={() => setSavedViewDialogOpen(false)}
        open={savedViewDialogOpen}
        title={activeSavedView ? "Atualizar visão" : "Salvar visão"}
      >
        <form className="form-card" onSubmit={handleSaveView}>
          <label className="field">
            <span>Nome da visão</span>
            <input value={savedViewName} onChange={(event) => setSavedViewName(event.target.value)} />
          </label>
          <label className="field">
            <span>Visão padrão</span>
            <select value={savedViewDefault ? "yes" : "no"} onChange={(event) => setSavedViewDefault(event.target.value === "yes")}>
              <option value="no">Não</option>
              <option value="yes">Sim</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="primary-button button-with-icon" disabled={savedViewSubmitting} type="submit">
              <AppIcon name="check" />
              <span>{savedViewSubmitting ? "Salvando..." : "Salvar visão"}</span>
            </button>
            <button className="ghost-button button-with-icon" onClick={() => setSavedViewDialogOpen(false)} type="button">
              <AppIcon name="close" />
              <span>Cancelar</span>
            </button>
          </div>
        </form>
      </QuickFormModal>
    </section>
  );
}

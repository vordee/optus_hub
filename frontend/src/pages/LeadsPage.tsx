import { useEffect, useMemo, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import { storeOpportunityDraftFromLead } from "../app/crmDrafts";
import { ActivityPanel } from "../app/ActivityPanel";
import { formatDateTime } from "../app/format";
import { AppIcon } from "../app/icons";
import { formatLeadStatus, LEAD_STATUSES } from "../app/labels";
import { QuickFormModal } from "../app/QuickFormModal";
import type { ContactItem, LeadDetailItem, LeadItem, LeadListResponse } from "../app/types";

const PAGE_SIZE = 8;

export function LeadsPage() {
  const [items, setItems] = useState<LeadItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<LeadDetailItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
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
    <section className="page-grid single">
      <section className="crm-console">
        <article className="card crm-console-main">
          <div className="workspace-header workspace-header-compact workspace-header-with-stats">
            <div className="section-heading section-heading-compact">
              <span className="eyebrow">CRM</span>
              <h3>Leads</h3>
            </div>
            <div className="workspace-stat-strip">
              <div className="workspace-stat-chip">
                <span>Novos</span>
                <strong>{statusStats.new}</strong>
              </div>
              <div className="workspace-stat-chip">
                <span>Qualificados</span>
                <strong>{statusStats.qualified}</strong>
              </div>
              <div className="workspace-stat-chip">
                <span>Em proposta</span>
                <strong>{statusStats.proposal}</strong>
              </div>
              <div className="workspace-stat-chip">
                <span>Ganhos</span>
                <strong>{statusStats.won}</strong>
              </div>
            </div>
            <div className="workspace-actions">
              <button className="primary-button button-with-icon" onClick={selectedId !== null ? openEditModal : openCreateModal} type="button">
                <AppIcon name="add" />
                <span>{selectedId !== null ? "Editar lead" : "Novo lead"}</span>
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
          <div className="toolbar">
            <input
              placeholder="Buscar por título ou origem"
              value={query}
              onChange={(event) => {
                setPage(1);
                setQuery(event.target.value);
              }}
            />
            <select
              value={filterStatus}
              onChange={(event) => {
                setPage(1);
                setFilterStatus(event.target.value);
              }}
            >
              <option value="">Todos os status</option>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatLeadStatus(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="table-summary">
            <span>{filterStatus ? `Filtro: ${formatLeadStatus(filterStatus)}` : "Todos os status"}</span>
            <span>{query ? `Busca: ${query}` : "Busca livre"}</span>
            <span>{selectedId !== null ? `Lead ativo #${selectedId}` : "Nenhum lead ativo"}</span>
          </div>
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
                    <span className={`status-pill status-${item.status}`}>{formatLeadStatus(item.status)}</span>
                  </div>
                  <div className="record-list-item-meta">
                    <span>{item.company_name || "Sem empresa"}</span>
                    <span>{item.contact_name || "Sem contato"}</span>
                    <span>{item.source || "Origem não informada"}</span>
                  </div>
                </div>
                <div className="record-list-item-side">
                  <small>Criado em</small>
                  <span>{formatDateTime(item.created_at)}</span>
                </div>
              </button>
            ))}
            {items.length === 0 && (
              <div className="record-list-empty">
                <strong>Nenhum lead encontrado</strong>
                <p>Ajuste a busca ou o status para abrir outro recorte comercial.</p>
              </div>
            )}
          </div>
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
                  <span className={`status-pill status-${selectedDetail.status}`}>{formatLeadStatus(selectedDetail.status)}</span>
                  <span className="status-pill detail-source">{selectedDetail.source || "Origem não informada"}</span>
                </div>
                <div className="section-heading">
                  <span className="eyebrow">Painel do lead</span>
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
                  <strong>Próxima leitura</strong>
                  <p>
                    {selectedDetail.status === "new" && "Validar origem e qualificar a necessidade."}
                    {selectedDetail.status === "qualified" && "Entrar em diagnóstico com informações completas."}
                    {selectedDetail.status === "diagnosis" && "Consolidar escopo para avançar à proposta."}
                    {selectedDetail.status === "proposal" && "Negociar e decidir avanço ou perda."}
                    {selectedDetail.status === "won" && "Lead convertido. Siga para oportunidade ou operação."}
                    {selectedDetail.status === "lost" && "Lead encerrado. Registrar aprendizado comercial."}
                  </p>
                </div>
                <div className="helper-card">
                  <strong>Contato principal</strong>
                  <p>{selectedDetail.contact_name || "Sem contato principal vinculado."}</p>
                </div>
                <div className="helper-card">
                  <strong>Próximo passo comercial</strong>
                  <p>Abra uma oportunidade pré-preenchida a partir deste lead quando o diagnóstico estiver pronto.</p>
                  <div className="workspace-actions-tight">
                    <button className="ghost-button button-with-icon" onClick={openEditModal} type="button">
                      <AppIcon name="edit" />
                      <span>Editar lead</span>
                    </button>
                    <button className="ghost-button button-with-icon" onClick={handleCreateOpportunity} type="button">
                      <AppIcon name="spark" />
                      <span>Abrir oportunidade</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="crm-context-grid crm-context-grid-compact">
                <div className="metric-card">
                  <span>Contato</span>
                  <strong>{selectedDetail.contact_name || "-"}</strong>
                  <small>vínculo principal</small>
                </div>
                <div className="metric-card">
                  <span>Empresa</span>
                  <strong>{selectedDetail.company_name || "-"}</strong>
                  <small>conta associada</small>
                </div>
                <div className="metric-card">
                  <span>Origem</span>
                  <strong>{selectedDetail.source || "-"}</strong>
                  <small>canal capturado</small>
                </div>
                <div className="metric-card">
                  <span>Eventos</span>
                  <strong>{safeHistory.length}</strong>
                  <small>mudanças registradas</small>
                </div>
              </div>

              <div className="detail-section detail-section-compact">
                <div className="section-heading">
                  <span className="eyebrow">Timeline</span>
                  <h3>Histórico do lead</h3>
                </div>
                <ul className="history-list history-list-timeline">
                  {safeHistory.map((entry) => (
                    <li key={entry.id}>
                      <strong>{formatLeadStatus(entry.from_status || "new")} → {formatLeadStatus(entry.to_status)}</strong>
                      <span>{entry.note || entry.changed_by_email || "-"}</span>
                      <small>{formatDateTime(entry.changed_at)}</small>
                    </li>
                  ))}
                </ul>
              </div>
              <ActivityPanel
                contextLabel="Atividade do lead para qualificar, retomar ou avançar sem sair do painel."
                emptyMessage="Nenhuma atividade registrada para este lead."
                entityId={selectedDetail.id}
                entityType="lead"
                title="Atividades do lead"
              />
              </div>
            ) : (
              <div className="empty-state-panel">
                <strong>Selecione um lead na fila</strong>
                <p>O painel contextual mostra etapa, vínculo comercial e histórico antes de qualquer edição.</p>
              </div>
            )}
          </div>
        </aside>
      </section>

      <QuickFormModal
        description="Ajuste o lead sem quebrar o contexto da fila comercial."
        onClose={closeModal}
        open={isModalOpen}
        title={selectedId === null ? "Novo lead" : "Editar lead"}
      >
        <form className="form-card" onSubmit={handleSubmit}>
          {contactsLoading && <div className="empty-state-panel">Carregando contatos de apoio...</div>}
          <div className="task-form-grid task-form-grid-2">
            <label className="field">
              <span>Contato</span>
              <select value={form.contact_id} onChange={(event) => setForm((current) => ({ ...current, contact_id: event.target.value }))}>
                <option value="">Sem vínculo</option>
                {safeContacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatLeadStatus(status)}
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
              <span>Origem</span>
              <input value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} />
            </label>
            <label className="field">
              <span>Descrição curta</span>
              <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-button" type="submit">
              {selectedId === null ? "Criar lead" : "Salvar ajustes"}
            </button>
            <button className="ghost-button" onClick={closeModal} type="button">
              Cancelar
            </button>
          </div>
        </form>
      </QuickFormModal>
    </section>
  );
}

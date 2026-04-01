import { useEffect, useMemo, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import { storeOpportunityDraftFromLead } from "../app/crmDrafts";
import { formatDateTime } from "../app/format";
import { formatLeadStatus, LEAD_STATUSES } from "../app/labels";
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
    setForm({
      contact_id: item.contact_id ? String(item.contact_id) : "",
      title: item.title,
      description: item.description || "",
      source: item.source || "",
      status: item.status,
    });
    void loadDetail(item.id);
  }

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, item: LeadItem) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    populate(item);
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

  function handleCreateOpportunity() {
    if (!selectedDetail) {
      return;
    }

    storeOpportunityDraftFromLead(selectedDetail);
    window.location.hash = "opportunities";
  }

  return (
    <section className="page-grid single">
      <article className="card">
        <div className="section-heading">
          <span className="eyebrow">CRM</span>
          <h3>Leads</h3>
          <p className="section-copy">
            Resumo rápido no topo, cadastro logo em seguida e a tabela no final da página.
          </p>
        </div>
        {error && <div className="inline-error">{error}</div>}
        <div className="crm-summary-grid compact-summary-grid">
          <div className="metric-card">
            <span>Novos</span>
            <strong>{statusStats.new}</strong>
            <small>entrada recente da página</small>
          </div>
          <div className="metric-card">
            <span>Qualificados</span>
            <strong>{statusStats.qualified}</strong>
            <small>prontos para diagnóstico</small>
          </div>
          <div className="metric-card">
            <span>Em proposta</span>
            <strong>{statusStats.proposal}</strong>
            <small>negociação ativa</small>
          </div>
          <div className="metric-card">
            <span>Ganhos</span>
            <strong>{statusStats.won}</strong>
            <small>conversão no recorte atual</small>
          </div>
        </div>
      </article>

      <article className="card">
        <div className="stacked-card-sections">
          <form className="form-card" onSubmit={handleSubmit}>
            <div className="section-heading">
              <span className="eyebrow">Cadastro</span>
              <h3>{selectedId === null ? "Novo lead" : "Editar lead"}</h3>
            </div>
            {contactsLoading && <div className="empty-state-panel">Carregando contatos de apoio...</div>}
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
              <span>Título</span>
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="field">
              <span>Descrição</span>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label className="field">
              <span>Origem</span>
              <input value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} />
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
            <div className="form-actions">
              <button className="primary-button" type="submit">
                {selectedId === null ? "Criar lead" : "Atualizar lead"}
              </button>
              {selectedId !== null && (
                <button className="ghost-button" onClick={resetForm} type="button">
                  Limpar edição
                </button>
              )}
            </div>
          </form>
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
                  <button className="ghost-button" onClick={handleCreateOpportunity} type="button">
                    Abrir oportunidade
                  </button>
                </div>
              </div>

              <div className="crm-context-grid">
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

              <div className="detail-section">
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
            </div>
          ) : (
            <div className="empty-state-panel">
              <strong>Selecione um lead na lista</strong>
              <p>O painel do lead concentra contexto, leitura da etapa e histórico sem cair direto em edição.</p>
            </div>
          )}
        </div>
      </article>

      <article className="card">
        <div className="section-heading">
          <span className="eyebrow">Tabela</span>
          <h3>Base de leads</h3>
        </div>
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
          <span>{total} leads encontrados</span>
          <span>{filterStatus ? `Filtro: ${formatLeadStatus(filterStatus)}` : "Todos os status"}</span>
          <span>{query ? `Busca: ${query}` : "Busca livre"}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Empresa</th>
                <th>Contato</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  aria-selected={selectedId === item.id}
                  className={selectedId === item.id ? "selected-row" : ""}
                  onClick={() => populate(item)}
                  onKeyDown={(event) => handleRowKeyDown(event, item)}
                  role="button"
                  tabIndex={0}
                >
                  <td>{item.title}</td>
                  <td>{item.company_name || "-"}</td>
                  <td>{item.contact_name || "-"}</td>
                  <td><span className={`status-pill status-${item.status}`}>{formatLeadStatus(item.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span>{total} registros</span>
          <div className="pager-actions">
            <button className="ghost-button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button">Anterior</button>
            <span>Página {page}</span>
            <button className="ghost-button" disabled={page * PAGE_SIZE >= total} onClick={() => setPage((current) => current + 1)} type="button">Próxima</button>
          </div>
        </div>
      </article>
    </section>
  );
}

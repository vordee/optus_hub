import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { formatDateTime } from "../app/format";
import type { ContactItem, LeadDetailItem, LeadItem, LeadListResponse } from "../app/types";

const LEAD_STATUSES = ["new", "qualified", "diagnosis", "proposal", "won", "lost"];
const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Novo",
  qualified: "Qualificado",
  diagnosis: "Diagnóstico",
  proposal: "Proposta",
  won: "Ganho",
  lost: "Perdido",
};

function formatStatusLabel(status: string) {
  return LEAD_STATUS_LABELS[status] || status;
}

export function LeadsPage() {
  const [items, setItems] = useState<LeadItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<LeadDetailItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({
    contact_id: "",
    title: "",
    description: "",
    source: "",
    status: "new",
  });
  const statusStats = {
    new: items.filter((item) => item.status === "new").length,
    qualified: items.filter((item) => item.status === "qualified").length,
    proposal: items.filter((item) => item.status === "proposal").length,
    won: items.filter((item) => item.status === "won").length,
  };

  useEffect(() => {
    void load();
  }, [page, query, filterStatus]);

  async function load() {
    try {
      setError(null);
      const [leadResponse, contactItems] = await Promise.all([
        apiRequest<LeadListResponse>(
          `/v1/crm/leads?page=${page}&page_size=8&query=${encodeURIComponent(query)}&status=${encodeURIComponent(filterStatus)}`,
        ),
        apiRequest<ContactItem[]>("/v1/crm/contacts"),
      ]);
      setItems(leadResponse.items);
      setTotal(leadResponse.total);
      setContacts(contactItems);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar leads.");
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
      await load();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao salvar lead.");
    }
  }

  return (
    <section className="page-grid">
      <article className="card">
        <div className="section-heading">
          <span className="eyebrow">CRM</span>
          <h3>Leads</h3>
        </div>
        {error && <div className="inline-error">{error}</div>}
        <div className="toolbar">
          <input placeholder="Buscar por título ou origem" value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} />
          <select value={filterStatus} onChange={(event) => { setPage(1); setFilterStatus(event.target.value); }}>
            <option value="">Todos os status</option>
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className="crm-summary-grid">
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
        <div className="table-summary">
          <span>{total} leads encontrados</span>
          <span>{filterStatus ? `Filtro: ${formatStatusLabel(filterStatus)}` : "Todos os status"}</span>
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
                  className={selectedId === item.id ? "selected-row" : ""}
                  onClick={() => populate(item)}
                >
                  <td>{item.title}</td>
                  <td>{item.company_name || "-"}</td>
                  <td>{item.contact_name || "-"}</td>
                  <td><span className={`status-pill status-${item.status}`}>{formatStatusLabel(item.status)}</span></td>
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
            <button className="ghost-button" disabled={page * 8 >= total} onClick={() => setPage((current) => current + 1)} type="button">Próxima</button>
          </div>
        </div>
      </article>

      <article className="card">
        <form className="form-card" onSubmit={handleSubmit}>
          <label className="field">
            <span>Contato</span>
            <select
              value={form.contact_id}
              onChange={(event) => setForm((current) => ({ ...current, contact_id: event.target.value }))}
            >
              <option value="">Sem vínculo</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Título</span>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Descrição</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Origem</span>
            <input
              value={form.source}
              onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" type="submit">
            {selectedId === null ? "Criar lead" : "Atualizar lead"}
          </button>
        </form>
        {selectedDetail && (
          <div className="detail-panel">
            <div className="detail-hero">
              <div className="detail-badges">
                <span className={`status-pill status-${selectedDetail.status}`}>{formatStatusLabel(selectedDetail.status)}</span>
                <span className="status-pill detail-source">{selectedDetail.source || "Origem não informada"}</span>
              </div>
              <div className="section-heading">
                <span className="eyebrow">Lead selecionado</span>
                <h3>{selectedDetail.title}</h3>
              </div>
              <div className="detail-meta detail-meta-dense">
                <span>{selectedDetail.company_name || "Sem empresa"}</span>
                <span>{selectedDetail.contact_name || "Sem contato"}</span>
                <span>{formatDateTime(selectedDetail.created_at)}</span>
              </div>
              <p>{selectedDetail.description || "Sem descrição."}</p>
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
                <strong>{selectedDetail.history.length}</strong>
                <small>mudanças registradas</small>
              </div>
            </div>
            <div className="detail-section">
              <div className="section-heading">
                <span className="eyebrow">Timeline</span>
                <h3>Histórico do lead</h3>
              </div>
            <ul className="history-list history-list-timeline">
              {selectedDetail.history.map((entry) => (
                <li key={entry.id}>
                  <strong>{formatStatusLabel(entry.from_status || "new")} → {formatStatusLabel(entry.to_status)}</strong>
                  <span>{entry.note || entry.changed_by_email || "-"}</span>
                  <small>{formatDateTime(entry.changed_at)}</small>
                </li>
              ))}
            </ul>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}

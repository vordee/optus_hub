import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { formatCurrency, formatDateTime } from "../app/format";
import type { LeadItem, OpportunityDetailItem, OpportunityItem, OpportunityListResponse } from "../app/types";

const OPPORTUNITY_STATUSES = ["open", "proposal", "won", "lost"];

export function OpportunitiesPage() {
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<OpportunityDetailItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [transitionNote, setTransitionNote] = useState("");
  const [form, setForm] = useState({
    lead_id: "",
    title: "",
    description: "",
    status: "open",
    amount: "",
  });

  useEffect(() => {
    void load();
  }, [page, query, filterStatus]);

  async function load() {
    try {
      const [response, leadItems] = await Promise.all([
        apiRequest<OpportunityListResponse>(
          `/v1/crm/opportunities?page=${page}&page_size=8&query=${encodeURIComponent(query)}&status=${encodeURIComponent(filterStatus)}`,
        ),
        apiRequest<LeadItem[]>("/v1/crm/leads"),
      ]);
      setItems(response.items);
      setTotal(response.total);
      setLeads(leadItems);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar oportunidades.");
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
      await load();
      await loadDetail(selectedId);
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao executar transição da oportunidade.");
    }
  }

  function populate(item: OpportunityItem) {
    setSelectedId(item.id);
    setForm({
      lead_id: item.lead_id ? String(item.lead_id) : "",
      title: item.title,
      description: item.description || "",
      status: item.status,
      amount: item.amount !== null ? String(item.amount) : "",
    });
    void loadDetail(item.id);
  }

  async function loadDetail(opportunityId: number) {
    try {
      setSelectedDetail(await apiRequest<OpportunityDetailItem>(`/v1/crm/opportunities/${opportunityId}`));
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar detalhe da oportunidade.");
    }
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
      setSelectedId(null);
      setSelectedDetail(null);
      setForm({ lead_id: "", title: "", description: "", status: "open", amount: "" });
      await load();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao salvar oportunidade.");
    }
  }

  return (
    <section className="page-grid">
      <article className="card">
        <div className="section-heading">
          <span className="eyebrow">CRM</span>
          <h3>Oportunidades</h3>
        </div>
        {error && <div className="inline-error">{error}</div>}
        <div className="toolbar">
          <input placeholder="Buscar por título" value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} />
          <select value={filterStatus} onChange={(event) => { setPage(1); setFilterStatus(event.target.value); }}>
            <option value="">Todos os status</option>
            {OPPORTUNITY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Empresa</th>
                <th>Status</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} onClick={() => populate(item)}>
                  <td>{item.title}</td>
                  <td>{item.company_name || "-"}</td>
                  <td>{item.status}</td>
                  <td>{formatCurrency(item.amount)}</td>
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
            <span>Lead</span>
            <select
              value={form.lead_id}
              onChange={(event) => setForm((current) => ({ ...current, lead_id: event.target.value }))}
            >
              <option value="">Sem lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.title}
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
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              {OPPORTUNITY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Valor</span>
            <input
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              type="number"
            />
          </label>
          <button className="primary-button" type="submit">
            {selectedId === null ? "Criar oportunidade" : "Atualizar oportunidade"}
          </button>
        </form>
        {selectedDetail && (
          <div className="detail-panel">
            <div className="section-heading">
              <span className="eyebrow">Detalhe</span>
              <h3>{selectedDetail.title}</h3>
            </div>
            <p>{selectedDetail.description || "Sem descrição."}</p>
            <p><strong>Valor:</strong> {formatCurrency(selectedDetail.amount)}</p>
            <div className="detail-section">
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
                {selectedDetail.next_statuses.map((status) => (
                  <button
                    key={status}
                    className="ghost-button"
                    onClick={() => void handleTransition(status)}
                    type="button"
                  >
                    Ir para {status}
                  </button>
                ))}
              </div>
            </div>
            <ul className="history-list">
              {selectedDetail.history.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.from_status || "inicial"} → {entry.to_status}</strong>
                  <span>{entry.changed_by_email || "-"}</span>
                  <small>{formatDateTime(entry.changed_at)}</small>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </section>
  );
}

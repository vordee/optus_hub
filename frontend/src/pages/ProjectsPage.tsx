import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { formatDateTime } from "../app/format";
import type {
  CompanyItem,
  ContactItem,
  OpportunityItem,
  OpportunityListResponse,
  ProjectDetailItem,
  ProjectItem,
  ProjectListResponse,
} from "../app/types";

const PROJECT_STATUSES = ["planned", "active", "on_hold", "completed"];
const PAGE_SIZE = 8;

export function ProjectsPage() {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ProjectDetailItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    opportunity_id: "",
    company_id: "",
    contact_id: "",
    name: "",
    status: "planned",
    description: "",
  });

  useEffect(() => {
    void load();
  }, [page, query, filterStatus]);

  const selectedOpportunity = opportunities.find((item) => String(item.id) === form.opportunity_id) || null;

  async function load() {
    try {
      const [projectResponse, companyItems, contactItems, opportunityResponse] = await Promise.all([
        apiRequest<ProjectListResponse>(
          `/v1/projects?page=${page}&page_size=${PAGE_SIZE}&query=${encodeURIComponent(query)}&status=${encodeURIComponent(filterStatus)}`,
        ),
        apiRequest<CompanyItem[]>("/v1/crm/companies"),
        apiRequest<ContactItem[]>("/v1/crm/contacts"),
        apiRequest<OpportunityListResponse>("/v1/crm/opportunities?page=1&page_size=100"),
      ]);
      setItems(projectResponse.items);
      setTotal(projectResponse.total);
      setCompanies(companyItems);
      setContacts(contactItems);
      setOpportunities(opportunityResponse.items);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar projetos.");
    }
  }

  function populate(item: ProjectItem) {
    setSelectedId(item.id);
    setForm({
      opportunity_id: item.opportunity_id ? String(item.opportunity_id) : "",
      company_id: item.company_id ? String(item.company_id) : "",
      contact_id: item.contact_id ? String(item.contact_id) : "",
      name: item.name,
      status: item.status,
      description: item.description || "",
    });
    void loadDetail(item.id);
  }

  async function loadDetail(projectId: number) {
    try {
      setSelectedDetail(await apiRequest<ProjectDetailItem>(`/v1/projects/${projectId}`));
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar detalhe do projeto.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      opportunity_id: form.opportunity_id ? Number(form.opportunity_id) : null,
      company_id: form.company_id ? Number(form.company_id) : null,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
      name: form.name,
      status: form.status,
      description: form.description || null,
    };

    try {
      if (selectedId === null) {
        await apiRequest("/v1/projects", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/v1/projects/${selectedId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: payload.name,
            status: payload.status,
            description: payload.description,
          }),
        });
      }
      resetForm();
      await load();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao salvar projeto.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateFromOpportunity() {
    if (!form.opportunity_id) {
      setError("Selecione uma oportunidade para gerar o projeto.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      await apiRequest(`/v1/projects/from-opportunity/${form.opportunity_id}`, {
        method: "POST",
      });
      resetForm();
      await load();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao gerar projeto pela oportunidade.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSelectedId(null);
    setSelectedDetail(null);
    setForm({
      opportunity_id: "",
      company_id: "",
      contact_id: "",
      name: "",
      status: "planned",
      description: "",
    });
  }

  return (
    <section className="page-grid">
      <article className="card">
        <div className="section-heading">
          <span className="eyebrow">Entrega</span>
          <h3>Projetos</h3>
          <p className="section-copy">
            Projetos nascem do funil ou podem ser cadastrados manualmente quando a
            operação precisar iniciar antes do fechamento formal.
          </p>
        </div>

        {error && <div className="inline-error">{error}</div>}

        <div className="toolbar">
          <input
            placeholder="Buscar por nome, empresa ou contato"
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
            {PROJECT_STATUSES.map((status) => (
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
                <th>Nome</th>
                <th>Empresa</th>
                <th>Contato</th>
                <th>Status</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} onClick={() => populate(item)}>
                  <td>{item.name}</td>
                  <td>{item.company_name || "-"}</td>
                  <td>{item.contact_name || "-"}</td>
                  <td><span className={`status-pill status-${item.status}`}>{item.status}</span></td>
                  <td>{item.opportunity_id ? `Oportunidade #${item.opportunity_id}` : "Manual"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pager">
          <span>{total} registros</span>
          <div className="pager-actions">
            <button
              className="ghost-button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              Anterior
            </button>
            <span>Página {page}</span>
            <button
              className="ghost-button"
              disabled={page * PAGE_SIZE >= total}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Próxima
            </button>
          </div>
        </div>
      </article>

      <article className="card">
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="section-heading">
            <span className="eyebrow">Cadastro</span>
            <h3>{selectedId === null ? "Novo projeto" : "Editar projeto"}</h3>
          </div>

          <label className="field">
            <span>Oportunidade vinculada</span>
            <select
              value={form.opportunity_id}
              onChange={(event) => setForm((current) => ({ ...current, opportunity_id: event.target.value }))}
            >
              <option value="">Sem vínculo</option>
              {opportunities.map((opportunity) => (
                <option key={opportunity.id} value={opportunity.id}>
                  {opportunity.title} {opportunity.status !== "won" ? `(${opportunity.status})` : "(won)"}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Empresa</span>
            <select
              value={form.company_id}
              onChange={(event) => setForm((current) => ({ ...current, company_id: event.target.value }))}
            >
              <option value="">Sem vínculo</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.legal_name}
                </option>
              ))}
            </select>
          </label>

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
            <span>Nome</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Descrição</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          <div className="form-actions">
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? "Salvando..." : selectedId === null ? "Criar projeto" : "Atualizar projeto"}
            </button>
            <button
              className="ghost-button"
              disabled={submitting || !selectedOpportunity || selectedOpportunity.status !== "won"}
              onClick={handleCreateFromOpportunity}
              type="button"
            >
              Gerar do funil
            </button>
          </div>

          <div className="helper-card">
            <strong>Fluxo sugerido</strong>
            <p>
              Se a oportunidade já estiver em `won`, o botão gera o projeto diretamente.
              Caso contrário, o cadastro manual mantém a flexibilidade operacional.
            </p>
            {selectedOpportunity && (
              <small>
                Selecionada: {selectedOpportunity.title} ({selectedOpportunity.status})
              </small>
            )}
          </div>
        </form>

        <div className="detail-panel">
          <div className="section-heading">
            <span className="eyebrow">Detalhe</span>
            <h3>{selectedDetail?.name || "Nenhum projeto selecionado"}</h3>
          </div>
          {selectedDetail ? (
            <>
              <div className="detail-meta">
                <span>{selectedDetail.company_name || "Sem empresa"}</span>
                <span>{selectedDetail.contact_name || "Sem contato"}</span>
                <span>{formatDateTime(selectedDetail.created_at)}</span>
              </div>
              <p>{selectedDetail.description || "Sem descrição."}</p>
              <ul className="history-list">
                {selectedDetail.history.map((entry) => (
                  <li key={entry.id}>
                    <strong>
                      {entry.from_status || "inicial"} → {entry.to_status}
                    </strong>
                    <span>{entry.changed_by_email || "-"}</span>
                    <small>{formatDateTime(entry.changed_at)}</small>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>Selecione um projeto para acompanhar histórico e contexto operacional.</p>
          )}
        </div>
      </article>
    </section>
  );
}

import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import { formatDateTime } from "../app/format";
import { formatOpportunityStatus } from "../app/labels";
import type { CompanyItem, ContactItem, LeadItem, OpportunityItem, OpportunityListResponse } from "../app/types";

export function CompaniesPage() {
  const [items, setItems] = useState<CompanyItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    legal_name: "",
    trade_name: "",
    tax_id: "",
    is_active: true,
  });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setError(null);
      const [companyItems, contactItems, leadItems, opportunityResponse] = await Promise.all([
        apiRequest<CompanyItem[]>("/v1/crm/companies"),
        apiRequest<ContactItem[]>("/v1/crm/contacts"),
        apiRequest<LeadItem[]>("/v1/crm/leads"),
        apiRequest<OpportunityListResponse>("/v1/crm/opportunities?page=1&page_size=100"),
      ]);
      setItems(ensureArray(companyItems));
      setContacts(ensureArray(contactItems));
      setLeads(ensureArray(leadItems));
      setOpportunities(ensureArray(opportunityResponse.items));
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar empresas.");
    }
  }

  function populate(item: CompanyItem) {
    setSelectedId(item.id);
    setForm({
      legal_name: item.legal_name,
      trade_name: item.trade_name || "",
      tax_id: item.tax_id || "",
      is_active: item.is_active,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = {
      legal_name: form.legal_name,
      trade_name: form.trade_name || null,
      tax_id: form.tax_id || null,
      is_active: form.is_active,
    };

    try {
      if (selectedId === null) {
        await apiRequest("/v1/crm/companies", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/v1/crm/companies/${selectedId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      setSelectedId(null);
      setForm({ legal_name: "", trade_name: "", tax_id: "", is_active: true });
      await load();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao salvar empresa.");
    }
  }

  const safeItems = ensureArray(items);
  const selectedCompany = safeItems.find((item) => item.id === selectedId) || null;
  const relatedContacts = ensureArray(contacts).filter((item) => item.company_id === selectedId);
  const relatedLeads = ensureArray(leads).filter((item) => item.company_id === selectedId);
  const relatedOpportunities = ensureArray(opportunities).filter((item) => item.company_id === selectedId);
  const activeCompanies = safeItems.filter((item) => item.is_active).length;

  return (
    <section className="page-grid single">
      <article className="card">
        <div className="section-heading">
          <span className="eyebrow">CRM</span>
          <h3>Empresas</h3>
          <p className="section-copy">
            Indicadores compactos primeiro, cadastro logo abaixo e a tabela da base no final.
          </p>
        </div>
        {error && <div className="inline-error">{error}</div>}
        <div className="crm-summary-grid compact-summary-grid">
          <div className="metric-card">
            <span>Contas</span>
            <strong>{safeItems.length}</strong>
            <small>base cadastrada</small>
          </div>
          <div className="metric-card">
            <span>Ativas</span>
            <strong>{activeCompanies}</strong>
            <small>prontas para operação</small>
          </div>
          <div className="metric-card">
            <span>Contatos</span>
            <strong>{ensureArray(contacts).length}</strong>
            <small>pessoas vinculadas</small>
          </div>
          <div className="metric-card">
            <span>Oportunidades</span>
            <strong>{ensureArray(opportunities).length}</strong>
            <small>negócios visíveis</small>
          </div>
        </div>
      </article>

      <article className="card">
        <div className="stacked-card-sections">
          <form className="form-card" onSubmit={handleSubmit}>
            <div className="section-heading">
              <span className="eyebrow">Cadastro</span>
              <h3>{selectedId === null ? "Nova empresa" : "Editar empresa"}</h3>
            </div>
            <label className="field">
              <span>Razão social</span>
              <input value={form.legal_name} onChange={(event) => setForm((current) => ({ ...current, legal_name: event.target.value }))} />
            </label>
            <label className="field">
              <span>Nome fantasia</span>
              <input value={form.trade_name} onChange={(event) => setForm((current) => ({ ...current, trade_name: event.target.value }))} />
            </label>
            <label className="field">
              <span>CNPJ / Tax ID</span>
              <input value={form.tax_id} onChange={(event) => setForm((current) => ({ ...current, tax_id: event.target.value }))} />
            </label>
            <label className="check-field">
              <input checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} type="checkbox" />
              <span>Empresa ativa</span>
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit">
                {selectedId === null ? "Criar empresa" : "Atualizar empresa"}
              </button>
            </div>
          </form>

          {selectedCompany ? (
            <div className="detail-panel detail-panel-standalone">
              <div className="detail-hero">
                <div className="detail-badges">
                  <span className="status-pill">{selectedCompany.is_active ? "Conta ativa" : "Conta inativa"}</span>
                  <span className="status-pill detail-source">{selectedCompany.tax_id || "Sem CNPJ / Tax ID"}</span>
                </div>
                <div className="section-heading">
                  <span className="eyebrow">Painel da conta</span>
                  <h3>{selectedCompany.trade_name || selectedCompany.legal_name}</h3>
                </div>
                <div className="detail-meta detail-meta-dense">
                  <span>{selectedCompany.legal_name}</span>
                  <span>{formatDateTime(selectedCompany.created_at)}</span>
                </div>
              </div>

              <div className="crm-context-grid">
                <div className="metric-card">
                  <span>Contatos</span>
                  <strong>{relatedContacts.length}</strong>
                  <small>pessoas ligadas à conta</small>
                </div>
                <div className="metric-card">
                  <span>Leads</span>
                  <strong>{relatedLeads.length}</strong>
                  <small>demandas em origem</small>
                </div>
                <div className="metric-card">
                  <span>Oportunidades</span>
                  <strong>{relatedOpportunities.length}</strong>
                  <small>negócios em andamento</small>
                </div>
                <div className="metric-card">
                  <span>Última movimentação</span>
                  <strong>{relatedOpportunities[0] ? formatOpportunityStatus(relatedOpportunities[0].status) : "-"}</strong>
                  <small>recorte operacional atual</small>
                </div>
              </div>

              <div className="detail-section">
                <div className="section-heading">
                  <span className="eyebrow">Relacionamentos</span>
                  <h3>Pessoas e demandas</h3>
                </div>
                <div className="cockpit-grid">
                  <div className="helper-card">
                    <strong>Contatos principais</strong>
                    <p>{relatedContacts.length === 0 ? "Nenhum contato vinculado." : relatedContacts.slice(0, 3).map((item) => item.full_name).join(" · ")}</p>
                  </div>
                  <div className="helper-card">
                    <strong>Leads recentes</strong>
                    <p>{relatedLeads.length === 0 ? "Nenhum lead vinculado." : relatedLeads.slice(0, 3).map((item) => item.title).join(" · ")}</p>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <div className="section-heading">
                  <span className="eyebrow">Oportunidades</span>
                  <h3>Carteira da conta</h3>
                </div>
                <ul className="task-list">
                  {relatedOpportunities.map((item) => (
                    <li key={item.id} className="task-item">
                      <div className="task-item-main">
                        <strong>{item.title}</strong>
                        <p>{item.description || "Sem descrição."}</p>
                        <div className="detail-meta">
                          <span>{item.contact_name || "Sem contato"}</span>
                          <span>{formatDateTime(item.created_at)}</span>
                        </div>
                      </div>
                      <div className="task-item-actions">
                        <span className={`status-pill status-${item.status}`}>{formatOpportunityStatus(item.status)}</span>
                      </div>
                    </li>
                  ))}
                  {relatedOpportunities.length === 0 && <li className="task-empty">Nenhuma oportunidade ligada a esta conta.</li>}
                </ul>
              </div>
            </div>
          ) : (
            <div className="empty-state-panel">
              <strong>Selecione uma empresa na tabela</strong>
              <p>O painel da conta mostra contexto comercial sem te jogar direto em um formulário.</p>
            </div>
          )}
        </div>
      </article>

      <article className="card">
        <div className="section-heading">
          <span className="eyebrow">Tabela</span>
          <h3>Base de empresas</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Razão social</th>
                <th>Fantasia</th>
                <th>Contatos</th>
                <th>Leads</th>
              </tr>
            </thead>
            <tbody>
              {safeItems.map((item) => (
                <tr key={item.id} className={selectedId === item.id ? "selected-row" : ""} onClick={() => populate(item)}>
                  <td>{item.legal_name}</td>
                  <td>{item.trade_name || "-"}</td>
                  <td>{item.contact_count}</td>
                  <td>{item.lead_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

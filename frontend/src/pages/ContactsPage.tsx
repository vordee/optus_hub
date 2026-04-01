import { useEffect, useMemo, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import { formatDateTime } from "../app/format";
import { AppIcon } from "../app/icons";
import { QuickFormModal } from "../app/QuickFormModal";
import type { CompanyItem, ContactItem } from "../app/types";

type ContactFormState = {
  company_id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  is_active: boolean;
};

const EMPTY_FORM: ContactFormState = {
  company_id: "",
  full_name: "",
  email: "",
  phone: "",
  position: "",
  is_active: true,
};

function matchesContact(contact: ContactItem, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    contact.full_name,
    contact.email,
    contact.phone,
    contact.position,
    contact.company_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function ContactsPage() {
  const [items, setItems] = useState<ContactItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [contacts, companyItems] = await Promise.all([
        apiRequest<ContactItem[]>("/v1/crm/contacts"),
        apiRequest<CompanyItem[]>("/v1/crm/companies"),
      ]);
      setItems(ensureArray(contacts));
      setCompanies(ensureArray(companyItems));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar contatos.");
    } finally {
      setLoading(false);
    }
  }

  const safeItems = ensureArray(items);
  const safeCompanies = ensureArray(companies);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    return safeItems.filter((item) => {
      if (activeOnly && !item.is_active) {
        return false;
      }
      return matchesContact(item, normalizedQuery);
    });
  }, [safeItems, normalizedQuery, activeOnly]);

  const stats = useMemo(
    () => ({
      total: safeItems.length,
      active: safeItems.filter((item) => item.is_active).length,
      withEmail: safeItems.filter((item) => Boolean(item.email)).length,
      withCompany: safeItems.filter((item) => Boolean(item.company_id)).length,
    }),
    [safeItems],
  );

  const selectedContact = safeItems.find((item) => item.id === selectedId) || null;

  function populate(item: ContactItem) {
    setSelectedId(item.id);
    setForm({
      company_id: item.company_id ? String(item.company_id) : "",
      full_name: item.full_name,
      email: item.email || "",
      phone: item.phone || "",
      position: item.position || "",
      is_active: item.is_active,
    });
  }

  function startCreate() {
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  }

  function startEdit() {
    if (!selectedContact) {
      return;
    }

    populate(selectedContact);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function resetFormState() {
    setSelectedId(null);
    setForm(EMPTY_FORM);
  }

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, item: ContactItem) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    populate(item);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = {
      company_id: form.company_id ? Number(form.company_id) : null,
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      position: form.position || null,
      is_active: form.is_active,
    };

    try {
      if (selectedId === null) {
        await apiRequest("/v1/crm/contacts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/v1/crm/contacts/${selectedId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      resetFormState();
      await load();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao salvar contato.");
    }
  }

  return (
    <section className="page-grid single">
      <article className="card">
        <div className="section-heading">
          <span className="eyebrow">CRM</span>
          <h3>Contatos</h3>
          <p className="section-copy">
            Indicadores compactos primeiro, cadastro logo abaixo e a tabela sempre no final.
          </p>
        </div>

        {error && <div className="inline-error">{error}</div>}

        <div className="crm-summary-grid compact-summary-grid">
          <div className="metric-card">
            <span>Total</span>
            <strong>{stats.total}</strong>
            <small>cadastros na base</small>
          </div>
          <div className="metric-card">
            <span>Ativos</span>
            <strong>{stats.active}</strong>
            <small>pessoas em uso</small>
          </div>
          <div className="metric-card">
            <span>Com email</span>
            <strong>{stats.withEmail}</strong>
            <small>canal de contato</small>
          </div>
          <div className="metric-card">
            <span>Com empresa</span>
            <strong>{stats.withCompany}</strong>
            <small>vínculos comerciais</small>
          </div>
        </div>
      </article>

      <article className="card">
        <div className="stacked-card-sections">
          <div className="detail-panel detail-panel-standalone contacts-detail-panel">
            <div className="workspace-header workspace-header-compact">
              <div className="section-heading section-heading-compact">
                <span className="eyebrow">Painel do contato</span>
                <h3>{selectedContact?.full_name || "Nenhum contato selecionado"}</h3>
                <p className="section-copy">
                  O painel mostra contexto humano do contato sem tirar o foco da base.
                </p>
              </div>
              <div className="workspace-actions">
                <button className="primary-button button-with-icon" onClick={startCreate} type="button">
                  <AppIcon name="add" />
                  <span>Novo contato</span>
                </button>
                {selectedContact && (
                  <button className="ghost-button button-with-icon" onClick={startEdit} type="button">
                    <AppIcon name="edit" />
                    <span>Editar</span>
                  </button>
                )}
              </div>
            </div>

            {selectedContact ? (
              <div className="detail-hero">
                <div className="detail-badges">
                  <span className={selectedContact.is_active ? "status-pill status-active" : "status-pill status-on_hold"}>
                    {selectedContact.is_active ? "Ativo" : "Inativo"}
                  </span>
                  <span className="status-pill detail-source">{selectedContact.company_name || "Sem empresa"}</span>
                </div>
                <div className="detail-meta detail-meta-dense">
                  <span>{selectedContact.email || "Sem email"}</span>
                  <span>{selectedContact.phone || "Sem telefone"}</span>
                  <span>{selectedContact.position || "Sem cargo"}</span>
                  <span>{formatDateTime(selectedContact.created_at)}</span>
                </div>
                <p>
                  {selectedContact.company_name
                    ? `Contato vinculado à empresa ${selectedContact.company_name}.`
                    : "Contato ainda sem vínculo com uma empresa."}
                </p>
              </div>
            ) : (
              <div className="empty-state-panel">
                <strong>Selecione um contato</strong>
                <p>Toque em uma linha da lista para abrir o contexto operacional desse registro.</p>
              </div>
            )}
          </div>
        </div>
      </article>

      <article className="card">
        <div className="section-heading">
          <span className="eyebrow">Tabela</span>
          <h3>Base de contatos</h3>
        </div>

        <div className="toolbar contacts-toolbar">
          <input
            placeholder="Buscar por nome, empresa, email, telefone ou cargo"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select value={activeOnly ? "active" : ""} onChange={(event) => setActiveOnly(event.target.value === "active")}>
            <option value="">Todos</option>
            <option value="active">Somente ativos</option>
          </select>
          <button className="primary-button button-with-icon" onClick={startCreate} type="button">
            <AppIcon name="add" />
            <span>Novo contato</span>
          </button>
        </div>

        <div className="table-summary">
          <span>{filteredItems.length} resultados</span>
          <span>{activeOnly ? "Filtrando só ativos" : "Incluindo inativos"}</span>
          <span>{query ? `Busca: ${query}` : "Busca livre"}</span>
        </div>

        {loading ? (
          <div className="empty-state-panel">Carregando contatos...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Empresa</th>
                  <th>Email</th>
                  <th>Cargo</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    aria-selected={selectedId === item.id}
                    className={selectedId === item.id ? "selected-row" : ""}
                    onClick={() => populate(item)}
                    onKeyDown={(event) => handleRowKeyDown(event, item)}
                    role="button"
                    tabIndex={0}
                  >
                    <td>{item.full_name}</td>
                    <td>{item.company_name || "-"}</td>
                    <td>{item.email || "-"}</td>
                    <td>{item.position || "-"}</td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state-panel">
                        <strong>Nenhum contato encontrado</strong>
                        <p>Refine a busca ou crie um novo contato pela ação ao lado.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <QuickFormModal
        description="Cadastro curto para criar ou corrigir um contato sem perder a lista de vista."
        onClose={closeModal}
        open={isModalOpen}
        title={selectedId === null ? "Novo contato" : "Editar contato"}
      >
        <form className="form-card" onSubmit={handleSubmit}>
          <label className="field">
            <span>Empresa</span>
            <select
              value={form.company_id}
              onChange={(event) => setForm((current) => ({ ...current, company_id: event.target.value }))}
            >
              <option value="">Sem vínculo</option>
              {safeCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.legal_name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Nome</span>
            <input
              value={form.full_name}
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
            />
          </label>
          <div className="task-form-grid task-form-grid-2">
            <label className="field">
              <span>Email</span>
              <input
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Telefone</span>
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>
          </div>
          <label className="field">
            <span>Cargo</span>
            <input
              value={form.position}
              onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))}
            />
          </label>
          <label className="check-field">
            <input
              checked={form.is_active}
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
              type="checkbox"
            />
            <span>Contato ativo</span>
          </label>
          <div className="form-actions">
            <button className="primary-button" type="submit">
              {selectedId === null ? "Criar contato" : "Atualizar contato"}
            </button>
            <button
              className="ghost-button"
              onClick={() => {
                closeModal();
                resetFormState();
              }}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </form>
      </QuickFormModal>
    </section>
  );
}

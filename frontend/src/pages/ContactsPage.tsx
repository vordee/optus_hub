import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import type { CompanyItem, ContactItem } from "../app/types";

export function ContactsPage() {
  const [items, setItems] = useState<ContactItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    company_id: "",
    full_name: "",
    email: "",
    phone: "",
    position: "",
    is_active: true,
  });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const [contacts, companyItems] = await Promise.all([
        apiRequest<ContactItem[]>("/v1/crm/contacts"),
        apiRequest<CompanyItem[]>("/v1/crm/companies"),
      ]);
      setItems(ensureArray(contacts));
      setCompanies(ensureArray(companyItems));
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar contatos.");
    }
  }

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
      setSelectedId(null);
      setForm({ company_id: "", full_name: "", email: "", phone: "", position: "", is_active: true });
      await load();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao salvar contato.");
    }
  }

  return (
    <section className="page-grid">
      <article className="card">
        <div className="section-heading">
          <span className="eyebrow">CRM</span>
          <h3>Contatos</h3>
        </div>
        {error && <div className="inline-error">{error}</div>}
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
              {items.map((item) => (
                <tr key={item.id} onClick={() => populate(item)}>
                  <td>{item.full_name}</td>
                  <td>{item.company_name || "-"}</td>
                  <td>{item.email || "-"}</td>
                  <td>{item.position || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card">
        <form className="form-card" onSubmit={handleSubmit}>
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
            <span>Nome</span>
            <input
              value={form.full_name}
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
            />
          </label>
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
          <button className="primary-button" type="submit">
            {selectedId === null ? "Criar contato" : "Atualizar contato"}
          </button>
        </form>
      </article>
    </section>
  );
}

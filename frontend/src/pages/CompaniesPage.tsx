import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import type { CompanyItem } from "../app/types";

export function CompaniesPage() {
  const [items, setItems] = useState<CompanyItem[]>([]);
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
      setItems(await apiRequest<CompanyItem[]>("/v1/crm/companies"));
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

  return (
    <CrudLayout
      title="Empresas"
      eyebrow="CRM"
      error={error}
      form={
        <form className="form-card" onSubmit={handleSubmit}>
          <label className="field">
            <span>Razão social</span>
            <input
              value={form.legal_name}
              onChange={(event) => setForm((current) => ({ ...current, legal_name: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Nome fantasia</span>
            <input
              value={form.trade_name}
              onChange={(event) => setForm((current) => ({ ...current, trade_name: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>CNPJ / Tax ID</span>
            <input
              value={form.tax_id}
              onChange={(event) => setForm((current) => ({ ...current, tax_id: event.target.value }))}
            />
          </label>
          <label className="check-field">
            <input
              checked={form.is_active}
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
              type="checkbox"
            />
            <span>Empresa ativa</span>
          </label>
          <button className="primary-button" type="submit">
            {selectedId === null ? "Criar empresa" : "Atualizar empresa"}
          </button>
        </form>
      }
      table={
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
            {items.map((item) => (
              <tr key={item.id} onClick={() => populate(item)}>
                <td>{item.legal_name}</td>
                <td>{item.trade_name || "-"}</td>
                <td>{item.contact_count}</td>
                <td>{item.lead_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    />
  );
}

function CrudLayout({
  title,
  eyebrow,
  form,
  table,
  error,
}: {
  title: string;
  eyebrow: string;
  form: React.ReactNode;
  table: React.ReactNode;
  error: string | null;
}) {
  return (
    <section className="page-grid">
      <article className="card">
        <div className="section-heading">
          <span className="eyebrow">{eyebrow}</span>
          <h3>{title}</h3>
        </div>
        {error && <div className="inline-error">{error}</div>}
        <div className="table-wrap">{table}</div>
      </article>
      <article className="card">{form}</article>
    </section>
  );
}

import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import type { PermissionItem, RoleItem } from "../app/types";

export function RolesPage() {
  const [items, setItems] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    permission_codes: [] as string[],
  });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const [roles, permissionItems] = await Promise.all([
        apiRequest<RoleItem[]>("/v1/admin/roles"),
        apiRequest<PermissionItem[]>("/v1/admin/permissions"),
      ]);
      setItems(ensureArray(roles));
      setPermissions(ensureArray(permissionItems));
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar papéis.");
    }
  }

  function populateFromItem(item: RoleItem) {
    setSelectedId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      permission_codes: item.permissions,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (selectedId === null) {
        await apiRequest("/v1/admin/roles", {
          method: "POST",
          body: JSON.stringify(form),
        });
      } else {
        await apiRequest(`/v1/admin/roles/${selectedId}`, {
          method: "PATCH",
          body: JSON.stringify({
            description: form.description,
            permission_codes: form.permission_codes,
          }),
        });
      }

      setSelectedId(null);
      setForm({ name: "", description: "", permission_codes: [] });
      await load();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao salvar papel.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-grid">
      <article className="card">
        <div className="section-heading">
          <span className="eyebrow">Admin</span>
          <h3>Papéis</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Permissões</th>
              </tr>
            </thead>
            <tbody>
              {ensureArray(items).map((item) => (
                <tr key={item.id} onClick={() => populateFromItem(item)}>
                  <td>{item.name}</td>
                  <td>{item.description}</td>
                  <td>{ensureArray(item.permissions).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card">
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="section-heading">
            <span className="eyebrow">Controle</span>
            <h3>{selectedId === null ? "Novo papel" : "Editar papel"}</h3>
          </div>

          <label className="field">
            <span>Nome</span>
            <input
              disabled={selectedId !== null}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>Descrição</span>
            <input
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>Permissões</span>
            <select
              multiple
              value={form.permission_codes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  permission_codes: Array.from(event.target.selectedOptions).map((option) => option.value),
                }))
              }
            >
              {ensureArray(permissions).map((permission) => (
                <option key={permission.code} value={permission.code}>
                  {permission.code}
                </option>
              ))}
            </select>
          </label>

          {error && <div className="inline-error">{error}</div>}

          <div className="form-actions">
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? "Salvando..." : selectedId === null ? "Criar papel" : "Atualizar papel"}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}

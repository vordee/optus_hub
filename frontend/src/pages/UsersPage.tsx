import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import type { RoleItem, UserItem } from "../app/types";

export function UsersPage() {
  const [items, setItems] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    password: "",
    role_names: [] as string[],
    is_active: true,
    is_superuser: false,
  });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const [users, roleItems] = await Promise.all([
        apiRequest<UserItem[]>("/v1/admin/users"),
        apiRequest<RoleItem[]>("/v1/admin/roles"),
      ]);
      setItems(ensureArray(users));
      setRoles(ensureArray(roleItems));
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar usuários.");
    }
  }

  function populateFromItem(item: UserItem) {
    setSelectedId(item.id);
    setForm({
      email: item.email,
      full_name: item.full_name,
      password: "",
      role_names: item.roles,
      is_active: item.is_active,
      is_superuser: item.is_superuser,
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (selectedId === null) {
        await apiRequest("/v1/admin/users", {
          method: "POST",
          body: JSON.stringify(form),
        });
      } else {
        await apiRequest(`/v1/admin/users/${selectedId}`, {
          method: "PATCH",
          body: JSON.stringify({
            full_name: form.full_name,
            password: form.password || undefined,
            role_names: form.role_names,
            is_active: form.is_active,
            is_superuser: form.is_superuser,
          }),
        });
      }

      setSelectedId(null);
      setForm({
        email: "",
        full_name: "",
        password: "",
        role_names: [],
        is_active: true,
        is_superuser: false,
      });
      await load();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao salvar usuário.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-grid">
      <article className="card">
        <div className="section-heading">
          <span className="eyebrow">Admin</span>
          <h3>Usuários</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Nome</th>
                <th>Papéis</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} onClick={() => populateFromItem(item)}>
                  <td>{item.email}</td>
                  <td>{item.full_name}</td>
                  <td>{ensureArray(item.roles).join(", ") || "-"}</td>
                  <td>{item.is_active ? "Ativo" : "Inativo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card">
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="section-heading">
            <span className="eyebrow">Cadastro</span>
            <h3>{selectedId === null ? "Novo usuário" : "Editar usuário"}</h3>
          </div>

          <label className="field">
            <span>Email</span>
            <input
              disabled={selectedId !== null}
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>Nome completo</span>
            <input
              value={form.full_name}
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>Senha {selectedId !== null ? "(opcional)" : ""}</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>Papéis</span>
            <select
              multiple
              value={form.role_names}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  role_names: Array.from(event.target.selectedOptions).map((option) => option.value),
                }))
              }
            >
              {ensureArray(roles).map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          <label className="check-field">
            <input
              checked={form.is_active}
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
              type="checkbox"
            />
            <span>Usuário ativo</span>
          </label>

          <label className="check-field">
            <input
              checked={form.is_superuser}
              onChange={(event) => setForm((current) => ({ ...current, is_superuser: event.target.checked }))}
              type="checkbox"
            />
            <span>Superusuário</span>
          </label>

          {error && <div className="inline-error">{error}</div>}

          <div className="form-actions">
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? "Salvando..." : selectedId === null ? "Criar usuário" : "Atualizar usuário"}
            </button>
            {selectedId !== null && (
              <button
                className="ghost-button"
                onClick={() => {
                  setSelectedId(null);
                  setForm({
                    email: "",
                    full_name: "",
                    password: "",
                    role_names: [],
                    is_active: true,
                    is_superuser: false,
                  });
                }}
                type="button"
              >
                Limpar
              </button>
            )}
          </div>
        </form>
      </article>
    </section>
  );
}

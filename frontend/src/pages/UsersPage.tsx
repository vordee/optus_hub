import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import type { RoleItem, UserItem } from "../app/types";
import {
  Badge,
  ButtonRow,
  CheckboxField,
  EmptyState,
  FormField,
  InlineAlert,
  PageHeader,
  PageShell,
  Panel,
  PanelBody,
  TableShell,
  buttonGhostClassName,
  buttonPrimaryClassName,
  inputClassName,
  selectClassName,
} from "../components/tw/ui";

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

  function resetForm() {
    setSelectedId(null);
    setForm({
      email: "",
      full_name: "",
      password: "",
      role_names: [],
      is_active: true,
      is_superuser: false,
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

      resetForm();
      await load();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao salvar usuário.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Admin"
        title="Usuários"
        description="Cadastro, papéis e status de acesso com leitura direta da base real."
      />

      {error && <InlineAlert>{error}</InlineAlert>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
        <Panel>
          <PanelBody className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Base</span>
                <h3 className="font-heading text-xl font-bold text-foreground">Lista de usuários</h3>
              </div>
              <Badge tone="muted">{items.length} registros</Badge>
            </div>

            <TableShell>
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Papéis</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      aria-selected={selectedId === item.id}
                      className="cursor-pointer align-top hover:bg-slate-50/80"
                      onClick={() => populateFromItem(item)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{item.email}</td>
                      <td className="px-4 py-3 text-slate-700">{item.full_name}</td>
                      <td className="px-4 py-3 text-slate-600">{ensureArray(item.roles).join(", ") || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={item.is_active ? "inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700" : "inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700"}>
                          {item.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td className="px-4 py-8" colSpan={4}>
                        <EmptyState
                          description="Crie o primeiro usuário para começar a distribuir acesso no sistema."
                          title="Nenhum usuário encontrado"
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableShell>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelBody className="space-y-4">
            <div className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Cadastro</span>
              <h3 className="font-heading text-xl font-bold text-foreground">
                {selectedId === null ? "Novo usuário" : "Editar usuário"}
              </h3>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <FormField label="Email" hint={selectedId !== null ? "Não pode ser alterado na edição." : undefined}>
                <input
                  disabled={selectedId !== null}
                  className={inputClassName}
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </FormField>

              <FormField label="Nome completo">
                <input
                  className={inputClassName}
                  value={form.full_name}
                  onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                />
              </FormField>

              <FormField label={`Senha ${selectedId !== null ? "(opcional)" : ""}`}>
                <input
                  className={inputClassName}
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                />
              </FormField>

              <FormField label="Papéis">
                <select
                  multiple
                  className={selectClassName}
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
              </FormField>

              <div className="grid gap-3">
                <CheckboxField
                  checked={form.is_active}
                  label="Usuário ativo"
                  onChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))}
                />
                <CheckboxField
                  checked={form.is_superuser}
                  label="Superusuário"
                  onChange={(checked) => setForm((current) => ({ ...current, is_superuser: checked }))}
                />
              </div>

              <ButtonRow>
                <button className={buttonPrimaryClassName} disabled={submitting} type="submit">
                  {submitting ? "Salvando..." : selectedId === null ? "Criar usuário" : "Atualizar usuário"}
                </button>
                {selectedId !== null && (
                  <button
                    className={buttonGhostClassName}
                    onClick={resetForm}
                    type="button"
                  >
                    Limpar
                  </button>
                )}
              </ButtonRow>
            </form>
          </PanelBody>
        </Panel>
      </div>
    </PageShell>
  );
}

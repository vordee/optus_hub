import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import type { PermissionItem, RoleItem } from "../app/types";
import {
  Badge,
  ButtonRow,
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

  function resetForm() {
    setSelectedId(null);
    setForm({ name: "", description: "", permission_codes: [] });
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

      resetForm();
      await load();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao salvar papel.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Admin"
        title="Papéis"
        description="Controle de permissões e definição de escopos de acesso para o sistema."
      />

      {error && <InlineAlert>{error}</InlineAlert>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
        <Panel>
          <PanelBody className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Base</span>
                <h3 className="font-heading text-xl font-bold text-foreground">Lista de papéis</h3>
              </div>
              <Badge tone="muted">{items.length} registros</Badge>
            </div>

            <TableShell>
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Descrição</th>
                    <th className="px-4 py-3 font-semibold">Permissões</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ensureArray(items).map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer align-top hover:bg-slate-50/80"
                      onClick={() => populateFromItem(item)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-4 py-3 text-slate-700">{item.description}</td>
                      <td className="px-4 py-3 text-slate-600">{ensureArray(item.permissions).join(", ") || "-"}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td className="px-4 py-8" colSpan={3}>
                        <EmptyState
                          description="Crie um papel para começar a organizar permissões e escopos."
                          title="Nenhum papel encontrado"
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
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Controle</span>
              <h3 className="font-heading text-xl font-bold text-foreground">
                {selectedId === null ? "Novo papel" : "Editar papel"}
              </h3>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <FormField label="Nome" hint={selectedId !== null ? "Nome não pode ser alterado na edição." : undefined}>
                <input
                  disabled={selectedId !== null}
                  className={inputClassName}
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </FormField>

              <FormField label="Descrição">
                <input
                  className={inputClassName}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </FormField>

              <FormField label="Permissões">
                <select
                  multiple
                  className={selectClassName}
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
              </FormField>

              <ButtonRow>
                <button className={buttonPrimaryClassName} disabled={submitting} type="submit">
                  {submitting ? "Salvando..." : selectedId === null ? "Criar papel" : "Atualizar papel"}
                </button>
                {selectedId !== null && (
                  <button className={buttonGhostClassName} onClick={resetForm} type="button">
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

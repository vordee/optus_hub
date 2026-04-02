import { useEffect, useMemo, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import { formatDateTime } from "../app/format";
import { AppIcon } from "../app/icons";
import { QuickFormModal } from "../app/QuickFormModal";
import type { CompanyItem, ContactItem } from "../app/types";
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
  StatCard,
  StatGrid,
  TableShell,
  buttonGhostClassName,
  buttonPrimaryClassName,
  inputClassName,
  selectClassName,
} from "../components/tw/ui";

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

  const haystack = [contact.full_name, contact.email, contact.phone, contact.position, contact.company_name]
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
    <PageShell>
      <PageHeader
        eyebrow="CRM"
        title="Contatos"
        description="Leitura rápida da base de pessoas ligadas às contas do CRM."
      />

      {error && <InlineAlert>{error}</InlineAlert>}

      <Panel>
        <PanelBody className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Indicadores</span>
              <h3 className="font-heading text-xl font-bold text-foreground">Resumo da base</h3>
            </div>
            <ButtonRow>
              <button className={buttonPrimaryClassName} onClick={startCreate} type="button">
                <AppIcon name="add" />
                <span>Novo contato</span>
              </button>
            </ButtonRow>
          </div>

          <StatGrid>
            <StatCard label="Total" value={stats.total} detail="cadastros na base" />
            <StatCard label="Ativos" value={stats.active} detail="pessoas em uso" />
            <StatCard label="Com email" value={stats.withEmail} detail="canal de contato" />
            <StatCard label="Com empresa" value={stats.withCompany} detail="vínculos comerciais" />
          </StatGrid>
        </PanelBody>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Panel>
          <PanelBody className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Painel</span>
                <h3 className="font-heading text-xl font-bold text-foreground">
                  {selectedContact?.full_name || "Nenhum contato selecionado"}
                </h3>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  O painel mostra contexto humano do contato sem tirar a visão da lista.
                </p>
              </div>
              <ButtonRow>
                <button className={buttonPrimaryClassName} onClick={startCreate} type="button">
                  <AppIcon name="add" />
                  <span>Novo contato</span>
                </button>
                {selectedContact && (
                  <button className={buttonGhostClassName} onClick={startEdit} type="button">
                    <AppIcon name="edit" />
                    <span>Editar</span>
                  </button>
                )}
              </ButtonRow>
            </div>

            {selectedContact ? (
              <div className="grid gap-4">
                <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className={selectedContact.is_active ? "inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700" : "inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700"}>
                      {selectedContact.is_active ? "Ativo" : "Inativo"}
                    </span>
                    <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                      {selectedContact.company_name || "Sem empresa"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <span className="rounded-full bg-white px-3 py-1">{selectedContact.email || "Sem email"}</span>
                    <span className="rounded-full bg-white px-3 py-1">{selectedContact.phone || "Sem telefone"}</span>
                    <span className="rounded-full bg-white px-3 py-1">{selectedContact.position || "Sem cargo"}</span>
                    <span className="rounded-full bg-white px-3 py-1">{formatDateTime(selectedContact.created_at)}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {selectedContact.company_name
                      ? `Contato vinculado à empresa ${selectedContact.company_name}.`
                      : "Contato ainda sem vínculo com uma empresa."}
                  </p>
                </div>
              </div>
            ) : (
              <EmptyState
                description="Selecione uma linha da lista para abrir o contexto operacional do registro."
                title="Selecione um contato"
              />
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelBody className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Tabela</span>
                <h3 className="font-heading text-xl font-bold text-foreground">Base de contatos</h3>
              </div>
              <Badge tone="muted">{filteredItems.length} resultados</Badge>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
              <input
                className={inputClassName}
                placeholder="Buscar por nome, empresa, email, telefone ou cargo"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                className={selectClassName}
                value={activeOnly ? "active" : ""}
                onChange={(event) => setActiveOnly(event.target.value === "active")}
              >
                <option value="">Todos</option>
                <option value="active">Somente ativos</option>
              </select>
              <button className={buttonPrimaryClassName} onClick={startCreate} type="button">
                <AppIcon name="add" />
                <span>Novo contato</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <Badge tone="muted">{activeOnly ? "Filtrando só ativos" : "Incluindo inativos"}</Badge>
              <Badge tone="muted">{query ? `Busca: ${query}` : "Busca livre"}</Badge>
            </div>

            {loading ? (
              <EmptyState description="Carregando contatos da base real..." title="Carregando contatos" />
            ) : (
              <TableShell>
                <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Nome</th>
                      <th className="px-4 py-3 font-semibold">Empresa</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Cargo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        aria-selected={selectedId === item.id}
                        className={selectedId === item.id ? "cursor-pointer bg-primary/5 hover:bg-primary/5" : "cursor-pointer hover:bg-slate-50/80"}
                        onClick={() => populate(item)}
                        onKeyDown={(event) => handleRowKeyDown(event, item)}
                        role="button"
                        tabIndex={0}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{item.full_name}</td>
                        <td className="px-4 py-3 text-slate-700">{item.company_name || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{item.email || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{item.position || "-"}</td>
                      </tr>
                    ))}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td className="px-4 py-8" colSpan={4}>
                          <EmptyState
                            description="Refine a busca ou crie um novo contato pela ação ao lado."
                            title="Nenhum contato encontrado"
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableShell>
            )}
          </PanelBody>
        </Panel>
      </div>

      <QuickFormModal
        description="Cadastro curto para criar ou corrigir um contato sem perder a lista de vista."
        onClose={closeModal}
        open={isModalOpen}
        title={selectedId === null ? "Novo contato" : "Editar contato"}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <FormField label="Empresa">
            <select
              className={selectClassName}
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
          </FormField>

          <FormField label="Nome">
            <input
              className={inputClassName}
              value={form.full_name}
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
            />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Email">
              <input
                className={inputClassName}
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </FormField>
            <FormField label="Telefone">
              <input
                className={inputClassName}
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </FormField>
          </div>

          <FormField label="Cargo">
            <input
              className={inputClassName}
              value={form.position}
              onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))}
            />
          </FormField>

          <CheckboxField
            checked={form.is_active}
            label="Contato ativo"
            onChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))}
          />

          <ButtonRow>
            <button className={buttonPrimaryClassName} type="submit">
              {selectedId === null ? "Criar contato" : "Atualizar contato"}
            </button>
            <button
              className={buttonGhostClassName}
              onClick={() => {
                closeModal();
                resetFormState();
              }}
              type="button"
            >
              Cancelar
            </button>
          </ButtonRow>
        </form>
      </QuickFormModal>
    </PageShell>
  );
}

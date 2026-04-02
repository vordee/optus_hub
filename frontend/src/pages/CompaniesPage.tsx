import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import { formatDateTime } from "../app/format";
import { AppIcon } from "../app/icons";
import { formatOpportunityStatus } from "../app/labels";
import { QuickFormModal } from "../app/QuickFormModal";
import type {
  CompanyItem,
  ContactItem,
  LeadItem,
  LeadListResponse,
  OpportunityItem,
  OpportunityListResponse,
} from "../app/types";
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
  StatCard,
  StatGrid,
  TableShell,
  buttonGhostClassName,
  buttonPrimaryClassName,
  inputClassName,
} from "../components/tw/ui";

const PAGE_SIZE = 100;

export function CompaniesPage() {
  const [items, setItems] = useState<CompanyItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
        loadAllLeads(),
        apiRequest<OpportunityListResponse>("/v1/crm/opportunities?page=1&page_size=100"),
      ]);
      setItems(ensureArray(companyItems));
      setContacts(ensureArray(contactItems));
      setLeads(leadItems);
      setOpportunities(ensureArray(opportunityResponse.items));
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar empresas.");
    }
  }

  async function loadAllLeads() {
    const collected: LeadItem[] = [];
    let page = 1;
    let total = 0;

    while (true) {
      const response = await apiRequest<LeadListResponse>(`/v1/crm/leads?page=${page}&page_size=${PAGE_SIZE}`);
      const pageItems = ensureArray(response.items);
      collected.push(...pageItems);
      total = response.total;

      if (collected.length >= total || pageItems.length < PAGE_SIZE) {
        return collected;
      }

      page += 1;
    }
  }

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, item: CompanyItem) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    populate(item);
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

  function startCreate() {
    setSelectedId(null);
    setForm({ legal_name: "", trade_name: "", tax_id: "", is_active: true });
    setIsModalOpen(true);
  }

  function startEdit() {
    if (!selectedCompany) {
      return;
    }

    populate(selectedCompany);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
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
      setIsModalOpen(false);
      setForm({ legal_name: "", trade_name: "", tax_id: "", is_active: true });
      await load();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao salvar empresa.");
    }
  }

  function resetForm() {
    setSelectedId(null);
    setForm({ legal_name: "", trade_name: "", tax_id: "", is_active: true });
  }

  const safeItems = ensureArray(items);
  const selectedCompany = safeItems.find((item) => item.id === selectedId) || null;
  const relatedContacts = ensureArray(contacts).filter((item) => item.company_id === selectedId);
  const relatedLeads = ensureArray(leads).filter((item) => item.company_id === selectedId);
  const relatedOpportunities = ensureArray(opportunities).filter((item) => item.company_id === selectedId);
  const activeCompanies = safeItems.filter((item) => item.is_active).length;

  return (
    <PageShell>
      <PageHeader
        eyebrow="CRM"
        title="Empresas"
        description="Base de contas com relação direta entre contatos, leads e oportunidades."
      />

      {error && <InlineAlert>{error}</InlineAlert>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="grid gap-6">
          <Panel>
            <PanelBody className="space-y-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Indicadores</span>
                  <h3 className="font-heading text-2xl font-bold text-foreground">Resumo da base</h3>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    A leitura começa pelos números e depois desce para a conta selecionada.
                  </p>
                </div>
                <ButtonRow>
                  <button className={buttonPrimaryClassName} onClick={startCreate} type="button">
                    <AppIcon name="add" />
                    <span>Nova empresa</span>
                  </button>
                </ButtonRow>
              </div>

              <StatGrid>
                <StatCard label="Contas" value={safeItems.length} detail="base cadastrada" />
                <StatCard label="Ativas" value={activeCompanies} detail="prontas para operação" />
                <StatCard label="Contatos" value={ensureArray(contacts).length} detail="pessoas vinculadas" />
                <StatCard label="Oportunidades" value={ensureArray(opportunities).length} detail="negócios visíveis" />
              </StatGrid>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelBody className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Painel</span>
                  <h3 className="font-heading text-2xl font-bold text-foreground">
                    {selectedCompany?.trade_name || selectedCompany?.legal_name || "Nenhuma empresa selecionada"}
                  </h3>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    O painel da conta mostra contexto comercial, vínculos e carteira sem abrir um formulário à força.
                  </p>
                </div>
                <ButtonRow>
                  <button className={buttonPrimaryClassName} onClick={startCreate} type="button">
                    <AppIcon name="add" />
                    <span>Nova empresa</span>
                  </button>
                  {selectedCompany && (
                    <button className={buttonGhostClassName} onClick={startEdit} type="button">
                      <AppIcon name="edit" />
                      <span>Editar</span>
                    </button>
                  )}
                </ButtonRow>
              </div>

              {selectedCompany ? (
                <div className="grid gap-5">
                  <div className="rounded-3xl border border-border bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={selectedCompany.is_active ? "accent" : "muted"}>
                        {selectedCompany.is_active ? "Conta ativa" : "Conta inativa"}
                      </Badge>
                      <Badge tone="muted">{selectedCompany.tax_id || "Sem CNPJ / Tax ID"}</Badge>
                    </div>
                    <div className="mt-4 grid gap-2">
                      <div className="font-heading text-xl font-semibold text-foreground">
                        {selectedCompany.legal_name}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Criada em {formatDateTime(selectedCompany.created_at)}
                      </p>
                    </div>
                  </div>

                  <StatGrid>
                    <StatCard label="Contatos" value={relatedContacts.length} detail="pessoas ligadas à conta" />
                    <StatCard label="Leads" value={relatedLeads.length} detail="demandas em origem" />
                    <StatCard label="Oportunidades" value={relatedOpportunities.length} detail="negócios em andamento" />
                    <StatCard
                      label="Última movimentação"
                      value={relatedOpportunities[0] ? formatOpportunityStatus(relatedOpportunities[0].status) : "-"}
                      detail="recorte operacional atual"
                    />
                  </StatGrid>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <strong className="font-heading text-base text-foreground">Contatos principais</strong>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {relatedContacts.length === 0
                          ? "Nenhum contato vinculado."
                          : relatedContacts.slice(0, 3).map((item) => item.full_name).join(" · ")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                      <strong className="font-heading text-base text-foreground">Leads recentes</strong>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {relatedLeads.length === 0
                          ? "Nenhum lead vinculado."
                          : relatedLeads.slice(0, 3).map((item) => item.title).join(" · ")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Oportunidades</span>
                      <h4 className="mt-1 font-heading text-xl font-semibold text-foreground">Carteira da conta</h4>
                    </div>
                    <ul className="grid gap-3">
                      {relatedOpportunities.map((item) => (
                        <li key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 space-y-1">
                              <strong className="block font-heading text-[15px] font-semibold text-foreground">
                                {item.title}
                              </strong>
                              <p className="text-sm leading-6 text-muted-foreground">{item.description || "Sem descrição."}</p>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span className="rounded-full bg-secondary px-2.5 py-1">{item.contact_name || "Sem contato"}</span>
                                <span className="rounded-full bg-secondary px-2.5 py-1">{formatDateTime(item.created_at)}</span>
                              </div>
                            </div>
                            <Badge tone="accent">{formatOpportunityStatus(item.status)}</Badge>
                          </div>
                        </li>
                      ))}
                      {relatedOpportunities.length === 0 && (
                        <li>
                          <EmptyState
                            title="Nenhuma oportunidade ligada"
                            description="Esta conta ainda não tem carteira comercial vinculada."
                          />
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Selecione uma empresa"
                  description="O painel mostra contexto comercial e vínculos antes de qualquer edição."
                  action={
                    <div>
                      <button className={buttonPrimaryClassName} onClick={startCreate} type="button">
                        <AppIcon name="add" />
                        <span>Nova empresa</span>
                      </button>
                    </div>
                  }
                />
              )}
            </PanelBody>
          </Panel>
        </div>

        <Panel>
          <PanelBody className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Tabela</span>
                <h3 className="font-heading text-2xl font-bold text-foreground">Base de empresas</h3>
              </div>
              <button className={buttonPrimaryClassName} onClick={startCreate} type="button">
                <AppIcon name="add" />
                <span>Nova empresa</span>
              </button>
            </div>

            <TableShell>
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Razão social</th>
                    <th className="px-4 py-3 font-semibold">Fantasia</th>
                    <th className="px-4 py-3 font-semibold">Contatos</th>
                    <th className="px-4 py-3 font-semibold">Leads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {safeItems.map((item) => (
                    <tr
                      key={item.id}
                      aria-selected={selectedId === item.id}
                      className="cursor-pointer align-top transition hover:bg-slate-50/80"
                      onClick={() => populate(item)}
                      onKeyDown={(event) => handleRowKeyDown(event, item)}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{item.legal_name}</td>
                      <td className="px-4 py-3 text-slate-700">{item.trade_name || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{item.contact_count}</td>
                      <td className="px-4 py-3 text-slate-600">{item.lead_count}</td>
                    </tr>
                  ))}
                  {safeItems.length === 0 && (
                    <tr>
                      <td className="px-4 py-8" colSpan={4}>
                        <EmptyState
                          title="Nenhuma empresa encontrada"
                          description="Cadastre a primeira empresa para começar a relacionar contatos, leads e oportunidades."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableShell>
          </PanelBody>
        </Panel>
      </div>

      <QuickFormModal
        description="Cadastro curto da conta sem quebrar a leitura de relacionamento e carteira."
        onClose={closeModal}
        open={isModalOpen}
        title={selectedId === null ? "Nova empresa" : "Editar empresa"}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <FormField label="Razão social">
            <input
              className={inputClassName}
              value={form.legal_name}
              onChange={(event) => setForm((current) => ({ ...current, legal_name: event.target.value }))}
            />
          </FormField>
          <FormField label="Nome fantasia">
            <input
              className={inputClassName}
              value={form.trade_name}
              onChange={(event) => setForm((current) => ({ ...current, trade_name: event.target.value }))}
            />
          </FormField>
          <FormField label="CNPJ / Tax ID">
            <input
              className={inputClassName}
              value={form.tax_id}
              onChange={(event) => setForm((current) => ({ ...current, tax_id: event.target.value }))}
            />
          </FormField>
          <label className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground">
            <input
              checked={form.is_active}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
              type="checkbox"
            />
            <span>Empresa ativa</span>
          </label>
          <div className="flex flex-wrap gap-3 pt-1">
            <button className={buttonPrimaryClassName} type="submit">
              {selectedId === null ? "Criar empresa" : "Atualizar empresa"}
            </button>
            <button
              className={buttonGhostClassName}
              onClick={() => {
                closeModal();
                resetForm();
              }}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </form>
      </QuickFormModal>
    </PageShell>
  );
}

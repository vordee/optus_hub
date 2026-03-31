import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { formatDateTime } from "../app/format";
import type {
  CompanyItem,
  ContactItem,
  OpportunityItem,
  OpportunityListResponse,
  ProjectDetailItem,
  ProjectItem,
  ProjectListResponse,
  ProjectPhaseItem,
  ProjectTaskItem,
} from "../app/types";

const PROJECT_STATUSES = ["planned", "active", "on_hold", "completed"];
const PROJECT_TASK_STATUSES = ["pending", "in_progress", "done", "blocked"];
const PAGE_SIZE = 8;
const PROJECT_STATUS_LABELS: Record<string, string> = {
  planned: "Planejado",
  active: "Em andamento",
  on_hold: "Em pausa",
  completed: "Concluído",
};
const PROJECT_TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em execução",
  done: "Concluída",
  blocked: "Bloqueada",
};
const PHASE_STATUS_LABELS: Record<string, string> = {
  planned: "Planejada",
  active: "Em andamento",
  on_hold: "Em pausa",
  completed: "Concluída",
  done: "Concluída",
};
const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatStatusLabel(status: string, labels: Record<string, string>) {
  return labels[status] || status;
}

function formatDateOnly(value: string | null) {
  if (!value) {
    return "Sem prazo";
  }

  const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return DATE_FORMATTER.format(parsed);
}

function isTaskOverdue(task: ProjectTaskItem) {
  if (!task.due_date || task.status === "done") {
    return false;
  }

  const dueDate = new Date(`${task.due_date}T23:59:59`);
  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

export function ProjectsPage() {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [tasks, setTasks] = useState<ProjectTaskItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ProjectDetailItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [form, setForm] = useState({
    opportunity_id: "",
    company_id: "",
    contact_id: "",
    name: "",
    status: "planned",
    description: "",
  });
  const [taskForm, setTaskForm] = useState({
    title: "",
    project_phase_id: "",
    description: "",
    status: "pending",
    assigned_to_email: "",
    due_date: "",
  });

  const tasksByPhaseId = new Map<number, ProjectTaskItem[]>();
  for (const task of tasks) {
    if (task.project_phase_id === null) {
      continue;
    }

    const current = tasksByPhaseId.get(task.project_phase_id) || [];
    current.push(task);
    tasksByPhaseId.set(task.project_phase_id, current);
  }

  const unassignedTasks = tasks.filter((task) => task.project_phase_id === null);
  const taskStats = {
    total: tasks.length,
    pending: tasks.filter((task) => task.status === "pending").length,
    inProgress: tasks.filter((task) => task.status === "in_progress").length,
    blocked: tasks.filter((task) => task.status === "blocked").length,
    done: tasks.filter((task) => task.status === "done").length,
    overdue: tasks.filter(isTaskOverdue).length,
  };
  const phaseStats = selectedDetail
    ? {
        total: selectedDetail.phases.length,
        completed: selectedDetail.phases.filter(
          (phase) => phase.status === "completed" || phase.completed_at !== null,
        ).length,
      }
    : null;
  const selectedProgress =
    phaseStats && phaseStats.total > 0 ? Math.round((phaseStats.completed / phaseStats.total) * 100) : 0;

  useEffect(() => {
    void load();
  }, [page, query, filterStatus]);

  const selectedOpportunity = opportunities.find((item) => String(item.id) === form.opportunity_id) || null;

  async function load() {
    try {
      setError(null);
      const [projectResponse, companyItems, contactItems, opportunityResponse] = await Promise.all([
        apiRequest<ProjectListResponse>(
          `/v1/projects?page=${page}&page_size=${PAGE_SIZE}&query=${encodeURIComponent(query)}&status=${encodeURIComponent(filterStatus)}`,
        ),
        apiRequest<CompanyItem[]>("/v1/crm/companies"),
        apiRequest<ContactItem[]>("/v1/crm/contacts"),
        apiRequest<OpportunityListResponse>("/v1/crm/opportunities?page=1&page_size=100"),
      ]);
      setItems(projectResponse.items);
      setTotal(projectResponse.total);
      setCompanies(companyItems);
      setContacts(contactItems);
      setOpportunities(opportunityResponse.items);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar projetos.");
    }
  }

  function populate(item: ProjectItem) {
    setSelectedId(item.id);
    setForm({
      opportunity_id: item.opportunity_id ? String(item.opportunity_id) : "",
      company_id: item.company_id ? String(item.company_id) : "",
      contact_id: item.contact_id ? String(item.contact_id) : "",
      name: item.name,
      status: item.status,
      description: item.description || "",
    });
    void loadDetail(item.id);
  }

  async function loadDetail(projectId: number) {
    try {
      setError(null);
      const [detail, taskItems] = await Promise.all([
        apiRequest<ProjectDetailItem>(`/v1/projects/${projectId}`),
        apiRequest<ProjectTaskItem[]>(`/v1/projects/${projectId}/tasks`),
      ]);
      setSelectedDetail(detail);
      setTasks(taskItems);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar detalhe do projeto.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      opportunity_id: form.opportunity_id ? Number(form.opportunity_id) : null,
      company_id: form.company_id ? Number(form.company_id) : null,
      contact_id: form.contact_id ? Number(form.contact_id) : null,
      name: form.name,
      status: form.status,
      description: form.description || null,
    };

    try {
      if (selectedId === null) {
        await apiRequest("/v1/projects", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/v1/projects/${selectedId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: payload.name,
            status: payload.status,
            description: payload.description,
          }),
        });
      }
      resetForm();
      await load();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao salvar projeto.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateFromOpportunity() {
    if (!form.opportunity_id) {
      setError("Selecione uma oportunidade para gerar o projeto.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      await apiRequest(`/v1/projects/from-opportunity/${form.opportunity_id}`, {
        method: "POST",
      });
      resetForm();
      await load();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao gerar projeto pela oportunidade.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSelectedId(null);
    setSelectedDetail(null);
    setTasks([]);
    setForm({
      opportunity_id: "",
      company_id: "",
      contact_id: "",
      name: "",
      status: "planned",
      description: "",
    });
    setTaskForm({
      title: "",
      project_phase_id: "",
      description: "",
      status: "pending",
      assigned_to_email: "",
      due_date: "",
    });
  }

  async function handleTaskSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedId === null) {
      setError("Selecione um projeto antes de criar uma tarefa.");
      return;
    }
    setTaskSubmitting(true);
    setError(null);

    try {
      await apiRequest(`/v1/projects/${selectedId}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: taskForm.title,
          project_phase_id: taskForm.project_phase_id ? Number(taskForm.project_phase_id) : null,
          description: taskForm.description || null,
          status: taskForm.status,
          assigned_to_email: taskForm.assigned_to_email || null,
          due_date: taskForm.due_date || null,
        }),
      });
      setTaskForm({
        title: "",
        project_phase_id: "",
        description: "",
        status: "pending",
        assigned_to_email: "",
        due_date: "",
      });
      await loadDetail(selectedId);
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao criar tarefa do projeto.");
    } finally {
      setTaskSubmitting(false);
    }
  }

  async function updateTaskStatus(taskId: number, status: string) {
    if (selectedId === null) {
      return;
    }
    try {
      await apiRequest(`/v1/projects/${selectedId}/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadDetail(selectedId);
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : "Falha ao atualizar tarefa do projeto.");
    }
  }

  return (
    <section className="page-grid">
      <article className="card">
        <div className="section-heading">
          <span className="eyebrow">Entrega</span>
          <h3>Projetos</h3>
          <p className="section-copy">
            Projetos nascem do funil ou podem ser cadastrados manualmente quando a
            operação precisar iniciar antes do fechamento formal.
          </p>
        </div>

        {error && <div className="inline-error">{error}</div>}

        <div className="toolbar">
          <input
            placeholder="Buscar por nome, empresa ou contato"
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
          />
          <select
            value={filterStatus}
            onChange={(event) => {
              setPage(1);
              setFilterStatus(event.target.value);
            }}
          >
            <option value="">Todos os status</option>
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status, PROJECT_STATUS_LABELS)}
              </option>
            ))}
          </select>
        </div>

        <div className="table-summary">
          <span>{total} projetos encontrados</span>
          <span>{filterStatus ? `Filtro: ${formatStatusLabel(filterStatus, PROJECT_STATUS_LABELS)}` : "Todos os status"}</span>
          <span>{query ? `Busca: ${query}` : "Busca livre"}</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Empresa</th>
                <th>Contato</th>
                <th>Status</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} onClick={() => populate(item)}>
                  <td>{item.name}</td>
                  <td>{item.company_name || "-"}</td>
                  <td>{item.contact_name || "-"}</td>
                  <td>
                    <span className={`status-pill status-${item.status}`}>
                      {formatStatusLabel(item.status, PROJECT_STATUS_LABELS)}
                    </span>
                  </td>
                  <td>{item.opportunity_id ? `Oportunidade #${item.opportunity_id}` : "Manual"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pager">
          <span>{total} registros</span>
          <div className="pager-actions">
            <button
              className="ghost-button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              Anterior
            </button>
            <span>Página {page}</span>
            <button
              className="ghost-button"
              disabled={page * PAGE_SIZE >= total}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Próxima
            </button>
          </div>
        </div>
      </article>

      <article className="card">
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="section-heading">
            <span className="eyebrow">Cadastro</span>
            <h3>{selectedId === null ? "Novo projeto" : "Editar projeto"}</h3>
          </div>

          <label className="field">
            <span>Oportunidade vinculada</span>
            <select
              value={form.opportunity_id}
              onChange={(event) => setForm((current) => ({ ...current, opportunity_id: event.target.value }))}
            >
              <option value="">Sem vínculo</option>
              {opportunities.map((opportunity) => (
                <option key={opportunity.id} value={opportunity.id}>
                  {opportunity.title} {opportunity.status !== "won" ? `(${opportunity.status})` : "(won)"}
                </option>
              ))}
            </select>
          </label>

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
            <span>Contato</span>
            <select
              value={form.contact_id}
              onChange={(event) => setForm((current) => ({ ...current, contact_id: event.target.value }))}
            >
              <option value="">Sem vínculo</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.full_name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Nome</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status, PROJECT_STATUS_LABELS)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Descrição</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          <div className="form-actions">
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? "Salvando..." : selectedId === null ? "Criar projeto" : "Atualizar projeto"}
            </button>
            <button
              className="ghost-button"
              disabled={submitting || !selectedOpportunity || selectedOpportunity.status !== "won"}
              onClick={handleCreateFromOpportunity}
              type="button"
            >
              Gerar do funil
            </button>
          </div>

          <div className="helper-card">
            <strong>Fluxo sugerido</strong>
            <p>
              Se a oportunidade já estiver em `won`, o botão gera o projeto diretamente.
              Caso contrário, o cadastro manual mantém a flexibilidade operacional.
            </p>
            {selectedOpportunity && (
              <small>
                Selecionada: {selectedOpportunity.title} ({selectedOpportunity.status})
              </small>
            )}
          </div>
        </form>

        <div className="detail-panel">
          <div className="section-heading">
            <span className="eyebrow">Detalhe</span>
            <h3>{selectedDetail?.name || "Nenhum projeto selecionado"}</h3>
          </div>
          {selectedDetail ? (
            <>
              <div className="detail-hero">
                <div className="detail-badges">
                  <span className={`status-pill status-${selectedDetail.status}`}>
                    {formatStatusLabel(selectedDetail.status, PROJECT_STATUS_LABELS)}
                  </span>
                  <span className="status-pill detail-source">
                    {selectedDetail.opportunity_id ? `Funil #${selectedDetail.opportunity_id}` : "Cadastro manual"}
                  </span>
                </div>
                <div className="detail-meta detail-meta-dense">
                  <span>{selectedDetail.company_name || "Sem empresa"}</span>
                  <span>{selectedDetail.contact_name || "Sem contato"}</span>
                  <span>{formatDateTime(selectedDetail.created_at)}</span>
                </div>
                <p>{selectedDetail.description || "Sem descrição."}</p>
              </div>

              <div className="project-metrics">
                <div className="metric-card">
                  <span>Fases</span>
                  <strong>{phaseStats ? `${phaseStats.completed}/${phaseStats.total}` : "0/0"}</strong>
                  <small>{selectedProgress}% concluído</small>
                </div>
                <div className="metric-card">
                  <span>Tarefas</span>
                  <strong>{taskStats.total}</strong>
                  <small>{taskStats.pending} pendentes</small>
                </div>
                <div className="metric-card">
                  <span>Execução</span>
                  <strong>{taskStats.inProgress + taskStats.blocked}</strong>
                  <small>{taskStats.blocked} bloqueadas</small>
                </div>
                <div className="metric-card">
                  <span>Risco</span>
                  <strong>{taskStats.overdue}</strong>
                  <small>{taskStats.done} concluídas</small>
                </div>
              </div>

              <div className="detail-meta">
                <span>{selectedDetail.phases.length} fase(s)</span>
                <span>{taskStats.total} tarefa(s)</span>
                <span>{unassignedTasks.length} sem fase</span>
                <span>{selectedDetail.history.length} evento(s) de histórico</span>
              </div>
              <div className="detail-section">
                <div className="section-heading">
                  <span className="eyebrow">Fases</span>
                  <h3>Mapa operacional</h3>
                </div>
                <div className="phase-grid">
                  {selectedDetail.phases.map((phase) => (
                    <PhaseCard
                      key={phase.id}
                      phase={phase}
                      tasks={tasksByPhaseId.get(phase.id) || []}
                    />
                  ))}
                  <article className="phase-card phase-card-backlog">
                    <div className="phase-card-head">
                      <div>
                        <span className="eyebrow">Backlog</span>
                        <h3>Tarefas sem fase</h3>
                      </div>
                      <span className="status-pill">{unassignedTasks.length}</span>
                    </div>
                    <p className="phase-copy">
                      {unassignedTasks.length === 0
                        ? "Nenhuma tarefa fora da sequência operacional."
                        : "Agrupa itens em espera antes do encaixe definitivo na execução."}
                    </p>
                    <ul className="phase-task-list">
                      {unassignedTasks.slice(0, 3).map((task) => (
                        <li key={task.id}>
                          <strong>{task.title}</strong>
                          <span>{formatStatusLabel(task.status, PROJECT_TASK_STATUS_LABELS)}</span>
                        </li>
                      ))}
                      {unassignedTasks.length === 0 && <li className="phase-task-empty">Sem pendências fora de fase.</li>}
                    </ul>
                  </article>
                </div>
              </div>
              <div className="detail-section">
                <div className="section-heading">
                  <span className="eyebrow">Tarefas</span>
                  <h3>Execução do projeto</h3>
                </div>
                <form className="form-card compact-form" onSubmit={handleTaskSubmit}>
                  <label className="field">
                    <span>Título da tarefa</span>
                    <input
                      value={taskForm.title}
                      onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span>Descrição</span>
                    <textarea
                      value={taskForm.description}
                      onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))}
                    />
                  </label>
                  <div className="task-form-grid">
                    <label className="field">
                      <span>Fase</span>
                      <select
                        value={taskForm.project_phase_id}
                        onChange={(event) =>
                          setTaskForm((current) => ({ ...current, project_phase_id: event.target.value }))
                        }
                      >
                        <option value="">Sem fase vinculada</option>
                        {selectedDetail.phases.map((phase) => (
                          <option key={phase.id} value={phase.id}>
                            {phase.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Status</span>
                      <select
                        value={taskForm.status}
                        onChange={(event) => setTaskForm((current) => ({ ...current, status: event.target.value }))}
                      >
                        {PROJECT_TASK_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {formatStatusLabel(status, PROJECT_TASK_STATUS_LABELS)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Responsável</span>
                      <input
                        value={taskForm.assigned_to_email}
                        onChange={(event) =>
                          setTaskForm((current) => ({ ...current, assigned_to_email: event.target.value }))
                        }
                        placeholder="email@optus.com"
                      />
                    </label>
                    <label className="field">
                      <span>Prazo</span>
                      <input
                        type="date"
                        value={taskForm.due_date}
                        onChange={(event) => setTaskForm((current) => ({ ...current, due_date: event.target.value }))}
                      />
                    </label>
                  </div>
                  <button className="primary-button" disabled={taskSubmitting} type="submit">
                    {taskSubmitting ? "Criando..." : "Criar tarefa"}
                  </button>
                </form>

                <ul className="task-list">
                  {tasks.map((task) => (
                    <li key={task.id} className="task-item">
                      <div className="task-item-main">
                        <strong>{task.title}</strong>
                        <p>{task.description || "Sem descrição."}</p>
                        <div className="detail-meta">
                          <span>{task.project_phase_name || "Sem fase"}</span>
                          <span>{task.assigned_to_email || "Sem responsável"}</span>
                          <span>{formatDateOnly(task.due_date)}</span>
                          <span>{formatDateTime(task.created_at)}</span>
                        </div>
                      </div>
                      <div className="task-item-actions">
                        <span className={`status-pill status-task-${task.status}`}>
                          {formatStatusLabel(task.status, PROJECT_TASK_STATUS_LABELS)}
                        </span>
                        <select
                          value={task.status}
                          onChange={(event) => void updateTaskStatus(task.id, event.target.value)}
                        >
                          {PROJECT_TASK_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {formatStatusLabel(status, PROJECT_TASK_STATUS_LABELS)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </li>
                  ))}
                  {tasks.length === 0 && <li className="task-empty">Nenhuma tarefa cadastrada para este projeto.</li>}
                </ul>
              </div>
              <ul className="history-list">
                {selectedDetail.history.map((entry) => (
                  <li key={entry.id}>
                    <strong>
                      {formatStatusLabel(entry.from_status || "inicial", PROJECT_STATUS_LABELS)} →{" "}
                      {formatStatusLabel(entry.to_status, PROJECT_STATUS_LABELS)}
                    </strong>
                    <span>{entry.changed_by_email || "-"}</span>
                    <small>{formatDateTime(entry.changed_at)}</small>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>Selecione um projeto para acompanhar histórico e contexto operacional.</p>
          )}
        </div>
      </article>
    </section>
  );
}

function PhaseCard({
  phase,
  tasks,
}: {
  phase: ProjectPhaseItem;
  tasks: ProjectTaskItem[];
}) {
  return (
    <article className="phase-card">
      <div className="phase-card-head">
        <div>
          <span className="eyebrow">Fase {phase.sequence}</span>
          <h3>{phase.name}</h3>
        </div>
        <span className={`status-pill status-${phase.status}`}>
          {formatStatusLabel(phase.status, PHASE_STATUS_LABELS)}
        </span>
      </div>
      <div className="detail-meta detail-meta-dense">
        <span>{tasks.length} tarefa(s)</span>
        <span>{phase.started_at ? `Início ${formatDateOnly(phase.started_at)}` : "Não iniciada"}</span>
        <span>{phase.completed_at ? `Fim ${formatDateOnly(phase.completed_at)}` : "Em aberto"}</span>
      </div>
      {phase.notes && <p className="phase-copy">{phase.notes}</p>}
      <ul className="phase-task-list">
        {tasks.slice(0, 3).map((task) => (
          <li key={task.id}>
            <strong>{task.title}</strong>
            <span>{formatStatusLabel(task.status, PROJECT_TASK_STATUS_LABELS)}</span>
          </li>
        ))}
        {tasks.length === 0 && <li className="phase-task-empty">Sem tarefas nessa fase.</li>}
      </ul>
    </article>
  );
}

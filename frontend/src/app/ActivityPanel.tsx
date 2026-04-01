import { useEffect, useMemo, useState, type FormEvent } from "react";

import { ApiError } from "./api";
import { AppIcon } from "./icons";
import { QuickFormModal } from "./QuickFormModal";
import type {
  CRMActivityEntityType,
  CRMActivityItem,
  CRMActivityType,
} from "./types";
import {
  cancelActivity,
  completeActivity,
  createOrUpdateActivity,
  getActivitySummary,
  loadActivities,
} from "./activityStore";

type ActivityDraft = {
  activity_type: CRMActivityType;
  title: string;
  note: string;
  due_at: string;
};

type ActivityPanelProps = {
  entityType: CRMActivityEntityType;
  entityId: number | null;
  title: string;
  emptyMessage: string;
  contextLabel: string;
  onActivityCountChange?: (count: number) => void;
  initialActivities?: CRMActivityItem[];
  initialNextActivity?: CRMActivityItem | null;
  initialOverdueActivityCount?: number;
  onChanged?: () => void | Promise<void>;
};

const EMPTY_DRAFT: ActivityDraft = {
  activity_type: "follow_up",
  title: "",
  note: "",
  due_at: "",
};

const ACTIVITY_TYPE_LABELS: Record<CRMActivityType, string> = {
  call: "Ligação",
  email: "Email",
  meeting: "Reunião",
  task: "Tarefa",
  follow_up: "Follow-up",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sem prazo";
  }

  const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function isPastDue(value: string | null) {
  if (!value) {
    return false;
  }

  const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
}

export function ActivityPanel({
  entityType,
  entityId,
  title,
  emptyMessage,
  contextLabel,
  onActivityCountChange,
  initialActivities = [],
  initialNextActivity = null,
  initialOverdueActivityCount = 0,
  onChanged,
}: ActivityPanelProps) {
  const [activities, setActivities] = useState<CRMActivityItem[]>(initialActivities);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<CRMActivityItem | null>(null);
  const [draft, setDraft] = useState<ActivityDraft>(EMPTY_DRAFT);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  const summary = useMemo(() => {
    if (activities.length > 0) {
      return getActivitySummary(activities);
    }

    return {
      nextActivity: initialNextActivity,
      overdueActivityCount: initialOverdueActivityCount,
    };
  }, [activities, initialNextActivity, initialOverdueActivityCount]);

  useEffect(() => {
    onActivityCountChange?.(activities.length);
  }, [activities.length, onActivityCountChange]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (editingActivity) {
      setDraft({
        activity_type: editingActivity.activity_type,
        title: editingActivity.title,
        note: editingActivity.note || "",
        due_at: editingActivity.due_at ? editingActivity.due_at.slice(0, 10) : "",
      });
    }
  }, [editingActivity, isOpen]);

  async function refresh() {
    if (entityId === null) {
      return;
    }

    setLoading(true);
    try {
      setActivities(await loadActivities(entityType, entityId));
      setPanelError(null);
      if (onChanged) {
        await onChanged();
      }
    } catch (error) {
      setPanelError(error instanceof ApiError ? error.message : "Falha ao carregar atividades.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    if (entityId === null) {
      return;
    }

    setEditingActivity(null);
    setDraft(EMPTY_DRAFT);
    setIsOpen(true);
  }

  function openEdit(activity: CRMActivityItem) {
    setEditingActivity(activity);
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setEditingActivity(null);
    setDraft(EMPTY_DRAFT);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (entityId === null) {
      return;
    }

    try {
      await createOrUpdateActivity(entityType, entityId, draft, editingActivity?.id ?? null);
      await refresh();
      closeModal();
    } catch (error) {
      setPanelError(error instanceof ApiError ? error.message : "Falha ao salvar atividade.");
    }
  }

  async function handleComplete(activity: CRMActivityItem) {
    try {
      await completeActivity(activity.id);
      await refresh();
    } catch (error) {
      setPanelError(error instanceof ApiError ? error.message : "Falha ao concluir atividade.");
    }
  }

  async function handleCancel(activity: CRMActivityItem) {
    try {
      await cancelActivity(activity.id);
      await refresh();
    } catch (error) {
      setPanelError(error instanceof ApiError ? error.message : "Falha ao cancelar atividade.");
    }
  }

  if (entityId === null) {
    return null;
  }

  return (
    <div className="detail-section detail-section-compact activity-panel">
      <div className="activity-panel-head">
        <div className="section-heading">
          <span className="eyebrow">Próximo passo</span>
          <h3>{title}</h3>
          <p className="section-copy">{contextLabel}</p>
        </div>
        <button className="primary-button button-with-icon" onClick={openCreate} type="button">
          <AppIcon name="add" />
          <span>Nova atividade</span>
        </button>
      </div>

      <div className="activity-summary-grid">
        <div className="metric-card">
          <span>Próxima atividade</span>
          <strong>{summary.nextActivity ? ACTIVITY_TYPE_LABELS[summary.nextActivity.activity_type] : "-"}</strong>
          <small>{summary.nextActivity ? summary.nextActivity.title : "Sem pendência aberta"}</small>
        </div>
        <div className="metric-card">
          <span>Atrasadas</span>
          <strong>{summary.overdueActivityCount}</strong>
          <small>{summary.overdueActivityCount > 0 ? "Exigem atenção" : "Em dia"}</small>
        </div>
        <div className="metric-card">
          <span>Total</span>
          <strong>{activities.length}</strong>
          <small>atividades no contexto</small>
        </div>
      </div>

      {panelError && <div className="inline-error">{panelError}</div>}
      {loading && <div className="empty-state-panel">Atualizando atividades...</div>}

      {summary.nextActivity && (
        <div className={isPastDue(summary.nextActivity.due_at) ? "inline-note overdue-note" : "inline-note"}>
          <strong>Próxima ação</strong>
          <p>
            {ACTIVITY_TYPE_LABELS[summary.nextActivity.activity_type]} em {formatDate(summary.nextActivity.due_at)}: {summary.nextActivity.title}
          </p>
        </div>
      )}

      <div className="activity-list">
        {activities.map((activity) => (
          <article key={activity.id} className={activity.status === "done" ? "activity-card done" : "activity-card"}>
            <div className="activity-card-main">
              <div className="activity-card-head">
                <div>
                  <strong>{activity.title}</strong>
                  <span className="activity-kind">{ACTIVITY_TYPE_LABELS[activity.activity_type]}</span>
                </div>
                <span className={`status-pill status-${activity.status}`}>{activity.status}</span>
              </div>
              <div className="detail-meta detail-meta-compact">
                <span>{formatDate(activity.due_at)}</span>
                <span>{activity.completed_at ? "Concluída" : "Aberta"}</span>
                {activity.owner_user_name && <span>{activity.owner_user_name}</span>}
              </div>
              {activity.note && <p className="activity-note">{activity.note}</p>}
            </div>
            <div className="activity-actions">
              {activity.status === "pending" && (
                <button className="ghost-button button-with-icon" onClick={() => handleComplete(activity)} type="button">
                  <AppIcon name="check" />
                  <span>Concluir</span>
                </button>
              )}
              {activity.status === "pending" && (
                <button className="ghost-button button-with-icon" onClick={() => openEdit(activity)} type="button">
                  <AppIcon name="edit" />
                  <span>Reagendar</span>
                </button>
              )}
              {activity.status !== "canceled" && (
                <button className="ghost-button" onClick={() => handleCancel(activity)} type="button">
                  Cancelar
                </button>
              )}
            </div>
          </article>
        ))}
        {activities.length === 0 && <div className="empty-state-panel">{emptyMessage}</div>}
      </div>

      <QuickFormModal
        description="Registre a ação seguinte sem sair do contexto comercial."
        onClose={closeModal}
        open={isOpen}
        title={editingActivity ? "Reagendar atividade" : "Nova atividade"}
      >
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="task-form-grid task-form-grid-2">
            <label className="field">
              <span>Tipo</span>
              <select
                value={draft.activity_type}
                onChange={(event) => setDraft((current) => ({ ...current, activity_type: event.target.value as CRMActivityType }))}
              >
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Prazo</span>
              <input
                value={draft.due_at}
                onChange={(event) => setDraft((current) => ({ ...current, due_at: event.target.value }))}
                type="date"
              />
            </label>
          </div>
          <label className="field">
            <span>Título</span>
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Nota</span>
            <textarea
              value={draft.note}
              onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
            />
          </label>
          <div className="form-actions">
            <button className="primary-button" type="submit">
              {editingActivity ? "Salvar reagendamento" : "Criar atividade"}
            </button>
            <button className="ghost-button" onClick={closeModal} type="button">
              Cancelar
            </button>
          </div>
        </form>
      </QuickFormModal>
    </div>
  );
}

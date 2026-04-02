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
import { MetricCard } from "../components/tw/shared/MetricCard";
import { SectionHeader } from "../components/tw/shared/SectionHeader";
import { StatusPill } from "../components/tw/shared/StatusPill";

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

function getActivityTone(status: CRMActivityItem["status"]) {
  if (status === "done") {
    return "success";
  }
  if (status === "canceled") {
    return "danger";
  }
  return "primary";
}

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
    <div className="detail-section detail-section-compact activity-panel space-y-6 rounded-3xl border border-border/70 bg-card/95 p-5 shadow-[0_18px_48px_rgba(17,32,49,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <SectionHeader eyebrow="Próximo passo" title={title} description={contextLabel} />
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
          onClick={openCreate}
          type="button"
        >
          <AppIcon name="add" />
          <span>Nova atividade</span>
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          label="Próxima atividade"
          value={summary.nextActivity ? ACTIVITY_TYPE_LABELS[summary.nextActivity.activity_type] : "-"}
          subtitle={summary.nextActivity ? summary.nextActivity.title : "Sem pendência aberta"}
        />
        <MetricCard
          label="Atrasadas"
          value={summary.overdueActivityCount}
          subtitle={summary.overdueActivityCount > 0 ? "Exigem atenção" : "Em dia"}
        />
        <MetricCard label="Total" value={activities.length} subtitle="atividades no contexto" />
      </div>

      {panelError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {panelError}
        </div>
      )}
      {loading && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
          Atualizando atividades...
        </div>
      )}

      {summary.nextActivity && (
        <div
          className={[
            "rounded-2xl border-l-4 px-4 py-4 shadow-sm",
            isPastDue(summary.nextActivity.due_at)
              ? "border-amber-500 bg-amber-50 text-amber-900"
              : "border-primary bg-primary/5 text-foreground",
          ].join(" ")}
        >
          <strong className="block text-sm font-semibold">Próxima ação</strong>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {ACTIVITY_TYPE_LABELS[summary.nextActivity.activity_type]} em {formatDate(summary.nextActivity.due_at)}:{" "}
            {summary.nextActivity.title}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {activities.map((activity) => (
          <article
            key={activity.id}
            className={[
              "rounded-2xl border border-border bg-card/90 p-4 shadow-sm transition-shadow hover:shadow-md",
              activity.status === "done" ? "opacity-80" : "",
            ].join(" ")}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <strong className="block font-heading text-lg font-semibold text-foreground">{activity.title}</strong>
                  <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {ACTIVITY_TYPE_LABELS[activity.activity_type]}
                  </span>
                </div>
                <StatusPill tone={getActivityTone(activity.status)}>{activity.status}</StatusPill>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-muted px-3 py-1">{formatDate(activity.due_at)}</span>
                <span className="rounded-full bg-muted px-3 py-1">{activity.completed_at ? "Concluída" : "Aberta"}</span>
                {activity.owner_user_name && <span className="rounded-full bg-muted px-3 py-1">{activity.owner_user_name}</span>}
              </div>
              {activity.note && <p className="text-sm leading-6 text-muted-foreground">{activity.note}</p>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {activity.status === "pending" && (
                <button
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                  onClick={() => handleComplete(activity)}
                  type="button"
                >
                  <AppIcon name="check" />
                  <span>Concluir</span>
                </button>
              )}
              {activity.status === "pending" && (
                <button
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                  onClick={() => openEdit(activity)}
                  type="button"
                >
                  <AppIcon name="edit" />
                  <span>Reagendar</span>
                </button>
              )}
              {activity.status !== "canceled" && (
                <button
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
                  onClick={() => handleCancel(activity)}
                  type="button"
                >
                  Cancelar
                </button>
              )}
            </div>
          </article>
        ))}
        {activities.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>

      <QuickFormModal
        description="Registre a ação seguinte sem sair do contexto comercial."
        onClose={closeModal}
        open={isOpen}
        title={editingActivity ? "Reagendar atividade" : "Nova atividade"}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field space-y-2">
              <span className="text-sm font-medium text-foreground">Tipo</span>
              <select
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
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
            <label className="field space-y-2">
              <span className="text-sm font-medium text-foreground">Prazo</span>
              <input
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
                value={draft.due_at}
                onChange={(event) => setDraft((current) => ({ ...current, due_at: event.target.value }))}
                type="date"
              />
            </label>
          </div>
          <label className="field space-y-2">
            <span className="text-sm font-medium text-foreground">Título</span>
            <input
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label className="field space-y-2">
            <span className="text-sm font-medium text-foreground">Nota</span>
            <textarea
              className="min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
              value={draft.note}
              onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
            />
          </label>
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
              type="submit"
            >
              {editingActivity ? "Salvar reagendamento" : "Criar atividade"}
            </button>
            <button
              className="inline-flex items-center justify-center rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
              onClick={closeModal}
              type="button"
            >
              Cancelar
            </button>
          </div>
        </form>
      </QuickFormModal>
    </div>
  );
}

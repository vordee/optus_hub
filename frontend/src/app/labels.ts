const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Novo",
  qualified: "Qualificado",
  diagnosis: "Diagnóstico",
  proposal: "Proposta",
  won: "Ganho",
  lost: "Perdido",
};

const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  open: "Aberta",
  proposal: "Proposta",
  won: "Ganha",
  lost: "Perdida",
};

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

const PROJECT_PHASE_STATUS_LABELS: Record<string, string> = {
  planned: "Planejada",
  active: "Em andamento",
  on_hold: "Em pausa",
  completed: "Concluída",
  done: "Concluída",
};

const AUDIT_STATUS_LABELS: Record<string, string> = {
  success: "Sucesso",
  failure: "Falha",
};

function translate(labels: Record<string, string>, value: string | null | undefined, fallback = "Não informado") {
  if (!value) {
    return fallback;
  }
  return labels[value] || value;
}

export const LEAD_STATUSES = ["new", "qualified", "diagnosis", "proposal", "won", "lost"] as const;
export const OPPORTUNITY_STATUSES = ["open", "proposal", "won", "lost"] as const;
export const PROJECT_STATUSES = ["planned", "active", "on_hold", "completed"] as const;
export const PROJECT_TASK_STATUSES = ["pending", "in_progress", "done", "blocked"] as const;

export function formatLeadStatus(status: string | null | undefined) {
  return translate(LEAD_STATUS_LABELS, status);
}

export function formatOpportunityStatus(status: string | null | undefined) {
  return translate(OPPORTUNITY_STATUS_LABELS, status);
}

export function formatProjectStatus(status: string | null | undefined) {
  return translate(PROJECT_STATUS_LABELS, status);
}

export function formatProjectTaskStatus(status: string | null | undefined) {
  return translate(PROJECT_TASK_STATUS_LABELS, status);
}

export function formatProjectPhaseStatus(status: string | null | undefined) {
  return translate(PROJECT_PHASE_STATUS_LABELS, status);
}

export function formatAuditStatus(status: string | null | undefined) {
  return translate(AUDIT_STATUS_LABELS, status);
}

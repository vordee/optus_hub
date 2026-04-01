import { apiRequest } from "./api";
import type { CRMActivityEntityType, CRMActivityItem, CRMActivityStatus, CRMActivityType } from "./types";

type ActivityDraft = {
  activity_type: CRMActivityType;
  title: string;
  note: string;
  due_at: string;
};

function normalizeDueAt(value: string) {
  return value ? `${value}T09:00:00` : null;
}

function sortActivities(items: CRMActivityItem[]) {
  function toMillis(value: string | null) {
    if (!value) {
      return Number.POSITIVE_INFINITY;
    }

    const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value);
    return Number.isNaN(parsed.getTime()) ? Number.POSITIVE_INFINITY : parsed.getTime();
  }

  return [...items].sort((left, right) => {
    const leftPending = left.status === "pending" ? 0 : 1;
    const rightPending = right.status === "pending" ? 0 : 1;
    if (leftPending !== rightPending) {
      return leftPending - rightPending;
    }

    const leftDue = toMillis(left.due_at);
    const rightDue = toMillis(right.due_at);
    if (leftDue !== rightDue) {
      return leftDue - rightDue;
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

export function getActivitySummary(activities: CRMActivityItem[]) {
  const sorted = sortActivities(activities);
  const nextActivity = sorted.find((item) => item.status === "pending") || null;
  const overdueActivityCount = sorted.filter((item) => {
    if (item.status !== "pending" || !item.due_at) {
      return false;
    }

    const parsed = new Date(item.due_at.length === 10 ? `${item.due_at}T00:00:00` : item.due_at);
    return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
  }).length;

  return {
    nextActivity,
    overdueActivityCount,
  };
}

export async function loadActivities(entityType: CRMActivityEntityType, entityId: number) {
  const items = await apiRequest<CRMActivityItem[]>(`/v1/crm/activities?entity_type=${entityType}&entity_id=${entityId}`);
  return sortActivities(items);
}

export async function createOrUpdateActivity(
  entityType: CRMActivityEntityType,
  entityId: number,
  draft: ActivityDraft,
  activityId: number | null,
) {
  const payload = {
    entity_type: entityType,
    entity_id: entityId,
    activity_type: draft.activity_type,
    title: draft.title,
    note: draft.note || null,
    due_at: normalizeDueAt(draft.due_at),
  };

  if (activityId === null) {
    await apiRequest<CRMActivityItem>("/v1/crm/activities", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return;
  }

  await apiRequest<CRMActivityItem>(`/v1/crm/activities/${activityId}`, {
    method: "PATCH",
    body: JSON.stringify({
      activity_type: payload.activity_type,
      title: payload.title,
      note: payload.note,
      due_at: payload.due_at,
    }),
  });
}

async function updateActivityStatus(activityId: number, status: CRMActivityStatus) {
  await apiRequest<CRMActivityItem>(`/v1/crm/activities/${activityId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function completeActivity(activityId: number) {
  await updateActivityStatus(activityId, "done");
}

export async function cancelActivity(activityId: number) {
  await updateActivityStatus(activityId, "canceled");
}

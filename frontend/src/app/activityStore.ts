import type {
  CRMActivityEntityType,
  CRMActivityItem,
  CRMActivityStatus,
  CRMActivityType,
} from "./types";

type ActivityDraft = {
  activity_type: CRMActivityType;
  title: string;
  note: string;
  due_at: string;
};

const STORAGE_KEY = "optus-hub.crm-activities.v1";

function nowIso() {
  return new Date().toISOString();
}

function entityKey(entityType: CRMActivityEntityType, entityId: number) {
  return `${entityType}:${entityId}`;
}

function readStore(): Record<string, CRMActivityItem[]> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, CRMActivityItem[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, CRMActivityItem[]>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
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
    const leftDue = toMillis(left.due_at);
    const rightDue = toMillis(right.due_at);
    if (leftDue !== rightDue) {
      return leftDue - rightDue;
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

function nextId(items: CRMActivityItem[]) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

export function loadActivities(entityType: CRMActivityEntityType, entityId: number | null) {
  if (entityId === null) {
    return [];
  }

  const store = readStore();
  return sortActivities(store[entityKey(entityType, entityId)] || []);
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

export function createOrUpdateActivity(
  entityType: CRMActivityEntityType,
  entityId: number,
  draft: ActivityDraft,
  activityId: number | null,
) {
  const store = readStore();
  const key = entityKey(entityType, entityId);
  const items = store[key] || [];
  const timestamp = nowIso();

  let nextItems: CRMActivityItem[];
  if (activityId === null) {
    const activity: CRMActivityItem = {
      id: nextId(items),
      entity_type: entityType,
      entity_id: entityId,
      activity_type: draft.activity_type,
      title: draft.title,
      note: draft.note || null,
      due_at: draft.due_at || null,
      status: "pending",
      completed_at: null,
      created_at: timestamp,
      updated_at: timestamp,
      created_by_email: null,
    };
    nextItems = [...items, activity];
  } else {
    nextItems = items.map((item) =>
      item.id === activityId
        ? {
            ...item,
            activity_type: draft.activity_type,
            title: draft.title,
            note: draft.note || null,
            due_at: draft.due_at || null,
            updated_at: timestamp,
          }
        : item,
    );
  }

  store[key] = sortActivities(nextItems);
  writeStore(store);
  return store[key];
}

export function completeActivity(entityType: CRMActivityEntityType, entityId: number, activityId: number) {
  const store = readStore();
  const key = entityKey(entityType, entityId);
  const items = store[key] || [];
  const timestamp = nowIso();

  store[key] = items.map((item) =>
    item.id === activityId
      ? {
          ...item,
          status: "done" as CRMActivityStatus,
          completed_at: timestamp,
          updated_at: timestamp,
        }
      : item,
  );
  writeStore(store);
  return store[key];
}

export function cancelActivity(entityType: CRMActivityEntityType, entityId: number, activityId: number) {
  const store = readStore();
  const key = entityKey(entityType, entityId);
  const items = store[key] || [];
  const timestamp = nowIso();

  store[key] = items.map((item) =>
    item.id === activityId
      ? {
          ...item,
          status: "canceled" as CRMActivityStatus,
          updated_at: timestamp,
        }
      : item,
  );
  writeStore(store);
  return store[key];
}

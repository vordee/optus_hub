import type { CRMViewFilters, CRMViewGroupBy, CRMViewModule, SavedViewPayload } from "./types";

const GROUP_BY_VALUES: CRMViewGroupBy[] = ["none", "status", "source", "company", "lead"];
const GROUP_BY_LABELS: Record<CRMViewGroupBy, string> = {
  none: "sem agrupamento",
  status: "status",
  source: "origem",
  company: "empresa",
  lead: "lead",
};

export function normalizeCRMViewGroupBy(value: unknown): CRMViewGroupBy {
  return GROUP_BY_VALUES.includes(value as CRMViewGroupBy) ? (value as CRMViewGroupBy) : "none";
}

export function formatCRMViewGroupByLabel(groupBy: CRMViewGroupBy) {
  return GROUP_BY_LABELS[groupBy];
}

export function normalizeCRMViewFilters(
  filters: Partial<CRMViewFilters> | null | undefined,
  fallbackListView: "lista" | "pipeline" = "lista",
): CRMViewFilters {
  return {
    query: typeof filters?.query === "string" ? filters.query : "",
    status: typeof filters?.status === "string" ? filters.status : "",
    group_by: normalizeCRMViewGroupBy(filters?.group_by),
    list_view: filters?.list_view === "pipeline" ? "pipeline" : fallbackListView,
  };
}

type BuildSavedViewPayloadParams = {
  name: string;
  module: CRMViewModule;
  query: string;
  status: string;
  groupBy: CRMViewGroupBy;
  listView?: "lista" | "pipeline";
  isDefault: boolean;
};

export function buildSavedViewPayload({
  name,
  module,
  query,
  status,
  groupBy,
  listView,
  isDefault,
}: BuildSavedViewPayloadParams): SavedViewPayload {
  return {
    name,
    module,
    filters_json: {
      query,
      status,
      group_by: groupBy,
      list_view: listView,
    },
    group_by: groupBy,
    sort_by: "created_at",
    sort_direction: "desc",
    is_default: isDefault,
  };
}

export function hasViewChanged(left: CRMViewFilters, right: CRMViewFilters) {
  return left.query !== right.query || left.status !== right.status || left.group_by !== right.group_by || left.list_view !== right.list_view;
}

import { apiRequest } from "./api";
import type { CRMViewModule, SavedViewItem, SavedViewPayload } from "./types";

function buildModuleQuery(module: CRMViewModule) {
  return `module=${encodeURIComponent(module)}`;
}

export async function loadSavedViews(module: CRMViewModule) {
  return apiRequest<SavedViewItem[]>(`/v1/crm/saved-views?${buildModuleQuery(module)}`);
}

export async function createSavedView(payload: SavedViewPayload) {
  return apiRequest<SavedViewItem>("/v1/crm/saved-views", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSavedView(viewId: number, payload: SavedViewPayload) {
  return apiRequest<SavedViewItem>(`/v1/crm/saved-views/${viewId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

import type { LeadDetailItem } from "./types";

const OPPORTUNITY_DRAFT_KEY = "optus.crm.opportunity-draft";

type OpportunityDraft = {
  lead_id: string;
  title: string;
  description: string;
  amount: string;
};

export function storeOpportunityDraftFromLead(lead: LeadDetailItem) {
  const draft: OpportunityDraft = {
    lead_id: String(lead.id),
    title: lead.title,
    description: lead.description || "",
    amount: "",
  };

  window.localStorage.setItem(OPPORTUNITY_DRAFT_KEY, JSON.stringify(draft));
}

export function consumeOpportunityDraft(): OpportunityDraft | null {
  const raw = window.localStorage.getItem(OPPORTUNITY_DRAFT_KEY);
  if (!raw) {
    return null;
  }

  window.localStorage.removeItem(OPPORTUNITY_DRAFT_KEY);

  try {
    const parsed = JSON.parse(raw) as Partial<OpportunityDraft>;
    if (!parsed.lead_id || !parsed.title) {
      return null;
    }

    return {
      lead_id: parsed.lead_id,
      title: parsed.title,
      description: parsed.description || "",
      amount: parsed.amount || "",
    };
  } catch {
    return null;
  }
}

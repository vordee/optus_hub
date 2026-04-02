import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import { formatDateTime } from "../app/format";
import { formatAuditStatus } from "../app/labels";
import type { AuditEventItem } from "../app/types";
import { EmptyState, InlineAlert, PageHeader, PageShell, Panel, PanelBody, TableShell } from "../components/tw/ui";

export function AuditPage() {
  const [items, setItems] = useState<AuditEventItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      setItems(ensureArray(await apiRequest<AuditEventItem[]>("/v1/admin/audit-events?limit=50")));
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Falha ao carregar auditoria.");
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Segurança"
        title="Eventos recentes"
        description="Leitura compacta da trilha de auditoria e dos eventos sensíveis da operação."
      />

      {error && <InlineAlert>{error}</InlineAlert>}

      <Panel>
        <PanelBody className="p-0">
          <TableShell>
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Quando</th>
                  <th className="px-4 py-3 font-semibold">Ação</th>
                  <th className="px-4 py-3 font-semibold">Ator</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Alvo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(item.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.action}</td>
                    <td className="px-4 py-3 text-slate-600">{item.actor_email || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {formatAuditStatus(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{[item.target_type, item.target_id].filter(Boolean).join(" #") || "-"}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="px-4 py-8" colSpan={5}>
                      <EmptyState
                        description="Ainda não há eventos de auditoria recentes para exibir."
                        title="Sem auditoria recente"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableShell>
        </PanelBody>
      </Panel>
    </PageShell>
  );
}

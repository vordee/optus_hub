import { useEffect, useState } from "react";

import { apiRequest, ApiError } from "../app/api";
import { ensureArray } from "../app/arrays";
import { formatDateTime } from "../app/format";
import { formatAuditStatus } from "../app/labels";
import type { AuditEventItem } from "../app/types";

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
    <section className="page-grid single">
      <article className="card">
        <div className="section-heading">
          <span className="eyebrow">Segurança</span>
          <h3>Eventos recentes</h3>
        </div>

        {error && <div className="inline-error">{error}</div>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Ação</th>
                <th>Ator</th>
                <th>Status</th>
                <th>Alvo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{formatDateTime(item.created_at)}</td>
                  <td>{item.action}</td>
                  <td>{item.actor_email || "-"}</td>
                  <td>{formatAuditStatus(item.status)}</td>
                  <td>{[item.target_type, item.target_id].filter(Boolean).join(" #") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

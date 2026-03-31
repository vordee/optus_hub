export function DashboardPage() {
  return (
    <section className="page-grid single">
      <article className="card highlight-card">
        <span className="eyebrow">Estado atual</span>
        <h3>Base pronta para operar com identidade da Optus</h3>
        <p>
          O backend já expõe autenticação, administração, auditoria, CRM e projetos.
          O frontend agora segue a marca da empresa e mantém o caminho humano simples
          para evoluir módulo por módulo.
        </p>

        <div className="metric-grid">
          <div className="metric-card">
            <span>Admin</span>
            <strong>Usuários, papéis e auditoria</strong>
          </div>
          <div className="metric-card">
            <span>CRM</span>
            <strong>Empresas, contatos, leads e oportunidades</strong>
          </div>
          <div className="metric-card">
            <span>Entrega</span>
            <strong>Projetos ligados ao funil</strong>
          </div>
        </div>
      </article>
    </section>
  );
}

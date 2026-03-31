import { useEffect, useState } from "react";

import { apiRequest, ApiError, login } from "./api";
import { clearToken, getStoredToken, storeToken } from "./auth";
import type { AuthenticatedUser, NavKey } from "./types";
import { AuditPage } from "../pages/AuditPage";
import { CompaniesPage } from "../pages/CompaniesPage";
import { ContactsPage } from "../pages/ContactsPage";
import { DashboardPage } from "../pages/DashboardPage";
import { LeadsPage } from "../pages/LeadsPage";
import { OpportunitiesPage } from "../pages/OpportunitiesPage";
import { RolesPage } from "../pages/RolesPage";
import { UsersPage } from "../pages/UsersPage";

interface SessionState {
  loading: boolean;
  user: AuthenticatedUser | null;
  error: string | null;
}

const NAV_ITEMS: Array<{ key: NavKey; label: string; group: string }> = [
  { key: "dashboard", label: "Visão geral", group: "Operação" },
  { key: "users", label: "Usuários", group: "Admin" },
  { key: "roles", label: "Papéis", group: "Admin" },
  { key: "audit", label: "Auditoria", group: "Admin" },
  { key: "companies", label: "Empresas", group: "CRM" },
  { key: "contacts", label: "Contatos", group: "CRM" },
  { key: "leads", label: "Leads", group: "CRM" },
  { key: "opportunities", label: "Oportunidades", group: "CRM" },
];

export function App() {
  const [session, setSession] = useState<SessionState>({
    loading: true,
    user: null,
    error: null,
  });
  const [activeNav, setActiveNav] = useState<NavKey>("dashboard");

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setSession({ loading: false, user: null, error: null });
      return;
    }

    void loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      const user = await apiRequest<AuthenticatedUser>("/v1/auth/me");
      setSession({ loading: false, user, error: null });
    } catch (error) {
      clearToken();
      setSession({
        loading: false,
        user: null,
        error: error instanceof ApiError ? error.message : "Falha ao carregar a sessão.",
      });
    }
  }

  async function handleLogin(email: string, password: string) {
    const token = await login(email, password);
    storeToken(token);
    await loadCurrentUser();
  }

  function handleLogout() {
    clearToken();
    setSession({ loading: false, user: null, error: null });
    setActiveNav("dashboard");
  }

  if (session.loading) {
    return <div className="screen-center">Carregando sessão...</div>;
  }

  if (!session.user) {
    return <LoginScreen onLogin={handleLogin} error={session.error} />;
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-kicker">Optus Hub</div>
          <h1>Painel operacional</h1>
          <p>Administração e CRM na mesma superfície.</p>
        </div>

        <nav className="nav-list">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={item.key === activeNav ? "nav-item active" : "nav-item"}
              onClick={() => setActiveNav(item.key)}
              type="button"
            >
              <span>{item.label}</span>
              <small>{item.group}</small>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div>
            <strong>{session.user.full_name}</strong>
            <small>{session.user.email}</small>
          </div>
          <button className="ghost-button" onClick={handleLogout} type="button">
            Sair
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">Módulo ativo</span>
            <h2>{NAV_ITEMS.find((item) => item.key === activeNav)?.label}</h2>
          </div>
          <div className="permission-pill">{session.user.roles.join(", ") || "sem papel"}</div>
        </header>

        {activeNav === "dashboard" && <DashboardPage />}
        {activeNav === "users" && <UsersPage />}
        {activeNav === "roles" && <RolesPage />}
        {activeNav === "audit" && <AuditPage />}
        {activeNav === "companies" && <CompaniesPage />}
        {activeNav === "contacts" && <ContactsPage />}
        {activeNav === "leads" && <LeadsPage />}
        {activeNav === "opportunities" && <OpportunitiesPage />}
      </main>
    </div>
  );
}

function LoginScreen({
  onLogin,
  error,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  error: string | null;
}) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    try {
      await onLogin(email, password);
    } catch (submitError) {
      setLocalError(submitError instanceof ApiError ? submitError.message : "Falha ao autenticar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-layout">
      <section className="login-hero">
        <div className="hero-panel">
          <span className="eyebrow">Optus Hub</span>
          <h1>Operação corporativa com base real de backend.</h1>
          <p>
            Esta interface já consome autenticação, administração, auditoria e CRM
            diretamente da API publicada.
          </p>
        </div>
      </section>

      <section className="login-panel">
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="section-heading">
            <span className="eyebrow">Acesso</span>
            <h2>Entrar</h2>
          </div>

          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {(error || localError) && <div className="inline-error">{localError || error}</div>}

          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </div>
  );
}

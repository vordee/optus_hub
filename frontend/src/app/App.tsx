import { useEffect, useState } from "react";

import { apiRequest, ApiError, login } from "./api";
import { ensureArray } from "./arrays";
import { clearToken, getStoredToken, storeToken } from "./auth";
import type { AuthenticatedUser, NavKey } from "./types";
import { AuditPage } from "../pages/AuditPage";
import { CompaniesPage } from "../pages/CompaniesPage";
import { ContactsPage } from "../pages/ContactsPage";
import { DashboardPage } from "../pages/DashboardPage";
import { LeadsPage } from "../pages/LeadsPage";
import { OpportunitiesPage } from "../pages/OpportunitiesPage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { RolesPage } from "../pages/RolesPage";
import { UsersPage } from "../pages/UsersPage";
import optusLogo from "../assets/optus-logo.png";

interface SessionState {
  loading: boolean;
  user: AuthenticatedUser | null;
  error: string | null;
}

interface NavItem {
  key: NavKey;
  label: string;
  description: string;
}

interface NavSection {
  title: string;
  summary: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Painel",
    summary: "Leitura rápida da operação e atalhos de decisão.",
    items: [
      { key: "dashboard", label: "Visão geral", description: "Estado atual da plataforma e atalhos de trabalho." },
    ],
  },
  {
    title: "Fluxo comercial",
    summary: "Da entrada ao avanço do relacionamento.",
    items: [
      { key: "leads", label: "Leads", description: "Entrada e qualificação de demanda." },
      { key: "opportunities", label: "Oportunidades", description: "Pipeline comercial e fechamento." },
      { key: "companies", label: "Empresas", description: "Cadastro base do relacionamento comercial." },
      { key: "contacts", label: "Contatos", description: "Pessoas vinculadas às contas." },
    ],
  },
  {
    title: "Entrega",
    summary: "Execução e acompanhamento do que foi vendido.",
    items: [
      { key: "projects", label: "Projetos", description: "Entrega operacional iniciada a partir do funil." },
    ],
  },
  {
    title: "Governança",
    summary: "Acesso, papéis e trilha operacional.",
    items: [
      { key: "users", label: "Usuários", description: "Contas, acessos e vínculo de papéis." },
      { key: "roles", label: "Papéis", description: "Permissões e controle de acesso." },
      { key: "audit", label: "Auditoria", description: "Eventos sensíveis e trilha operacional." },
    ],
  },
];

export function App() {
  const [session, setSession] = useState<SessionState>({
    loading: true,
    user: null,
    error: null,
  });
  const [activeNav, setActiveNav] = useState<NavKey>("dashboard");
  const activeItem = NAV_SECTIONS.flatMap((section) => section.items).find((item) => item.key === activeNav);

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

  const safeRoles = ensureArray(session.user.roles);

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-logo-surface">
            <img alt="Optus Group" className="brand-logo" src={optusLogo} />
          </div>
          <div className="brand-copy">
            <div className="brand-kicker">Optus Hub</div>
            <h1>Software house operacional</h1>
            <p>Administração, CRM e entrega em uma única superfície.</p>
          </div>
        </div>

        <nav className="nav-list">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="nav-group">
              <div className="nav-group-header">
                <span className="nav-group-title">{section.title}</span>
                <span className="nav-group-summary">{section.summary}</span>
              </div>
              <div className="nav-group-items">
                {section.items.map((item) => (
                  <button
                    key={item.key}
                    className={item.key === activeNav ? "nav-item active" : "nav-item"}
                    onClick={() => setActiveNav(item.key)}
                    type="button"
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
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
            <h2>{activeItem?.label}</h2>
            <p className="topbar-copy">{activeItem?.description}</p>
          </div>
          <div className="permission-pill">{safeRoles.join(", ") || "sem papel"}</div>
        </header>

        {activeNav === "dashboard" && <DashboardPage currentUser={session.user} />}
        {activeNav === "users" && <UsersPage />}
        {activeNav === "roles" && <RolesPage />}
        {activeNav === "audit" && <AuditPage />}
        {activeNav === "companies" && <CompaniesPage />}
        {activeNav === "contacts" && <ContactsPage />}
        {activeNav === "leads" && <LeadsPage />}
        {activeNav === "opportunities" && <OpportunitiesPage />}
        {activeNav === "projects" && <ProjectsPage />}
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
          <div className="hero-brand">
            <div className="brand-logo-surface hero-logo">
              <img alt="Optus Group" className="brand-logo" src={optusLogo} />
            </div>
            <span className="eyebrow">Optus Hub</span>
          </div>
          <h1>Operação corporativa com base real de backend.</h1>
          <p>
            Esta interface já consome autenticação, administração, auditoria, CRM e
            projetos diretamente da API publicada.
          </p>
          <div className="hero-notes">
            <span>Admin</span>
            <span>CRM</span>
            <span>Entrega</span>
          </div>
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

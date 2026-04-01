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
  icon: IconName;
  description: string;
}

interface NavSection {
  title: string;
  summary: string;
  items: NavItem[];
}

type IconName =
  | "dashboard"
  | "companies"
  | "contacts"
  | "leads"
  | "opportunities"
  | "projects"
  | "users"
  | "roles"
  | "audit"
  | "sidebar-open"
  | "sidebar-close"
  | "logout";

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Painel",
    summary: "Acompanhamento executivo e leitura rápida da operação.",
    items: [
      { key: "dashboard", label: "Visão geral", icon: "dashboard", description: "Estado atual da plataforma e atalhos de trabalho." },
    ],
  },
  {
    title: "Fluxo comercial",
    summary: "Base do CRM, qualificação e negociação até o fechamento.",
    items: [
      { key: "companies", label: "Empresas", icon: "companies", description: "Contas e base relacional do CRM." },
      { key: "contacts", label: "Contatos", icon: "contacts", description: "Pessoas vinculadas às contas e seus canais." },
      { key: "leads", label: "Leads", icon: "leads", description: "Entrada, qualificação e leitura comercial da demanda." },
      { key: "opportunities", label: "Oportunidades", icon: "opportunities", description: "Negociação, transição e fechamento comercial." },
    ],
  },
  {
    title: "Entrega",
    summary: "Kickoff e execução operacional do que foi vendido.",
    items: [
      { key: "projects", label: "Projetos", icon: "projects", description: "Entrega operacional iniciada a partir do funil." },
    ],
  },
  {
    title: "Governança",
    summary: "Acesso, papéis e trilha de controle do sistema.",
    items: [
      { key: "users", label: "Usuários", icon: "users", description: "Contas, acessos e vínculo de papéis." },
      { key: "roles", label: "Papéis", icon: "roles", description: "Permissões e controle de acesso." },
      { key: "audit", label: "Auditoria", icon: "audit", description: "Eventos sensíveis e trilha operacional." },
    ],
  },
];

const NAV_KEYS = new Set<NavKey>(NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.key)));

function getNavFromHash(hash: string): NavKey | null {
  const candidate = hash.replace(/^#/, "");
  return NAV_KEYS.has(candidate as NavKey) ? (candidate as NavKey) : null;
}

function AppIcon({ name }: { name: IconName }) {
  const commonProps = {
    className: "app-icon-svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return <svg {...commonProps}><path d="M4 5h7v6H4zM13 5h7v10h-7zM4 13h7v6H4zM13 17h7v2h-7z" /></svg>;
    case "companies":
      return <svg {...commonProps}><path d="M4 20V6l8-3 8 3v14" /><path d="M9 20v-4h6v4" /><path d="M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01" /></svg>;
    case "contacts":
      return <svg {...commonProps}><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 8v6" /><path d="M23 11h-6" /></svg>;
    case "leads":
      return <svg {...commonProps}><path d="m4 12 5 5L20 6" /><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /></svg>;
    case "opportunities":
      return <svg {...commonProps}><path d="M4 19h16" /><path d="M7 16V9" /><path d="M12 16V5" /><path d="M17 16v-3" /></svg>;
    case "projects":
      return <svg {...commonProps}><path d="M3 7h18" /><path d="M7 3v4" /><path d="M17 3v4" /><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 11h8M8 15h5" /></svg>;
    case "users":
      return <svg {...commonProps}><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "roles":
      return <svg {...commonProps}><path d="m12 2 7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case "audit":
      return <svg {...commonProps}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /><path d="M11 8v3l2 2" /></svg>;
    case "sidebar-open":
      return <svg {...commonProps}><path d="M4 5h16v14H4z" /><path d="M9 5v14" /><path d="m13 12 3-3" /><path d="m13 12 3 3" /></svg>;
    case "sidebar-close":
      return <svg {...commonProps}><path d="M4 5h16v14H4z" /><path d="M15 5v14" /><path d="m11 12-3-3" /><path d="m11 12-3 3" /></svg>;
    case "logout":
      return <svg {...commonProps}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>;
  }
}

export function App() {
  const [session, setSession] = useState<SessionState>({
    loading: true,
    user: null,
    error: null,
  });
  const [activeNav, setActiveNav] = useState<NavKey>(() => getNavFromHash(window.location.hash) || "dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeSection = NAV_SECTIONS.find((section) => section.items.some((item) => item.key === activeNav)) || null;
  const activeItem = NAV_SECTIONS.flatMap((section) => section.items).find((item) => item.key === activeNav);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setSession({ loading: false, user: null, error: null });
      return;
    }

    void loadCurrentUser();
  }, []);

  useEffect(() => {
    function syncNavFromHash() {
      const hashNav = getNavFromHash(window.location.hash);
      if (hashNav) {
        setActiveNav(hashNav);
      }
    }

    window.addEventListener("hashchange", syncNavFromHash);
    return () => window.removeEventListener("hashchange", syncNavFromHash);
  }, []);

  useEffect(() => {
    const nextHash = `#${activeNav}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = activeNav;
    }
  }, [activeNav]);

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
    <div className={sidebarCollapsed ? "app-frame sidebar-collapsed" : "app-frame"}>
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-logo-surface">
            <img alt="Optus Group" className="brand-logo" src={optusLogo} />
          </div>
          {!sidebarCollapsed && (
            <div className="brand-copy">
              <div className="brand-kicker">Optus Hub</div>
              <small>Mesa operacional unificada</small>
            </div>
          )}
        </div>

        <button
          aria-controls="sidebar-navigation"
          aria-expanded={!sidebarCollapsed}
          aria-label={sidebarCollapsed ? "Abrir menu" : "Recolher menu"}
          className="ghost-button sidebar-toggle"
          onClick={() => setSidebarCollapsed((current) => !current)}
          title={sidebarCollapsed ? "Abrir menu" : "Recolher menu"}
          type="button"
        >
          <AppIcon name={sidebarCollapsed ? "sidebar-open" : "sidebar-close"} />
        </button>

        <nav aria-label="Navegação principal" className="nav-list" id="sidebar-navigation">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="nav-group">
              {!sidebarCollapsed && (
                <div className="nav-group-header">
                  <span className="nav-group-title">{section.title}</span>
                  <span className="nav-group-summary">{section.summary}</span>
                </div>
              )}
              <div className="nav-group-items">
                {section.items.map((item) => (
                  <button
                    key={item.key}
                    className={item.key === activeNav ? "nav-item active" : "nav-item"}
                    aria-pressed={item.key === activeNav}
                    onClick={() => setActiveNav(item.key)}
                    title={item.label}
                    type="button"
                  >
                    <span className="nav-item-content">
                      <span className="nav-item-icon"><AppIcon name={item.icon} /></span>
                      {!sidebarCollapsed && <span className="nav-item-label">{item.label}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!sidebarCollapsed && (
            <div>
              <strong>{session.user.full_name}</strong>
              <small>{session.user.email}</small>
            </div>
          )}
          <button
            aria-label="Sair"
            className="ghost-button button-with-icon"
            onClick={handleLogout}
            title="Sair"
            type="button"
          >
            <AppIcon name="logout" />
            {!sidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow topbar-kicker">
              Optus Hub
              {activeSection ? ` / ${activeSection.title}` : ""}
            </span>
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

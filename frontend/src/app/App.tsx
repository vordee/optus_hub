import { useEffect, useState } from "react";

import { apiRequest, ApiError, login } from "./api";
import { ensureArray } from "./arrays";
import { clearToken, getStoredToken, storeToken } from "./auth";
import { AppIcon, type AppIconName } from "./icons";
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
  icon: AppIconName;
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
  const safeRoles = ensureArray(session.user?.roles);

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

  return (
    <>
      <a className="skip-link" href="#main-content">Pular navegação</a>
      <div className={sidebarCollapsed ? "app-frame sidebar-collapsed" : "app-frame"}>
        <aside className="sidebar">
          <div className="sidebar-head">
            <div className="brand-block">
              <div className="brand-logo-surface">
                <img alt="Optus Group" className="brand-logo" src={optusLogo} />
              </div>
              {!sidebarCollapsed && (
                <div className="brand-copy">
                  <div className="brand-kicker">Optus Hub</div>
                  <strong className="sidebar-brand-title">Mesa operacional</strong>
                  <small>CRM, governança e entrega conectados à API real.</small>
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
          </div>

          {!sidebarCollapsed && activeSection && (
            <div className="sidebar-spotlight">
              <span className="sidebar-spotlight-label">Seção ativa</span>
              <strong>{activeSection.title}</strong>
              <p>{activeSection.summary}</p>
            </div>
          )}

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
                        {!sidebarCollapsed && (
                          <span className="nav-item-copy">
                            <span className="nav-item-label">{item.label}</span>
                            <span className="nav-item-description">{item.description}</span>
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            {!sidebarCollapsed && (
              <div className="sidebar-user-card">
                <span className="sidebar-user-label">Sessão</span>
                <strong>{session.user.full_name}</strong>
                <small>{session.user.email}</small>
                <div className="sidebar-role-list">
                  {safeRoles.length > 0 ? safeRoles.map((role) => (
                    <span key={role} className="sidebar-role-pill">{role}</span>
                  )) : <span className="sidebar-role-pill">sem papel</span>}
                </div>
              </div>
            )}
            <button
              aria-label="Sair"
              className="ghost-button button-with-icon sidebar-logout"
              onClick={handleLogout}
              title="Sair"
              type="button"
            >
              <AppIcon name="logout" />
              {!sidebarCollapsed && <span>Sair</span>}
            </button>
          </div>
        </aside>

        <main className="main-content" id="main-content" tabIndex={-1}>
          <header className="topbar">
            <div className="topbar-main">
              <span className="eyebrow topbar-kicker">
                Optus Hub
                {activeSection ? ` / ${activeSection.title}` : ""}
              </span>
              <h2>{activeItem?.label}</h2>
              <p className="topbar-copy">{activeItem?.description}</p>
            </div>
            <div className="topbar-meta">
              <div className="permission-pill">{safeRoles.join(", ") || "sem papel"}</div>
              <div className="topbar-user-meta">
                <strong>{session.user.full_name}</strong>
                <small>{session.user.email}</small>
              </div>
            </div>
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
    </>
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
          <div className="hero-proof">
            <div>
              <strong>Frontend em produção</strong>
              <small>Shell React conectado ao backend FastAPI atual.</small>
            </div>
            <div>
              <strong>Navegação operacional</strong>
              <small>Fluxo comercial, projetos e governança no mesmo painel.</small>
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel">
        <form className="card form-card" onSubmit={handleSubmit}>
          <div className="section-heading">
            <span className="eyebrow">Acesso</span>
            <h2>Entrar</h2>
            <p className="section-copy">
              Use a conta publicada no backend para abrir a sessão e acessar CRM, projetos e governança.
            </p>
          </div>

          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              inputMode="email"
              placeholder="admin@example.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <small className="field-hint">A conta deve existir no backend publicado.</small>
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              autoComplete="current-password"
              aria-invalid={Boolean(error || localError)}
              placeholder="Sua senha de acesso"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <small className="field-hint">Se a sessão expirar, faça login novamente.</small>
          </label>

          {(error || localError) && <div className="inline-error">{localError || error}</div>}

          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Entrando..." : "Entrar"}
          </button>

          <div className="login-footnote">
            <span>Autenticação</span>
            <small>Use sua conta publicada no backend para abrir a sessão.</small>
          </div>
        </form>
      </section>
    </div>
  );
}

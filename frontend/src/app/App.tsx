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
import { AppShell, LoginShell, type ShellNavSection } from "../components/tw/shell";

interface SessionState {
  loading: boolean;
  user: AuthenticatedUser | null;
  error: string | null;
}

const NAV_SECTIONS: ShellNavSection[] = [
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
    return (
      <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,rgba(3,105,161,0.10),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#e7edf5_100%)] text-slate-600">
        Carregando sessão...
      </div>
    );
  }

  if (!session.user) {
    return <LoginShell onLogin={handleLogin} error={session.error} />;
  }

  return (
    <AppShell
      activeItem={activeItem}
      activeNav={activeNav}
      activeSection={activeSection}
      collapsed={sidebarCollapsed}
      currentUser={session.user}
      onLogout={handleLogout}
      onNavigate={setActiveNav}
      onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
      roles={safeRoles}
      sections={NAV_SECTIONS}
    >
      {activeNav === "dashboard" && <DashboardPage currentUser={session.user} />}
      {activeNav === "users" && <UsersPage />}
      {activeNav === "roles" && <RolesPage />}
      {activeNav === "audit" && <AuditPage />}
      {activeNav === "companies" && <CompaniesPage />}
      {activeNav === "contacts" && <ContactsPage />}
      {activeNav === "leads" && <LeadsPage />}
      {activeNav === "opportunities" && <OpportunitiesPage />}
      {activeNav === "projects" && <ProjectsPage />}
    </AppShell>
  );
}

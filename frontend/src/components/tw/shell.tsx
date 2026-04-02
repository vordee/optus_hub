import { useState, type FormEvent, type ReactNode } from "react";

import optusLogo from "../../assets/optus-logo.png";
import { AppIcon, type AppIconName } from "../../app/icons";
import type { AuthenticatedUser, NavKey } from "../../app/types";

export type ShellNavItem = {
  key: NavKey;
  label: string;
  icon: AppIconName;
  description: string;
};

export type ShellNavSection = {
  title: string;
  summary: string;
  items: ShellNavItem[];
};

type AppShellProps = {
  sections: ShellNavSection[];
  activeNav: NavKey;
  activeSection: ShellNavSection | null;
  activeItem: ShellNavItem | undefined;
  currentUser: AuthenticatedUser;
  roles: string[];
  collapsed: boolean;
  onToggleSidebar: () => void;
  onNavigate: (key: NavKey) => void;
  onLogout: () => void;
  children: ReactNode;
};

export function AppShell({
  sections,
  activeNav,
  activeSection,
  activeItem,
  currentUser,
  roles,
  collapsed,
  onToggleSidebar,
  onNavigate,
  onLogout,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(3,105,161,0.10),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#e7edf5_100%)] text-slate-900">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-slate-950 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        href="#main-content"
      >
        Pular navegação
      </a>

      <div className={collapsed ? "grid min-h-screen grid-cols-[96px_minmax(0,1fr)]" : "grid min-h-screen grid-cols-[320px_minmax(0,1fr)]"}>
        <aside className="flex min-h-screen flex-col gap-5 border-r border-slate-200/80 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.16),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.995),rgba(8,16,31,0.99))] px-5 py-5 text-slate-50 shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div className={collapsed ? "grid w-full justify-items-center gap-3" : "grid gap-3"}>
              <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_16px_34px_rgba(0,0,0,0.18)]">
                <img alt="Optus Group" className="h-auto w-[150px]" src={optusLogo} />
              </div>
              {!collapsed && (
                <div className="grid gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-300">
                    Optus Hub
                  </span>
                  <strong className="font-heading text-[26px] leading-none text-white">
                    Mesa operacional
                  </strong>
                  <p className="max-w-xs text-sm leading-6 text-slate-300">
                    CRM, governança e entrega conectados à API real.
                  </p>
                </div>
              )}
            </div>

            <button
              aria-controls="sidebar-navigation"
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Abrir menu" : "Recolher menu"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/95 text-slate-100 transition hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-sky-400/20"
              onClick={onToggleSidebar}
              type="button"
            >
              <AppIcon name={collapsed ? "sidebar-open" : "sidebar-close"} />
            </button>
          </div>

          {!collapsed && activeSection && (
            <div className="grid gap-2 rounded-2xl border border-sky-400/20 bg-white/5 p-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">
                Seção ativa
              </span>
              <strong className="font-heading text-lg text-white">{activeSection.title}</strong>
              <p className="text-sm leading-6 text-slate-300">{activeSection.summary}</p>
            </div>
          )}

          <nav aria-label="Navegação principal" className="grid gap-4" id="sidebar-navigation">
            {sections.map((section) => (
              <div key={section.title} className="grid gap-2">
                {!collapsed && (
                  <div className="grid gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      {section.title}
                    </span>
                    <span className="text-sm leading-6 text-slate-300">{section.summary}</span>
                  </div>
                )}
                <div className="grid gap-2">
                  {section.items.map((item) => {
                    const isActive = item.key === activeNav;
                    return (
                      <button
                        key={item.key}
                        aria-pressed={isActive}
                        className={
                          isActive
                            ? "flex items-start gap-3 rounded-2xl border border-sky-300/40 bg-[linear-gradient(135deg,rgba(3,105,161,0.30),rgba(3,105,161,0.08))] px-4 py-3 text-left text-slate-50 shadow-[inset_0_0_0_1px_rgba(147,185,220,0.14)] transition"
                            : "flex items-start gap-3 rounded-2xl border border-white/5 bg-white/0 px-4 py-3 text-left text-slate-50 transition hover:-translate-y-px hover:bg-white/5"
                        }
                        onClick={() => onNavigate(item.key)}
                        title={item.label}
                        type="button"
                      >
                        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 text-slate-100">
                          <AppIcon name={item.icon} />
                        </span>
                        {!collapsed && (
                          <span className="grid gap-1 text-left">
                            <span className="font-semibold tracking-tight text-white">{item.label}</span>
                            <span className="text-sm leading-5 text-slate-300">{item.description}</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto grid gap-3">
            {!collapsed && (
              <div className="grid gap-2 rounded-2xl border border-sky-400/20 bg-white/5 p-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">
                  Sessão
                </span>
                <strong className="font-heading text-base text-white">{currentUser.full_name}</strong>
                <small className="break-all text-sm text-slate-300">{currentUser.email}</small>
                <div className="flex flex-wrap gap-2 pt-1">
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex rounded-full bg-sky-400/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-100"
                      >
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex rounded-full bg-sky-400/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-100">
                      sem papel
                    </span>
                  )}
                </div>
              </div>
            )}

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/95 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-sky-400/20"
              onClick={onLogout}
              type="button"
            >
              <AppIcon name="logout" />
              {!collapsed && <span>Sair</span>}
            </button>
          </div>
        </aside>

        <main className="min-w-0 px-5 py-6 lg:px-6">
          <header className="topbar mb-5 rounded-[28px] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(240,245,250,0.94))] px-5 py-4 shadow-[0_18px_48px_rgba(17,32,49,0.08)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="grid gap-2">
                <span className="topbar-kicker text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">
                  Optus Hub{activeSection ? ` / ${activeSection.title}` : ""}
                </span>
                <h2 className="font-heading text-[clamp(1.8rem,3vw,2.6rem)] font-bold tracking-tight text-slate-950">
                  {activeItem?.label}
                </h2>
                <p className="max-w-4xl text-sm leading-6 text-slate-600">{activeItem?.description}</p>
              </div>
              <div className="grid gap-2 xl:justify-items-end">
                <div className="inline-flex w-fit rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                  {roles.join(", ") || "sem papel"}
                </div>
                <div className="grid gap-1 text-sm text-slate-600 xl:text-right">
                  <strong className="font-semibold text-slate-900">{currentUser.full_name}</strong>
                  <small>{currentUser.email}</small>
                </div>
              </div>
            </div>
          </header>

          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

type LoginShellProps = {
  onLogin: (email: string, password: string) => Promise<void>;
  error: string | null;
};

export function LoginShell({ onLogin, error }: LoginShellProps) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    try {
      await onLogin(email, password);
    } catch (submitError) {
      setLocalError(submitError instanceof Error ? submitError.message : "Falha ao autenticar.");
    } finally {
      setSubmitting(false);
    }
  }

  const displayError = localError || error;

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
      <section className="flex items-stretch p-4 lg:p-6">
        <div className="flex w-full flex-col justify-between gap-8 rounded-[32px] border border-slate-800/70 bg-[radial-gradient(circle_at_top_left,rgba(147,185,220,0.18),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.995),rgba(8,16,31,0.98))] p-7 text-slate-50 shadow-[0_24px_64px_rgba(15,23,42,0.16)] lg:p-10">
          <div className="grid gap-6">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_16px_34px_rgba(0,0,0,0.18)] w-fit">
              <img alt="Optus Group" className="h-auto w-40" src={optusLogo} />
            </div>
            <div className="grid gap-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300">
                Optus Hub
              </span>
              <h1 className="max-w-lg font-heading text-[clamp(2.5rem,5vw,4rem)] font-bold tracking-tight text-white">
                Operação corporativa com base real de backend.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-300">
                Esta interface já consome autenticação, administração, auditoria, CRM e projetos diretamente
                da API publicada.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Admin", "CRM", "Entrega"].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex rounded-full border border-sky-400/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1 rounded-2xl border border-sky-400/20 bg-white/5 p-4">
              <strong className="font-heading text-lg text-white">Frontend em produção</strong>
              <small className="text-sm leading-6 text-slate-300">Shell React conectado ao backend FastAPI atual.</small>
            </div>
            <div className="grid gap-1 rounded-2xl border border-sky-400/20 bg-white/5 p-4">
              <strong className="font-heading text-lg text-white">Navegação operacional</strong>
              <small className="text-sm leading-6 text-slate-300">Fluxo comercial, projetos e governança no mesmo painel.</small>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-4 lg:p-6">
        <form
          className="grid w-full max-w-md gap-5 rounded-[28px] border border-slate-200/90 bg-white/95 p-6 shadow-[0_18px_48px_rgba(17,32,49,0.08)]"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">Acesso</span>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-950">Entrar</h2>
            <p className="text-sm leading-6 text-slate-600">
              Use a conta publicada no backend para abrir a sessão e acessar CRM, projetos e governança.
            </p>
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-900">
            <span>Email</span>
            <input
              autoComplete="email"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-600/10"
              inputMode="email"
              placeholder="admin@example.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <small className="text-xs font-normal leading-5 text-slate-500">
              A conta deve existir no backend publicado.
            </small>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-900">
            <span>Senha</span>
            <input
              autoComplete="current-password"
              aria-invalid={Boolean(displayError)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-600/10"
              placeholder="Sua senha de acesso"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <small className="text-xs font-normal leading-5 text-slate-500">
              Se a sessão expirar, faça login novamente.
            </small>
          </label>

          {displayError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {displayError}
            </div>
          )}

          <button
            className="inline-flex w-full items-center justify-center rounded-xl bg-sky-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus:ring-4 focus:ring-sky-600/15 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>

          <div className="grid gap-1 border-t border-slate-200 pt-1">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Autenticação</span>
            <small className="text-sm leading-6 text-slate-600">
              Use sua conta publicada no backend para abrir a sessão.
            </small>
          </div>
        </form>
      </section>
    </div>
  );
}

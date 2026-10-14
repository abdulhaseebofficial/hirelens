import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import {
  IconHistory,
  IconKey,
  IconLinkedin,
  IconLogout,
  IconMail,
  IconMenu,
  IconMoon,
  IconPlus,
  IconShield,
  IconSun,
  IconX,
} from "@/components/icons";
import { apiKeyStore } from "@/api/client";
import { Avatar } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

/** Who built this, and where feedback goes. */
const DEVELOPER = {
  name: "Abdul Haseeb",
  linkedin: "https://www.linkedin.com/in/abdulhaseebkashmiri/",
  email: "abdul.haseeb.kashmiri@outlook.com",
};

const NAV = [
  { to: "/", end: true, label: "History", icon: IconHistory, hint: "Past screening runs" },
  { to: "/new", end: false, label: "New analysis", icon: IconPlus, hint: "Score a fresh batch" },
];

export function BrandMark({ className = "h-9 w-9 rounded-xl" }: { className?: string }) {
  return (
    <span
      className={`brand-gradient grid shrink-0 place-items-center text-white shadow-pop ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[55%] w-[55%]">
        <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="2.1" />
        <path
          d="m15.5 15.5 4 4"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path d="M8 10.5h5M10.5 8v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="icon-btn"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? <IconSun className="h-4.5 w-4.5" /> : <IconMoon className="h-4.5 w-4.5" />}
    </button>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV.map(({ to, end, label, icon: Icon, hint }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold
             transition-all duration-200 ${
               isActive
                 ? "border border-coral/25 bg-coral/12 text-coral-light"
                 : "border border-transparent text-ink-muted hover:bg-paper-hover hover:text-ink"
             }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "" : "text-ink-faint"}`} />
              <span className="flex min-w-0 flex-col">
                <span>{label}</span>
                <span className="text-[0.7rem] font-normal text-ink-faint">{hint}</span>
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // A route change means the drawer has done its job.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  // Escape closes the drawer, matching every other overlay on the web.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const displayName = user?.full_name || user?.email || "You";

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <NavLink to="/" className="flex items-center gap-2.5 px-1" aria-label="HireLens home">
        <BrandMark />
        <span className="font-serif text-lg font-semibold">HireLens</span>
      </NavLink>

      <NavItems onNavigate={() => setDrawerOpen(false)} />

      <div className="mt-auto space-y-3">
        <NavLink
          to="/new"
          onClick={() => setDrawerOpen(false)}
          className="flex items-center justify-between rounded-xl border border-line bg-paper-sunken px-3 py-2 text-xs text-ink-muted transition-colors hover:border-coral/30 hover:text-ink"
        >
          <span className="flex items-center gap-2 font-medium">
            <IconKey className="h-3.5 w-3.5 text-coral-light" />
            <span>Gemini API Key</span>
          </span>
          {apiKeyStore.key ? (
            <span className="inline-flex items-center gap-1 text-[0.65rem] text-fit-high-light font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-fit-high" />
              Active
            </span>
          ) : (
            <span className="text-[0.65rem] text-fit-mid-light font-semibold">
              Get Free Key
            </span>
          )}
        </NavLink>

        <div className="rounded-2xl border border-line bg-paper-sunken p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={displayName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
              <p className="truncate text-xs text-ink-faint" title={user?.email}>
                {user?.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="btn-ghost mt-2 w-full justify-start px-2 py-1.5 text-xs"
          >
            <IconLogout className="h-4 w-4" />
            Sign out
          </button>
        </div>

        <p className="flex items-start gap-2 px-1 text-[0.7rem] leading-relaxed text-ink-faint">
          <IconShield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          CVs are processed for analysis and stored against your account only.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      {/* Desktop rail. */}
      <aside className="glass sticky top-0 hidden h-screen border-r border-line lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          />
          <div className="animate-rise absolute inset-y-0 left-0 w-72 border-r border-line bg-paper shadow-lift">
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="glass sticky top-0 z-30 border-b border-line">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="icon-btn lg:hidden"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
            >
              {drawerOpen ? <IconX className="h-4.5 w-4.5" /> : <IconMenu className="h-4.5 w-4.5" />}
            </button>

            <NavLink to="/" className="flex items-center gap-2.5 lg:hidden" aria-label="HireLens home">
              <BrandMark className="h-8 w-8 rounded-lg" />
              <span className="font-serif text-base font-semibold">HireLens</span>
            </NavLink>

            <span className="hidden text-sm text-ink-muted lg:block">
              Recruiter screening console
            </span>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <NavLink to="/new" className="btn-primary hidden py-2 text-xs sm:inline-flex">
                <IconPlus className="h-4 w-4" />
                New analysis
              </NavLink>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <Outlet />
        </main>

        <footer className="border-t border-line px-4 py-5 sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-faint">
            <span className="font-semibold text-ink-muted">HireLens</span>
            <span aria-hidden="true">·</span>
            <span>Screening decisions stay yours — the model only shows its evidence.</span>

            {/* Somewhere to send a bug or an idea. On every page, because the
                page you need to report is rarely the one you can get back to. */}
            <span className="ml-auto flex flex-wrap items-center gap-3">
              <span>Feedback for {DEVELOPER.name}:</span>
              <a
                href={DEVELOPER.linkedin}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 font-semibold text-ink-muted transition-colors hover:text-coral-light"
              >
                <IconLinkedin className="h-3.5 w-3.5" />
                LinkedIn
              </a>
              <a
                href={`mailto:${DEVELOPER.email}?subject=HireLens%20feedback`}
                className="inline-flex items-center gap-1.5 font-semibold text-ink-muted transition-colors hover:text-coral-light"
              >
                <IconMail className="h-3.5 w-3.5" />
                Email
              </a>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

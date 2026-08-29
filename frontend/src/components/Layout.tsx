import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

/** Who built this, and where feedback goes. */
const DEVELOPER = {
  name: "Abdul Haseeb",
  linkedin: "https://www.linkedin.com/in/abdulhaseebkashmiri/",
  email: "abdul.haseeb.kashmiri@outlook.com",
};

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    isActive ? "bg-coral/15 text-coral-light" : "text-ink-muted hover:text-ink"
  }`;
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-5 py-3.5">
          <NavLink to="/" className="flex items-center gap-2.5" aria-label="HireLens home">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-coral font-serif text-lg font-bold text-white">
              H
            </span>
            <span className="font-serif text-lg font-semibold">HireLens</span>
          </NavLink>

          <nav className="flex items-center gap-1" aria-label="Main">
            <NavLink to="/" end className={navClass}>
              History
            </NavLink>
            <NavLink to="/new" className={navClass}>
              New analysis
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:inline" title={user?.email}>
              {user?.full_name || user?.email}
            </span>
            <button type="button" onClick={handleLogout} className="btn-secondary py-1.5 text-xs">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line px-5 py-5">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 text-xs text-ink-faint">
          <span>HireLens</span>
          <span aria-hidden="true">·</span>
          <span>CVs are processed for analysis and stored against your account only.</span>

          {/* Somewhere to send a bug or an idea. On every page, because the page
              you need to report is rarely the one you can get back to. */}
          <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>Feedback? Reach {DEVELOPER.name}:</span>
            <a
              href={DEVELOPER.linkedin}
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-ink-muted transition-colors hover:text-coral"
            >
              LinkedIn
            </a>
            <a
              href={`mailto:${DEVELOPER.email}?subject=HireLens%20feedback`}
              className="font-semibold text-ink-muted transition-colors hover:text-coral"
            >
              Email
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}

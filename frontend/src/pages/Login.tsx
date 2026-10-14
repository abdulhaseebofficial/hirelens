import { useState, type ComponentType, type SVGProps, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { isApiError } from "@/api/client";
import { BrandMark } from "@/components/Layout";
import { IconClipboard, IconMoon, IconSun, IconTarget, IconUsers } from "@/components/icons";
import { Alert } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Send the user back to whatever they were trying to reach.
  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (isApiError(err)) {
        setError(err.message);
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Could not reach the server.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up your screening pipeline."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-coral-light hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}

        <div className="space-y-1.5">
          <label htmlFor="email" className="section-label block">
            Work email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
            placeholder="you@company.com"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="section-label block">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input"
            placeholder="••••••••••"
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}

const HIGHLIGHTS: Array<{
  title: string;
  body: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}> = [
  {
    title: "Evidence, not vibes",
    body: "Every score cites the lines of the CV it rests on, and names the gaps it could not close.",
    icon: IconTarget,
  },
  {
    title: "Structured profiles",
    body: "Contact details, skills, education and achievements pulled into fields you can export.",
    icon: IconUsers,
  },
  {
    title: "Interview kits on demand",
    body: "Role-specific questions with rubrics for what a strong answer actually covers.",
    icon: IconClipboard,
  },
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      <button
        type="button"
        onClick={toggleTheme}
        className="icon-btn absolute top-5 right-5 z-10"
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      >
        {theme === "dark" ? <IconSun className="h-4.5 w-4.5" /> : <IconMoon className="h-4.5 w-4.5" />}
      </button>

      {/* Form. Full width on small screens, left half once the brand panel appears. */}
      <div className="flex flex-1 items-center justify-center px-5 py-14">
        <div className="animate-rise w-full max-w-md space-y-7">
          {/* The brand panel is hidden below lg, so carry a compact mark here instead. */}
          <div className="flex items-center justify-center gap-2.5 lg:hidden">
            <BrandMark className="h-10 w-10 rounded-xl" />
            <span className="font-serif text-2xl font-semibold">HireLens</span>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h1 className="font-serif text-3xl font-semibold">{title}</h1>
            <p className="text-sm text-ink-muted">{subtitle}</p>
          </div>

          <div className="card p-6 sm:p-7">{children}</div>

          <p className="text-center text-sm text-ink-muted lg:text-left">{footer}</p>
        </div>
      </div>

      {/* Brand panel. Decorative, so it simply disappears on narrow screens. */}
      <aside className="relative hidden overflow-hidden border-l border-line bg-paper-sunken lg:flex lg:w-[46%] lg:flex-col lg:justify-center lg:px-14 xl:px-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(38rem 30rem at 20% 12%, color-mix(in oklab, var(--color-coral) 26%, transparent), transparent 65%), radial-gradient(34rem 28rem at 90% 85%, color-mix(in oklab, var(--color-violet) 26%, transparent), transparent 65%)",
          }}
          aria-hidden="true"
        />

        <div className="relative">
          <div className="mb-9 flex items-center gap-3">
            <BrandMark className="h-12 w-12 rounded-2xl" />
            <span className="font-serif text-3xl font-semibold">HireLens</span>
          </div>

          <p className="mb-11 max-w-md font-serif text-2xl leading-snug text-ink">
            Screen a stack of CVs against one job description, and get back a ranked shortlist you
            can defend.
          </p>

          <ul className="max-w-md space-y-4">
            {HIGHLIGHTS.map(({ title: heading, body, icon: Icon }) => (
              <li
                key={heading}
                className="flex gap-3.5 rounded-2xl border border-line bg-paper-raised/60 p-4 backdrop-blur-sm"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-coral/25 bg-coral/12 text-coral-light">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{heading}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

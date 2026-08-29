import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ApiError } from "@/api/client";
import { Alert } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";

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
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Recruiter's smart screening assistant"
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
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Form. Full width on small screens, left half once the brand panel appears. */}
      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* The brand panel is hidden below lg, so carry a compact mark here instead. */}
          <div className="flex items-center justify-center gap-2.5 lg:hidden">
            <BrandMark className="h-10 w-10 text-xl" />
            <span className="font-serif text-2xl font-semibold">HireLens</span>
          </div>

          <div className="space-y-1.5 text-center lg:text-left">
            <h1 className="font-serif text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-ink-muted">{subtitle}</p>
          </div>

          <div className="card p-6">{children}</div>

          <p className="text-center text-sm text-ink-muted lg:text-left">{footer}</p>
        </div>
      </div>

      <aside className="hidden border-l border-line bg-paper-sunken lg:flex lg:w-[44%] lg:flex-col lg:justify-center lg:px-14 xl:px-20">
        <div className="mb-8 flex items-center gap-3">
          <BrandMark className="h-12 w-12 text-2xl" />
          <span className="font-serif text-3xl font-semibold">HireLens</span>
        </div>

        <p className="mb-10 max-w-md text-lg leading-relaxed text-ink-muted">
          Screen a stack of CVs against one job description, and get back a ranked shortlist you
          can defend.
        </p>

        <ul className="max-w-md space-y-6">
          {HIGHLIGHTS.map((item) => (
            <li key={item.title}>
              <p className="eyebrow mb-1">{item.title}</p>
              <p className="text-sm leading-relaxed text-ink-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

const HIGHLIGHTS = [
  {
    title: "Evidence, not vibes",
    body: "Every score cites the lines of the CV it rests on, and names the gaps it could not close.",
  },
  {
    title: "Structured profiles",
    body: "Contact details, skills, education and achievements pulled into fields you can export.",
  },
  {
    title: "Interview kits on demand",
    body: "Role-specific questions with rubrics for what a strong answer actually covers.",
  },
];

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`grid place-items-center rounded-xl bg-coral font-serif font-bold text-white ${className}`}
    >
      H
    </span>
  );
}

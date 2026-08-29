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
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1.5 text-center">
          <div className="mb-4 flex items-center justify-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-coral font-serif text-xl font-bold text-white">
              H
            </span>
            <span className="font-serif text-2xl font-semibold">HireLens</span>
          </div>
          <h1 className="text-xl">{title}</h1>
          <p className="text-sm text-ink-muted">{subtitle}</p>
        </div>

        <div className="card p-6">{children}</div>

        <p className="text-center text-sm text-ink-muted">{footer}</p>
      </div>
    </div>
  );
}

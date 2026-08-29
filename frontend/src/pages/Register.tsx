import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "@/api/client";
import { system } from "@/api/endpoints";
import { Alert } from "@/components/ui";
import { AuthShell } from "@/pages/Login";
import { useAuth } from "@/hooks/useAuth";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [minLength, setMinLength] = useState(10);

  // Read the rule from the server so the hint never drifts from the validator.
  useEffect(() => {
    system
      .config()
      .then((config) => setMinLength(config.password_min_length))
      .catch(() => undefined);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await register(email, password, fullName);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
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
      title="Create an account"
      subtitle="Screen candidates against a job description in minutes"
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-coral-light hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}

        <div className="space-y-1.5">
          <label htmlFor="fullName" className="section-label block">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="input"
            placeholder="Ada Lovelace"
          />
        </div>

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
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
          {fieldErrors.email && (
            <p id="email-error" className="text-xs text-fit-low-light">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="section-label block">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input"
            placeholder="••••••••••"
            aria-describedby="password-hint"
          />
          <p
            id="password-hint"
            className={`text-xs ${fieldErrors.password ? "text-fit-low-light" : "text-ink-faint"}`}
          >
            {fieldErrors.password ??
              `At least ${minLength} characters, mixing letters with numbers or symbols.`}
          </p>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}

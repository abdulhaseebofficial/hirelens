import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { isApiError } from "@/api/client";
import { system } from "@/api/endpoints";
import { Alert } from "@/components/ui";
import { AuthShell } from "@/pages/Login";
import { useAuth } from "@/hooks/useAuth";

/**
 * Local, advisory strength read-out. The backend is still the authority on
 * what it accepts; this only tells the user where they stand before they
 * submit.
 */
function scorePassword(password: string, minLength: number) {
  if (!password) return { level: 0, label: "", tone: "" };

  let level = 0;
  if (password.length >= minLength) level += 1;
  if (password.length >= minLength + 4) level += 1;
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) level += 1;
  if (/[^a-zA-Z0-9]/.test(password)) level += 1;

  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"] as const;
  const tones = [
    "bg-fit-low",
    "bg-fit-low",
    "bg-fit-mid",
    "bg-fit-high",
    "bg-fit-high",
  ] as const;

  return { level, label: labels[level], tone: tones[level] };
}

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

  const strength = useMemo(() => scorePassword(password, minLength), [password, minLength]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await register(email, password, fullName);
      navigate("/", { replace: true });
    } catch (err) {
      if (isApiError(err)) {
        setFieldErrors(err.fieldErrors);
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
      title="Create an account"
      subtitle="Screen candidates against a job description in minutes."
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

          {password && (
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex flex-1 gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                      step <= strength.level ? strength.tone : "bg-paper-hover"
                    }`}
                  />
                ))}
              </div>
              <span className="w-16 shrink-0 text-right text-[0.7rem] font-semibold text-ink-muted">
                {strength.label}
              </span>
            </div>
          )}

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

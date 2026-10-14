import { useState, type FormEvent } from "react";

import { apiKeyStore } from "@/api/client";
import { analyses } from "@/api/endpoints";
import {
  IconCheck,
  IconCheckCircle,
  IconChevronDown,
  IconExternalLink,
  IconKey,
  IconSparkles,
  IconTrash,
} from "@/components/icons";
import { Alert, Spinner } from "@/components/ui";

interface ApiKeySectionProps {
  serverConfigured?: boolean;
  onKeyChange?: (hasKey: boolean) => void;
}

export function ApiKeySection({ serverConfigured = false, onKeyChange }: ApiKeySectionProps) {
  const [apiKey, setApiKey] = useState(() => apiKeyStore.key);
  const [savedKey, setSavedKey] = useState(() => apiKeyStore.key);
  const [showKey, setShowKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [guideOpen, setGuideOpen] = useState(!savedKey && !serverConfigured);

  const hasSavedKey = Boolean(savedKey);
  const isDirty = apiKey.trim() !== savedKey;

  const handleSave = (event?: FormEvent) => {
    if (event) event.preventDefault();
    const clean = apiKey.trim();
    apiKeyStore.set(clean);
    setSavedKey(clean);
    setStatusMessage({
      tone: "success",
      text: clean ? "API Key saved successfully to your browser." : "API Key removed.",
    });
    onKeyChange?.(Boolean(clean));
  };

  const handleRemove = () => {
    apiKeyStore.clear();
    setApiKey("");
    setSavedKey("");
    setStatusMessage({
      tone: "info",
      text: "API Key removed from this browser.",
    });
    onKeyChange?.(false);
  };

  const handleVerify = async () => {
    const keyToTest = apiKey.trim() || savedKey;
    if (!keyToTest) {
      setStatusMessage({ tone: "error", text: "Please enter an API key to test." });
      return;
    }

    setVerifying(true);
    setStatusMessage(null);
    try {
      const result = await analyses.verifyKey(keyToTest);
      if (result.valid) {
        // Also auto-save if verified successfully
        apiKeyStore.set(keyToTest);
        setSavedKey(keyToTest);
        setStatusMessage({
          tone: "success",
          text: "Verification successful! Your Gemini API key is valid and working.",
        });
        onKeyChange?.(true);
      } else {
        setStatusMessage({
          tone: "error",
          text: result.message || "The API key could not be verified by Google.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to verify key.";
      setStatusMessage({ tone: "error", text: msg });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <section className="card overflow-hidden border border-line-strong p-5 sm:p-6 transition-all duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-coral/15 text-coral-light border border-coral/25">
            <IconKey className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-ink flex items-center gap-2">
              Google Gemini API Key
              {hasSavedKey ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-fit-high/15 border border-fit-high/30 px-2 py-0.5 text-[0.65rem] font-semibold text-fit-high-light uppercase tracking-wide">
                  <IconCheck className="h-3 w-3" /> Active
                </span>
              ) : serverConfigured ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-paper-sunken border border-line px-2 py-0.5 text-[0.65rem] font-medium text-ink-muted uppercase tracking-wide">
                  Server Default Available
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-fit-mid/15 border border-fit-mid/30 px-2 py-0.5 text-[0.65rem] font-semibold text-fit-mid-light uppercase tracking-wide">
                  Required
                </span>
              )}
            </h2>
            <p className="text-xs text-ink-muted">
              Enter your free Google Gemini API key to run CV screenings and fit score analyses.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setGuideOpen((prev) => !prev)}
          className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
          aria-expanded={guideOpen}
        >
          <IconSparkles className="h-3.5 w-3.5 text-coral-light" />
          <span>{guideOpen ? "Hide Guide" : "How to get a Free Key"}</span>
          <IconChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${guideOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Input & Action controls */}
      <div className="mt-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your Gemini API key here (AIzaSy...)"
              className="input pr-16 w-full font-mono text-xs sm:text-sm tracking-wide"
              aria-label="Google Gemini API Key"
              autoComplete="off"
              spellCheck={false}
            />
            {apiKey && (
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.7rem] font-semibold uppercase text-ink-faint hover:text-ink px-1.5 py-0.5 rounded transition-colors"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={verifying || (!isDirty && hasSavedKey)}
              className="btn-primary py-2 px-4 text-xs font-semibold whitespace-nowrap"
            >
              {hasSavedKey && !isDirty ? (
                <>
                  <IconCheck className="h-3.5 w-3.5" />
                  Saved
                </>
              ) : (
                "Save Key"
              )}
            </button>

            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying || (!apiKey.trim() && !hasSavedKey)}
              className="btn-secondary py-2 px-3 text-xs font-semibold whitespace-nowrap"
              title="Test this key with a lightweight Google Gemini ping"
            >
              {verifying ? (
                <Spinner className="h-3.5 w-3.5" label="Testing..." />
              ) : (
                "Test Key"
              )}
            </button>

            {hasSavedKey && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={verifying}
                className="icon-btn text-fit-low-light hover:bg-fit-low/15 border border-fit-low/20"
                title="Remove saved API key"
                aria-label="Remove saved API key"
              >
                <IconTrash className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Feedback message */}
        {statusMessage && (
          <Alert tone={statusMessage.tone}>
            {statusMessage.text}
          </Alert>
        )}
      </div>

      {/* Interactive Guide: Roman Urdu + English */}
      {guideOpen && (
        <div className="mt-6 rounded-2xl border border-line bg-paper-sunken p-4 sm:p-5 animate-rise space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-coral/20 text-coral-light">
                <IconSparkles className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-ink">
                  How to get a Free Google Gemini API Key
                </h3>
                <p className="text-xs text-ink-muted">
                  Muft Gemini API Key lene ka aasan tareeqa (No Credit Card Required)
                </p>
              </div>
            </div>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer noopener"
              className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
            >
              <span>Open Google AI Studio</span>
              <IconExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Steps */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-1">
            {/* Step 1 */}
            <div className="rounded-xl border border-line/60 bg-paper p-3.5 space-y-1.5">
              <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-coral/15 text-coral-light text-xs font-bold">
                1
              </span>
              <h4 className="text-xs font-bold text-ink">Go to Google AI Studio</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Open <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-coral-light underline">Google AI Studio</a>.
              </p>
              <p className="text-[0.7rem] text-ink-faint italic">
                (Google AI Studio ki website par jayein)
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-line/60 bg-paper p-3.5 space-y-1.5">
              <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-coral/15 text-coral-light text-xs font-bold">
                2
              </span>
              <h4 className="text-xs font-bold text-ink">Sign in with Google</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Log in with any Gmail or Google account.
              </p>
              <p className="text-[0.7rem] text-ink-faint italic">
                (Apne Gmail ya Google account se sign in karein)
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-line/60 bg-paper p-3.5 space-y-1.5">
              <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-coral/15 text-coral-light text-xs font-bold">
                3
              </span>
              <h4 className="text-xs font-bold text-ink">Click &quot;Create API Key&quot;</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Click the blue button and choose &quot;Create API key in new project&quot;.
              </p>
              <p className="text-[0.7rem] text-ink-faint italic">
                (&quot;Create API key&quot; par click kar ke new project choose karein)
              </p>
            </div>

            {/* Step 4 */}
            <div className="rounded-xl border border-line/60 bg-paper p-3.5 space-y-1.5">
              <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-coral/15 text-coral-light text-xs font-bold">
                4
              </span>
              <h4 className="text-xs font-bold text-ink">Paste &amp; Save</h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                Copy your key (<code className="text-coral-light">AIzaSy...</code>) and paste it into the box above.
              </p>
              <p className="text-[0.7rem] text-ink-faint italic">
                (Key copy kar ke yahan paste karein aur Save karein)
              </p>
            </div>
          </div>

          {/* Zero Cost Assurance */}
          <div className="flex items-start gap-2.5 rounded-xl border border-fit-high/30 bg-fit-high/10 p-3 text-xs text-ink">
            <IconCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-fit-high-light" />
            <div>
              <p className="font-semibold text-fit-high-light">
                100% Free &bull; No Credit Card Required
              </p>
              <p className="text-ink-muted mt-0.5">
                Google provides a free tier with 15 requests per minute for Gemini Flash models.
                You do not need to provide a credit card or billing information to get this key.
              </p>
              <p className="text-[0.75rem] text-ink-faint mt-1 italic">
                Roman Urdu: Iske liye credit card ya kisi payment ki zaroorat nahi hai. Google muft quota deta hai jo CV screening ke liye kaafi hai.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

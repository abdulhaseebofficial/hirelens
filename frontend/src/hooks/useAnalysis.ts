import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/api/client";
import { analyses } from "@/api/endpoints";
import type { AnalysisDetail } from "@/types";

const POLL_INTERVAL_MS = 2500;

interface UseAnalysisResult {
  analysis: AnalysisDetail | null;
  loading: boolean;
  error: string | null;
  /** True while the backend is still working through the batch. */
  polling: boolean;
  refresh: () => Promise<void>;
}

/**
 * Loads one analysis and keeps polling while it is pending or running.
 *
 * Polling stops as soon as the run settles, so a completed report costs no
 * further requests.
 */
export function useAnalysis(analysisId: string | undefined): UseAnalysisResult {
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (showSpinner: boolean) => {
      if (!analysisId) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (showSpinner) setLoading(true);
      try {
        const data = await analyses.get(analysisId, controller.signal);
        setAnalysis(data);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? err.message : "Could not load this analysis.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [analysisId],
  );

  useEffect(() => {
    void load(true);
    return () => abortRef.current?.abort();
  }, [load]);

  const isRunning = analysis?.status === "pending" || analysis?.status === "running";

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => void load(false), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isRunning, load]);

  return {
    analysis,
    loading,
    error,
    polling: Boolean(isRunning),
    refresh: () => load(false),
  };
}

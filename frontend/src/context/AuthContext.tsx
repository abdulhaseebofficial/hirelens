import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { setSessionExpiredHandler, tokenStore } from "@/api/client";
import { auth } from "@/api/endpoints";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  /** True until the stored token has been checked against the API. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The client calls this when a refresh fails, so an expired session clears
  // the UI instead of leaving a stale user in place.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (mounted.current) setUser(null);
    });
  }, []);

  // Restore the session on load: a stored token is only trusted once /me confirms it.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!tokenStore.access) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const me = await auth.me();
        if (!cancelled) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await auth.login(email, password);
    tokenStore.set(response.tokens);
    setUser(response.user);
  }, []);

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    const response = await auth.register(email, password, fullName);
    tokenStore.set(response.tokens);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.refresh;
    if (refreshToken) {
      // Revoke server-side, but never block sign-out on a network failure.
      await auth.logout(refreshToken).catch(() => undefined);
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import { createContext } from "react";

import type { User } from "@/types";

export interface AuthContextValue {
  user: User | null;
  /** True until the stored token has been checked against the API. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Kept apart from AuthProvider so that file exports only a component, which is
// what Vite's fast refresh requires.
export const AuthContext = createContext<AuthContextValue | null>(null);

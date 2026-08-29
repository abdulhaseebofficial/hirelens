import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { Layout } from "@/components/Layout";
import { PageLoader } from "@/components/ui";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { AnalysisDetail } from "@/pages/AnalysisDetail";
import { Dashboard } from "@/pages/Dashboard";
import { Login } from "@/pages/Login";
import { NewAnalysis } from "@/pages/NewAnalysis";
import { Register } from "@/pages/Register";

/** Gate for signed-in routes. Remembers where the user was heading. */
function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Restoring your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Layout />;
}

/** Keeps signed-in users away from the login and register screens. */
function RedirectIfSignedIn({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfSignedIn>
              <Login />
            </RedirectIfSignedIn>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfSignedIn>
              <Register />
            </RedirectIfSignedIn>
          }
        />

        <Route element={<RequireAuth />}>
          <Route index element={<Dashboard />} />
          <Route path="new" element={<NewAnalysis />} />
          <Route path="analyses/:analysisId" element={<AnalysisDetail />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

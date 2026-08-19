import { useEffect } from "react";
import type { ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import { Spinner } from "./components/ui";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Dashboard from "./pages/Dashboard";
import InterviewPage from "./pages/InterviewPage";
import JobDetails from "./pages/JobDetails";
import JobEditor from "./pages/JobEditor";
import Jobs from "./pages/Jobs";
import Login from "./pages/Login";
import ManualPage from "./pages/ManualPage";
import ProfilePage from "./pages/ProfilePage";
import Register from "./pages/Register";
import ResumePage from "./pages/ResumePage";

/* HashRouter keeps deep links working on any static host (no server
   rewrites needed). Swap to BrowserRouter + rewrites when deploying to Vercel. */

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function BootScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Spinner className="h-8 w-8 text-radar-500" />
      <p className="font-mono text-[11px] tracking-[0.2em] text-fog-500 uppercase">{label}</p>
    </div>
  );
}

function Protected() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <BootScreen label="Contacting control tower" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <AppShell />;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <BootScreen label="Contacting control tower" />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <HashRouter>
          <ScrollToTop />
          <Routes>
            <Route
              path="/login"
              element={
                <GuestOnly>
                  <Login />
                </GuestOnly>
              }
            />
            <Route
              path="/register"
              element={
                <GuestOnly>
                  <Register />
                </GuestOnly>
              }
            />
            <Route element={<Protected />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/new" element={<JobEditor />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route path="/jobs/:id/edit" element={<JobEditor />} />
              <Route path="/resume" element={<ResumePage />} />
              <Route path="/interview/:sessionId" element={<InterviewPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/manual" element={<ManualPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

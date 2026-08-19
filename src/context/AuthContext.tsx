import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { SessionUser } from "../lib/types";
import * as authService from "../services/auth";

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  loginDemo: () => Promise<SessionUser>;
  register: (fullName: string, email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  setUser: (user: SessionUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authService
      .getSession()
      .then((session) => {
        if (!cancelled) setUser(session);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await authService.login(email, password);
    setUser(session);
    return session;
  }, []);

  const loginDemo = useCallback(async () => {
    const session = await authService.loginDemo();
    setUser(session);
    return session;
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    const session = await authService.register(fullName, email, password);
    setUser(session);
    return session;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, loginDemo, register, logout, setUser }),
    [user, loading, login, loginDemo, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}

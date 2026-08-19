import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Briefcase, FileText, LayoutDashboard, LogOut, Menu, User, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { BACKEND_MODE } from "../../services/ai";
import { initials } from "../../utils/format";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/jobs", label: "Applications", icon: Briefcase, end: false },
  { to: "/resume", label: "Resume", icon: FileText, end: false },
  { to: "/manual", label: "Field Manual", icon: BookOpen, end: false },
  { to: "/profile", label: "Profile", icon: User, end: false },
];

function Logo() {
  return (
    <NavLink to="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-radar-500/30 bg-radar-500/10">
        <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden="true">
          <path d="M10 42 L54 14 L40 48 L30 39 Z" fill="#3ddc97" />
          <path d="M30 39 L40 48 L33 53 L27 42 Z" fill="#1fa971" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block font-display text-[17px] font-bold tracking-tight text-fog-50">CareerPilot</span>
        <span className="micro block !text-[9px]">Flight deck</span>
      </span>
    </NavLink>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-[10px] border px-3 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? "border-radar-500/25 bg-radar-500/10 text-radar-400"
                : "border-transparent text-fog-400 hover:border-ink-600 hover:bg-ink-800 hover:text-fog-100"
            }`
          }
        >
          <Icon className="h-4.5 w-4.5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserFooter({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
      toast("info", "Signed out. See you on the next flight.");
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
      onNavigate?.();
    }
  };

  if (!user) return null;
  return (
    <div className="mt-auto space-y-3">
      <div className="flex items-center gap-2 rounded-[10px] border border-signal-500/25 bg-signal-500/8 px-3 py-2">
        <span className="pulse-soft h-1.5 w-1.5 shrink-0 rounded-full bg-signal-500" />
        <span className="font-mono text-[10px] tracking-[0.14em] text-signal-400 uppercase">
          {BACKEND_MODE === "demo" ? "Demo mode · local data" : "Supabase · live"}
        </span>
      </div>
      <div className="flex items-center gap-2.5 rounded-[10px] border border-ink-700 bg-ink-800/70 p-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-600 font-display text-[12px] font-bold text-fog-100">
          {initials(user.fullName)}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13px] font-medium text-fog-100">{user.fullName}</span>
          <span className="block truncate text-[11px] text-fog-500">{user.email}</span>
        </span>
        <button
          onClick={handleLogout}
          disabled={signingOut}
          className="rounded-md p-1.5 text-fog-500 transition-colors hover:bg-ink-700 hover:text-flare-400 disabled:opacity-50"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-ink-700/60 bg-ink-900/85 px-4 py-5 backdrop-blur md:flex">
        <div className="mb-7 px-1">
          <Logo />
        </div>
        <NavItems />
        <div className="pt-6">
          <UserFooter />
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-ink-700/60 bg-ink-900/90 px-4 backdrop-blur md:hidden">
        <Logo />
        <button
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg border border-ink-600 bg-ink-800 p-2 text-fog-300 transition-colors hover:text-fog-50"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-ink-950/70 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-ink-700 bg-ink-900 px-4 py-5 md:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
            >
              <div className="mb-6 flex items-center justify-between px-1">
                <Logo />
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-fog-500 hover:bg-ink-750 hover:text-fog-100"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavItems onNavigate={() => setDrawerOpen(false)} />
              <div className="pt-6">
                <UserFooter onNavigate={() => setDrawerOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* content */}
      <main className="pt-14 md:pl-[232px] md:pt-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 md:px-8 md:py-9">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type Kind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: Kind;
  message: string;
}

interface ToastContextValue {
  toast: (kind: Kind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<Kind, { border: string; icon: ReactNode }> = {
  success: { border: "border-radar-500/40", icon: <CheckCircle2 className="h-4.5 w-4.5 text-radar-500" /> },
  error: { border: "border-flare-500/40", icon: <AlertTriangle className="h-4.5 w-4.5 text-flare-500" /> },
  info: { border: "border-beacon-500/40", icon: <Info className="h-4.5 w-4.5 text-beacon-500" /> },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (kind: Kind, message: string) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev.slice(-3), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[min(92vw,380px)] flex-col gap-2.5">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.button
              key={t.id}
              type="button"
              onClick={() => dismiss(t.id)}
              initial={{ opacity: 0, x: 48, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-ink-800/95 px-4 py-3 text-left shadow-[0_16px_40px_rgba(3,8,20,0.55)] backdrop-blur ${STYLES[t.kind].border}`}
            >
              <span className="mt-0.5 shrink-0">{STYLES[t.kind].icon}</span>
              <span className="flex-1 text-sm leading-snug text-fog-100">{t.message}</span>
              <X className="mt-0.5 h-4 w-4 shrink-0 text-fog-500" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>.");
  return ctx;
}

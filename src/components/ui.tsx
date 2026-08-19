import { useEffect, useRef, useState } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Difficulty, Status } from "../lib/types";
import { STATUS_META } from "../lib/types";
import { scoreBand } from "../utils/format";

/* ------------------------------- Spinner ------------------------------- */

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------- Button ------------------------------- */

type Variant = "primary" | "outline" | "ghost" | "danger" | "subtle";

const BTN_VARIANTS: Record<Variant, string> = {
  primary:
    "bg-radar-500 text-ink-950 font-semibold hover:bg-radar-400 shadow-[0_10px_26px_rgba(61,220,151,0.22)] active:translate-y-px",
  outline:
    "border border-ink-600 bg-ink-800/50 text-fog-200 hover:border-radar-500/50 hover:text-fog-50 active:translate-y-px",
  ghost: "text-fog-400 hover:text-fog-100 hover:bg-ink-750",
  danger: "border border-flare-500/30 bg-flare-500/10 text-flare-400 hover:bg-flare-500/20 active:translate-y-px",
  subtle: "border border-ink-600/70 bg-ink-750 text-fog-200 hover:bg-ink-700 active:translate-y-px",
};

const BTN_SIZES = {
  sm: "text-[13px] px-3 py-1.5 rounded-lg gap-1.5",
  md: "text-sm px-4 py-2.5 rounded-[10px] gap-2",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: keyof typeof BTN_SIZES;
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading, disabled, children, className = "", ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 select-none disabled:pointer-events-none disabled:opacity-50 ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${className}`}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  to,
  variant = "primary",
  size = "md",
  children,
  className = "",
}: {
  to: string;
  variant?: Variant;
  size?: keyof typeof BTN_SIZES;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 select-none ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${className}`}
    >
      {children}
    </Link>
  );
}

/* -------------------------------- Fields ------------------------------- */

export function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-fog-300">
          {label}
          {required && <span className="ml-1 text-radar-500">*</span>}
        </span>
        {hint && <span className="font-mono text-[10.5px] text-fog-600">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-[12.5px] text-flare-400">{error}</span>}
    </label>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`field ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`field ${className}`} {...rest} />;
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`field ${className}`} {...rest}>
      {children}
    </select>
  );
}

/* -------------------------------- Badges ------------------------------- */

export function StatusBadge({ status, size = "md" }: { status: Status; size?: "sm" | "md" }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${meta.badge} ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const tone =
    difficulty === "Easy"
      ? "text-radar-400 border-radar-500/30 bg-radar-500/10"
      : difficulty === "Medium"
        ? "text-signal-400 border-signal-500/30 bg-signal-500/10"
        : "text-flare-400 border-flare-500/30 bg-flare-500/10";
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>{difficulty}</span>;
}

export function SkillChip({ name, tone = "neutral" }: { name: string; tone?: "match" | "gap" | "neutral" }) {
  const toneClass =
    tone === "match"
      ? "border-radar-500/30 bg-radar-500/10 text-radar-300"
      : tone === "gap"
        ? "border-signal-500/30 bg-signal-500/10 text-signal-400"
        : "border-ink-600 bg-ink-750/70 text-fog-300";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11.5px] ${toneClass}`}>
      {tone === "match" && <span className="text-radar-500">+</span>}
      {tone === "gap" && <span className="text-signal-500">−</span>}
      {name}
    </span>
  );
}

/* --------------------------------- Modal -------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/75 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="panel w-full max-w-md p-6"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <h2 className="font-display text-lg font-semibold text-fog-50">{title}</h2>
              <button onClick={onClose} className="rounded-md p-1 text-fog-500 transition-colors hover:bg-ink-750 hover:text-fog-100" aria-label="Close dialog">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="text-sm leading-relaxed text-fog-300">{children}</div>
            {footer && <div className="mt-5 flex justify-end gap-2.5">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------ Empty state ----------------------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-ink-600 bg-ink-800 text-fog-400">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold text-fog-100">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-fog-400">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------- Skeletons ------------------------------ */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/* ------------------------------- Score ring ----------------------------- */

export function ScoreRing({ value, size = 132, label }: { value: number; size?: number; label?: string }) {
  const [display, setDisplay] = useState(0);
  const [offset, setOffset] = useState<number | null>(null);
  const rafRef = useRef<number>(0);

  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const band = scoreBand(value);
  const color =
    band.tone === "radar" ? "text-radar-500" : band.tone === "beacon" ? "text-beacon-500" : band.tone === "signal" ? "text-signal-500" : "text-flare-500";

  useEffect(() => {
    const start = performance.now();
    const duration = 950;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    const timer = window.setTimeout(() => setOffset(c - (c * value) / 100), 60);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timer);
    };
  }, [value, c]);

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${color}`} style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset === null ? c : offset}
            className="score-arc"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[30px] font-bold leading-none text-fog-50">{display}</span>
          <span className="mt-1 font-mono text-[10px] tracking-[0.16em] text-fog-500">/ 100</span>
        </div>
      </div>
      {label && <span className={`mt-2 font-mono text-[11px] tracking-[0.14em] uppercase ${color}`}>{label}</span>}
    </div>
  );
}

/* ------------------------------- Segmented ------------------------------ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-[10px] border border-ink-600 bg-ink-900/70 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all ${
            value === opt.value ? "bg-radar-500/15 text-radar-400 shadow-[inset_0_0_0_1px_rgba(61,220,151,0.3)]" : "text-fog-400 hover:text-fog-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Page header ----------------------------- */

export function PageHeader({
  kicker,
  title,
  desc,
  actions,
}: {
  kicker: string;
  title: string;
  desc?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="micro mb-1.5">{kicker}</p>
        <h1 className="font-display text-[26px] font-bold leading-tight text-fog-50 sm:text-[30px]">{title}</h1>
        {desc && <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-fog-400">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Eye, EyeOff, PlaneTakeoff } from "lucide-react";
import AuthLayout from "../components/layout/AuthLayout";
import { Button, Field, Input } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { validateCredentials } from "../utils/validation";
import type { FormErrors } from "../utils/validation";

export default function Login() {
  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<FormErrors<"email" | "password">>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validateCredentials(email, password);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    setFormError(null);
    try {
      await loginDemo();
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to start the demo flight.");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <AuthLayout
      footer={
        <p>
          New to CareerPilot?{" "}
          <Link to="/register" className="font-medium text-radar-400 transition-colors hover:text-radar-300">
            Create an account
          </Link>
        </p>
      }
    >
      <div className="panel rise p-7">
        <p className="micro mb-2">Sign in</p>
        <h2 className="font-display text-2xl font-bold text-fog-50">Welcome back, pilot</h2>
        <p className="mt-1.5 text-sm text-fog-400">Pick up your application tracking where you left off.</p>

        {formError && (
          <div className="mt-5 flex items-start gap-2.5 rounded-[10px] border border-flare-500/30 bg-flare-500/10 px-3.5 py-3 text-[13px] text-flare-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <Field label="Email" error={errors.email} required>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
            />
          </Field>
          <Field label="Password" error={errors.password} required>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fog-500 transition-colors hover:text-fog-200"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </Field>
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-ink-600" />
          <span className="font-mono text-[10px] tracking-[0.18em] text-fog-600 uppercase">or</span>
          <span className="h-px flex-1 bg-ink-600" />
        </div>

        <Button variant="subtle" className="w-full" loading={demoLoading} onClick={handleDemo}>
          <PlaneTakeoff className="h-4 w-4 text-radar-500" />
          Take the demo flight
        </Button>
        <p className="mt-2.5 text-center font-mono text-[10.5px] text-fog-600">
          Pre-loaded account · resume, 5 applications &amp; all AI features
        </p>
      </div>
    </AuthLayout>
  );
}

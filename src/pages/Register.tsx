import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import AuthLayout from "../components/layout/AuthLayout";
import { Button, Field, Input } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { validateRegister } from "../utils/validation";
import type { FormErrors } from "../utils/validation";

export default function Register() {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<FormErrors<"fullName" | "email" | "password">>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validateRegister(fullName, email, password);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;
    setLoading(true);
    try {
      const user = await register(fullName, email, password);
      toast("success", `Welcome aboard, ${user.fullName.split(" ")[0]}! Add your resume to unlock AI analysis.`);
      navigate("/resume", { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to create the account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-radar-400 transition-colors hover:text-radar-300">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="panel rise p-7">
        <p className="micro mb-2">Create account</p>
        <h2 className="font-display text-2xl font-bold text-fog-50">Start your flight plan</h2>
        <p className="mt-1.5 text-sm text-fog-400">One account for every application, analysis and interview rehearsal.</p>

        {formError && (
          <div className="mt-5 flex items-start gap-2.5 rounded-[10px] border border-flare-500/30 bg-flare-500/10 px-3.5 py-3 text-[13px] text-flare-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <Field label="Full name" error={errors.fullName} required>
            <Input
              type="text"
              autoComplete="name"
              placeholder="Ada Lovelace"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-invalid={!!errors.fullName}
            />
          </Field>
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
          <Field label="Password" error={errors.password} hint="min. 8 characters" required>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
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
            Create account
          </Button>
        </form>

        <p className="mt-4 text-center font-mono text-[10.5px] leading-relaxed text-fog-600">
          Demo mode stores credentials locally. In production this is
          <br />
          Supabase Auth — passwords never touch our code.
        </p>
      </div>
    </AuthLayout>
  );
}

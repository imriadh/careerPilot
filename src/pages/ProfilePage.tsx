import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Download, LogOut, Save, ShieldAlert, Trash2 } from "lucide-react";
import { Button, Field, Input, Modal, PageHeader } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { BACKEND_MODE } from "../services/ai";
import * as authService from "../services/auth";
import { formatDate, initials } from "../utils/format";

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.fullName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const nameDirty = name.trim() !== user.fullName;

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    try {
      const updated = await authService.updateFullName(user.id, name);
      setUser(updated);
      toast("success", "Profile updated.");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Unable to update the profile.");
    } finally {
      setSavingName(false);
    }
  };

  const handleExport = () => {
    const data = authService.exportAll(user.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "careerpilot-export.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("success", "Data exported as JSON.");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await logout();
    navigate("/login", { replace: true });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await authService.deleteAccount(user.id);
      toast("info", "Account and all data deleted.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Unable to delete the account.");
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader kicker="Pilot" title="Profile" desc="Your account, your data, and how this build is wired to the backend." />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="panel rise p-5 sm:p-6" aria-label="Account">
          <p className="micro mb-4">Account</p>
          <div className="mb-5 flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-radar-500/30 bg-radar-500/10 font-display text-lg font-bold text-radar-400">
              {initials(user.fullName)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-fog-50">{user.fullName}</p>
              <p className="truncate text-[13px] text-fog-400">{user.email}</p>
              <p className="mt-0.5 font-mono text-[10.5px] text-fog-600">
                joined {formatDate(user.createdAt)} · id {user.id.slice(0, 8)}…
              </p>
            </div>
          </div>
          <form onSubmit={handleSaveName} className="space-y-4">
            <Field label="Full name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Full name" />
            </Field>
            <div className="flex justify-end gap-2.5">
              <Button type="button" variant="ghost" onClick={handleSignOut} loading={signingOut}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
              <Button type="submit" loading={savingName} disabled={!nameDirty}>
                <Save className="h-4 w-4" /> Save
              </Button>
            </div>
          </form>
        </section>

        <div className="space-y-5">
          <section className="panel rise rise-1 p-5" aria-label="Backend mode">
            <p className="micro mb-3">Backend mode</p>
            <div className="flex items-center gap-2.5">
              <span className={`pulse-soft h-2 w-2 rounded-full ${BACKEND_MODE === "demo" ? "bg-signal-500" : "bg-radar-500"}`} />
              <p className="text-[14px] font-semibold text-fog-100">
                {BACKEND_MODE === "demo" ? "Demo mode — on-device engine, browser storage" : "Supabase — live"}
              </p>
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-fog-400">
              This build runs the full product without a server: services in <span className="font-mono text-[12px] text-fog-300">src/services</span>{" "}
              keep the exact Supabase contract, so production is a swap of internals. The real schema, Edge Functions and env template ship in the{" "}
              <span className="font-mono text-[12px] text-fog-300">supabase/</span> folder and the Field Manual.
            </p>
          </section>

          <section className="panel rise rise-2 p-5" aria-label="Data">
            <p className="micro mb-3">Your data</p>
            <p className="text-[13px] leading-relaxed text-fog-400">
              Export everything you own — applications, resume, analyses, interview sessions and feedback — as a single JSON file.
            </p>
            <Button variant="outline" size="sm" className="mt-3.5" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export JSON
            </Button>
          </section>

          <section className="panel rise rise-3 border-flare-500/25 p-5" aria-label="Danger zone">
            <p className="micro mb-3 !text-flare-400">
              <ShieldAlert className="mr-1.5 inline h-3.5 w-3.5" /> Danger zone
            </p>
            <p className="text-[13px] leading-relaxed text-fog-400">
              Deleting the account removes your profile, applications, resume, analyses and interview history. In Postgres this is one{" "}
              <span className="font-mono text-[12px] text-fog-300">ON DELETE CASCADE</span> away.
            </p>
            <Button variant="danger" size="sm" className="mt-3.5" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete account
            </Button>
          </section>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete your account?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              <Trash2 className="h-4 w-4" /> Delete everything
            </Button>
          </>
        }
      >
        <p>
          This permanently removes <span className="font-semibold text-fog-100">{user.email}</span> and every record it owns. There is no
          recovery path.
        </p>
      </Modal>
    </>
  );
}

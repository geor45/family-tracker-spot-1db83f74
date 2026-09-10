import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import familyPhoto from "@/assets/KERMEGPS.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Σύνδεση | Family GPS" },
      { name: "description", content: "Σύνδεση στην οικογενειακή εφαρμογή τοποθεσίας." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  useEffect(() => {
  const isReset =
    new URLSearchParams(window.location.search).get("reset") === "true";

  if (isReset) {
    setResetMode(true);
  }

  if (!loading && session && !isReset) {
    nav({ to: "/" });
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      setResetMode(true);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}, [session, loading, nav]);

     const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      toast.error("Γράψε πρώτα το email σου.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        },
      );

      if (error) throw error;

      toast.success("Σου στείλαμε email για επαναφορά κωδικού.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Δεν ήταν δυνατή η αποστολή του email.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Ο κωδικός σου άλλαξε επιτυχώς!");

      setNewPassword("");
      setResetMode(false);
      nav({ to: "/" });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Δεν ήταν δυνατή η αλλαγή του κωδικού.",
      );
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    try {
      if (resetMode) {
  const isRecoverySession =
    new URLSearchParams(window.location.search).get("reset") === "true";

  if (isRecoverySession) {
    await handleUpdatePassword();
  } else {
    await handlePasswordReset();
  }

  return;
}

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });

        if (error) throw error;

        toast.success("Εγγραφή επιτυχής!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Κάτι πήγε στραβά",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh overflow-y-auto bg-gradient-to-br from-background to-muted px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-3">
        <img
          src={familyPhoto}
          alt="Οικογενειακή φωτογραφία"
          className="aspect-[4/3] w-full min-h-[360px] rounded-2xl border object-cover object-center shadow-lg"
        />

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Family GPS</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Σύνδεση στην οικογένεια" : "Δημιουργία λογαριασμού"}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 bg-card border rounded-xl p-6 shadow-sm">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Όνομα</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="π.χ. Μαρία"
                required={!resetMode}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {resetMode && (
        <div className="space-y-1.5">
    <Label htmlFor="newPassword">Νέος κωδικός</Label>
    <Input
      id="newPassword"
      type="password"
      value={newPassword}
      onChange={(e) => setNewPassword(e.target.value)}
      required
      minLength={6}
      autoComplete="new-password"
    />
  </div>
)}

          {mode === "signin" && !resetMode && (
            <button
             type="button"
             className="w-full text-sm text-primary underline-offset-4 hover:underline"
             onClick={() => setResetMode(true)}
            >
            Ξέχασες τον κωδικό σου;
            </button>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy
              ? "..."
              : resetMode
              ? new URLSearchParams(window.location.search).get("reset") === "true"
              ? "Αλλαγή κωδικού"
              : "Αποστολή email επαναφοράς"
              : mode === "signin"
              ? "Σύνδεση"
             : "Εγγραφή"}
            </Button>
        </form>

        {resetMode ? (
  <button
    type="button"
    onClick={() => {
      setResetMode(false);
      setNewPassword("");
    }}
    className="w-full text-sm text-muted-foreground hover:text-foreground transition"
  >
    ← Επιστροφή στη σύνδεση
  </button>
) : (
  <button
    type="button"
    onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
    className="w-full text-sm text-muted-foreground hover:text-foreground transition"
  >
    {mode === "signin"
      ? "Δεν έχεις λογαριασμό; Εγγραφή"
      : "Έχεις λογαριασμό; Σύνδεση"}
  </button>
)}
      </div>
    </div>
  );
}
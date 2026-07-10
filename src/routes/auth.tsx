import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import familyPhoto from "@/assets/KERMEGPS.png.asset.json";

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
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) nav({ to: "/" });
  }, [session, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Κάτι πήγε στραβά");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh overflow-y-auto bg-gradient-to-br from-background to-muted px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-5">
        <img
          src={familyPhoto.url}
          alt="Οικογενειακή φωτογραφία"
          className="aspect-[4/3] w-full rounded-2xl border object-cover object-center shadow-lg"
        />
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <MapPin className="h-7 w-7" />
          </div>
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
                required
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
          <div className="space-y-1.5">
            <Label htmlFor="password">Κωδικός</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "..." : mode === "signin" ? "Σύνδεση" : "Εγγραφή"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition"
        >
          {mode === "signin"
            ? "Δεν έχεις λογαριασμό; Εγγραφή"
            : "Έχεις λογαριασμό; Σύνδεση"}
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, LogOut, Plus, UserPlus, Copy } from "lucide-react";

export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "Η οικογένειά μου - Family GPS" },
      {
        name: "description",
        content: "Δημιούργησε ή σύνδεσε την οικογένειά σου στο Family GPS.",
      },
    ],
  }),
  component: FamilyPage,
});

function FamilyPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();

  const [checkingFamily, setCheckingFamily] = useState(true);
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

const [familyId, setFamilyId] = useState<string | null>(null);
const [familyMembers, setFamilyMembers] = useState<
  {
    user_id: string;
    role: string;
    joined_at: string;
    display_name: string;
    color: string;
  }[]
>([]);
const [family, setFamily] = useState<{
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
} | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      nav({ to: "/auth" });
      return;
    }

    const checkFamily = async () => {
      setCheckingFamily(true);

      const { data, error } = await supabase.rpc("get_my_family_id");

      if (error) {
        console.error("Family check error:", error);
        toast.error("Δεν ήταν δυνατός ο έλεγχος της οικογένειας.");
        setCheckingFamily(false);
        return;
      }

      if (data) {
  setFamilyId(data);

  const { data: membersData, error: membersError } = await supabase
  .from("family_members")
  .select("user_id, role, joined_at")
  .eq("family_id", data);

if (membersError) {
  console.error("Family members error:", membersError);
  toast.error("Δεν ήταν δυνατή η φόρτωση των μελών.");
} else {
  const userIds = membersData.map((member) => member.user_id);

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, color")
    .in("id", userIds);

  if (profilesError) {
    console.error("Family profiles error:", profilesError);
    toast.error("Δεν ήταν δυνατή η φόρτωση των προφίλ.");
  } else {
    setFamilyMembers(
      membersData.map((member) => {
        const profile = profilesData.find(
          (p) => p.id === member.user_id,
        );

        return {
          user_id: member.user_id,
          role: member.role,
          joined_at: member.joined_at,
          display_name: profile?.display_name ?? "Χωρίς όνομα",
          color: profile?.color ?? "#2563eb",
        };
      }),
    );
  }
}

  const { data: familyData, error: familyError } = await supabase
    .from("families")
    .select("id, name, invite_code, owner_id")
    .eq("id", data)
    .single();

  if (familyError) {
    console.error("Family details error:", familyError);
    toast.error("Δεν ήταν δυνατή η φόρτωση της οικογένειας.");
  } else {
    setFamily(familyData);
  }

  setCheckingFamily(false);
  return;
}

      setCheckingFamily(false);
    };

    void checkFamily();
  }, [loading, user, nav]);

  const handleCreateFamily = async () => {
    if (!user) return;

    const name = familyName.trim();

    if (!name) {
      toast.error("Γράψε ένα όνομα για την οικογένεια.");
      return;
    }

    setCreating(true);

    const { error } = await supabase.rpc("create_family", {
      p_name: name,
    });

    if (error) {
      console.error("Create family error:", error);
      toast.error(`Αποτυχία δημιουργίας: ${error.message}`);
      setCreating(false);
      return;
    }

    toast.success("Η οικογένεια δημιουργήθηκε! 🎉");

    setCreating(false);
    nav({ to: "/" });
  };

  const handleJoinFamily = async () => {
    if (!user) return;

    const code = inviteCode.trim().toUpperCase();

    if (!code) {
      toast.error("Γράψε τον κωδικό πρόσκλησης.");
      return;
    }

    setJoining(true);

    const { error } = await supabase.rpc("join_family", {
      p_invite_code: code,
    });

    if (error) {
      console.error("Join family error:", error);
      toast.error(`Αποτυχία εισόδου: ${error.message}`);
      setJoining(false);
      return;
    }

    toast.success("Μπήκες στην οικογένεια! 👨‍👩‍👧‍👦");

    setJoining(false);
    nav({ to: "/" });
  };
  const handleCopyInviteCode = async () => {
  if (!family) return;

  try {
    await navigator.clipboard.writeText(family.invite_code);
    toast.success("Ο κωδικός αντιγράφηκε! 📋");
  } catch (error) {
    console.error("Copy invite code error:", error);
    toast.error("Δεν ήταν δυνατή η αντιγραφή του κωδικού.");
  }
};
  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  };

  if (loading || checkingFamily || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">
          Φόρτωση...
        </div>
      </div>
    );
  }

  console.log("Loaded family:", family);

  if (family) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-7 w-7 text-primary" />
          </div>

          <h1 className="text-2xl font-bold">Η οικογένειά μου</h1>

          <p className="text-sm text-muted-foreground">
            Εδώ βλέπεις τα στοιχεία της οικογένειάς σου.
          </p>
        </div>

        <div>
  <p className="text-xs text-muted-foreground">
    Κωδικός πρόσκλησης
  </p>

  <div className="flex items-center gap-3 mt-1">
    <p className="text-2xl font-bold tracking-[0.25em]">
      {family.invite_code}
    </p>

    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => void handleCopyInviteCode()}
      title="Αντιγραφή κωδικού"
    >
      <Copy className="h-4 w-4" />
    </Button>
  </div>
</div>

          <p className="text-sm text-muted-foreground">
            Δώσε αυτόν τον κωδικό σε ένα άτομο που θέλεις να προσθέσεις στην
            οικογένεια.
          </p>
          <div className="border rounded-2xl p-5 bg-card shadow-sm space-y-4">
  <div className="flex items-center gap-2">
    <Users className="h-5 w-5 text-primary" />
    <h2 className="font-semibold">Μέλη οικογένειας</h2>
  </div>

  <div className="space-y-3">
    {familyMembers.map((member) => (
      <div
        key={member.user_id}
        className="flex items-center justify-between rounded-xl border p-3"
      >
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: member.color }}
          >
            {member.display_name
              .split(/\s+/)
              .slice(0, 2)
              .map((word) => word[0]?.toUpperCase() ?? "")
              .join("")}
          </div>

          <div>
            <p className="font-medium">{member.display_name}</p>
            <p className="text-xs text-muted-foreground">
              {member.role === "owner" ? "Διαχειριστής" : "Μέλος"}
            </p>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
        </div>

        <Button
          className="w-full"
          onClick={() => nav({ to: "/" })}
        >
          Επιστροφή στον χάρτη
        </Button>

        <Button
          variant="ghost"
          className="w-full gap-2"
          onClick={() => void handleLogout()}
        >
          <LogOut className="h-4 w-4" />
          Αποσύνδεση
        </Button>
      </div>
  );
}

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-7 w-7 text-primary" />
          </div>

          <h1 className="text-2xl font-bold">
            Καλώς ήρθες στο Family GPS
          </h1>

          <p className="text-sm text-muted-foreground">
            Για να χρησιμοποιήσεις την εφαρμογή, δημιούργησε μια οικογένεια
            ή μπες σε μία με κωδικό πρόσκλησης.
          </p>
        </div>

        {/* Create Family */}
        <div className="border rounded-2xl p-5 space-y-4 bg-card shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>

            <div>
              <h2 className="font-semibold">Δημιουργία οικογένειας</h2>
              <p className="text-xs text-muted-foreground">
                Δημιούργησε τη δική σου οικογένεια.
              </p>
            </div>
          </div>

          <Input
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="π.χ. Οικογένεια Παπαδόπουλου"
            maxLength={80}
            disabled={creating || joining}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void handleCreateFamily();
              }
            }}
          />

          <Button
            className="w-full"
            onClick={() => void handleCreateFamily()}
            disabled={creating || joining}
          >
            {creating ? "Δημιουργία..." : "Δημιουργία οικογένειας"}
          </Button>
        </div>

        {/* Join Family */}
        <div className="border rounded-2xl p-5 space-y-4 bg-card shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>

            <div>
              <h2 className="font-semibold">Είσοδος σε οικογένεια</h2>
              <p className="text-xs text-muted-foreground">
                Χρησιμοποίησε τον κωδικό που σου έδωσε ένα μέλος.
              </p>
            </div>
          </div>

          <Input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="π.χ. A7K9P2QX"
            maxLength={8}
            autoCapitalize="characters"
            disabled={creating || joining}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void handleJoinFamily();
              }
            }}
          />

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => void handleJoinFamily()}
            disabled={creating || joining}
          >
            {joining ? "Σύνδεση..." : "Μπες στην οικογένεια"}
          </Button>
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          className="w-full gap-2"
          onClick={() => void handleLogout()}
          disabled={creating || joining}
        >
          <LogOut className="h-4 w-4" />
          Αποσύνδεση
        </Button>
      </div>
    </div>
  );
}
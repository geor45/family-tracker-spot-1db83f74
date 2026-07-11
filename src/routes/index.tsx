import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { LocationTracker } from "@/components/LocationTracker";
import { FamilyMap, type MemberLocation } from "@/components/FamilyMap";
import { Button } from "@/components/ui/button";
import { LogOut, History, Users, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { el } from "date-fns/locale";
import { playWakeSound, primeWakeSound } from "@/lib/wake-sound";
import { registerPushNotifications } from "@/lib/push-setup";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Family GPS" },
      { name: "description", content: "Δες σε πραγματικό χρόνο πού βρίσκεται η οικογένεια." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [members, setMembers] = useState<MemberLocation[]>([]);
  const [showList, setShowList] = useState(false);
  const processedWakeIdsRef = useRef<Set<string>>(new Set());
  const listenFromRef = useRef(new Date().toISOString());

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    const enableSound = () => primeWakeSound();
    window.addEventListener("pointerdown", enableSound, { once: true });
    window.addEventListener("keydown", enableSound, { once: true });
    return () => {
      window.removeEventListener("pointerdown", enableSound);
      window.removeEventListener("keydown", enableSound);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    void registerPushNotifications(user.id);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      await supabase.from("profiles").upsert({
        id: user.id,
        display_name:
          user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Μέλος",
      });
      const { data: locs } = await supabase.from("latest_locations").select("*");
      const { data: profs } = await supabase.from("profiles").select("*");
      if (!profs) return;
      const merged: MemberLocation[] = profs.map((p) => {
        const l = locs?.find((lo) => lo.user_id === p.id);
        return {
          user_id: p.id,
          display_name: p.display_name,
          color: p.color,
          latitude: l?.latitude ?? 0,
          longitude: l?.longitude ?? 0,
          accuracy: l?.accuracy ?? null,
          updated_at: l?.updated_at ?? "",
        } satisfies MemberLocation;
      });
      setMembers(merged);
    };
    void load();

    const ch = supabase
      .channel("latest_locations_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "latest_locations" },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user]);

  const handleIncomingWake = useCallback(
    async (row: { id?: string; sender_id: string; message: string; created_at?: string }) => {
      if (row.id && processedWakeIdsRef.current.has(row.id)) return;
      if (row.id) processedWakeIdsRef.current.add(row.id);
      if (row.created_at && row.created_at > listenFromRef.current) {
        listenFromRef.current = row.created_at;
      }

      const { data: p } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", row.sender_id)
        .maybeSingle();
      await playWakeSound(6);
      toast(`🔔 ${p?.display_name ?? "Κάποιος"} σε ψάχνει!`, {
        description: row.message,
        duration: 9000,
      });
    },
    [],
  );

  // Listen for incoming wake signals addressed to me → play sound.
  // Realtime handles instant delivery; polling is a fallback for mobile/webview stalls.
  useEffect(() => {
    if (!user) return;
    listenFromRef.current = new Date().toISOString();
    processedWakeIdsRef.current.clear();

    const ch = supabase
      .channel(`wake_signals_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wake_signals",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => void handleIncomingWake(payload.new as Parameters<typeof handleIncomingWake>[0]),
      )
      .subscribe();

    const poll = window.setInterval(() => {
      void supabase
        .from("wake_signals")
        .select("id, sender_id, message, created_at")
        .eq("recipient_id", user.id)
        .gt("created_at", listenFromRef.current)
        .order("created_at", { ascending: true })
        .limit(10)
        .then(({ data }) => {
          for (const row of data ?? []) void handleIncomingWake(row);
        });
    }, 7000);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(ch);
    };
  }, [handleIncomingWake, user]);

  const sendWake = useCallback(async (recipientId: string, name: string) => {
    if (!user) return;
    primeWakeSound();
    const { data, error } = await supabase
      .from("wake_signals")
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        message: "Ξύπνα βλάκα!",
      })
      .select("id, sender_id, message, created_at")
      .single();
    if (error) {
      toast.error(`Αποτυχία αποστολής: ${error.message}`);
    } else {
      toast.success(`Στάλθηκε ξύπνημα στον/στην ${name} 📣`);
      if (recipientId === user.id && data) void handleIncomingWake(data);
    }
  }, [handleIncomingWake, user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Φόρτωση...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background z-10 shadow-sm">
        <div>
          <h1 className="font-semibold">Family GPS</h1>
          <p className="text-xs text-muted-foreground">
            {members.length} {members.length === 1 ? "μέλος" : "μέλη"} online
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowList((v) => !v)}>
            <Users className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/history">
              <History className="h-5 w-5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void supabase.auth.signOut()}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <LocationTracker />

      <div className="flex-1 relative">
        <FamilyMap
          members={members.filter((m) => m.updated_at !== "")}
          onWakeMember={(member) => void sendWake(member.user_id, member.display_name)}
        />
        {showList && (
          <div className="absolute top-3 left-3 right-3 z-[1000] bg-card/95 backdrop-blur border rounded-xl shadow-lg max-h-[60vh] overflow-y-auto">
            {members.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">
                Κανείς δεν μοιράζεται τοποθεσία ακόμα.
              </div>
            )}
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center gap-3 p-3 border-b last:border-0"
              >
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                  style={{ backgroundColor: m.color }}
                >
                  {m.display_name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{m.display_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.updated_at
                      ? formatDistanceToNow(new Date(m.updated_at), {
                          addSuffix: true,
                          locale: el,
                        })
                      : "Χωρίς τοποθεσία ακόμα"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="shrink-0 gap-1"
                  onClick={() => void sendWake(m.user_id, m.display_name)}
                >
                  <Bell className="h-4 w-4" />
                  Ξύπνα βλάκα
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

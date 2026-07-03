import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { LocationTracker } from "@/components/LocationTracker";
import { FamilyMap, type MemberLocation } from "@/components/FamilyMap";
import { Button } from "@/components/ui/button";
import { LogOut, History, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { el } from "date-fns/locale";

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

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data: locs } = await supabase.from("latest_locations").select("*");
      const { data: profs } = await supabase.from("profiles").select("*");
      if (!locs || !profs) return;
      const merged: MemberLocation[] = locs
        .map((l) => {
          const p = profs.find((pr) => pr.id === l.user_id);
          if (!p) return null;
          return {
            user_id: l.user_id,
            display_name: p.display_name,
            color: p.color,
            latitude: l.latitude,
            longitude: l.longitude,
            accuracy: l.accuracy,
            updated_at: l.updated_at,
          } satisfies MemberLocation;
        })
        .filter((x): x is MemberLocation => x !== null);
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
        <FamilyMap members={members} />
        {showList && (
          <div className="absolute top-3 left-3 right-3 bg-card/95 backdrop-blur border rounded-xl shadow-lg max-h-[60vh] overflow-y-auto">
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
                    {formatDistanceToNow(new Date(m.updated_at), {
                      addSuffix: true,
                      locale: el,
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

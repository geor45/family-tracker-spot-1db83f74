import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Ιστορικό διαδρομών | Family GPS" },
      { name: "description", content: "Ιστορικό τοποθεσιών των μελών της οικογένειας." },
    ],
  }),
  component: HistoryPage,
});

type Profile = { id: string; display_name: string; color: string };
type Point = {
  latitude: number;
  longitude: number;
  recorded_at: string;
};

function HistoryPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [range, setRange] = useState<"1" | "7" | "30">("1");
  const [points, setPoints] = useState<Point[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("id, display_name, color")
      .then(({ data }) => {
        if (!data) return;
        setProfiles(data);
        setSelected((prev) => prev || user.id);
      });
  }, [user]);

  useEffect(() => {
    if (!selected) return;
    const since = new Date(Date.now() - Number(range) * 86400_000).toISOString();
    void supabase
      .from("location_history")
      .select("latitude, longitude, recorded_at")
      .eq("user_id", selected)
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: true })
      .then(({ data }) => setPoints(data ?? []));
  }, [selected, range]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [37.9838, 23.7275], zoom: 12 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  const profile = useMemo(() => profiles.find((p) => p.id === selected), [profiles, selected]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (points.length === 0) return;
    const latlngs = points.map((p) => [p.latitude, p.longitude] as [number, number]);
    L.polyline(latlngs, { color: profile?.color ?? "#3b82f6", weight: 4, opacity: 0.8 }).addTo(
      layer,
    );
    L.circleMarker(latlngs[0], {
      radius: 6,
      color: "white",
      weight: 2,
      fillColor: "#22c55e",
      fillOpacity: 1,
    })
      .bindPopup("Αρχή")
      .addTo(layer);
    L.circleMarker(latlngs[latlngs.length - 1], {
      radius: 7,
      color: "white",
      weight: 2,
      fillColor: profile?.color ?? "#3b82f6",
      fillOpacity: 1,
    })
      .bindPopup("Τελευταία θέση")
      .addTo(layer);
    map.fitBounds(L.latLngBounds(latlngs).pad(0.2));
  }, [points, profile]);

  if (loading || !user) return null;

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center gap-2 px-4 py-3 border-b bg-background shadow-sm">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="font-semibold flex-1">Ιστορικό</h1>
      </header>

      <div className="p-3 grid grid-cols-2 gap-2 border-b bg-muted/30">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder="Μέλος" />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={(v) => setRange(v as "1" | "7" | "30")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Τελευταίες 24 ώρες</SelectItem>
            <SelectItem value="7">Τελευταίες 7 ημέρες</SelectItem>
            <SelectItem value="30">Τελευταίες 30 ημέρες</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 relative">
        <div ref={containerRef} className="h-full w-full" />
        {points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 pointer-events-none">
            <p className="text-sm text-muted-foreground">Δεν υπάρχουν καταγραφές.</p>
          </div>
        )}
      </div>
    </div>
  );
}

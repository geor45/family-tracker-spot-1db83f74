import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { isNative, startNativeTracking, stopNativeTracking } from "@/lib/native-tracker";

/**
 * Native (Capacitor) → background geolocation plugin (works με κλειστή οθόνη).
 * Web (browser) → navigator.geolocation.watchPosition (μόνο όσο είναι ανοιχτή η εφαρμογή).
 */
export function LocationTracker() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "granted" | "denied" | "error">("idle");
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    if (isNative()) {
      startNativeTracking(user.id).catch((e) => {
        setStatus("error");
        setLastError(e instanceof Error ? e.message : String(e));
      });
      return () => {
        void stopNativeTracking();
      };
    }

    if (!("geolocation" in navigator)) {
      setStatus("error");
      setLastError("Το browser δεν υποστηρίζει GPS.");
      return;
    }

    let lastLat = 0;
    let lastLng = 0;
    let lastAt = 0;

    const write = async (lat: number, lng: number, acc: number | null) => {
      const now = Date.now();
      const moved =
        Math.hypot((lat - lastLat) * 111000, (lng - lastLng) * 85000) > 15;
      if (!moved && now - lastAt < 60_000) return;
      lastLat = lat;
      lastLng = lng;
      lastAt = now;

      await supabase.from("latest_locations").upsert({
        user_id: user.id,
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        updated_at: new Date().toISOString(),
      });
      await supabase.from("location_history").insert({
        user_id: user.id,
        latitude: lat,
        longitude: lng,
        accuracy: acc,
      });
    };

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus("granted");
        setLastError(null);
        void write(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
        setLastError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [user]);

  if (status === "denied") {
    return (
      <div className="bg-destructive/10 text-destructive text-xs px-3 py-2 text-center">
        Δώσε άδεια τοποθεσίας στις ρυθμίσεις για να σε βλέπει η οικογένεια.
      </div>
    );
  }
  if (status === "error" && lastError) {
    return (
      <div className="bg-destructive/10 text-destructive text-xs px-3 py-2 text-center">
        GPS: {lastError}
      </div>
    );
  }
  return null;
}

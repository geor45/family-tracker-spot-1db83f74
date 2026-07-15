import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { startNativeTracking, stopNativeTracking } from "@/lib/native-tracker";

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
    let cancelled = false;
    let webWatchId: number | null = null;

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

    const startWebTracking = () => {
      if (cancelled || webWatchId !== null) return;
      if (!("geolocation" in navigator)) {
        setStatus("error");
        setLastError("Το browser δεν υποστηρίζει GPS.");
        return;
      }

      webWatchId = navigator.geolocation.watchPosition(
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
    };

    void startNativeTracking(user.id)
      .then((startedNative) => {
        if (cancelled) {
          if (startedNative) void stopNativeTracking();
          return;
        }
        if (!startedNative) startWebTracking();
      })
      .catch((e) => {
        console.warn("Native GPS failed; falling back to browser GPS", e);
        startWebTracking();
      });

    return () => {
      cancelled = true;
      if (webWatchId !== null) navigator.geolocation.clearWatch(webWatchId);
      void stopNativeTracking();
    };
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

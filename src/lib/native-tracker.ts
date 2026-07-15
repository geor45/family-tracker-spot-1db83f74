import { supabase } from "@/integrations/supabase/client";

// Types for @capacitor-community/background-geolocation
interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  time: number;
}
interface WatcherOptions {
  backgroundMessage?: string;
  backgroundTitle?: string;
  requestPermissions?: boolean;
  stale?: boolean;
  distanceFilter?: number;
}
interface BackgroundGeolocationPlugin {
  addWatcher(
    options: WatcherOptions,
    callback: (location: Location | null, error?: { code: string; message: string }) => void,
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
}

let watcherId: string | null = null;
let lastLat = 0;
let lastLng = 0;
let lastAt = 0;
let backgroundGeolocation: BackgroundGeolocationPlugin | null = null;

async function getBackgroundGeolocation() {
  if (typeof window === "undefined") return null;

  const { Capacitor, registerPlugin } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return null;

  backgroundGeolocation ??=
    registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");
  return backgroundGeolocation;
}

export async function startNativeTracking(userId: string) {
  if (watcherId) return true;

  const BackgroundGeolocation = await getBackgroundGeolocation();
  if (!BackgroundGeolocation) return false;

  watcherId = await BackgroundGeolocation.addWatcher(
    {
      backgroundMessage: "Η οικογένεια βλέπει την τοποθεσία σου.",
      backgroundTitle: "Family GPS ενεργό",
      requestPermissions: true,
      stale: false,
      distanceFilter: 15,
    },
    async (location, error) => {
      if (error) {
        if (error.code === "NOT_AUTHORIZED") {
          await BackgroundGeolocation.openSettings();
        }
        return;
      }
      if (!location) return;

      const now = Date.now();
      const moved =
        Math.hypot(
          (location.latitude - lastLat) * 111000,
          (location.longitude - lastLng) * 85000,
        ) > 15;
      if (!moved && now - lastAt < 60_000) return;
      lastLat = location.latitude;
      lastLng = location.longitude;
      lastAt = now;

      await supabase.from("latest_locations").upsert({
        user_id: userId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        updated_at: new Date().toISOString(),
      });
      await supabase.from("location_history").insert({
        user_id: userId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      });
    },
  );
  return true;
}

export async function stopNativeTracking() {
  const BackgroundGeolocation = await getBackgroundGeolocation();
  if (watcherId && BackgroundGeolocation) {
    await BackgroundGeolocation.removeWatcher({ id: watcherId });
    watcherId = null;
  }
}

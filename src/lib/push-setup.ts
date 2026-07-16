import { supabase } from "@/integrations/supabase/client";

let registered = false;
let registrationStarted = false;

type PushPermissionState = "prompt" | "prompt-with-rationale" | "granted" | "denied";

interface SafeAndroidPushPlugin {
  checkPermissions(): Promise<{ receive: PushPermissionState }>;
  requestPermissions(): Promise<{ receive: PushPermissionState }>;
  getToken(): Promise<{ value: string }>;
}

function safeWarn(message: string, error?: unknown) {
  console.warn(message, error instanceof Error ? error.message : error);
}

export async function registerPushNotifications(userId: string) {
  if (registered || registrationStarted) return;
  if (typeof window === "undefined") return;

  registrationStarted = true;
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;

    const platform = Capacitor.getPlatform();

    if (platform === "android") {
      await registerAndroidPushSafely(userId);
      registered = true;
      return;
    }

    const { PushNotifications } = await import("@capacitor/push-notifications");

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      safeWarn("Push permission denied");
      return;
    }

    await PushNotifications.addListener("registration", async (token) => {
      try {
        await supabase.from("push_tokens").upsert(
          {
            user_id: userId,
            token: token.value,
            platform,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "token" },
        );
      } catch (e) {
        safeWarn("Failed to save push token", e);
      }
    });

    await PushNotifications.addListener("registrationError", (err) => {
      safeWarn("Push registration error", err);
    });

    await PushNotifications.register();
    registered = true;
  } catch (e) {
    safeWarn("Push setup failed", e);
  } finally {
    registrationStarted = false;
  }
}

async function registerAndroidPushSafely(userId: string) {
  const { registerPlugin } = await import("@capacitor/core");
  const SafePush = registerPlugin<SafeAndroidPushPlugin>("SafePush");

  let perm = await SafePush.checkPermissions();
  if (perm.receive !== "granted") {
    perm = await SafePush.requestPermissions();
  }
  if (perm.receive !== "granted") {
    safeWarn("Push permission denied");
    return;
  }

  const token = await SafePush.getToken();
  if (!token.value) {
    safeWarn("Push registration returned an empty token");
    return;
  }

  await supabase.from("push_tokens").upsert(
    {
      user_id: userId,
      token: token.value,
      platform: "android",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );
}

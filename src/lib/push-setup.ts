import { supabase } from "@/integrations/supabase/client";

let registered = false;
let registrationStarted = false;

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

    const { PushNotifications } = await import("@capacitor/push-notifications");
    const platform = Capacitor.getPlatform();

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      safeWarn("Push permission denied");
      return;
    }

    if (platform === "android") {
      try {
        await PushNotifications.createChannel({
          id: "wake",
          name: "Ξύπνα βλάκα",
          description: "Ειδοποιήσεις όταν κάποιος από την οικογένεια σε ψάχνει.",
          importance: 5,
          visibility: 1,
          vibration: true,
        });
      } catch (e) {
        safeWarn("Push notification channel setup failed", e);
      }
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

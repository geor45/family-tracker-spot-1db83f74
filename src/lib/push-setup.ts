import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

let registered = false;

export async function registerPushNotifications(userId: string) {
  if (registered) return;
  if (!Capacitor.isNativePlatform()) return;
  registered = true;

  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      console.warn("Push permission denied");
      registered = false;
      return;
    }

    await PushNotifications.addListener("registration", async (token) => {
      try {
        await supabase.from("push_tokens").upsert(
          {
            user_id: userId,
            token: token.value,
            platform: Capacitor.getPlatform(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "token" },
        );
      } catch (e) {
        console.warn("Failed to save push token", e);
      }
    });

    await PushNotifications.addListener("registrationError", (err) => {
      console.warn("Push registration error", err);
    });

    await PushNotifications.register();
  } catch (e) {
    console.warn("Push setup failed", e);
    registered = false;
  }
}

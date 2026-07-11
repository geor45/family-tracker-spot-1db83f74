import { createFileRoute } from "@tanstack/react-router";

// Sends an FCM push (HTTP v1) to all registered devices of a recipient user.
// Called by the sender's client right after a wake_signal is inserted.
// Bypasses auth by design (public /api/public/*), but validates that the
// caller is authenticated via their Supabase JWT and only allows push to
// existing users.

async function importPrivateKey(pemString: string): Promise<CryptoKey> {
  const pem = pemString
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    bin,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function b64url(input: string | ArrayBuffer): string {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : new Uint8Array(input);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

let cachedAccessToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.exp - now > 60) {
    return cachedAccessToken.token;
  }
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const key = await importPrivateKey(sa.private_key);
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`OAuth failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: json.access_token,
    exp: now + json.expires_in,
  };
  return json.access_token;
}

export const Route = createFileRoute("/api/public/send-wake-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") ?? "";
          if (!authHeader.toLowerCase().startsWith("bearer ")) {
            return new Response("Unauthorized", { status: 401 });
          }

          const body = (await request.json()) as {
            recipient_id?: string;
            sender_name?: string;
            message?: string;
          };
          if (!body.recipient_id) {
            return new Response("Missing recipient_id", { status: 400 });
          }

          const saRaw = process.env.FCM_SERVICE_ACCOUNT_JSON;
          if (!saRaw) {
            return new Response("FCM not configured", { status: 503 });
          }
          const sa = JSON.parse(saRaw) as {
            client_email: string;
            private_key: string;
            project_id: string;
          };

          // Verify caller with their bearer token, then look up tokens with admin.
          const { createClient } = await import("@supabase/supabase-js");
          const userClient = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            {
              global: { headers: { Authorization: authHeader } },
              auth: { persistSession: false, autoRefreshToken: false },
            },
          );
          const { data: userData, error: userErr } = await userClient.auth.getUser();
          if (userErr || !userData.user) {
            return new Response("Unauthorized", { status: 401 });
          }

          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          const { data: tokens, error: tokErr } = await supabaseAdmin
            .from("push_tokens")
            .select("token")
            .eq("user_id", body.recipient_id);
          if (tokErr) {
            return new Response(`DB error: ${tokErr.message}`, { status: 500 });
          }
          if (!tokens || tokens.length === 0) {
            return Response.json({ sent: 0, note: "no tokens for recipient" });
          }

          const accessToken = await getAccessToken(sa);
          const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
          const title = body.sender_name
            ? `🔔 ${body.sender_name} σε ψάχνει!`
            : "🔔 Κάποιος σε ψάχνει!";
          const bodyText = body.message ?? "Ξύπνα βλάκα!";

          const results = await Promise.allSettled(
            tokens.map((t) =>
              fetch(url, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  message: {
                    token: t.token,
                    notification: { title, body: bodyText },
                    android: {
                      priority: "HIGH",
                      notification: {
                        channel_id: "wake",
                        sound: "default",
                        default_vibrate_timings: true,
                      },
                    },
                    data: { type: "wake" },
                  },
                }),
              }).then(async (r) => ({
                ok: r.ok,
                status: r.status,
                token: t.token,
                text: r.ok ? "" : await r.text(),
              })),
            ),
          );

          // Clean up dead tokens
          const dead: string[] = [];
          for (const r of results) {
            if (
              r.status === "fulfilled" &&
              !r.value.ok &&
              (r.value.status === 404 ||
                r.value.text.includes("UNREGISTERED") ||
                r.value.text.includes("INVALID_ARGUMENT"))
            ) {
              dead.push(r.value.token);
            }
          }
          if (dead.length > 0) {
            await supabaseAdmin.from("push_tokens").delete().in("token", dead);
          }

          const sent = results.filter(
            (r) => r.status === "fulfilled" && r.value.ok,
          ).length;
          return Response.json({ sent, total: tokens.length, dead: dead.length });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("send-wake-push error:", msg);
          return new Response(`Error: ${msg}`, { status: 500 });
        }
      },
    },
  },
});

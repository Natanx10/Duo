import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotification } from "https://esm.sh/web-push-neo";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:duo@app.com";

// Send a single Web Push notification
async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string
): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await sendNotification({
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      payload,
      vapidDetails: {
        subject: VAPID_SUBJECT,
        publicKey: VAPID_PUBLIC_KEY,
        privateKey: VAPID_PRIVATE_KEY,
      },
    });
    return { ok: res.statusCode === 200 || res.statusCode === 201, status: res.statusCode };
  } catch (err: any) {
    const status = err.statusCode || 500;
    console.error("[send-push] Error sending push:", err);
    return { ok: false, status };
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const CRON_SECRET = Deno.env.get("CRON_SECRET");
    if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Body: { user_ids?: string[], title: string, body: string, url?: string, tag?: string }
    const body = await req.json();
    const { user_ids, title, body: msgBody, url, tag } = body;

    if (!title) {
      return new Response(JSON.stringify({ error: "title is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch subscriptions
    let query = supabase.from("push_subscriptions").select("*");
    if (user_ids && user_ids.length > 0) {
      query = query.in("user_id", user_ids);
    }
    const { data: subs, error } = await query;
    if (error) throw error;

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "no subscriptions" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title, body: msgBody, url, tag });
    const results = await Promise.allSettled(
      subs.map((sub) =>
        sendPush({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload)
      )
    );

    // Remove stale subscriptions (410 Gone)
    const staleEndpoints: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value.status === 410) {
        staleEndpoints.push(subs[i].endpoint);
      }
    });
    if (staleEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", staleEndpoints);
    }

    const sent = results.filter((r) => r.status === "fulfilled" && (r.value as { ok: boolean }).ok).length;

    return new Response(JSON.stringify({ sent, total: subs.length }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

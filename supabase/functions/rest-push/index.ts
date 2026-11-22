// Sends one Web Push to a phone after a delay. Called when a rest timer starts.
// Rung 1: delay is capped at MAX_DELAY seconds until the function's real wall-clock limit is measured.
import webpush from "npm:web-push@3.6.7";

const MAX_DELAY = 140;
const ALLOWED = [".push.apple.com", ".googleapis.com", ".push.services.mozilla.com", ".notify.windows.com"];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

webpush.setVapidDetails(
  "https://johnsaas.github.io/iron-ledger/",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let b: any;
  try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const sub = b?.sub, delay = Number(b?.delay);
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return json({ error: "bad subscription" }, 400);
  let host = "";
  try { const u = new URL(sub.endpoint); if (u.protocol !== "https:") throw 0; host = u.hostname; }
  catch { return json({ error: "bad endpoint" }, 400); }
  if (!ALLOWED.some((s) => host.endsWith(s))) return json({ error: "endpoint host not allowed" }, 400);
  if (b.sync === true) {  // debug: send now and report the push service's answer
    try {
      const r = await webpush.sendNotification(sub, JSON.stringify({ title: "Push test", body: "Sent immediately." }), { TTL: 60, urgency: "high" });
      return json({ sync: true, status: r.statusCode });
    } catch (e) {
      return json({ sync: true, status: (e as any)?.statusCode, body: String((e as any)?.body || e).slice(0, 200) });
    }
  }
  if (!(delay >= 1 && delay <= MAX_DELAY)) return json({ error: "delay must be 1.." + MAX_DELAY }, 400);

  const payload = JSON.stringify({
    title: String(b.title || "Rest over").slice(0, 80),
    body: String(b.body || "Back to work.").slice(0, 160),
  });
  const job = (async () => {
    await new Promise((r) => setTimeout(r, delay * 1000));
    try {
      const r = await webpush.sendNotification(sub, payload, { TTL: 120, urgency: "high" });
      console.log("sent", r.statusCode, host);
    } catch (e) {
      console.log("push failed", (e as any)?.statusCode, String((e as any)?.body || e).slice(0, 200));
    }
  })();
  // @ts-ignore EdgeRuntime is provided by Supabase
  EdgeRuntime.waitUntil(job);
  return json({ queued: true, delay }, 202);
});

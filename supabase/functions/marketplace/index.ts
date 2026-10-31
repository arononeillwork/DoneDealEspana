// DoneDealEspana server function.
//
// Signed-in website calls (POST JSON with the user's access token):
//   { action: "checkout", listing_id, buyer_id? }  -> Stripe Checkout URL for the fixed sale fee
//   { action: "confirm", session_id }              -> verifies a paid Checkout session, marks the item sold
//   { action: "delete_account" }                   -> removes the user's photos and account
//
// Stripe webhook (POST with a stripe-signature header):
//   checkout.session.completed / async_payment_succeeded -> marks the item sold
//   checkout.session.expired                             -> marks the pending fee expired
//
// Secrets: STRIPE_SECRET_KEY (required for payments), STRIPE_WEBHOOK_SECRET (for the webhook),
//          optional STRIPE_PRICE_ID (use an existing €5 Price), SALE_FEE_CENTS (default 500), SITE_URL.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const APP = "donedealespana";
const FEE_CENTS = Number(Deno.env.get("SALE_FEE_CENTS") ?? 500);
const DEFAULT_SITE = (Deno.env.get("SITE_URL") ?? "https://donedealespana.vercel.app").replace(/\/$/, "");
const BUCKET = "listing-images";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Stripe (REST, form-encoded; no SDK needed)
// ---------------------------------------------------------------------------

const stripeReady = () => !!Deno.env.get("STRIPE_SECRET_KEY");

// deno-lint-ignore no-explicit-any
function formEncode(obj: Record<string, any>, prefix = "", out: string[] = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((x, i) =>
        typeof x === "object"
          ? formEncode(x, `${key}[${i}]`, out)
          : out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(x))}`)
      );
    } else if (typeof v === "object") formEncode(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out;
}

// deno-lint-ignore no-explicit-any
async function stripe(method: "GET" | "POST", path: string, params?: Record<string, any>, idempotencyKey?: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  let url = `https://api.stripe.com/v1/${path}`;
  let body: string | undefined;
  if (params) {
    const q = formEncode(params).join("&");
    if (method === "GET") url += `?${q}`;
    else body = q;
  }
  const r = await fetch(url, { method, headers, body });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message ?? `Stripe error ${r.status}`);
  return j;
}

const te = new TextEncoder();
const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function verifyStripeSignature(raw: string, header: string, secret: string) {
  let t = "";
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=");
    if (k === "t") t = v;
    if (k === "v1" && v) sigs.push(v);
  }
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", te.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toHex(await crypto.subtle.sign("HMAC", key, te.encode(`${t}.${raw}`)));
  return sigs.some((s) => safeEqual(s, expected));
}

// ---------------------------------------------------------------------------
// Sale fee
// ---------------------------------------------------------------------------

function siteFor(req: Request) {
  try {
    const u = new URL(req.headers.get("origin") ?? "");
    const h = u.hostname;
    const allowed =
      (u.protocol === "https:" &&
        ((h.startsWith("donedealespana") && h.endsWith(".vercel.app")) || /(^|\.)donedealespana\.(com|es)$/.test(h))) ||
      h === "localhost" || h === "127.0.0.1";
    if (allowed) return u.origin;
  } catch { /* fall through */ }
  return DEFAULT_SITE;
}

// deno-lint-ignore no-explicit-any
async function settle(session: any) {
  if (session?.metadata?.app !== APP) return { status: "ignored" };
  if (session.payment_status !== "paid") return { status: "unpaid" };
  const { data: fee } = await admin.from("sale_fees").select("id, listing_id, buyer_id, status, amount_cents")
    .eq("id", session.metadata.fee_id).maybeSingle();
  if (!fee) return { status: "ignored" };
  if (fee.status !== "paid") {
    await admin.from("sale_fees").update({
      status: "paid",
      paid_at: new Date().toISOString(),
      amount_cents: session.amount_total ?? fee.amount_cents,
      stripe_session_id: session.id,
      stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    }).eq("id", fee.id);
  }
  if (fee.listing_id) {
    // .neq keeps this idempotent: the webhook and the success page may both arrive.
    const { error } = await admin.from("listings").update({ status: "sold", buyer_id: fee.buyer_id })
      .eq("id", fee.listing_id).neq("status", "sold");
    if (error) throw error;
  }
  return { status: "sold", listing_id: fee.listing_id };
}

// deno-lint-ignore no-explicit-any
async function checkout(req: Request, user: any, body: any) {
  const listingId = String(body.listing_id ?? "");
  const buyerId = body.buyer_id ? String(body.buyer_id) : null;
  const { data: l } = await admin.from("listings").select("id, title, seller_id, status").eq("id", listingId).maybeSingle();
  if (!l || l.seller_id !== user.id) return json({ error: "Listing not found." }, 404);
  if (l.status === "sold") return json({ status: "already_sold" });
  if (buyerId) {
    const { data: c } = await admin.from("conversations").select("id").eq("listing_id", l.id).eq("buyer_id", buyerId).maybeSingle();
    if (!c) return json({ error: "Choose a buyer you have chatted with about this item." }, 400);
  }
  if (!stripeReady()) return json({ status: "not_configured" });

  // Close earlier unpaid checkouts for this item so the fee can never be paid twice.
  const { data: pending } = await admin.from("sale_fees").select("id, stripe_session_id")
    .eq("listing_id", l.id).eq("status", "pending");
  for (const f of pending ?? []) {
    if (f.stripe_session_id) {
      const s = await stripe("GET", `checkout/sessions/${f.stripe_session_id}`);
      if (s.payment_status === "paid") {
        await settle(s);
        return json({ status: "already_sold" });
      }
      if (s.status === "open") {
        try { await stripe("POST", `checkout/sessions/${f.stripe_session_id}/expire`); } catch { /* already closed */ }
      }
    }
    await admin.from("sale_fees").update({ status: "expired" }).eq("id", f.id).eq("status", "pending");
  }

  const { data: fee, error } = await admin.from("sale_fees").insert({
    listing_id: l.id, listing_title: l.title, seller_id: user.id, buyer_id: buyerId, amount_cents: FEE_CENTS,
  }).select("id").single();
  if (error) throw error;

  const priceId = Deno.env.get("STRIPE_PRICE_ID");
  const lineItem = priceId
    ? { price: priceId, quantity: 1 }
    : {
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: FEE_CENTS,
        product_data: { name: "DoneDealEspana sale fee", description: `Item: ${l.title}`.slice(0, 300) },
      },
    };
  const metadata = { app: APP, fee_id: fee.id, listing_id: l.id, seller_id: user.id };
  const site = siteFor(req);
  const session = await stripe("POST", "checkout/sessions", {
    mode: "payment",
    line_items: [lineItem],
    customer_email: user.email,
    client_reference_id: fee.id,
    metadata,
    payment_intent_data: { description: `DoneDealEspana sale fee: ${l.title}`.slice(0, 350), metadata },
    success_url: `${site}/?fee=success&session_id={CHECKOUT_SESSION_ID}#/dashboard`,
    cancel_url: `${site}/?fee=cancelled#/dashboard`,
    locale: "auto",
  }, `ddm-fee-${fee.id}`);
  await admin.from("sale_fees").update({ stripe_session_id: session.id }).eq("id", fee.id);
  return json({ status: "ok", url: session.url });
}

// deno-lint-ignore no-explicit-any
async function confirm(user: any, body: any) {
  const id = String(body.session_id ?? "");
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json({ error: "Invalid payment reference." }, 400);
  if (!stripeReady()) return json({ status: "not_configured" });
  const s = await stripe("GET", `checkout/sessions/${id}`);
  if (s.metadata?.seller_id !== user.id) return json({ error: "This payment belongs to another account." }, 403);
  return json(await settle(s));
}

// deno-lint-ignore no-explicit-any
async function deleteAccount(user: any) {
  const store = admin.storage.from(BUCKET);
  for (let i = 0; i < 20; i++) {
    const { data: files } = await store.list(user.id, { limit: 100 });
    if (!files?.length) break;
    await store.remove(files.map((f) => `${user.id}/${f.name}`));
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  return json({ status: "deleted" });
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

async function webhook(req: Request, signature: string) {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const raw = await req.text();
  if (!secret || !(await verifyStripeSignature(raw, signature, secret))) return json({ error: "Invalid signature" }, 400);
  const evt = JSON.parse(raw);
  const session = evt?.data?.object;
  if (evt.type === "checkout.session.completed" || evt.type === "checkout.session.async_payment_succeeded") {
    return json({ received: true, ...(await settle(session)) });
  }
  if (evt.type === "checkout.session.expired" && session?.metadata?.app === APP) {
    await admin.from("sale_fees").update({ status: "expired" }).eq("id", session.metadata.fee_id).eq("status", "pending");
  }
  return json({ received: true });
}

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const signature = req.headers.get("stripe-signature");
    if (signature) return await webhook(req, signature);

    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data } = token ? await admin.auth.getUser(token) : { data: { user: null } };
    const user = data?.user;
    if (!user) return json({ error: "Please log in." }, 401);

    // deno-lint-ignore no-explicit-any
    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400); }

    switch (body?.action) {
      case "checkout": return await checkout(req, user, body);
      case "confirm": return await confirm(user, body);
      case "delete_account": return await deleteAccount(user);
      default: return json({ error: "Unknown action." }, 400);
    }
  } catch (e) {
    console.error("marketplace", e);
    return json({ error: "Something went wrong. Please try again in a moment." }, 502);
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BASE = `${SB_URL}/functions/v1/oauth`;
const cb = (provider: string) => `${BASE}/${provider}/callback`;
const enc = new TextEncoder();

function b64u(bytes: Uint8Array) {
  let value = "";
  for (const b of bytes) value += String.fromCharCode(b);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function ub64u(value: string) {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
async function hmacBytes(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}
async function hmac64(value: string, secret = SB_KEY) { return b64u(await hmacBytes(value, secret)); }
async function hmacHex(value: string, secret: string) { return [...await hmacBytes(value, secret)].map((x) => x.toString(16).padStart(2, "0")).join(""); }

async function createState(provider: string) {
  const payload = `${provider}.${Date.now()}.${b64u(crypto.getRandomValues(new Uint8Array(18)))}`;
  return `${b64u(enc.encode(payload))}.${await hmac64(payload)}`;
}
async function validState(value: string | null, provider: string) {
  if (!value) return false;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return false;
  let payload = "";
  try { payload = new TextDecoder().decode(ub64u(encoded)); } catch { return false; }
  const parts = payload.split(".");
  if (parts.length !== 3 || parts[0] !== provider) return false;
  const timestamp = Number(parts[1]);
  if (!Number.isFinite(timestamp) || Date.now() - timestamp > 900000 || timestamp > Date.now() + 60000) return false;
  return signature === await hmac64(payload);
}
async function aesKey() {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(`${SB_KEY}:oauth-token-v1`));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
}
async function seal(value?: string | null) {
  if (!value) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), enc.encode(value)));
  return `${b64u(iv)}.${b64u(cipher)}`;
}
async function save(provider: string, externalId: string, token: any) {
  const supabase = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const ttl = Number(token.expires_in ?? token.expire_in ?? 0);
  const { error } = await supabase.from("oauth_connections").upsert({
    provider,
    external_account_id: externalId || "default",
    access_token_enc: await seal(token.access_token),
    refresh_token_enc: await seal(token.refresh_token),
    token_type: token.token_type ?? "bearer",
    scope: Array.isArray(token.granted_scopes) ? token.granted_scopes.join(" ") : (token.scope ?? null),
    expires_at: ttl ? new Date(Date.now() + ttl * 1000).toISOString() : null,
    metadata: { user_id: token.user_id ?? null, shop_id: token.shop_id ?? null, open_id: token.open_id ?? null, user_type: token.user_type ?? null },
  }, { onConflict: "provider,external_account_id" });
  if (error) throw error;
}
function page(title: string, message: string, status = 200) {
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;max-width:720px;margin:60px auto;padding:24px"><h1>${title}</h1><p>${message}</p></body>`, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

async function meliStart() {
  const clientId = Deno.env.get("MELI_CLIENT_ID");
  if (!clientId) return page("Mercado Livre", "Backend pronto. Falta cadastrar MELI_CLIENT_ID e MELI_CLIENT_SECRET.", 503);
  const url = new URL("https://auth.mercadolivre.com.br/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", cb("mercadolivre"));
  url.searchParams.set("state", await createState("mercadolivre"));
  return Response.redirect(url, 302);
}
async function meliCallback(url: URL) {
  if (!await validState(url.searchParams.get("state"), "mercadolivre")) return page("Falha de segurança", "State inválido ou expirado.", 400);
  const code = url.searchParams.get("code"), clientId = Deno.env.get("MELI_CLIENT_ID"), clientSecret = Deno.env.get("MELI_CLIENT_SECRET");
  if (!code || !clientId || !clientSecret) return page("Mercado Livre", "Código ou credenciais ausentes.", 400);
  const body = new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, client_secret: clientSecret, code, redirect_uri: cb("mercadolivre") });
  const response = await fetch("https://api.mercadolibre.com/oauth/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body });
  const token = await response.json();
  if (!response.ok || !token.access_token) return page("Mercado Livre", `Autorização não concluída (${token.error ?? response.status}).`, 400);
  await save("mercadolivre", String(token.user_id ?? "default"), token);
  return page("Mercado Livre conectado", "Autorização concluída. Os tokens foram cifrados e armazenados.");
}

async function shopeeStart() {
  const partnerId = Deno.env.get("SHOPEE_PARTNER_ID"), partnerKey = Deno.env.get("SHOPEE_PARTNER_KEY");
  if (!partnerId || !partnerKey) return page("Shopee", "Backend pronto. Faltam SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY.", 503);
  const path = "/api/v2/shop/auth_partner", timestamp = Math.floor(Date.now() / 1000), sign = await hmacHex(`${partnerId}${path}${timestamp}`, partnerKey), state = await createState("shopee");
  const url = new URL(`https://partner.shopeemobile.com${path}`);
  url.searchParams.set("partner_id", partnerId); url.searchParams.set("timestamp", String(timestamp)); url.searchParams.set("sign", sign);
  url.searchParams.set("redirect", `${cb("shopee")}?state=${encodeURIComponent(state)}`);
  return Response.redirect(url, 302);
}
async function shopeeCallback(url: URL) {
  if (!await validState(url.searchParams.get("state"), "shopee")) return page("Falha de segurança", "State da Shopee inválido ou expirado.", 400);
  const code = url.searchParams.get("code"), shopId = url.searchParams.get("shop_id"), partnerId = Deno.env.get("SHOPEE_PARTNER_ID"), partnerKey = Deno.env.get("SHOPEE_PARTNER_KEY");
  if (!code || !shopId || !partnerId || !partnerKey) return page("Shopee", "Código, shop_id ou credenciais ausentes.", 400);
  const path = "/api/v2/auth/token/get", timestamp = Math.floor(Date.now() / 1000), sign = await hmacHex(`${partnerId}${path}${timestamp}`, partnerKey);
  const endpoint = new URL(`https://partner.shopeemobile.com${path}`);
  endpoint.searchParams.set("partner_id", partnerId); endpoint.searchParams.set("timestamp", String(timestamp)); endpoint.searchParams.set("sign", sign);
  const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code, shop_id: Number(shopId), partner_id: Number(partnerId) }) });
  const token = await response.json();
  if (!response.ok || token.error || !token.access_token) return page("Shopee", `Autorização não concluída (${token.error ?? response.status}).`, 400);
  token.shop_id = shopId; await save("shopee", shopId, token);
  return page("Shopee conectada", "Autorização concluída. Os tokens foram cifrados e armazenados.");
}

async function tiktokStart() {
  const appKey = Deno.env.get("TIKTOK_APP_KEY");
  if (!appKey) return page("TikTok Shop", "Backend pronto. Faltam TIKTOK_APP_KEY e TIKTOK_APP_SECRET.", 503);
  const url = new URL("https://shop.tiktok.com/alliance/creator/auth");
  url.searchParams.set("app_key", appKey); url.searchParams.set("state", await createState("tiktok"));
  return Response.redirect(url, 302);
}
async function tiktokCallback(url: URL) {
  if (!await validState(url.searchParams.get("state"), "tiktok")) return page("Falha de segurança", "State do TikTok Shop inválido ou expirado.", 400);
  const code = url.searchParams.get("code"), appKey = Deno.env.get("TIKTOK_APP_KEY"), appSecret = Deno.env.get("TIKTOK_APP_SECRET");
  if (!code || !appKey || !appSecret) return page("TikTok Shop", "Código ou credenciais ausentes.", 400);
  const endpoint = new URL("https://auth.tiktok-shops.com/api/v2/token/get");
  endpoint.searchParams.set("app_key", appKey); endpoint.searchParams.set("app_secret", appSecret); endpoint.searchParams.set("auth_code", code); endpoint.searchParams.set("grant_type", "authorized_code");
  const response = await fetch(endpoint), payload = await response.json(), token = payload.data ?? payload;
  if (!response.ok || (payload.code && payload.code !== 0) || !token.access_token) return page("TikTok Shop", `Autorização não concluída (${payload.message ?? payload.code ?? response.status}).`, 400);
  await save("tiktok", String(token.open_id ?? "default"), token);
  return page("TikTok Shop conectado", "Autorização concluída. Os tokens foram cifrados e armazenados.");
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url), marker = "/oauth/", index = url.pathname.indexOf(marker);
    const path = (index >= 0 ? url.pathname.slice(index + marker.length) : url.pathname.replace(/^\/+/, "")).replace(/\/+$/g, "");
    if (!path || path === "config") return Response.json({ ok: true, callbacks: { mercadolivre: cb("mercadolivre"), shopee: cb("shopee"), tiktok: cb("tiktok") }, starts: { mercadolivre: `${BASE}/mercadolivre/start`, shopee: `${BASE}/shopee/start`, tiktok: `${BASE}/tiktok/start` } });
    if (path === "mercadolivre/start") return await meliStart();
    if (path === "mercadolivre/callback") return await meliCallback(url);
    if (path === "shopee/start") return await shopeeStart();
    if (path === "shopee/callback") return await shopeeCallback(url);
    if (path === "tiktok/start") return await tiktokStart();
    if (path === "tiktok/callback") return await tiktokCallback(url);
    return new Response("Not found", { status: 404 });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "oauth_error");
    return page("Erro na integração", "Não foi possível concluir esta etapa.", 500);
  }
});

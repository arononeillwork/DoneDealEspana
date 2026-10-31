import { createClient } from './vendor/supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, IMAGE_BUCKET } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Signed-in user + their public profile, kept current by app.js.
export const state = { user: null, profile: null, unread: 0 };

const ok = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------
export async function loadMyProfile() {
  if (!state.user) return (state.profile = null);
  state.profile = ok(await sb.from('profiles').select('*').eq('id', state.user.id).maybeSingle());
  return state.profile;
}
export const getProfile = async (id) =>
  ok(await sb.from('profiles').select('id, display_name, location, bio, items_sold, created_at').eq('id', id).maybeSingle());
export const updateMyProfile = async (patch) => ok(await sb.from('profiles').update(patch).eq('id', state.user.id));

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------
const CARD = 'id, title, price, images, status, location, created_at, category, condition';
const SELLER = 'seller:profiles!listings_seller_id_fkey(id, display_name, location, items_sold, created_at)';

export async function searchListings({ q = '', cat = '', min = '', max = '', sort = 'new', page = 0, size = 24 } = {}) {
  let query = sb.from('listings').select(CARD).in('status', ['active', 'reserved']);
  if (cat) query = query.eq('category', cat);
  if (min !== '' && !Number.isNaN(Number(min))) query = query.gte('price', Number(min));
  if (max !== '' && !Number.isNaN(Number(max))) query = query.lte('price', Number(max));
  // Every word must appear in the title, brand or description.
  const words = q.replace(/[%,()*"\\:]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 6);
  for (const w of words) query = query.or(`title.ilike."%${w}%",brand.ilike."%${w}%",description.ilike."%${w}%"`);
  if (sort === 'price_asc') query = query.order('price', { ascending: true, nullsFirst: false });
  else if (sort === 'price_desc') query = query.order('price', { ascending: false, nullsFirst: false });
  query = query.order('created_at', { ascending: false }).range(page * size, page * size + size - 1);
  return ok(await query);
}

export const getListing = async (id) => ok(await sb.from('listings').select(`*, ${SELLER}`).eq('id', id).maybeSingle());

export const sellerListings = async (sellerId) =>
  ok(await sb.from('listings').select(CARD).eq('seller_id', sellerId).neq('status', 'paused').order('created_at', { ascending: false }).limit(60));

export const myListings = async () =>
  ok(
    await sb
      .from('listings')
      .select(`${CARD}, view_count, favorites_count, sold_at, buyer_id, updated_at, buyer:profiles!listings_buyer_id_fkey(id, display_name)`)
      .eq('seller_id', state.user.id)
      .order('created_at', { ascending: false })
  );

export const myPurchases = async () =>
  ok(
    await sb.from('listings').select(`${CARD}, sold_at, ${SELLER}`).eq('buyer_id', state.user.id).order('sold_at', { ascending: false })
  );

export const createListing = async (row) => ok(await sb.from('listings').insert({ ...row, seller_id: state.user.id }));
export const updateListing = async (id, patch) => ok(await sb.from('listings').update(patch).eq('id', id));
export const deleteListing = async (id) => ok(await sb.from('listings').delete().eq('id', id));
export const registerView = (id) => sb.rpc('register_view', { p_listing: id }).then(() => {}, () => {});

export async function uploadPhoto(listingId, blob) {
  const path = `${state.user.id}/${listingId}-${crypto.randomUUID().slice(0, 8)}.jpg`;
  ok(await sb.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }));
  return path;
}
export async function removePhotos(paths) {
  const mine = paths.filter((p) => p && !p.startsWith('/') && p.startsWith(`${state.user.id}/`));
  if (mine.length) await sb.storage.from(IMAGE_BUCKET).remove(mine);
}

// ---------------------------------------------------------------------------
// Favourites
// ---------------------------------------------------------------------------
export async function isFavorite(listingId) {
  if (!state.user) return false;
  const rows = ok(await sb.from('favorites').select('listing_id').eq('listing_id', listingId).eq('user_id', state.user.id));
  return rows.length > 0;
}
export async function setFavorite(listingId, on) {
  if (on) ok(await sb.from('favorites').insert({ user_id: state.user.id, listing_id: listingId }));
  else ok(await sb.from('favorites').delete().eq('user_id', state.user.id).eq('listing_id', listingId));
}
export async function myFavorites() {
  const rows = ok(
    await sb.from('favorites').select(`created_at, listing:listings(${CARD})`).eq('user_id', state.user.id).order('created_at', { ascending: false })
  );
  return rows.map((r) => r.listing).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Conversations & messages
// ---------------------------------------------------------------------------
export const startConversation = async (listingId) => ok(await sb.rpc('start_conversation', { p_listing: listingId }));

const CONVO = `id, listing_id, buyer_id, seller_id, last_message, last_message_at, created_at,
  listing:listings(id, title, images, price, status, seller_id),
  buyer:profiles!conversations_buyer_id_fkey(id, display_name),
  seller:profiles!conversations_seller_id_fkey(id, display_name)`;

export const myConversations = async () => ok(await sb.from('conversations').select(CONVO).order('last_message_at', { ascending: false }));
export const getConversation = async (id) => ok(await sb.from('conversations').select(CONVO).eq('id', id).maybeSingle());
export const listingConversations = async (listingId) =>
  ok(
    await sb
      .from('conversations')
      .select('id, buyer_id, buyer:profiles!conversations_buyer_id_fkey(id, display_name)')
      .eq('listing_id', listingId)
      .eq('seller_id', state.user.id)
  );

export const getMessages = async (conversationId) =>
  ok(await sb.from('messages').select('id, conversation_id, sender_id, body, created_at, read_at').eq('conversation_id', conversationId).order('created_at').limit(500));

export const sendMessage = async (conversationId, body) =>
  ok(
    await sb
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: state.user.id, body })
      .select('id, conversation_id, sender_id, body, created_at, read_at')
      .single()
  );

export const markRead = (conversationId) => sb.rpc('mark_conversation_read', { p_conversation: conversationId });

// Unread messages for me, grouped by conversation.
export async function unreadByConversation() {
  if (!state.user) return {};
  const rows = ok(await sb.from('messages').select('conversation_id').is('read_at', null).neq('sender_id', state.user.id).limit(1000));
  const out = {};
  for (const r of rows) out[r.conversation_id] = (out[r.conversation_id] ?? 0) + 1;
  return out;
}

// ---------------------------------------------------------------------------
// Sale fee (Stripe Checkout via the "marketplace" edge function)
// ---------------------------------------------------------------------------
async function callServer(body) {
  const { data, error } = await sb.functions.invoke('marketplace', { body });
  if (error) {
    let msg = error.message;
    try {
      const j = await error.context?.json?.();
      if (j?.error) msg = j.error;
    } catch { /* keep generic message */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
export const startSaleCheckout = (listingId, buyerId) => callServer({ action: 'checkout', listing_id: listingId, buyer_id: buyerId || null });
export const confirmSaleFee = (sessionId) => callServer({ action: 'confirm', session_id: sessionId });
export const deleteMyAccount = () => callServer({ action: 'delete_account' });

export const mySaleFees = async () =>
  ok(await sb.from('sale_fees').select('id, listing_id, listing_title, amount_cents, currency, status, created_at, paid_at').eq('seller_id', state.user.id).eq('status', 'paid').order('paid_at', { ascending: false }));

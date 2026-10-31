import { SUPABASE_URL, IMAGE_BUCKET } from './config.js';

// ---------------------------------------------------------------------------
// Safe HTML templating: every interpolated value is escaped unless wrapped in raw().
// ---------------------------------------------------------------------------
class Safe {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
export const raw = (s) => new Safe(String(s));
const part = (v) =>
  v == null || v === false ? '' : v instanceof Safe ? v.s : Array.isArray(v) ? v.map(part).join('') : esc(v);
export function html(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += part(vals[i]) + strings[i + 1];
  return new Safe(out);
}
export function mount(el, tpl) {
  el.innerHTML = tpl instanceof Safe ? tpl.s : esc(tpl);
  return el;
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------------------------------------------------------------------------
// Catalogue data
// ---------------------------------------------------------------------------
export const CATEGORIES = [
  { id: 'motor', label: 'Cars & Motorbikes', icon: '🚗' },
  { id: 'electronics', label: 'Electronics', icon: '📱' },
  { id: 'home', label: 'Home & Garden', icon: '🛋️' },
  { id: 'fashion', label: 'Fashion', icon: '👕' },
  { id: 'sports', label: 'Sports & Leisure', icon: '🚲' },
  { id: 'kids', label: 'Kids & Baby', icon: '🧸' },
  { id: 'business', label: 'Business & Hospitality', icon: '☕' },
  { id: 'diy', label: 'DIY & Tools', icon: '🔧' },
  { id: 'collectibles', label: 'Collectibles & Art', icon: '🎨' },
  { id: 'books', label: 'Books, Music & Film', icon: '📚' },
  { id: 'other', label: 'Everything else', icon: '📦' },
];
export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? 'Other';

export const CONDITIONS = [
  { id: 'new', label: 'New', hint: 'Never used, in its original packaging' },
  { id: 'like_new', label: 'Like new', hint: 'Barely used, no visible wear' },
  { id: 'good', label: 'Good', hint: 'Used, works perfectly, light signs of use' },
  { id: 'fair', label: 'Fair', hint: 'Visible wear, fully working' },
  { id: 'for_parts', label: 'For parts', hint: 'Not working or needs repair' },
];
export const conditionLabel = (id) => CONDITIONS.find((c) => c.id === id)?.label ?? null;

export const PROVINCES = [
  'A Coruña', 'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz', 'Barcelona', 'Bizkaia',
  'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ceuta', 'Ciudad Real', 'Córdoba', 'Cuenca', 'Gipuzkoa',
  'Girona', 'Granada', 'Guadalajara', 'Huelva', 'Huesca', 'Illes Balears', 'Jaén', 'La Rioja', 'Las Palmas', 'León',
  'Lleida', 'Lugo', 'Madrid', 'Málaga', 'Marbella', 'Melilla', 'Murcia', 'Navarra', 'Ourense', 'Palencia',
  'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria', 'Tarragona', 'Teruel',
  'Toledo', 'Valencia', 'Valladolid', 'Zamora', 'Zaragoza',
];

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
const eur0 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
export function fmtPrice(p) {
  if (p == null || p === '') return 'Price on request';
  const n = Number(p);
  return Number.isInteger(n) ? eur0.format(n) : eur2.format(n);
}
export const fmtCents = (c) => eur2.format((c ?? 0) / 100);

export function timeAgo(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const days = Math.floor(s / 86400);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return fmtDate(d);
}
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtMonth = (d) => new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
export const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export function initials(name = '') {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

// Listing photos are either Supabase Storage paths or files shipped with the site under /assets/.
export function imgUrl(path) {
  if (!path) return '';
  if (path.startsWith('/assets/')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

// ---------------------------------------------------------------------------
// Feedback: toasts and modal dialogs
// ---------------------------------------------------------------------------
export function toast(msg, kind = 'info') {
  const wrap = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast toast-${kind}`;
  t.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 300);
  }, kind === 'error' ? 6000 : 3800);
}

export function openModal(tpl, { onClose } = {}) {
  const d = document.createElement('dialog');
  d.className = 'modal';
  mount(d, html`<div class="modal-card">${tpl}</div>`);
  document.body.appendChild(d);
  d.showModal();
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    if (d.open) d.close();
    d.remove();
    onClose?.();
  };
  d.addEventListener('click', (e) => {
    if (e.target === d || e.target.closest('[data-close]')) close();
  });
  d.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  return { el: d, close };
}

export function confirmDialog({ title, body, confirm = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let ok = false;
    const m = openModal(
      html`
        <h2 class="modal-title">${title}</h2>
        <p class="muted">${body}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-close>Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${confirm}</button>
        </div>`,
      { onClose: () => resolve(ok) }
    );
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      ok = true;
      m.close();
    });
  });
}

// Shrink photos in the browser before upload (max 1600px, JPEG) so pages stay fast.
export async function resizeImage(file, max = 1600, quality = 0.85) {
  let bmp;
  try {
    bmp = await createImageBitmap(file);
  } catch {
    throw new Error(`"${file.name}" isn't an image we can read. Try a JPG or PNG.`);
  }
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return new Promise((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error('Could not process that photo.'))), 'image/jpeg', quality)
  );
}

export function friendlyError(e) {
  const m = e?.message || String(e || '');
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Connection problem. Check your internet and try again.';
  if (e?.code === 'email_address_not_authorized' || /address not authorized/i.test(m))
    return "We can't send emails to that address yet while sign-ups are being set up. Please try again soon.";
  if (e?.code === 'over_email_send_rate_limit' || /rate limit/i.test(m)) return 'Too many emails sent just now. Please try again in an hour.';
  if (/JWT|not authenticated|401/i.test(m)) return 'Your session has expired. Please log in again.';
  if (/row-level security|permission denied/i.test(m)) return "You don't have permission to do that.";
  return m || 'Something went wrong.';
}

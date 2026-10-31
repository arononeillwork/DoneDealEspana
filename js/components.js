import { html, raw, imgUrl, fmtPrice, timeAgo, initials, openModal, toast, friendlyError } from './lib.js';
import { state, listingConversations, startSaleCheckout } from './api.js';
import { SALE_FEE_EUR } from './config.js';

export const STATUS = {
  active: { label: 'For sale', cls: 'badge-green' },
  reserved: { label: 'Reserved', cls: 'badge-amber' },
  paused: { label: 'Hidden', cls: 'badge-grey' },
  sold: { label: 'Sold', cls: 'badge-ink' },
};
export const statusBadge = (s) => html`<span class="badge ${STATUS[s]?.cls ?? ''}">${STATUS[s]?.label ?? s}</span>`;

export const photo = (path, alt = '', cls = '') =>
  path
    ? html`<img class="${cls}" src="${imgUrl(path)}" alt="${alt}" loading="lazy" decoding="async">`
    : html`<div class="noimg ${cls}" aria-hidden="true">${raw(ICONS.box)}</div>`;

export const card = (l) => html`
  <a class="card" href="#/item/${l.id}">
    <div class="card-img">
      ${photo(l.images?.[0], '')}
      ${l.status === 'reserved' ? html`<span class="ribbon ribbon-amber">Reserved</span>` : ''}
      ${l.status === 'sold' ? html`<span class="ribbon ribbon-ink">Sold</span>` : ''}
    </div>
    <div class="card-body">
      <div class="card-price">${fmtPrice(l.price)}</div>
      <div class="card-title">${l.title}</div>
      <div class="card-meta">${l.location || 'Spain'} · ${timeAgo(l.created_at)}</div>
    </div>
  </a>`;

export const skeletonCards = (n = 8) =>
  html`${Array.from({ length: n }, () => html`<div class="card skeleton"><div class="card-img"></div><div class="card-body"><div class="sk-line w40"></div><div class="sk-line"></div><div class="sk-line w60"></div></div></div>`)}`;

export const avatar = (name, size = '') => html`<span class="avatar ${size}" aria-hidden="true">${initials(name)}</span>`;

export const empty = (icon, title, body, action = '') => html`
  <div class="empty">
    <div class="empty-icon" aria-hidden="true">${raw(icon)}</div>
    <h3>${title}</h3>
    <p class="muted">${body}</p>
    ${action}
  </div>`;

export function requireLogin(next) {
  if (state.user) return true;
  location.hash = `#/login?next=${encodeURIComponent(next || location.hash.slice(1) || '/')}`;
  return false;
}

// "Mark as sold": the seller pays the fixed sale fee through Stripe Checkout,
// then the server marks the listing sold and adds one to their sold counter.
export async function markSoldFlow(listing) {
  let buyers = [];
  try {
    buyers = await listingConversations(listing.id);
  } catch { /* buyer list is optional */ }
  const m = openModal(html`
    <h2 class="modal-title">Mark as sold</h2>
    <p>Congratulations on the sale of <strong>${listing.title}</strong>.</p>
    <div class="fee-box">
      <div class="fee-amount">€${SALE_FEE_EUR}</div>
      <div>
        <strong>Fixed sale fee</strong>
        <p class="small muted">Paid securely with Stripe. The fee is for using DoneDealEspana only. It is not a payment for the item: you and the buyer settle the item's price between yourselves.</p>
      </div>
    </div>
    <label class="field">
      <span>Who bought it? <span class="muted">(optional)</span></span>
      <select name="buyer">
        <option value="">Someone else / prefer not to say</option>
        ${buyers.map((b) => html`<option value="${b.buyer_id}">${b.buyer?.display_name ?? 'Member'}</option>`)}
      </select>
    </label>
    <p class="small muted">Once paid, the item shows as sold and counts towards your items sold. Sold items can't be put back on sale.</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-primary" data-pay>Pay €${SALE_FEE_EUR} and mark as sold</button>
    </div>`);
  const btn = m.el.querySelector('[data-pay]');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Opening secure checkout…';
    try {
      const r = await startSaleCheckout(listing.id, m.el.querySelector('[name=buyer]').value);
      if (r.status === 'ok' && r.url) {
        location.href = r.url;
        return;
      }
      if (r.status === 'already_sold') {
        m.close();
        toast('This item is already marked as sold.', 'success');
        window.dispatchEvent(new Event('dd:refresh'));
        return;
      }
      if (r.status === 'not_configured') throw new Error('Card payments are still being set up. Please try again soon.');
      throw new Error('Could not start the payment.');
    } catch (e) {
      toast(friendlyError(e), 'error');
      btn.disabled = false;
      btn.textContent = `Pay €${SALE_FEE_EUR} and mark as sold`;
    }
  });
}

// Small inline icon set (stroke icons, 24px grid).
const svg = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const ICONS = {
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  heart: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>'),
  heartFill: svg('<path fill="currentColor" d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>'),
  chat: svg('<path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9.5h8M8 12.5h5"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  home: svg('<path d="M4 11 12 4l8 7v9H4v-9Z"/><path d="M10 20v-5h4v5"/>'),
  box: svg('<path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/>'),
  tag: svg('<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="8.5" r="1.5"/>'),
  eye: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'),
  pin: svg('<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/>'),
  share: svg('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>'),
  shield: svg('<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>'),
  check: svg('<path d="m5 12 4.5 4.5L19 7"/>'),
  back: svg('<path d="M15 5 8 12l7 7"/>'),
  send: svg('<path d="M4 12 20 4l-6 16-3-7-7-1Z"/>'),
  edit: svg('<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>'),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  camera: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4V8Z"/><circle cx="12" cy="13" r="3.5"/>'),
  handshake: svg('<path d="m11 17 2 2a1.4 1.4 0 0 0 2-2"/><path d="m14 14 2.5 2.5a1.4 1.4 0 0 0 2-2l-3-3"/><path d="M21 11.5 17 7.5l-3 1-2-2-3 3 1.5 1.5a1.4 1.4 0 0 0 2 0L14 10"/><path d="m3 11.5 4-4 2 1"/><path d="m7 13 2.5 2.5a1.4 1.4 0 0 0 2-2"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  logout: svg('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>'),
  euro: svg('<path d="M17 6.5A6.5 6.5 0 1 0 17 17.5"/><path d="M4 10h9M4 14h9"/>'),
};

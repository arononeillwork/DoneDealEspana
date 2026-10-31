import { html, raw, mount, $, fmtPrice, fmtDate, fmtCents, timeAgo, toast, friendlyError, confirmDialog } from '../lib.js';
import { state, myListings, myPurchases, mySaleFees, myConversations, unreadByConversation, updateListing, deleteListing, removePhotos, loadMyProfile } from '../api.js';
import { statusBadge, photo, empty, ICONS, markSoldFlow } from '../components.js';
import { SALE_FEE_EUR } from '../config.js';

export const auth = true;

const TABS = [
  { id: 'selling', label: 'For sale' },
  { id: 'sold', label: 'Sold' },
  { id: 'bought', label: 'Purchases' },
  { id: 'fees', label: 'Sale fees' },
];

export async function render(root, { query, isCurrent }) {
  const tab = TABS.some((t) => t.id === query.get('tab')) ? query.get('tab') : 'selling';
  mount(root, html`<section class="container page-pad"><h1>My items</h1><div class="stats skeleton-box short"></div><div class="skeleton-box tall"></div></section>`);

  const [listings, convos, unread] = await Promise.all([
    myListings(),
    myConversations().catch(() => []),
    unreadByConversation().catch(() => ({})),
    loadMyProfile().catch(() => null),
  ]);
  if (!isCurrent()) return;

  const chatsBy = {};
  for (const c of convos) if (c.seller_id === state.user.id) chatsBy[c.listing_id] = (chatsBy[c.listing_id] ?? 0) + 1;
  const selling = listings.filter((l) => l.status !== 'sold');
  const sold = listings.filter((l) => l.status === 'sold');
  const views = listings.reduce((a, l) => a + (l.view_count ?? 0), 0);
  const unreadTotal = Object.values(unread).reduce((a, b) => a + b, 0);

  mount(root, html`
    <section class="container page-pad">
      <div class="page-head">
        <h1>My items</h1>
        <a class="btn btn-primary" href="#/sell">${raw(ICONS.plus)} List an item</a>
      </div>

      <div class="stats">
        <div class="stat stat-hero"><span class="stat-n">${state.profile?.items_sold ?? sold.length}</span><span class="stat-l">${raw(ICONS.handshake)} Items sold</span></div>
        <div class="stat"><span class="stat-n">${selling.filter((l) => l.status !== 'paused').length}</span><span class="stat-l">Listed for sale</span></div>
        <div class="stat"><span class="stat-n">${views}</span><span class="stat-l">Total views</span></div>
        <a class="stat" href="#/messages"><span class="stat-n">${unreadTotal}</span><span class="stat-l">Unread messages</span></a>
      </div>

      <nav class="tabs" role="tablist">
        ${TABS.map((t) => html`<a role="tab" class="tab ${t.id === tab ? 'active' : ''}" aria-selected="${t.id === tab}" href="#/dashboard?tab=${t.id}">${t.label}${t.id === 'selling' ? html` <span class="count">${selling.length}</span>` : t.id === 'sold' ? html` <span class="count">${sold.length}</span>` : ''}</a>`)}
      </nav>
      <div id="tab-body"></div>
    </section>`);

  const body = $('#tab-body', root);

  const row = (l) => html`
    <article class="row-item" data-id="${l.id}">
      <a class="row-thumb" href="#/item/${l.id}">${photo(l.images?.[0], '')}</a>
      <div class="row-main">
        <div class="row-top">${statusBadge(l.status)}<span class="row-price">${fmtPrice(l.price)}</span></div>
        <a class="row-title" href="#/item/${l.id}">${l.title}</a>
        <div class="row-stats small muted">
          <span title="Views">${raw(ICONS.eye)} ${l.view_count ?? 0}</span>
          <span title="Saves">${raw(ICONS.heart)} ${l.favorites_count ?? 0}</span>
          <span title="Chats">${raw(ICONS.chat)} ${chatsBy[l.id] ?? 0}</span>
          <span>${l.status === 'sold' ? `Sold ${fmtDate(l.sold_at)}${l.buyer?.display_name ? ` to ${l.buyer.display_name}` : ''}` : `Listed ${timeAgo(l.created_at)}`}</span>
        </div>
        ${!l.condition || l.price == null ? html`<div class="small warn-text">Missing: ${[!l.condition && 'condition', l.price == null && 'price'].filter(Boolean).join(', ')}</div>` : ''}
      </div>
      <div class="row-actions">
        ${l.status === 'sold'
          ? html`<a class="btn btn-ghost btn-sm" href="#/item/${l.id}">View</a>`
          : html`
            <a class="btn btn-ghost btn-sm" href="#/edit/${l.id}">${raw(ICONS.edit)}<span>Edit</span></a>
            <button class="btn btn-ghost btn-sm" data-act="reserve">${l.status === 'reserved' ? 'Unreserve' : 'Reserve'}</button>
            <button class="btn btn-ghost btn-sm" data-act="pause">${l.status === 'paused' ? 'Show' : 'Hide'}</button>
            <button class="btn btn-primary btn-sm" data-act="sold">Mark sold · €${SALE_FEE_EUR}</button>
            <button class="icon-btn danger" data-act="delete" aria-label="Delete listing">${raw(ICONS.trash)}</button>`}
      </div>
    </article>`;

  if (tab === 'selling') {
    mount(body, selling.length
      ? html`<div class="rows">${selling.map(row)}</div>`
      : empty(ICONS.tag, 'Nothing for sale yet', 'List your first item. It takes a minute and it is free.', html`<a class="btn btn-primary" href="#/sell">List an item</a>`));
  } else if (tab === 'sold') {
    mount(body, sold.length
      ? html`<div class="rows">${sold.map(row)}</div>`
      : empty(ICONS.handshake, 'No sales yet', `When you sell something, mark it as sold (fixed €${SALE_FEE_EUR} fee) and it is counted here and on your profile.`));
  } else if (tab === 'bought') {
    const items = await myPurchases().catch(() => []);
    if (!isCurrent()) return;
    mount(body, items.length
      ? html`<div class="rows">${items.map((l) => html`
          <article class="row-item">
            <a class="row-thumb" href="#/item/${l.id}">${photo(l.images?.[0], '')}</a>
            <div class="row-main">
              <div class="row-top">${statusBadge('sold')}<span class="row-price">${fmtPrice(l.price)}</span></div>
              <a class="row-title" href="#/item/${l.id}">${l.title}</a>
              <div class="small muted">Bought from <a href="#/user/${l.seller?.id}">${l.seller?.display_name ?? 'a member'}</a> · ${fmtDate(l.sold_at)}</div>
            </div>
          </article>`)}</div>`
      : empty(ICONS.box, 'No purchases yet', 'Items a seller marks as sold to you appear here.'));
  } else {
    const fees = await mySaleFees().catch(() => []);
    if (!isCurrent()) return;
    mount(body, fees.length
      ? html`<table class="table">
          <thead><tr><th>Date</th><th>Item</th><th class="num">Fee</th></tr></thead>
          <tbody>${fees.map((f) => html`<tr><td>${fmtDate(f.paid_at)}</td><td>${f.listing_id ? html`<a href="#/item/${f.listing_id}">${f.listing_title ?? 'Item'}</a>` : f.listing_title ?? 'Deleted item'}</td><td class="num">${fmtCents(f.amount_cents)}</td></tr>`)}</tbody>
        </table>
        <p class="small muted">Stripe emails a receipt for each payment to your account email.</p>`
      : empty(ICONS.euro, 'No sale fees paid', `You only pay the fixed €${SALE_FEE_EUR} fee when you mark an item as sold.`));
  }

  body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const l = listings.find((x) => x.id === b.closest('[data-id]').dataset.id);
    if (!l) return;
    const reload = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
    try {
      if (b.dataset.act === 'reserve') {
        await updateListing(l.id, { status: l.status === 'reserved' ? 'active' : 'reserved' });
        toast(l.status === 'reserved' ? 'Back on sale.' : 'Marked as reserved.');
        reload();
      } else if (b.dataset.act === 'pause') {
        await updateListing(l.id, { status: l.status === 'paused' ? 'active' : 'paused' });
        toast(l.status === 'paused' ? 'Listing is visible again.' : 'Listing hidden from buyers.');
        reload();
      } else if (b.dataset.act === 'sold') {
        await markSoldFlow(l);
      } else if (b.dataset.act === 'delete') {
        const yes = await confirmDialog({ title: 'Delete this listing?', body: `“${l.title}” and its photos will be removed. Chats about it are deleted too.`, confirm: 'Delete', danger: true });
        if (!yes) return;
        await deleteListing(l.id);
        await removePhotos(l.images ?? []).catch(() => {});
        toast('Listing deleted.');
        reload();
      }
    } catch (err) {
      toast(friendlyError(err), 'error');
    }
  });

  const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
  window.addEventListener('dd:refresh', refresh);
  return () => window.removeEventListener('dd:refresh', refresh);
}

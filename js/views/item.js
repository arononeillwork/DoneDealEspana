import { html, raw, mount, $, $$, imgUrl, fmtPrice, fmtDate, fmtMonth, timeAgo, categoryLabel, conditionLabel, CONDITIONS, toast, friendlyError, confirmDialog } from '../lib.js';
import { state, getListing, registerView, isFavorite, setFavorite, startConversation, updateListing, deleteListing, removePhotos } from '../api.js';
import { statusBadge, avatar, ICONS, markSoldFlow, requireLogin, photo } from '../components.js';
import { SALE_FEE_EUR } from '../config.js';

export async function render(root, { params: [id], isCurrent }) {
  mount(root, html`<section class="container page-pad"><div class="item-layout"><div class="gallery skeleton-box"></div><div class="panel skeleton-box tall"></div></div></section>`);
  const l = await getListing(id);
  if (!isCurrent()) return;
  if (!l) {
    mount(root, html`<section class="container narrow page-pad"><h1>Item not found</h1><p class="muted">It may have been removed by the seller. <a href="#/">Browse other items</a>.</p></section>`);
    return;
  }
  document.title = `${l.title} · DoneDealEspana`;
  const mine = !!state.user && state.user.id === l.seller_id;
  if (!mine) {
    const key = `dd:viewed:${l.id}`;
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        registerView(l.id);
      }
    } catch {
      registerView(l.id);
    }
  }
  let fav = !mine && state.user ? await isFavorite(l.id).catch(() => false) : false;
  const images = l.images?.length ? l.images : [null];
  const cond = conditionLabel(l.condition);
  const condHint = CONDITIONS.find((c) => c.id === l.condition)?.hint;
  const seller = l.seller;
  const missing = [!l.condition && 'condition', l.price == null && 'price'].filter(Boolean);

  const specValue = (v) =>
    Array.isArray(v) ? html`<ul class="spec-list">${v.map((x) => html`<li>${x}</li>`)}</ul>` : html`${String(v ?? '')}`;

  mount(root, html`
    <section class="container page-pad">
      <nav class="crumbs small"><a href="#/">Home</a> › <a href="#/search?cat=${l.category}">${categoryLabel(l.category)}</a></nav>
      <div class="item-layout">
        <div class="gallery">
          <div class="gallery-main">
            ${photo(images[0], l.title, 'gallery-img')}
            ${l.status === 'reserved' ? html`<span class="ribbon ribbon-amber big">Reserved</span>` : ''}
            ${l.status === 'sold' ? html`<span class="ribbon ribbon-ink big">Sold</span>` : ''}
            ${images.length > 1 ? html`
              <button class="g-nav prev" aria-label="Previous photo">‹</button>
              <button class="g-nav next" aria-label="Next photo">›</button>
              <span class="g-count"><span id="g-i">1</span>/${images.length}</span>` : ''}
          </div>
          ${images.length > 1 ? html`<div class="thumbs">${images.map((p, i) => html`<button class="thumb ${i === 0 ? 'active' : ''}" data-i="${i}" aria-label="Photo ${i + 1}">${photo(p, '')}</button>`)}</div>` : ''}
        </div>

        <aside class="panel">
          <div class="panel-top">
            <div class="price">${fmtPrice(l.price)}</div>
            ${mine ? statusBadge(l.status) : ''}
          </div>
          <h1 class="item-title">${l.title}</h1>
          <div class="chips">
            ${cond ? html`<span class="chip" title="${condHint ?? ''}">${cond}</span>` : html`<span class="chip chip-muted">Condition not specified</span>`}
            <span class="chip">${categoryLabel(l.category)}</span>
            ${l.brand ? html`<span class="chip">${l.brand}</span>` : ''}
          </div>
          <div class="meta-row small muted">
            <span>${raw(ICONS.pin)} ${l.location || 'Spain'}</span>
            <span>${raw(ICONS.clock)} ${timeAgo(l.created_at)}</span>
            <span>${raw(ICONS.eye)} ${l.view_count} views</span>
            <span>${raw(ICONS.heart)} ${l.favorites_count}</span>
          </div>

          ${mine ? html`
            ${missing.length ? html`<div class="note note-amber small">Not filled in yet: <strong>${missing.join(' and ')}</strong>. <a href="#/edit/${l.id}">Edit listing</a></div>` : ''}
            <div class="actions">
              ${l.status !== 'sold' ? html`
                <a class="btn btn-ghost" href="#/edit/${l.id}">${raw(ICONS.edit)} Edit</a>
                <button class="btn btn-ghost" data-act="reserve">${l.status === 'reserved' ? 'Unreserve' : 'Mark reserved'}</button>
                <button class="btn btn-primary" data-act="sold">${raw(ICONS.check)} Mark as sold · €${SALE_FEE_EUR}</button>
                <button class="btn btn-link danger" data-act="delete">${raw(ICONS.trash)} Delete listing</button>`
              : html`<p class="muted">Sold on ${fmtDate(l.sold_at)}. <a href="#/dashboard">Back to My items</a></p>
                <a class="btn btn-ghost" href="#/edit/${l.id}">${raw(ICONS.edit)} Edit details</a>`}
            </div>`
          : html`
            <div class="actions">
              ${l.status === 'sold'
                ? html`<p class="note small">This item has been sold.</p>`
                : html`<button class="btn btn-primary btn-lg" data-act="chat" ${!seller ? 'disabled' : ''}>${raw(ICONS.chat)} Chat with seller</button>`}
              <div class="row-actions">
                <button class="btn btn-ghost fav ${fav ? 'on' : ''}" data-act="fav" aria-pressed="${fav}">${raw(fav ? ICONS.heartFill : ICONS.heart)} <span>${fav ? 'Saved' : 'Save'}</span></button>
                <button class="btn btn-ghost" data-act="share">${raw(ICONS.share)} Share</button>
              </div>
            </div>`}

          <a class="seller-card" href="${seller ? `#/user/${seller.id}` : '#/'}">
            ${avatar(seller?.display_name ?? 'DoneDealEspana', 'lg')}
            <div>
              <strong>${seller?.display_name ?? 'DoneDealEspana'}</strong>
              <div class="small muted">${seller ? `Member since ${fmtMonth(seller.created_at)}` : 'Seller account being set up'}</div>
              <div class="sold-count">${raw(ICONS.handshake)} <b>${seller?.items_sold ?? 0}</b> item${seller?.items_sold === 1 ? '' : 's'} sold</div>
            </div>
          </a>

          <div class="safety small">
            ${raw(ICONS.shield)}
            <p><strong>You deal directly with the seller.</strong> DoneDealEspana is not part of the sale and does not take payments for items. See the item before paying and never share card details in chat. <a href="#/terms">Terms</a></p>
          </div>
        </aside>
      </div>

      <div class="item-details">
        <section>
          <h2>Description</h2>
          <div class="desc">${l.description || 'No description yet.'}</div>
        </section>
        ${l.specifics?.length || !l.condition ? html`
          <section>
            <h2>Item specifics</h2>
            <dl class="specs">
              <div><dt>Condition</dt><dd>${cond ?? html`<span class="muted">Not specified</span>`}</dd></div>
              ${(l.specifics ?? []).map((s) => html`<div><dt>${s.label}</dt><dd>${specValue(s.value)}</dd></div>`)}
            </dl>
          </section>` : ''}
      </div>
    </section>`);

  // Gallery
  let gi = 0;
  const show = (i) => {
    gi = (i + images.length) % images.length;
    const main = $('.gallery-main', root);
    const old = $('.gallery-img', main);
    const tmp = document.createElement('div');
    tmp.innerHTML = photo(images[gi], l.title, 'gallery-img').toString();
    old.replaceWith(tmp.firstElementChild);
    $$('.thumb', root).forEach((t, k) => t.classList.toggle('active', k === gi));
    const c = $('#g-i', root);
    if (c) c.textContent = gi + 1;
  };
  $$('.thumb', root).forEach((t) => t.addEventListener('click', () => show(Number(t.dataset.i))));
  $('.g-nav.prev', root)?.addEventListener('click', () => show(gi - 1));
  $('.g-nav.next', root)?.addEventListener('click', () => show(gi + 1));

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    try {
      if (act === 'chat') {
        if (!requireLogin(`/item/${l.id}`)) return;
        b.disabled = true;
        const convId = await startConversation(l.id);
        location.hash = `#/messages/${convId}`;
      } else if (act === 'fav') {
        if (!requireLogin(`/item/${l.id}`)) return;
        fav = !fav;
        await setFavorite(l.id, fav);
        b.classList.toggle('on', fav);
        b.setAttribute('aria-pressed', fav);
        b.innerHTML = `${fav ? ICONS.heartFill : ICONS.heart} <span>${fav ? 'Saved' : 'Save'}</span>`;
        toast(fav ? 'Saved to your list.' : 'Removed from saved items.');
      } else if (act === 'share') {
        const url = location.href;
        if (navigator.share) await navigator.share({ title: l.title, url }).catch(() => {});
        else {
          await navigator.clipboard.writeText(url);
          toast('Link copied.');
        }
      } else if (act === 'reserve') {
        await updateListing(l.id, { status: l.status === 'reserved' ? 'active' : 'reserved' });
        toast(l.status === 'reserved' ? 'Back on sale.' : 'Marked as reserved.');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else if (act === 'sold') {
        await markSoldFlow(l);
      } else if (act === 'delete') {
        const yes = await confirmDialog({ title: 'Delete this listing?', body: 'The listing, its photos and saves are removed. Chats about it are deleted too.', confirm: 'Delete', danger: true });
        if (!yes) return;
        await deleteListing(l.id);
        await removePhotos(l.images ?? []);
        toast('Listing deleted.');
        location.hash = '#/dashboard';
      }
    } catch (err) {
      b.disabled = false;
      toast(friendlyError(err), 'error');
    }
  });

  const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
  window.addEventListener('dd:refresh', refresh);
  return () => {
    window.removeEventListener('dd:refresh', refresh);
    document.title = 'DoneDealEspana · Buy and sell anything in Spain';
  };
}

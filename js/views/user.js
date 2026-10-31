import { html, raw, mount, fmtMonth } from '../lib.js';
import { state, getProfile, sellerListings } from '../api.js';
import { card, avatar, empty, ICONS } from '../components.js';

export async function render(root, { params: [id], isCurrent }) {
  mount(root, html`<section class="container page-pad"><div class="skeleton-box short"></div></section>`);
  const [p, items] = await Promise.all([getProfile(id), sellerListings(id)]);
  if (!isCurrent()) return;
  if (!p) {
    mount(root, html`<section class="container narrow page-pad"><h1>Member not found</h1><p class="muted"><a href="#/">Back to the homepage</a></p></section>`);
    return;
  }
  const forSale = items.filter((l) => l.status !== 'sold');
  const sold = items.filter((l) => l.status === 'sold');
  mount(root, html`
    <section class="container page-pad">
      <div class="profile-head">
        ${avatar(p.display_name, 'xl')}
        <div>
          <h1>${p.display_name}</h1>
          <p class="muted">${p.location ? html`${raw(ICONS.pin)} ${p.location} · ` : ''}Member since ${fmtMonth(p.created_at)}</p>
          ${p.bio ? html`<p class="bio">${p.bio}</p>` : ''}
        </div>
        <div class="profile-stats">
          <div class="stat stat-hero"><span class="stat-n">${p.items_sold}</span><span class="stat-l">${raw(ICONS.handshake)} Items sold</span></div>
          <div class="stat"><span class="stat-n">${forSale.length}</span><span class="stat-l">For sale</span></div>
        </div>
      </div>
      ${state.user?.id === p.id ? html`<p class="small"><a href="#/account">Edit your profile</a></p>` : ''}

      <h2>For sale</h2>
      ${forSale.length ? html`<div class="grid">${forSale.map(card)}</div>` : empty(ICONS.tag, 'Nothing for sale right now', 'Check back soon.')}
      ${sold.length ? html`<h2>Sold</h2><div class="grid">${sold.map(card)}</div>` : ''}
    </section>`);
}

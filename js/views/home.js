import { html, raw, mount, $, CATEGORIES, categoryLabel, friendlyError } from '../lib.js';
import { searchListings } from '../api.js';
import { card, skeletonCards, empty, ICONS } from '../components.js';
import { SALE_FEE_EUR } from '../config.js';

const PAGE = 24;

export async function render(root, { query, isCurrent }) {
  const q = query.get('q') ?? '';
  const cat = query.get('cat') ?? '';
  const sort = query.get('sort') ?? 'new';
  const min = query.get('min') ?? '';
  const max = query.get('max') ?? '';
  const filtered = !!(q || cat || min || max || sort !== 'new');
  const heading = q ? `Results for “${q}”` : cat ? categoryLabel(cat) : filtered ? 'Search results' : 'Fresh finds';

  const link = (patch) => {
    const p = new URLSearchParams({ q, cat, sort, min, max, ...patch });
    for (const [k, v] of [...p]) if (!v || (k === 'sort' && v === 'new')) p.delete(k);
    const s = p.toString();
    return s ? `#/search?${s}` : '#/';
  };

  mount(root, html`
    ${filtered ? '' : html`
      <section class="hero">
        <div class="container hero-inner">
          <div class="hero-copy">
            <p class="eyebrow">Spain's friendly marketplace</p>
            <h1>Buy and sell <span class="hl">anything</span>, close to home.</h1>
            <p class="lead">List your item for free in under a minute, chat with buyers, and close the deal your way.</p>
            <form class="hero-search" id="hero-search" role="search">
              <span class="hs-icon">${raw(ICONS.search)}</span>
              <input name="q" type="search" placeholder="What are you looking for?" aria-label="Search items" autocomplete="off">
              <button class="btn btn-primary" type="submit">Search</button>
            </form>
            <div class="hero-cta"><a class="btn btn-accent" href="#/sell">${raw(ICONS.camera)} Sell something</a><a class="link-quiet" href="#/how-it-works">How it works →</a></div>
          </div>
          <div class="hero-art" aria-hidden="true">
            <div class="hero-tile t1">${raw(ICONS.tag)}<span>Listed free</span></div>
            <div class="hero-tile t2">${raw(ICONS.chat)}<span>Chat to buyers</span></div>
            <div class="hero-tile t3">${raw(ICONS.handshake)}<span>Done deal</span></div>
          </div>
        </div>
      </section>`}

    <section class="container">
      <nav class="cats" aria-label="Categories">
        <a class="cat ${!cat ? 'active' : ''}" href="${link({ cat: '' })}"><span class="cat-ico">✨</span>All</a>
        ${CATEGORIES.map((c) => html`<a class="cat ${cat === c.id ? 'active' : ''}" href="${link({ cat: c.id })}"><span class="cat-ico">${c.icon}</span>${c.label}</a>`)}
      </nav>

      <div class="results-head">
        <h2>${heading}</h2>
        <form class="filters" id="filters">
          <label class="sr" for="f-min">Minimum price</label>
          <input id="f-min" name="min" type="number" min="0" step="1" inputmode="numeric" placeholder="Min €" value="${min}">
          <label class="sr" for="f-max">Maximum price</label>
          <input id="f-max" name="max" type="number" min="0" step="1" inputmode="numeric" placeholder="Max €" value="${max}">
          <label class="sr" for="f-sort">Sort by</label>
          <select id="f-sort" name="sort">
            <option value="new" ${sort === 'new' ? 'selected' : ''}>Newest</option>
            <option value="price_asc" ${sort === 'price_asc' ? 'selected' : ''}>Price: low to high</option>
            <option value="price_desc" ${sort === 'price_desc' ? 'selected' : ''}>Price: high to low</option>
          </select>
          <button class="btn btn-ghost btn-sm" type="submit">Apply</button>
          ${filtered ? html`<a class="link-quiet small" href="#/">Clear</a>` : ''}
        </form>
      </div>

      <div class="grid" id="grid">${skeletonCards(8)}</div>
      <div class="center"><button class="btn btn-ghost" id="more" hidden>Load more</button></div>
    </section>

    ${filtered ? '' : html`
      <section class="container how" id="how">
        <h2>How DoneDealEspana works</h2>
        <ol class="steps">
          <li><span class="step-n">1</span><h3>List it free</h3><p>Snap a few photos, add a price and a description. Any kind of item is welcome.</p></li>
          <li><span class="step-n">2</span><h3>Chat with buyers</h3><p>Answer questions and agree a price in your private DoneDealEspana inbox.</p></li>
          <li><span class="step-n">3</span><h3>Deal directly</h3><p>Buyer and seller arrange payment and collection or delivery between themselves.</p></li>
          <li><span class="step-n">4</span><h3>Mark it sold</h3><p>A fixed €${SALE_FEE_EUR} fee when you mark an item sold, and it adds to your items-sold count.</p></li>
        </ol>
        <p class="small muted">Every sale is a private agreement between buyer and seller. <a href="#/terms">Read the Terms</a>.</p>
      </section>`}
  `);

  $('#hero-search', root)?.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = new FormData(e.target).get('q').toString().trim();
    if (v) location.hash = link({ q: v });
  });
  $('#filters', root).addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    location.hash = link({ min: f.get('min'), max: f.get('max'), sort: f.get('sort') });
  });

  const grid = $('#grid', root);
  const more = $('#more', root);
  let page = 0;
  async function load() {
    more.disabled = true;
    try {
      const rows = await searchListings({ q, cat, min, max, sort, page, size: PAGE });
      if (!isCurrent()) return;
      if (page === 0) {
        grid.innerHTML = '';
        if (!rows.length) {
          mount(grid, html`<div class="grid-empty">${empty(
            ICONS.search,
            filtered ? 'Nothing matches yet' : 'No items yet',
            filtered ? 'Try different words or remove a filter.' : 'Be the first to list something!',
            html`<a class="btn btn-primary" href="#/sell">List an item</a>`
          )}</div>`);
        }
      }
      grid.insertAdjacentHTML('beforeend', html`${rows.map(card)}`.toString());
      more.hidden = rows.length < PAGE;
      page += 1;
    } catch (e) {
      if (isCurrent()) mount(grid, html`<div class="grid-empty"><p class="error-text">${friendlyError(e)}</p></div>`);
    } finally {
      more.disabled = false;
    }
  }
  more.addEventListener('click', load);
  await load();
}

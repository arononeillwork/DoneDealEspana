import { html, raw, mount, $, $$, imgUrl, CATEGORIES, CONDITIONS, PROVINCES, toast, friendlyError, resizeImage } from '../lib.js';
import { state, getListing, createListing, updateListing, uploadPhoto, removePhotos } from '../api.js';
import { ICONS } from '../components.js';
import { SALE_FEE_EUR, MAX_IMAGES } from '../config.js';

export const auth = true;

export async function render(root, { params: [id], isCurrent }) {
  const editing = !!id;
  let l = null;
  if (editing) {
    l = await getListing(id);
    if (!isCurrent()) return;
    if (!l || l.seller_id !== state.user.id) {
      mount(root, html`<section class="container narrow page-pad"><h1>Listing not found</h1><p class="muted">You can only edit your own listings. <a href="#/dashboard">Go to My items</a>.</p></section>`);
      return;
    }
  }

  const photos = (l?.images ?? []).map((p) => ({ path: p, url: imgUrl(p) }));
  const specs = (l?.specifics ?? []).map((s) => ({ label: s.label, value: Array.isArray(s.value) ? s.value.join('\n') : String(s.value ?? '') }));
  const v = (k, d = '') => l?.[k] ?? d;
  const priceText = l?.price != null ? String(l.price).replace(/\.00$/, '').replace('.', ',') : '';

  mount(root, html`
    <section class="container narrow page-pad">
      <h1>${editing ? 'Edit listing' : 'Sell an item'}</h1>
      <p class="muted">Listing is free. A fixed €${SALE_FEE_EUR} fee applies only when you mark the item as sold.</p>

      <form id="sell" class="form" novalidate>
        <fieldset class="box" id="photo-box">
          <legend>Photos</legend>
          <p class="small muted">Up to ${MAX_IMAGES} photos. The first one is the cover. You can also drag photos here.</p>
          <div class="photo-grid" id="photos"></div>
          <input type="file" id="file" accept="image/*" multiple hidden>
        </fieldset>

        <fieldset class="box">
          <legend>Details</legend>
          <label class="field">
            <span>Title <b class="req">*</b></span>
            <input name="title" required minlength="3" maxlength="120" value="${v('title')}" placeholder="e.g. Road bike, size M, barely used">
            <small class="counter" data-for="title"></small>
          </label>
          <div class="two">
            <label class="field">
              <span>Category <b class="req">*</b></span>
              <select name="category" required>
                <option value="">Choose a category</option>
                ${CATEGORIES.map((c) => html`<option value="${c.id}" ${v('category') === c.id ? 'selected' : ''}>${c.icon} ${c.label}</option>`)}
              </select>
            </label>
            <label class="field">
              <span>Price (€)</span>
              <input name="price" type="text" inputmode="decimal" value="${priceText}" placeholder="Empty = “Price on request”">
            </label>
          </div>
          <div class="two">
            <label class="field">
              <span>Condition</span>
              <select name="condition">
                <option value="">Not specified</option>
                ${CONDITIONS.map((c) => html`<option value="${c.id}" ${v('condition') === c.id ? 'selected' : ''}>${c.label} · ${c.hint}</option>`)}
              </select>
            </label>
            <label class="field">
              <span>Brand</span>
              <input name="brand" maxlength="60" value="${v('brand')}" placeholder="Optional">
            </label>
          </div>
          <label class="field">
            <span>Location</span>
            <input name="location" list="provinces" maxlength="80" value="${editing ? v('location') : state.profile?.location ?? ''}" placeholder="Town or province, e.g. Málaga">
            <datalist id="provinces">${PROVINCES.map((p) => html`<option value="${p}">`)}</datalist>
          </label>
          <label class="field">
            <span>Description</span>
            <textarea name="description" rows="8" maxlength="5000" placeholder="What is it, what condition is it in, why are you selling, collection or delivery options…">${v('description')}</textarea>
            <small class="counter" data-for="description"></small>
          </label>
        </fieldset>

        <fieldset class="box">
          <legend>Item specifics <span class="muted">(optional)</span></legend>
          <p class="small muted">Model, size, colour, dimensions… For a list of features, put one per line.</p>
          <div id="specs" class="specs-edit"></div>
          <button type="button" class="btn btn-ghost btn-sm" id="add-spec">${raw(ICONS.plus)} Add a specific</button>
        </fieldset>

        ${editing ? '' : html`
          <label class="check box">
            <input type="checkbox" name="agree" required>
            <span>I own this item or have the right to sell it, and I understand that any sale is a private agreement between me and the buyer, as set out in the <a href="#/terms" target="_blank">Terms</a>.</span>
          </label>`}

        <p class="error-text" id="form-error" role="alert" hidden></p>
        <div class="form-actions">
          <a class="btn btn-ghost" href="${editing ? `#/item/${l.id}` : '#/'}">Cancel</a>
          <button class="btn btn-primary btn-lg" type="submit" id="submit">${editing ? 'Save changes' : 'Publish listing'}</button>
        </div>
      </form>
    </section>`);

  const form = $('#sell', root);
  const fileInput = $('#file', root);
  const photosEl = $('#photos', root);
  const specsEl = $('#specs', root);
  const errEl = $('#form-error', root);
  const objectUrls = [];

  // ---- Photos --------------------------------------------------------------
  function drawPhotos() {
    mount(photosEl, html`
      ${photos.map((p, i) => html`
        <div class="ph">
          <img src="${p.url}" alt="Photo ${i + 1}">
          ${i === 0 ? html`<span class="ph-cover">Cover</span>` : html`<button type="button" class="ph-btn ph-make" data-cover="${i}">Make cover</button>`}
          <button type="button" class="ph-btn ph-del" data-del="${i}" aria-label="Remove photo ${i + 1}">×</button>
        </div>`)}
      ${photos.length < MAX_IMAGES ? html`<button type="button" class="ph-add" id="ph-add">${raw(ICONS.camera)}<span>${photos.length ? 'Add more' : 'Add photos'}</span></button>` : ''}`);
  }
  async function addFiles(files) {
    const list = [...files].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    const room = MAX_IMAGES - photos.length;
    if (list.length > room) toast(`Only ${MAX_IMAGES} photos per listing. Extra photos were skipped.`);
    for (const f of list.slice(0, room)) {
      try {
        const blob = await resizeImage(f);
        const url = URL.createObjectURL(blob);
        objectUrls.push(url);
        photos.push({ blob, url });
        drawPhotos();
      } catch (e) {
        toast(e.message, 'error');
      }
    }
  }
  photosEl.addEventListener('click', (e) => {
    if (e.target.closest('#ph-add')) return fileInput.click();
    const del = e.target.closest('[data-del]');
    if (del) {
      photos.splice(Number(del.dataset.del), 1);
      return drawPhotos();
    }
    const cov = e.target.closest('[data-cover]');
    if (cov) {
      const [p] = photos.splice(Number(cov.dataset.cover), 1);
      photos.unshift(p);
      drawPhotos();
    }
  });
  fileInput.addEventListener('change', async () => {
    await addFiles(fileInput.files);
    fileInput.value = '';
  });
  const box = $('#photo-box', root);
  box.addEventListener('dragover', (e) => {
    e.preventDefault();
    box.classList.add('drag');
  });
  box.addEventListener('dragleave', () => box.classList.remove('drag'));
  box.addEventListener('drop', (e) => {
    e.preventDefault();
    box.classList.remove('drag');
    addFiles(e.dataTransfer.files);
  });
  drawPhotos();

  // ---- Specifics -----------------------------------------------------------
  const specRow = (s = { label: '', value: '' }) => html`
    <div class="spec-row">
      <input class="spec-label" maxlength="40" placeholder="Name, e.g. Model" value="${s.label}" aria-label="Specific name">
      <textarea class="spec-value" rows="${Math.min(8, Math.max(1, s.value.split('\n').length))}" maxlength="1500" placeholder="Value" aria-label="Specific value">${s.value}</textarea>
      <button type="button" class="icon-btn spec-del" aria-label="Remove">${raw(ICONS.trash)}</button>
    </div>`;
  mount(specsEl, html`${specs.map(specRow)}`);
  $('#add-spec', root).addEventListener('click', () => {
    if ($$('.spec-row', specsEl).length >= 30) return toast('Up to 30 specifics per item.');
    specsEl.insertAdjacentHTML('beforeend', specRow().toString());
    $$('.spec-label', specsEl).at(-1).focus();
  });
  specsEl.addEventListener('click', (e) => e.target.closest('.spec-del')?.closest('.spec-row').remove());
  specsEl.addEventListener('input', (e) => {
    if (e.target.matches('.spec-value')) e.target.rows = Math.min(8, Math.max(1, e.target.value.split('\n').length));
  });
  const readSpecs = () =>
    $$('.spec-row', specsEl)
      .map((r) => {
        const label = $('.spec-label', r).value.trim();
        const lines = $('.spec-value', r).value.split('\n').map((x) => x.trim()).filter(Boolean);
        return label && lines.length ? { label, value: lines.length > 1 ? lines : lines[0] } : null;
      })
      .filter(Boolean);

  // ---- Counters ------------------------------------------------------------
  $$('.counter', root).forEach((c) => {
    const input = form.elements[c.dataset.for];
    const upd = () => (c.textContent = `${input.value.length}/${input.maxLength}`);
    input.addEventListener('input', upd);
    upd();
  });

  // ---- Submit --------------------------------------------------------------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.hidden = true;
    const f = new FormData(form);
    const title = f.get('title').toString().trim();
    const priceRaw = f.get('price').toString().trim().replace(/\s|€/g, '');
    const fail = (msg, field) => {
      errEl.textContent = msg;
      errEl.hidden = false;
      if (field) form.elements[field]?.focus();
      else errEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    if (!editing && !photos.length) return fail('Add at least one photo. Listings with photos sell much faster.');
    if (title.length < 3) return fail('Give your item a title (at least 3 characters).', 'title');
    if (!f.get('category')) return fail('Choose a category.', 'category');
    let price = null;
    if (priceRaw) {
      if (!/^\d{1,8}([.,]\d{1,2})?$/.test(priceRaw)) return fail('Enter the price as a number, e.g. 120 or 120,50.', 'price');
      price = Number(priceRaw.replace(',', '.'));
    }
    if (!editing && !f.get('agree')) return fail('Please confirm you agree to the Terms.');

    const btn = $('#submit', root);
    btn.disabled = true;
    const listingId = l?.id ?? crypto.randomUUID();
    try {
      const paths = [];
      const fresh = photos.filter((p) => p.blob).length;
      let n = 0;
      for (const p of photos) {
        if (p.path) paths.push(p.path);
        else {
          n += 1;
          btn.textContent = `Uploading photo ${n} of ${fresh}…`;
          p.path = await uploadPhoto(listingId, p.blob);
          paths.push(p.path);
        }
      }
      btn.textContent = 'Saving…';
      const row = {
        title,
        description: f.get('description').toString().trim(),
        price,
        category: f.get('category'),
        condition: f.get('condition') || null,
        brand: f.get('brand').toString().trim() || null,
        location: f.get('location').toString().trim() || null,
        specifics: readSpecs(),
        images: paths,
      };
      if (editing) {
        await updateListing(l.id, row);
        await removePhotos((l.images ?? []).filter((p) => !paths.includes(p))).catch(() => {});
        toast('Changes saved.', 'success');
      } else {
        await createListing({ id: listingId, status: 'active', ...row });
        toast('Your item is live!', 'success');
      }
      location.hash = `#/item/${listingId}`;
    } catch (err) {
      fail(friendlyError(err));
      btn.disabled = false;
      btn.textContent = editing ? 'Save changes' : 'Publish listing';
    }
  });

  return () => objectUrls.forEach((u) => URL.revokeObjectURL(u));
}

import { html, mount } from '../lib.js';
import { myFavorites } from '../api.js';
import { card, skeletonCards, empty, ICONS } from '../components.js';

export const auth = true;

export async function render(root, { isCurrent }) {
  mount(root, html`<section class="container page-pad"><h1>Saved items</h1><div class="grid">${skeletonCards(4)}</div></section>`);
  const items = await myFavorites();
  if (!isCurrent()) return;
  mount(root, html`
    <section class="container page-pad">
      <h1>Saved items</h1>
      ${items.length
        ? html`<div class="grid">${items.map(card)}</div>`
        : empty(ICONS.heart, 'Nothing saved yet', 'Tap “Save” on any item to keep an eye on it here.', html`<a class="btn btn-primary" href="#/">Browse items</a>`)}
    </section>`);
}

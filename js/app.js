import { sb, state, loadMyProfile, unreadByConversation, confirmSaleFee } from './api.js';
import { html, raw, mount, $, toast, friendlyError } from './lib.js';
import { ICONS, avatar } from './components.js';
import { SUPABASE_URL } from './config.js';

import * as Home from './views/home.js';
import * as Item from './views/item.js';
import * as Sell from './views/sell.js';
import * as Dashboard from './views/dashboard.js';
import * as Messages from './views/messages.js';
import * as Favorites from './views/favorites.js';
import * as UserPage from './views/user.js';
import * as Account from './views/account.js';
import * as Auth from './views/auth.js';
import * as Legal from './views/legal.js';

const routes = [
  [/^$/, Home],
  [/^search$/, Home],
  [/^item\/([0-9a-f-]{36})$/, Item],
  [/^sell$/, Sell],
  [/^edit\/([0-9a-f-]{36})$/, Sell],
  [/^dashboard$/, Dashboard],
  [/^messages(?:\/([0-9a-f-]{36}))?$/, Messages],
  [/^favorites$/, Favorites],
  [/^user\/([0-9a-f-]{36})$/, UserPage],
  [/^account$/, Account],
  [/^(login|signup|forgot|reset)$/, Auth],
  [/^(terms|privacy|how-it-works)$/, Legal],
];

const view = document.getElementById('view');
let cleanup = null;
let renderSeq = 0;

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs = ''] = h.split('?');
  return { path: path.replace(/\/$/, ''), query: new URLSearchParams(qs) };
}

export async function render() {
  const seq = ++renderSeq;
  const { path, query } = parseHash();
  if (typeof cleanup === 'function') {
    try { cleanup(); } catch { /* ignore */ }
  }
  cleanup = null;
  let match = null;
  let mod = null;
  for (const [re, m] of routes) {
    match = path.match(re);
    if (match) { mod = m; break; }
  }
  document.body.dataset.route = path.split('/')[0] || 'home';
  highlightNav(path);
  if (!mod) {
    mount(view, html`<section class="container narrow page-pad"><h1>Page not found</h1><p class="muted">That page doesn't exist. <a href="#/">Go to the homepage</a>.</p></section>`);
    return;
  }
  if (mod.auth && !state.user) {
    location.replace(`#/login?next=${encodeURIComponent('/' + path + (query.toString() ? '?' + query : ''))}`);
    return;
  }
  // A fresh element per page, so listeners from the previous page are dropped with it.
  const root = document.createElement('div');
  root.className = 'page';
  view.replaceChildren(root);
  try {
    const c = await mod.render(root, { params: match.slice(1), query, path, isCurrent: () => seq === renderSeq });
    if (seq === renderSeq) cleanup = c;
    else if (typeof c === 'function') c();
  } catch (e) {
    console.error(e);
    if (seq === renderSeq) {
      mount(view, html`<section class="container narrow page-pad"><h1>Something went wrong</h1><p class="muted">${friendlyError(e)}</p><button class="btn btn-primary" onclick="location.reload()">Try again</button></section>`);
    }
  }
}

// ---------------------------------------------------------------------------
// Header & mobile tab bar
// ---------------------------------------------------------------------------
function renderHeader() {
  const u = state.user;
  const name = state.profile?.display_name ?? 'Account';
  const badge = state.unread ? html`<span class="dot-badge">${state.unread > 99 ? '99+' : state.unread}</span>` : '';
  mount($('#header-actions'), html`
    ${u
      ? html`
        <a class="icon-btn" href="#/favorites" title="Saved items" data-nav="favorites">${raw(ICONS.heart)}<span class="sr">Saved items</span></a>
        <a class="icon-btn" href="#/messages" title="Messages" data-nav="messages">${raw(ICONS.chat)}${badge}<span class="sr">Messages</span></a>
        <details class="menu">
          <summary class="menu-btn" aria-label="Your account">${avatar(name, 'sm')}<span class="hide-sm">${name}</span></summary>
          <div class="menu-pop">
            <a href="#/dashboard">${raw(ICONS.tag)} My items</a>
            <a href="#/messages">${raw(ICONS.chat)} Messages</a>
            <a href="#/favorites">${raw(ICONS.heart)} Saved items</a>
            <a href="#/user/${u.id}">${raw(ICONS.user)} Public profile</a>
            <a href="#/account">${raw(ICONS.edit)} Account settings</a>
            <button type="button" data-logout>${raw(ICONS.logout)} Log out</button>
          </div>
        </details>`
      : html`<a class="btn btn-ghost btn-sm" href="#/login">Log in</a><a class="btn btn-ghost btn-sm hide-sm" href="#/signup">Sign up</a>`}
    <a class="btn btn-primary btn-sm sell-btn" href="#/sell">${raw(ICONS.plus)}<span>Sell</span></a>`);

  mount($('#tabbar'), html`
    <a href="#/" data-nav="">${raw(ICONS.home)}<span>Home</span></a>
    <a href="#/favorites" data-nav="favorites">${raw(ICONS.heart)}<span>Saved</span></a>
    <a href="#/sell" data-nav="sell" class="tab-sell">${raw(ICONS.plus)}<span>Sell</span></a>
    <a href="#/messages" data-nav="messages">${raw(ICONS.chat)}${badge}<span>Inbox</span></a>
    <a href="${u ? '#/dashboard' : '#/login'}" data-nav="${u ? 'dashboard' : 'login'}">${raw(ICONS.user)}<span>${u ? 'You' : 'Log in'}</span></a>`);
  highlightNav(parseHash().path);
}

function highlightNav(path) {
  const top = path.split('/')[0];
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === top));
  document.querySelectorAll('details.menu[open]').forEach((d) => d.removeAttribute('open'));
}

document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-logout]')) {
    await sb.auth.signOut();
    toast('You are logged out.');
    location.hash = '#/';
  }
  const open = document.querySelector('details.menu[open]');
  if (open && !e.target.closest('details.menu')) open.removeAttribute('open');
});

$('#header-search').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = new FormData(e.target).get('q').toString().trim();
  location.hash = q ? `#/search?q=${encodeURIComponent(q)}` : '#/';
});

// ---------------------------------------------------------------------------
// Unread badge + realtime messages
// ---------------------------------------------------------------------------
let channel = null;
export async function refreshUnread() {
  try {
    const map = await unreadByConversation();
    state.unread = Object.values(map).reduce((a, b) => a + b, 0);
  } catch {
    state.unread = 0;
  }
  renderHeader();
}
window.addEventListener('dd:unread', refreshUnread);

function subscribeMessages() {
  if (channel) sb.removeChannel(channel);
  channel = null;
  if (!state.user) return;
  channel = sb
    .channel('my-messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      window.dispatchEvent(new CustomEvent('dd:message', { detail: payload.new }));
      if (payload.new.sender_id !== state.user?.id) refreshUnread();
    })
    .subscribe();
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function onSession(session) {
  const prev = state.user?.id;
  state.user = session?.user ?? null;
  if (state.user?.id !== prev) {
    try { await loadMyProfile(); } catch { state.profile = null; }
    subscribeMessages();
    await refreshUnread();
    return true;
  }
  return false;
}

async function handleReturnParams() {
  const p = new URLSearchParams(location.search);
  if (!p.toString()) return;
  const clean = () => history.replaceState(null, '', location.pathname + location.hash);
  if (p.get('error_description')) {
    toast(p.get('error_description'), 'error');
    clean();
    return;
  }
  if (p.get('fee') === 'cancelled') {
    toast('Payment cancelled. Your item is still listed.');
    clean();
    return;
  }
  if (p.get('fee') === 'success' && p.get('session_id')) {
    clean();
    if (!state.user) return;
    try {
      const r = await confirmSaleFee(p.get('session_id'));
      if (r.status === 'sold') toast('Payment received. Your item is marked as sold.', 'success');
      else toast('Payment is still processing. Your item will show as sold shortly.');
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
    await loadMyProfile().catch(() => {});
    return;
  }
  if (p.get('reset')) {
    clean();
    location.hash = '#/reset';
    return;
  }
  if (p.get('confirmed') || p.get('code')) {
    clean();
    if (state.user) toast('Your email is confirmed. Welcome to DoneDealEspana!', 'success');
  }
}

async function boot() {
  if (SUPABASE_URL.startsWith('__')) {
    mount(view, html`<section class="container narrow page-pad"><h1>Almost there</h1><p class="muted">The site is not connected to its database yet.</p></section>`);
    return;
  }
  // Old-style auth redirects put tokens or errors in the hash; never let the router see them.
  if (/^#(access_token|error)=/.test(location.hash)) {
    const hp = new URLSearchParams(location.hash.slice(1));
    if (hp.get('error_description')) toast(hp.get('error_description'), 'error');
    history.replaceState(null, '', location.pathname + location.search + '#/');
  }
  const { data } = await sb.auth.getSession();
  await onSession(data.session);
  renderHeader();
  sb.auth.onAuthStateChange((event, session) => {
    setTimeout(async () => {
      if (event === 'PASSWORD_RECOVERY') {
        await onSession(session);
        location.hash = '#/reset';
        return;
      }
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        state.user = session?.user ?? state.user;
        return;
      }
      if (await onSession(session)) render();
    }, 0);
  });
  await handleReturnParams();
  window.addEventListener('hashchange', () => {
    window.scrollTo(0, 0);
    render();
  });
  render();
}

boot();

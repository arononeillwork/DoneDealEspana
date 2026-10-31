import { html, raw, mount, $, fmtPrice, fmtTime, timeAgo, toast, friendlyError } from '../lib.js';
import { state, myConversations, getConversation, getMessages, sendMessage, markRead, unreadByConversation, getListing } from '../api.js';
import { photo, avatar, empty, ICONS, statusBadge, markSoldFlow } from '../components.js';

export const auth = true;

export async function render(root, { params: [convId], isCurrent }) {
  mount(root, html`
    <section class="container page-pad chat-page ${convId ? 'has-convo' : ''}">
      <h1 class="chat-h1">Messages</h1>
      <div class="chat-layout">
        <aside class="convo-list" id="convos" aria-label="Conversations"><div class="skeleton-box tall"></div></aside>
        <div class="convo-pane" id="pane"></div>
      </div>
    </section>`);
  const listEl = $('#convos', root);
  const pane = $('#pane', root);
  const me = state.user.id;
  let onIncoming = null;
  let listTimer = null;
  const other =(c) => (c.buyer_id === me ? c.seller : c.buyer) ?? { display_name: 'Member' };

  async function drawList() {
    const [convos, unread] = await Promise.all([myConversations(), unreadByConversation().catch(() => ({}))]);
    if (!isCurrent()) return [];
    mount(listEl, convos.length
      ? html`${convos.map((c) => html`
          <a class="convo ${c.id === convId ? 'active' : ''}" href="#/messages/${c.id}">
            <span class="convo-thumb">${photo(c.listing?.images?.[0], '')}</span>
            <span class="convo-main">
              <span class="convo-top"><strong>${other(c).display_name}</strong><span class="small muted">${timeAgo(c.last_message_at)}</span></span>
              <span class="convo-item small"><span class="role ${c.seller_id === me ? 'role-sell' : 'role-buy'}">${c.seller_id === me ? 'Selling' : 'Buying'}</span> ${c.listing?.title ?? 'Listing removed'}</span>
              <span class="convo-last small muted">${c.last_message ?? 'No messages yet'}</span>
            </span>
            ${unread[c.id] ? html`<span class="dot-badge static">${unread[c.id]}</span>` : ''}
          </a>`)}`
      : empty(ICONS.chat, 'No messages yet', 'When you contact a seller, or a buyer contacts you, your chats appear here.', html`<a class="btn btn-primary" href="#/">Browse items</a>`));
    return convos;
  }

  const convos = await drawList();
  if (!isCurrent()) return;

  if (!convId) {
    mount(pane, html`<div class="pane-empty">${raw(ICONS.chat)}<p class="muted">${convos.length ? 'Choose a chat to read it.' : 'Your chats will appear here.'}</p></div>`);
  } else {
    const c = convos.find((x) => x.id === convId) ?? (await getConversation(convId));
    if (!isCurrent()) return;
    if (!c) {
      mount(pane, html`<div class="pane-empty"><p class="muted">Chat not found.</p></div>`);
    } else {
      await openConversation(c);
    }
  }

  async function openConversation(c) {
    const them = other(c);
    const iSell = c.seller_id === me;
    const l = c.listing;
    mount(pane, html`
      <header class="pane-head">
        <a class="icon-btn back" href="#/messages" aria-label="All chats">${raw(ICONS.back)}</a>
        ${l ? html`
          <a class="pane-item" href="#/item/${l.id}">
            <span class="pane-thumb">${photo(l.images?.[0], '')}</span>
            <span><strong class="clamp1">${l.title}</strong><span class="small muted">${fmtPrice(l.price)} · ${statusBadge(l.status)}</span></span>
          </a>` : html`<span class="muted">Listing removed</span>`}
        ${iSell && l && l.status !== 'sold' ? html`<button class="btn btn-primary btn-sm" data-act="sold">Mark sold</button>` : ''}
      </header>
      <div class="pane-with small">${avatar(them.display_name, 'sm')} <span>${iSell ? 'Buyer' : 'Seller'}: <a href="#/user/${them.id}">${them.display_name}</a></span></div>
      <div class="safety-banner small">${raw(ICONS.shield)}<span>Agree the deal directly with ${them.display_name}. DoneDealEspana does not handle payments or delivery. See items before paying and never share card details here.</span></div>
      <div class="msgs" id="msgs" aria-live="polite"><div class="skeleton-box"></div></div>
      <form class="composer" id="composer">
        <textarea name="body" rows="1" maxlength="2000" placeholder="Write a message…" aria-label="Message" required></textarea>
        <button class="btn btn-primary send" type="submit" aria-label="Send">${raw(ICONS.send)}</button>
      </form>`);

    const msgsEl = $('#msgs', pane);
    const form = $('#composer', pane);
    const ta = form.elements.body;
    const seen = new Set();
    let lastDay = '';

    const bubble = (m) => {
      const day = new Date(m.created_at).toDateString();
      const sep = day !== lastDay ? html`<div class="day-sep"><span>${new Date(m.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>` : '';
      lastDay = day;
      return html`${sep}<div class="bubble ${m.sender_id === me ? 'me' : 'them'}" data-id="${m.id}"><div class="bubble-text">${m.body}</div><time class="bubble-time">${fmtTime(m.created_at)}</time></div>`;
    };
    const append = (m) => {
      if (seen.has(m.id)) return;
      seen.add(m.id);
      msgsEl.insertAdjacentHTML('beforeend', bubble(m).toString());
      msgsEl.scrollTop = msgsEl.scrollHeight;
    };

    const msgs = await getMessages(c.id);
    if (!isCurrent()) return;
    msgsEl.innerHTML = msgs.length ? '' : html`<p class="pane-hint small muted">Say hello and ask anything about the item.</p>`.toString();
    msgs.forEach(append);
    const lastMine = [...msgs].reverse().find((m) => m.sender_id === me);
    if (lastMine?.read_at && msgs.at(-1)?.id === lastMine.id) msgsEl.insertAdjacentHTML('beforeend', '<div class="seen small muted">Seen</div>');
    await markRead(c.id);
    window.dispatchEvent(new Event('dd:unread'));
    drawList();

    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = ta.value.trim();
      if (!body) return;
      const btn = $('.send', form);
      btn.disabled = true;
      try {
        $('.pane-hint', msgsEl)?.remove();
        $('.seen', msgsEl)?.remove();
        const m = await sendMessage(c.id, body);
        append(m);
        ta.value = '';
        ta.style.height = 'auto';
        drawList();
      } catch (err) {
        toast(friendlyError(err), 'error');
      } finally {
        btn.disabled = false;
        ta.focus();
      }
    });
    $('[data-act=sold]', pane)?.addEventListener('click', async () => {
      try {
        const full = await getListing(l.id);
        if (full) await markSoldFlow(full);
      } catch (err) {
        toast(friendlyError(err), 'error');
      }
    });
    if (window.matchMedia('(min-width: 900px)').matches) ta.focus();

    onIncoming = async (m) => {
      if (m.conversation_id !== c.id) return;
      $('.pane-hint', msgsEl)?.remove();
      append(m);
      if (m.sender_id !== me) {
        await markRead(c.id);
        window.dispatchEvent(new Event('dd:unread'));
      }
    };
  }

  const handler = (e) => {
    onIncoming?.(e.detail);
    clearTimeout(listTimer);
    listTimer = setTimeout(() => isCurrent() && drawList(), 400);
  };
  window.addEventListener('dd:message', handler);
  return () => {
    window.removeEventListener('dd:message', handler);
    clearTimeout(listTimer);
  };
}

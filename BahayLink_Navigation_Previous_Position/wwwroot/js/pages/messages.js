/* Messaging (renter: messages.html, owner: owner-messages.html) — frontend demo, no server */
(function () {
  if (RC.blocked) return;
  const db = RC.db, main = document.getElementById('main');
  const role = document.body.dataset.role || 'renter';
  const me = RC.requireRole(role);
  const other = role === 'renter' ? 'owner' : 'renter';
  const otherOf = c => role === 'renter' ? RC.owner(c.ownerId) : RC.renter(c.renterId);
  const st = { active: RC.qs('c'), q: '' };
  const pageTitle = role === 'renter' ? '<div class="d-flex justify-content-between align-items-end mb-3"><div><h1 class="h2 mb-1">Messages</h1><p class="text-muted mb-0">Your conversations with the property owner.</p></div></div>' : '';

  main.innerHTML = `<div class="${role === 'renter' ? 'container-xxl py-4' : ''}">${pageTitle}
    <div class="rc-chat" id="chat">
      <div class="rc-chat-list">
        <div class="head"><div class="input-icon"><i class="bi bi-search"></i><input class="form-control" id="cSearch" placeholder="Search conversations" aria-label="Search conversations"></div></div>
        <div class="rc-convos" id="convos" role="list"></div>
      </div>
      <section class="rc-chat-pane" id="pane" aria-label="Conversation"></section>
    </div></div>`;
  const chat = document.getElementById('chat');

  function renderList() {
    const q = st.q.toLowerCase();
    const list = RC.convosFor(role, me.id).filter(c => { const u = otherOf(c), p = RC.prop(c.propertyId) || {}; return !q || [RC.fullName(u), p.name, ...c.messages.map(m => m.text)].join(' ').toLowerCase().includes(q); });
    document.getElementById('convos').innerHTML = list.length ? list.map(c => {
      const u = otherOf(c), p = RC.prop(c.propertyId) || { name: 'Removed listing' }, l = RC.lastMsg(c), un = c.unread[role] || 0;
      return `<button class="rc-convo ${c.id === st.active ? 'active' : ''} ${un ? 'unread' : ''}" data-c="${c.id}" role="listitem">${RC.avatar(u)}
        <span class="body"><span class="top"><span class="name">${RC.esc(RC.fullName(u))}</span><span class="time">${l.time ? RC.timeAgo(l.time) : ''}</span></span>
        <span class="prop d-block">${RC.esc(p.name)}</span>
        <span class="d-flex justify-content-between gap-2 align-items-center"><span class="prev">${l.text ? (l.from === role ? 'You: ' : '') + RC.esc(l.text) : 'No messages yet'}</span>${un ? `<span class="rc-unread" aria-label="${un} unread">${un}</span>` : ''}</span></span></button>`;
    }).join('') : `<div class="rc-empty p-4"><i class="bi bi-chat-dots fs-2"></i><h2 class="h6 mt-3">${st.q ? 'No conversations found' : 'No messages yet'}</h2><p class="text-muted small">${st.q ? 'Try another search.' : 'Your conversations with the property owner or interested renters will appear here.'}</p>${role === 'renter' && !st.q ? '<a class="btn btn-primary btn-pill btn-sm" href="browse.html">Browse Rentals</a>' : ''}</div>`;
  }

  function renderPane() {
    const c = db.conversations.find(x => x.id === st.active);
    const pane = document.getElementById('pane');
    if (!c) { pane.innerHTML = `<div class="rc-chat-empty"><div><i class="bi bi-chat-square-text fs-1"></i><h2 class="h5 mt-2">No messages yet</h2><p class="mb-3">Your conversations with the property owner or interested renters will appear here.</p>${role === 'renter' ? '<a href="browse.html" class="btn btn-primary btn-pill">Browse Rentals</a>' : ''}</div></div>`; return; }
    const u = otherOf(c), p = RC.prop(c.propertyId) || { name: 'Removed listing', id: '' }, q = db.inquiries.find(x => x.id === c.inquiryId);
    let lastDay = '';
    const log = c.messages.map(m => {
      const d = RC.date(m.time, { weekday: 'short', month: 'short', day: 'numeric' }), sep = d !== lastDay ? `<div class="rc-day">${d}</div>` : '';
      lastDay = d;
      return sep + `<div class="rc-msg ${m.from === role ? 'me' : 'them'}"><div class="bubble">${RC.esc(m.text)}</div><span class="stamp">${m.from === role ? 'You' : RC.esc(u.firstName)} · ${RC.time(m.time)}</span></div>`;
    }).join('');
    pane.innerHTML = `
      <header class="rc-chat-head">
        <button class="rc-icon-btn rc-chat-back" id="backBtn" aria-label="Back to conversations"><i class="bi bi-arrow-left"></i></button>
        ${RC.avatar(u)}
        <div class="who"><div class="fw-bold">${RC.esc(RC.fullName(u))}</div><div class="small text-muted"><a class="text-muted text-decoration-underline" href="property.html?id=${p.id}">${RC.esc(p.name)}</a>${role === 'owner' && u.phone ? ' · ' + RC.esc(u.phone) : ''}</div></div>
        ${q ? RC.statusBadge(q.status) : ''}
        ${role === 'owner' && q ? `<a class="btn btn-light-soft btn-sm d-none d-sm-inline-flex" href="owner-inquiries.html?id=${q.id}">View inquiry</a>` : ''}
      </header>
      <div class="rc-chat-log" id="log" aria-live="polite">${log || `<div class="rc-chat-empty"><div><i class="bi bi-hand-wave fs-2"></i><p class="mt-2 mb-0">Say hello to ${RC.esc(u.firstName)} and ask about ${RC.esc(p.name)}.</p></div></div>`}</div>
      <form class="rc-chat-input" id="sendForm">
        <label class="visually-hidden" for="msgInput">Message</label>
        <textarea class="form-control" id="msgInput" rows="1" maxlength="2000" placeholder="Write a message…"></textarea>
        <button class="btn btn-primary" type="submit" aria-label="Send message"><i class="bi bi-send-fill"></i></button>
      </form>`;
    const lg = document.getElementById('log'); lg.scrollTop = lg.scrollHeight;
    const ta = document.getElementById('msgInput');
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('sendForm').requestSubmit(); } });
    document.getElementById('sendForm').addEventListener('submit', e => {
      e.preventDefault();
      const text = ta.value.trim(); if (!text) { ta.focus(); return; }
      c.messages.push({ from: role, text, time: RC.nowIso() });
      c.unread[other] = (c.unread[other] || 0) + 1;
      if (role === 'owner' && q && q.status === 'Pending') {
        q.status = 'Ongoing';
        RC.addNotif('renter', 'status', `Your inquiry about ${p.name} is now Ongoing`, 'my-inquiries.html');
      }
      RC.addNotif(other, 'message', `${RC.fullName(me)} sent a message about ${p.name}`, other === 'owner' ? `owner-messages.html?c=${c.id}` : `messages.html?c=${c.id}`);
      RC.save(); renderList(); renderPane(); RC.renderChrome();
      document.getElementById('msgInput').focus();
    });
    document.getElementById('backBtn').addEventListener('click', () => { chat.classList.remove('show-pane'); st.active = null; history.replaceState(null, '', location.pathname); renderList(); });
  }

  function open(id) {
    st.active = id;
    const c = db.conversations.find(x => x.id === id);
    if (c && c.unread[role]) { c.unread[role] = 0; RC.save(); RC.renderChrome(); }
    history.replaceState(null, '', `${location.pathname}?c=${id}`);
    chat.classList.add('show-pane');
    renderList(); renderPane();
  }

  document.getElementById('convos').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) open(b.dataset.c); });
  document.getElementById('cSearch').addEventListener('input', e => { st.q = e.target.value.trim(); renderList(); });

  const first = RC.convosFor(role, me.id)[0];
  if (st.active && db.conversations.some(c => c.id === st.active)) open(st.active);
  else { st.active = window.matchMedia('(min-width: 992px)').matches && first ? first.id : null; if (st.active) open(st.active); else { renderList(); renderPane(); } }
})();

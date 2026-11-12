/* Renter pages: dashboard (renter-dashboard.html) and My Inquiries (my-inquiries.html) */
(function () {
  if (RC.blocked) return;
  const db = RC.db, main = document.getElementById('main');
  const page = document.body.dataset.active;
  const me = RC.requireRole('renter');
  const mine = () => db.inquiries.filter(q => q.renterId === me.id).sort((a, b) => b.date.localeCompare(a.date));
  const convoFor = q => db.conversations.find(c => c.inquiryId === q.id) || db.conversations.find(c => c.propertyId === q.propertyId && c.renterId === q.renterId);

  function inquiryModal(q) {
    const p = RC.prop(q.propertyId) || { name: 'Removed listing', images: [], location: '' }, o = RC.owner(p.ownerId), c = convoFor(q);
    const reply = c && c.messages.find(m => m.from === 'owner');
    RC.modal({ title: 'Inquiry details', body: `
      <div class="d-flex gap-3 mb-3">${RC.img(RC.cover(p), '', 'rounded-3', 'style="width:110px;height:84px;object-fit:cover"')}
        <div class="min-w-0"><div class="fw-bold">${RC.esc(p.name)}</div><div class="small text-muted">${RC.esc(p.location)}</div><div class="mt-1">${RC.statusBadge(q.status)}</div></div></div>
      <div class="small text-muted mb-1">Your message · ${RC.date(q.date)} at ${RC.time(q.date)}</div>
      <div class="p-3 rounded-3 mb-4" style="background:var(--rc-soft)">${RC.esc(q.message)}</div>
      <h3 class="h6 mb-3">Progress</h3>
      <ol class="rc-timeline">
        <li class="done"><div class="fw-semibold">Inquiry sent</div><div class="small text-muted">${RC.date(q.date)}</div></li>
        <li class="${reply ? 'done' : ''}"><div class="fw-semibold">${o ? RC.esc(o.firstName) : 'Owner'} replied</div><div class="small text-muted">${reply ? RC.date(reply.time) : 'Waiting for a reply · usually ' + (o ? o.responseTime : '')}</div></li>
        <li class="${q.status === 'Resolved' ? 'done' : ''}"><div class="fw-semibold">Resolved</div><div class="small text-muted">${q.status === 'Resolved' ? 'Your question has been answered' : 'Marked by the owner once your question is answered'}</div></li>
      </ol>`,
      footer: `<a class="btn btn-light-soft" href="property.html?id=${p.id}">View property</a>${c ? `<a class="btn btn-dark" href="messages.html?c=${c.id}"><i class="bi bi-chat-dots me-1"></i>Open conversation</a>` : ''}` });
  }
  main.addEventListener('click', e => { const v = e.target.closest('[data-view]'); if (v) inquiryModal(db.inquiries.find(q => q.id === v.dataset.view)); });

  /* ---------- dashboard ---------- */
  if (page === 'dashboard') {
    const list = mine(), convos = RC.convosFor('renter', me.id), notifs = RC.notifsFor('renter');
    const unread = RC.unreadCount('renter', me.id), open = list.filter(q => q.status !== 'Resolved').length;
    const h = new Date().getHours(), greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const recommended = db.properties.filter(p => p.available && !p.hidden && !list.some(q => q.propertyId === p.id)).slice(0, 4);
    main.innerHTML = `<div class="container-xxl py-4">
      <section class="rc-panel mb-4 d-flex flex-wrap gap-3 justify-content-between align-items-center" style="background:linear-gradient(120deg,#F3F3F3,#fff 60%)">
        <div class="d-flex gap-3 align-items-center">${RC.avatar(me, 'lg')}<div><h1 class="h3 mb-1">${greet}, ${RC.esc(me.firstName)}</h1>
          <p class="text-muted mb-0">${unread ? `You have ${unread} unread repl${unread === 1 ? 'y' : 'ies'} from owners.` : open ? `${open} of your inquiries ${open === 1 ? 'is' : 'are'} still open.` : 'Find your next home and send an inquiry.'}</p></div></div>
        <a href="browse.html" class="btn btn-dark btn-pill"><i class="bi bi-search me-1"></i>Browse rentals</a></section>
      <div class="row g-3 mb-4">
        ${[['my-inquiries.html', 'bi-envelope-paper', 'ico-coral', list.length, 'Inquiries sent'], ['my-inquiries.html?status=Pending', 'bi-hourglass-split', 'ico-amber', list.filter(q => q.status === 'Pending').length, 'Waiting for reply'],
           ['messages.html', 'bi-chat-dots', 'ico-blue', unread, 'Unread messages'], ['notifications.html', 'bi-bell', 'ico-green', notifs.filter(n => !n.read).length, 'New notifications']]
          .map(([h, i, c, v, l]) => `<div class="col-6 col-lg-3"><a href="${h}" class="rc-stat text-reset"><span class="rc-stat-ico ${c}"><i class="bi ${i}"></i></span><div><div class="rc-stat-val">${v}</div><div class="rc-stat-lab">${l}</div></div></a></div>`).join('')}
      </div>
      <div class="row g-4 mb-4">
        <div class="col-lg-7"><section class="rc-panel h-100"><div class="rc-panel-head"><h2>My Inquiries</h2><a href="my-inquiries.html" class="small fw-semibold text-decoration-underline">See all</a></div>
          ${list.length ? list.slice(0, 4).map(q => { const p = RC.prop(q.propertyId) || {}; return `<button class="rc-list-item w-100 bg-transparent border-0 border-bottom text-start" data-view="${q.id}">${RC.img(RC.cover(p), '', 'rounded-3', 'style="width:56px;height:46px;object-fit:cover"')}
            <div class="flex-grow-1 min-w-0"><div class="rc-li-title">${RC.esc(p.name)}</div><div class="rc-li-sub">${RC.date(q.date)} · ${RC.esc(q.message)}</div></div>${RC.statusBadge(q.status)}</button>`; }).join('')
            : '<p class="text-muted mb-0">No inquiries yet. Open any listing and choose “Send Inquiry”.</p>'}</section></div>
        <div class="col-lg-5"><section class="rc-panel h-100"><div class="rc-panel-head"><h2>My Messages</h2><a href="messages.html" class="small fw-semibold text-decoration-underline">Open inbox</a></div>
          ${convos.length ? convos.slice(0, 4).map(c => { const o = RC.owner(c.ownerId), l = RC.lastMsg(c); return `<a class="rc-list-item" href="messages.html?c=${c.id}">${RC.avatar(o)}<div class="flex-grow-1 min-w-0"><div class="rc-li-title">${RC.esc(RC.fullName(o))}</div><div class="rc-li-sub">${l.text ? (l.from === 'renter' ? 'You: ' : '') + RC.esc(l.text) : 'No messages yet'}</div></div>${c.unread.renter ? `<span class="rc-unread">${c.unread.renter}</span>` : `<small class="text-muted">${l.time ? RC.timeAgo(l.time) : ''}</small>`}</a>`; }).join('')
            : '<p class="text-muted mb-0">Conversations with owners appear here.</p>'}</section></div>
      </div>
      <div class="row g-4 mb-5">
        <div class="col-lg-7"><section class="rc-panel h-100"><div class="rc-panel-head"><h2>Notifications</h2><a href="notifications.html" class="small fw-semibold text-decoration-underline">See all</a></div>
          ${notifs.slice(0, 4).map(n => `<a class="rc-list-item" href="${n.link || '#'}" data-notif="${n.id}"><span class="rc-notif-ico ${n.type}"><i class="bi ${{ inquiry: 'bi-envelope-paper', message: 'bi-chat-dots', status: 'bi-arrow-repeat', system: 'bi-info-lg' }[n.type]}"></i></span><div class="flex-grow-1 min-w-0"><div class="rc-li-title ${n.read ? 'fw-normal' : ''}">${RC.esc(n.text)}</div><div class="rc-li-sub">${RC.timeAgo(n.time)}</div></div>${n.read ? '' : '<span class="rc-dot"></span>'}</a>`).join('') || '<p class="text-muted mb-0">No notifications yet.</p>'}</section></div>
        <div class="col-lg-5"><section class="rc-panel h-100"><div class="rc-panel-head"><h2>Profile Settings</h2></div>
          <div class="d-flex gap-3 align-items-center mb-3">${RC.avatar(me, 'lg')}<div class="min-w-0"><div class="fw-bold">${RC.esc(RC.fullName(me))}</div><div class="small text-muted text-truncate">${RC.esc(me.email)}</div><div class="small text-muted">${RC.esc(me.phone || 'No phone number added')}</div></div></div>
          <a href="profile.html" class="btn btn-outline-dark btn-pill btn-sm">Edit profile</a></section></div>
      </div>
      ${recommended.length ? `<h2 class="h4 mb-4">Recommended for you</h2><div class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-4">${recommended.map(RC.propertyCard).join('')}</div>` : ''}
    </div>`;
    return;
  }

  /* ---------- My Inquiries ---------- */
  const st = { status: RC.qs('status') || '', q: '' };
  main.innerHTML = `<div class="container-xxl py-4">
    <div class="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4"><div><h1 class="h2 mb-1">My Inquiries</h1><p class="text-muted mb-0">Track every question you’ve sent to the property owner.</p></div>
      <a href="browse.html" class="btn btn-dark btn-pill"><i class="bi bi-plus-lg me-1"></i>New inquiry</a></div>
    <div class="d-flex flex-wrap gap-3 justify-content-between align-items-center mb-4">
      <div class="rc-tabs" id="tabs" role="group" aria-label="Filter by status"></div>
      <div class="input-icon" style="min-width:min(280px,100%)"><i class="bi bi-search"></i><input class="form-control" id="iqSearch" placeholder="Search by property or message" aria-label="Search inquiries"></div></div>
    <div id="iqList" class="d-grid gap-3" aria-live="polite"></div></div>`;
  function render() {
    const list = mine(), q = st.q.toLowerCase();
    document.getElementById('tabs').innerHTML = ['', 'Pending', 'Ongoing', 'Resolved'].map(s => `<button class="rc-chip ${st.status === s ? 'active' : ''}" data-status="${s}" aria-pressed="${st.status === s}">${s || 'All'} <span class="count num">${s ? list.filter(x => x.status === s).length : list.length}</span></button>`).join('');
    const shown = list.filter(x => (!st.status || x.status === st.status) && (!q || ((RC.prop(x.propertyId) || {}).name + ' ' + x.message).toLowerCase().includes(q)));
    document.getElementById('iqList').innerHTML = shown.length ? shown.map(x => {
      const p = RC.prop(x.propertyId) || { name: 'Removed listing', images: [], location: '' }, c = convoFor(x);
      return `<article class="rc-inq">${RC.img(RC.cover(p), p.name)}
        <div class="rc-inq-body"><div class="d-flex justify-content-between gap-2 flex-wrap"><h2 class="h6 mb-0">${RC.esc(p.name)}</h2>${RC.statusBadge(x.status)}</div>
          <div class="small text-muted"><i class="bi bi-geo-alt"></i> ${RC.esc(p.location)} · Sent ${RC.date(x.date)}</div>
          <p class="mb-2 text-truncate">${RC.esc(x.message)}</p>
          <div class="d-flex gap-2 flex-wrap mt-auto"><button class="btn btn-dark btn-sm btn-pill" data-view="${x.id}">View Details</button>
            ${c ? `<a class="btn btn-light-soft btn-sm btn-pill" href="messages.html?c=${c.id}"><i class="bi bi-chat-dots me-1"></i>Messages${c.unread.renter ? ` <span class="rc-unread d-inline-grid ms-1">${c.unread.renter}</span>` : ''}</a>` : ''}</div></div></article>`;
    }).join('') : `<div class="rc-empty"><i class="bi bi-envelope-open"></i><h2 class="h5 mt-3">${list.length ? 'No inquiries match' : 'No inquiries yet'}</h2><p class="text-muted">${list.length ? 'Try another status or search term.' : 'Once you inquire about a rental property, your inquiries will appear here.'}</p><a href="browse.html" class="btn btn-dark btn-pill">Browse rentals</a></div>`;
  }
  main.addEventListener('click', e => { const t = e.target.closest('[data-status]'); if (t) { st.status = t.dataset.status; render(); } });
  document.getElementById('iqSearch').addEventListener('input', e => { st.q = e.target.value.trim(); render(); });
  render();
})();

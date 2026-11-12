/* =========================================================
   BahayLink — shared layout: navbar, footer, dashboard
   sidebar/topbar, notifications and account menus.
   The menus shown depend on the signed-in account's role
   (from RC.Auth). There is no way to pick a role manually.
   In ASP.NET Core MVC these become Views/Shared/_Layout.cshtml,
   _DashboardLayout.cshtml and partials (_Navbar, _Sidebar, ...).
   Pages declare their layout on <body>:
     data-layout="public|dashboard|auth" data-active="<key>" data-title="<page title>" data-role="<required role>"
   ========================================================= */
(function (RC) {
  const body = document.body;
  const layout = body.dataset.layout || 'public';
  const active = body.dataset.active || '';
  function logo() {
    const me = RC.me();
    const href = (me && me.role === 'owner') ? 'owner-dashboard.html' : 'index.html';
    return `<a class="rc-logo" href="${href}" aria-label="BahayLink home">
    <svg class="rc-logo-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 3.5 13.2V29h9.2v-8.6h6.6V29h9.2V13.2z" fill="#222222"/><circle cx="16" cy="14.5" r="2.6" fill="#fff"/></svg>
    <span>BahayLink</span></a>`;
  }
  function footerLogo() {
    return `<span class="rc-logo rc-logo-static" aria-label="BahayLink">
    <svg class="rc-logo-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 3.5 13.2V29h9.2v-8.6h6.6V29h9.2V13.2z" fill="#222222"/><circle cx="16" cy="14.5" r="2.6" fill="#fff"/></svg>
    <span>BahayLink</span></span>`;
  }

  /* ---------- menus per role ---------- */
  const NAV = {
    guest: [['index.html', 'home', 'Home'], ['browse.html', 'browse', 'Browse Rentals'], ['about.html', 'about', 'About']],
    renter: [['index.html', 'home', 'Home'], ['browse.html', 'browse', 'Browse Rentals'], ['messages.html', 'messages', 'Messages']],
    owner: [['owner-dashboard.html', 'dashboard', 'Dashboard'], ['owner-properties.html', 'properties', 'My Properties'], ['owner-inquiries.html', 'inquiries', 'Inquiries'], ['owner-messages.html', 'messages', 'Messages'], ['admin-users.html', 'users', 'Manage Users'], ['admin-activity.html', 'activity', 'System Activity']]
  };
  const PROFILE = { renter: 'profile.html', owner: 'owner-settings.html' };
  const NOTIF_PAGE = { renter: 'notifications.html', owner: 'owner-notifications.html' };

  /* ---------- notifications dropdown ---------- */
  const NICON = { inquiry: 'bi-envelope-paper', message: 'bi-chat-dots', status: 'bi-arrow-repeat', system: 'bi-info-lg' };
  function bell(role) {
    const list = RC.notifsFor(role), un = list.filter(n => !n.read).length;
    return `<div class="dropdown rc-bell">
      <button class="rc-icon-btn" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false" aria-label="Notifications${un ? `, ${un} unread` : ''}">
        <i class="bi bi-bell"></i>${un ? `<span class="rc-count num">${un}</span>` : ''}</button>
      <div class="dropdown-menu dropdown-menu-end rc-notif-menu">
        <div class="rc-notif-head"><strong>Notifications</strong>${un ? '<button class="btn btn-link btn-sm p-0 text-dark fw-semibold" data-notif-all>Mark all as read</button>' : '<span class="text-muted small">All caught up</span>'}</div>
        <div class="rc-notif-list">${list.length ? list.slice(0, 8).map(n => `
          <button class="rc-notif-item ${n.read ? '' : 'unread'}" data-notif="${n.id}">
            <span class="rc-notif-ico ${n.type}"><i class="bi ${NICON[n.type]}"></i></span>
            <span class="flex-grow-1"><span class="rc-notif-text d-block">${RC.esc(n.text)}</span><span class="rc-notif-time">${RC.timeAgo(n.time)}</span></span>
            ${n.read ? '' : '<span class="rc-dot" aria-label="Unread"></span>'}</button>`).join('')
          : '<p class="text-muted p-3 mb-0">No notifications yet.</p>'}</div>
        <a class="d-block text-center p-3 fw-semibold border-top" href="${NOTIF_PAGE[role]}">See all notifications</a>
      </div></div>`;
  }
  document.addEventListener('click', e => {
    const all = e.target.closest('[data-notif-all]');
    const one = e.target.closest('[data-notif]');
    if (!all && !one) return;
    const me = RC.me(); if (!me) return;
    if (all) { RC.notifsFor(me.role).forEach(n => n.read = true); RC.save(); RC.renderChrome(); RC.toast('All notifications marked as read'); return; }
    const n = RC.db.notifications.find(x => x.id === one.dataset.notif);
    if (n) { n.read = true; RC.save(); if (n.link) location.href = n.link; else RC.renderChrome(); }
  });

  /* ---------- account menu (dashboard topbar) ---------- */
  function accountMenu(me) {
    const items = [
      ...(PROFILE[me.role] ? [[PROFILE[me.role], 'Profile']] : []),
      '-',
      ['#logout', 'Logout']
    ];
    return `<div class="dropdown">
      <button class="rc-profile-btn" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Account menu"><i class="bi bi-list fs-5"></i>${RC.avatar(me, 'sm')}</button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li class="px-3 py-2"><div class="fw-bold">${RC.esc(RC.fullName(me))}</div><div class="small text-muted">${RC.roleName(me.role)}</div></li><li><hr class="dropdown-divider"></li>
        ${items.map(i => i === '-' ? '<li><hr class="dropdown-divider"></li>' : `<li><a class="dropdown-item" href="${i[0]}" ${i[0] === '#logout' ? 'data-logout' : ''}>${i[1]}</a></li>`).join('')}
      </ul></div>`;
  }
  document.addEventListener('click', async e => {
    if (!e.target.closest('[data-logout]')) return;
    e.preventDefault(); await RC.signOut(); location.href = 'login.html?out=1';
  });

  /* ---------- public navbar + footer ---------- */
  function navbar() {
    const me = RC.me(), role = me ? me.role : 'guest';
    const unread = me && me.role !== 'admin' ? RC.unreadCount(me.role, me.id) : 0;
    const link = ([href, key, label]) => {
      const on = active === key;
      const badge = key === 'messages' && unread ? ` <span class="badge rounded-pill num" style="background:var(--rc-primary)">${unread}</span>` : '';
      return `<li class="nav-item"><a class="nav-link ${on ? 'active' : ''}" ${on ? 'aria-current="page"' : ''} href="${href}">${label}${badge}</a></li>`;
    };
    const right = !me
      ? `<a class="btn btn-link text-dark fw-semibold" href="login.html">Login</a><a class="btn btn-primary btn-pill" href="signup.html">Sign Up</a>`
      : `<span class="${role === 'owner' ? 'd-none d-xxl-inline' : 'd-none d-lg-inline'}">${bell(role)}</span>
         ${PROFILE[role] ? `<a class="rc-profile-btn text-reset" href="${PROFILE[role]}" aria-label="Profile">${RC.avatar(me, 'sm')}<span class="fw-semibold pe-2">Profile</span></a>` : ''}
         <a class="btn btn-logout btn-pill" href="#logout" data-logout><i class="bi bi-box-arrow-right me-1"></i>Logout</a>`;
    return `<nav class="navbar ${role === 'owner' ? 'navbar-expand-xxl rc-owner-navbar' : 'navbar-expand-lg'} rc-navbar" aria-label="Main"><div class="${role === 'owner' ? 'container-fluid px-3 px-xxl-4' : 'container-xxl'}">
      ${logo()}
      <div class="d-flex align-items-center gap-1 ${role === 'owner' ? 'd-xxl-none' : 'd-lg-none'} ms-auto">${me ? bell(role) : ''}
        <button class="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#rcNav" aria-controls="rcNav" aria-expanded="false" aria-label="Open menu"><i class="bi bi-list fs-2"></i></button></div>
      <div class="collapse navbar-collapse" id="rcNav">
        <ul class="navbar-nav mx-auto gap-lg-1">${NAV[role].map(link).join('')}</ul>
        <div class="d-flex align-items-center gap-2 rc-navbar-account-actions">${right}</div>
      </div></div></nav>`;
  }
  function footer() {
    return `<footer class="rc-footer no-print"><div class="container-xxl">
      <div class="row g-4">
        <div class="col-lg-5">${footerLogo()}<p class="mt-3 text-muted" style="max-width:36ch">Find rental homes across the Philippines and talk directly with the property owner — before any agreement is made.</p></div>
        <div class="col-6 col-md-4 col-lg-3 offset-lg-1"><h6>Explore</h6><ul class="list-unstyled">
          <li><a href="browse.html">Browse rentals</a></li><li><a href="browse.html?type=House">Houses</a></li><li><a href="browse.html?type=Apartment">Apartments</a></li><li><a href="browse.html?type=Room">Rooms</a></li></ul></div>
        <div class="col-6 col-md-4 col-lg-3"><h6>Company</h6><ul class="list-unstyled text-muted">
          <li><a href="about.html">About BahayLink</a></li>
          <li><a href="about.html#how">How it works</a></li></ul></div>
      </div>
      <div class="rc-footer-bottom d-flex flex-wrap justify-content-between gap-2 small">
        <span>© 2026 BahayLink · Web-Based House Rental Inquiry and Communication Management System</span>
        <span class="d-flex gap-3"><a href="#" data-policy="privacy">Privacy</a><a href="#" data-policy="terms">Terms</a></span>
      </div></div></footer>`;
  }

  /* ---------- dashboard sidebar + topbar ---------- */
  const SIDE = {
    owner: [
      ['Manage', [
        ['dashboard', 'owner-dashboard.html', 'bi-grid-1x2', 'Dashboard'],
        ['properties', 'owner-properties.html', 'bi-houses', 'My Properties'],
        ['add', 'owner-property-form.html', 'bi-plus-square', 'Add Property'],
        ['inquiries', 'owner-inquiries.html', 'bi-envelope-paper', 'Inquiries', 'pending'],
        ['messages', 'owner-messages.html', 'bi-chat-dots', 'Messages', 'unread']
      ]],
      ['Insights', [
        ['reports', 'owner-reports.html', 'bi-bar-chart-line', 'Reports']
      ]],
      ['Administration', [
        ['users', 'admin-users.html', 'bi-people', 'Manage Users'],
        ['activity', 'admin-activity.html', 'bi-activity', 'System Activity']
      ]]
    ]
  };
  function sidebar(role, me) {
    const counts = {
      pending: role === 'owner' ? RC.ownerInquiries(me.id).filter(q => q.status === 'Pending').length : 0,
      unread: role === 'owner' ? RC.unreadCount('owner', me.id) : 0,
      notif: RC.notifsFor(role).filter(n => !n.read).length
    };
    const groups = SIDE[role].map(([label, links]) => `<div class="rc-side-label">${label}</div>` + links.map(([k, href, ic, text, c]) =>
      `<a class="rc-side-link ${active === k ? 'active' : ''}" href="${href}" ${active === k ? 'aria-current="page"' : ''}><i class="bi ${ic}"></i>${text}${c && counts[c] ? `<span class="badge num">${counts[c]}</span>` : ''}</a>`).join('')).join('');
    return `<div class="offcanvas-header d-lg-none border-bottom">${logo()}<button type="button" class="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#rcSidebar" aria-label="Close menu"></button></div>
      <div class="offcanvas-body">
        <div class="d-none d-lg-block px-2 mb-2">${logo()}</div>
        <nav aria-label="Dashboard">${groups}</nav>
      </div>`;
  }
  function topbar(role, me) {
    return `<button class="rc-icon-btn d-lg-none" data-bs-toggle="offcanvas" data-bs-target="#rcSidebar" aria-controls="rcSidebar" aria-label="Open menu"><i class="bi bi-list fs-4"></i></button>
      <h1>${RC.esc(body.dataset.title || '')}</h1>
      ${bell(role)}${accountMenu(me)}`;
  }

  /* ---------- mount ---------- */
  RC.renderChrome = function () {
    const me = RC.me();
    const nav = document.getElementById('rc-nav'), side = document.getElementById('rcSidebar'), top = document.getElementById('rcTopbar');
    if (layout === 'public' && nav) nav.innerHTML = navbar();
    else if (layout === 'dashboard' && side && top && me) { side.innerHTML = sidebar(body.dataset.role, me); top.innerHTML = topbar(body.dataset.role, me); }
  };

  const main = document.getElementById('main');
  body.insertBefore(Object.assign(document.createElement('a'), { className: 'skip-link', href: '#main', textContent: 'Skip to content' }), body.firstChild);
  if (layout === 'public') {
    const me = RC.me();
    if (me && me.role === 'owner') {
      location.replace('owner-dashboard.html');
      return;
    }
    if (body.dataset.role && !RC.requireRole(body.dataset.role)) { main.innerHTML = ''; return; }
    const nav = document.createElement('div'); nav.id = 'rc-nav';
    body.insertBefore(nav, main);
    const f = document.createElement('div'); f.innerHTML = footer(); main.after(f.firstElementChild);
  } else if (layout === 'dashboard') {
    if (!RC.requireRole(body.dataset.role)) { main.innerHTML = ''; return; }
    const shell = document.createElement('div'); shell.className = 'rc-shell';
    shell.innerHTML = `<aside class="rc-sidebar offcanvas-lg offcanvas-start" tabindex="-1" id="rcSidebar" aria-label="Sidebar"></aside><div class="rc-main"><header class="rc-topbar" id="rcTopbar"></header></div>`;
    body.insertBefore(shell, main);
    main.classList.add('rc-content'); shell.querySelector('.rc-main').appendChild(main);
  }
  RC.renderChrome();
  if (RC.qs('denied')) setTimeout(() => RC.toast('That page isn’t available for your account.', 'info'), 300);
})(window.RC);

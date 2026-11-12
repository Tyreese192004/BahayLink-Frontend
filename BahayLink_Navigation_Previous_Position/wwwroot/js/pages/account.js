/* Shared account pages for renters and owners:
   notifications.html / owner-notifications.html  (data-active="notifications")
   profile.html / owner-settings.html             (data-active="settings")      */
(function () {
  if (RC.blocked) return;
  const db = RC.db, main = document.getElementById('main');
  const role = document.body.dataset.role || 'renter';
  const me = RC.requireRole(role);
  const wrap = html => role === 'renter' ? `<div class="container-xxl py-4" style="max-width:960px">${html}</div>` : html;
  const ICON = { inquiry: 'bi-envelope-paper', message: 'bi-chat-dots', status: 'bi-arrow-repeat', system: 'bi-info-lg' };

  if (document.body.dataset.active === 'notifications') {
    let tab = 'all';
    function render() {
      const list = RC.notifsFor(role), un = list.filter(n => !n.read).length, shown = tab === 'unread' ? list.filter(n => !n.read) : list;
      main.innerHTML = wrap(`
        ${role === 'renter' ? '<h1 class="h2 mb-1">Notifications</h1><p class="text-muted mb-4">Replies from owners and updates to your inquiries.</p>' : ''}
        <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-3">
          <div class="rc-tabs"><button class="rc-chip ${tab === 'all' ? 'active' : ''}" data-tab="all">All <span class="count num">${list.length}</span></button><button class="rc-chip ${tab === 'unread' ? 'active' : ''}" data-tab="unread">Unread <span class="count num">${un}</span></button></div>
          <button class="btn btn-light-soft btn-sm" data-all ${un ? '' : 'disabled'}><i class="bi bi-check2-all me-1"></i>Mark all as read</button></div>
        <div class="rc-table-wrap">${shown.length ? shown.map(n => `
          <div class="rc-notif-item ${n.read ? '' : 'unread'}">
            <span class="rc-notif-ico ${n.type}"><i class="bi ${ICON[n.type]}"></i></span>
            <a class="flex-grow-1 text-reset min-w-0" href="${n.link || '#'}" data-go="${n.id}"><span class="rc-notif-text d-block">${RC.esc(n.text)}</span><span class="rc-notif-time">${RC.date(n.time)} · ${RC.time(n.time)}</span></a>
            ${n.read ? '<span class="small text-muted">Read</span>' : `<button class="btn btn-sm btn-link text-dark text-nowrap" data-read="${n.id}">Mark as read</button>`}
          </div>`).join('') : `<div class="rc-empty bg-white py-5"><i class="bi bi-bell fs-1 text-muted"></i><h2 class="h5 mt-3">You're all caught up!</h2><p class="text-muted mb-0">No notifications yet. Updates about your rental inquiries and messages will appear here.</p></div>`}</div>`);
    }
    main.addEventListener('click', e => {
      const t = e.target.closest('[data-tab]'), r = e.target.closest('[data-read]'), g = e.target.closest('[data-go]');
      if (t) { tab = t.dataset.tab; render(); }
      else if (e.target.closest('[data-all]')) { RC.notifsFor(role).forEach(n => n.read = true); RC.save(); render(); RC.renderChrome(); RC.toast('All notifications marked as read'); }
      else if (r) { db.notifications.find(n => n.id === r.dataset.read).read = true; RC.save(); render(); RC.renderChrome(); }
      else if (g) { const n = db.notifications.find(x => x.id === g.dataset.go); n.read = true; RC.save(); }
    });
    render();
    return;
  }

  /* ---------- profile / settings ---------- */
  db.prefs = db.prefs || {};
  const prefs = db.prefs[me.id] = Object.assign({ newInquiry: true, newMessage: true, status: true, weekly: role === 'owner', sms: false }, db.prefs[me.id]);
  const prefRows = (role === 'owner'
    ? [['newInquiry', 'New inquiries', 'When a renter sends an inquiry about one of your properties'], ['newMessage', 'New messages', 'When a renter replies in a conversation'], ['weekly', 'Weekly summary', 'A short report of inquiries every Monday']]
    : [['newMessage', 'Owner replies', 'When an owner replies to your inquiry'], ['status', 'Inquiry status changes', 'When an inquiry moves to Ongoing or Resolved']])
    .concat([['sms', 'SMS alerts', 'Text messages to your phone number (available after launch)']]);
  main.innerHTML = wrap(`
    ${role === 'renter' ? '<h1 class="h2 mb-1">Profile Settings</h1><p class="text-muted mb-4">Manage your personal details, password and notifications.</p>' : ''}
    <div class="row g-4">
      <div class="col-lg-4"><section class="rc-panel text-center">${RC.avatar(me, 'xl')}<h2 class="h5 mt-3 mb-0" id="pName">${RC.esc(RC.fullName(me))}</h2><div class="text-muted small">${RC.roleName(role)} · member since ${RC.date(me.since, { month: 'long', year: 'numeric' })}</div>
        <p class="rc-demo-note mt-3 mb-0 justify-content-center"><i class="bi bi-info-circle"></i>Photo upload comes with the backend.</p></section></div>
      <div class="col-lg-8 d-grid gap-4">
        <section class="rc-panel"><h2 class="h5 mb-3">Personal information</h2>
          <form id="infoForm" class="row g-3" novalidate>
            <div class="col-sm-6 rc-field"><label class="form-label" for="aFirst">First name</label><input class="form-control" id="aFirst" value="${RC.esc(me.firstName)}"><div class="invalid-feedback"></div></div>
            <div class="col-sm-6 rc-field"><label class="form-label" for="aLast">Last name</label><input class="form-control" id="aLast" value="${RC.esc(me.lastName)}"><div class="invalid-feedback"></div></div>
            <div class="col-sm-6 rc-field"><label class="form-label" for="aEmail">Email</label><input class="form-control" id="aEmail" type="email" value="${RC.esc(me.email)}"><div class="invalid-feedback"></div></div>
            <div class="col-sm-6 rc-field"><label class="form-label" for="aPhone">Phone</label><input class="form-control" id="aPhone" type="tel" value="${RC.esc(me.phone || '')}" placeholder="0917 555 0142"><div class="invalid-feedback"></div></div>
            <div class="col-sm-6"><label class="form-label" for="aCity">City</label><input class="form-control" id="aCity" value="${RC.esc(me.city || '')}"></div>
            ${role === 'owner' ? `<div class="col-sm-6"><label class="form-label" for="aResp">Typical response time</label><input class="form-control" id="aResp" value="within a day" readonly aria-readonly="true"></div>` : ''}
            <div class="col-12"><button class="btn btn-dark" type="submit">Save changes</button></div>
          </form></section>
        <section class="rc-panel"><h2 class="h5 mb-3">Change password</h2>
          <form id="pwForm" class="row g-3" novalidate>
            ${[['pwCur', 'Current password', 'current-password'], ['pwNew', 'New password', 'new-password'], ['pwCon', 'Confirm new password', 'new-password']].map(([id, l, ac]) => `<div class="col-md-4 rc-field"><label class="form-label" for="${id}">${l}</label><div class="position-relative"><input class="form-control pe-5" id="${id}" type="password" autocomplete="${ac}"><button type="button" class="pw-toggle" aria-label="Show password"><i class="bi bi-eye"></i></button></div><div class="invalid-feedback"></div></div>`).join('')}
            <div class="col-12"><button class="btn btn-dark" type="submit">Update password</button> <span class="rc-demo-note ms-2"><i class="bi bi-info-circle"></i>Demo — passwords aren’t stored.</span></div>
          </form></section>
        <section class="rc-panel"><h2 class="h5 mb-3">Notification preferences</h2>
          ${prefRows.map(([k, t, d]) => `<div class="d-flex justify-content-between align-items-center gap-3 py-2 border-bottom"><div><label class="fw-semibold" for="pref-${k}">${t}</label><div class="small text-muted">${d}</div></div><div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" role="switch" id="pref-${k}" data-pref="${k}" ${prefs[k] ? 'checked' : ''}></div></div>`).join('')}
        </section>
      </div></div>`);

  const $ = id => document.getElementById(id);
  $('infoForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = $('aEmail').value.trim(), phone = $('aPhone').value.trim();
    const ok = [RC.setInvalid($('aFirst'), $('aFirst').value.trim() ? '' : 'Enter your first name.'), RC.setInvalid($('aLast'), $('aLast').value.trim() ? '' : 'Enter your last name.'),
      RC.setInvalid($('aEmail'), RC.isEmail(email) ? '' : 'Enter a valid email address.'), RC.setInvalid($('aPhone'), !phone || /^[0-9+\-\s()]{7,}$/.test(phone) ? '' : 'Use digits only, like 0917 555 0142.')].every(Boolean);
    if (!ok) return;
    const u = RC.user(me.id);
    Object.assign(u, { firstName: $('aFirst').value.trim(), lastName: $('aLast').value.trim(), email, phone, city: $('aCity').value.trim() });
    if (role === 'owner') u.responseTime = 'within a day';
    RC.save(); $('pName').textContent = RC.fullName(u); RC.renderChrome(); RC.toast('Profile saved');
  });
  $('pwForm').addEventListener('submit', e => {
    e.preventDefault();
    const n = $('pwNew').value;
    const ok = [RC.setInvalid($('pwCur'), $('pwCur').value.length >= 6 ? '' : 'Enter your current password.'),
      RC.setInvalid($('pwNew'), n.length < 8 ? 'Use at least 8 characters.' : RC.passwordScore(n) < 2 ? 'Add a number or symbol.' : ''),
      RC.setInvalid($('pwCon'), $('pwCon').value === n && n ? '' : 'Passwords don’t match.')].every(Boolean);
    if (!ok) return;
    e.target.reset(); RC.toast('Password updated (demo)');
  });
  main.addEventListener('change', e => { const k = e.target.dataset.pref; if (k) { prefs[k] = e.target.checked; RC.save(); RC.toast('Preference saved'); } });
})();

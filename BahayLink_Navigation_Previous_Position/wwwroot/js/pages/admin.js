/* Admin interface: overview, user management, property listings, system activity (Connected to Backend API) */
(function () {
  if (RC.blocked) return;
  const db = RC.db, main = document.getElementById('main'), page = document.body.dataset.active, me = RC.me();
  db.userStatus = db.userStatus || {};

  const API_BASE = (location.port === '5115') ? '' : 'http://localhost:5115';
  let serverUsers = null;

  async function loadServerUsers() {
    try {
      const res = await fetch(`${API_BASE}/api/users`);
      if (res.ok) {
        serverUsers = await res.json();
      }
    } catch (e) {
      console.warn('API /api/users unreachable, using local state:', e);
    }
  }

  // Combine server users if available, otherwise fallback to local renters.
  // Excludes Admin accounts (RoleId === 1 or Maria Santos) from Manage Users.
  const users = () => {
    if (serverUsers && Array.isArray(serverUsers)) {
      return serverUsers
        .filter(u => u.roleId !== 1 && u.email !== 'admin@bahaylink.ph' && u.email !== 'admin@gmail.com')
        .map(u => ({
          u: {
            id: u.userId,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            phone: u.phone,
            city: u.city,
            since: u.createdAt,
            lastActiveAt: u.lastActiveAt,
            status: u.status,
            isDeleted: u.isDeleted
          },
          role: u.roleName || (u.roleId === 2 ? 'Property Owner' : 'Renter')
        }))
        .sort((a, b) => (b.u.since || '').localeCompare(a.u.since || ''));
    }

    return (db.renters || [])
      .map(u => ({ u, role: 'Renter' }))
      .sort((a, b) => (b.u.since || '').localeCompare(a.u.since || ''));
  };

  const ACT = { inquiry: ['bi-envelope-paper', 'ico-coral'], message: ['bi-chat-dots', 'ico-blue'], listing: ['bi-houses', 'ico-ink'], status: ['bi-arrow-repeat', 'ico-green'], user: ['bi-person', 'ico-violet'] };
  const actRow = a => `<div class="rc-list-item"><span class="rc-stat-ico ${ACT[a.type][1]}" style="width:36px;height:36px;font-size:1rem"><i class="bi ${ACT[a.type][0]}"></i></span><div class="flex-grow-1 min-w-0"><div class="rc-li-title fw-normal"><strong>${RC.esc(a.actor)}</strong> ${RC.esc(a.text)}</div><div class="rc-li-sub">${RC.date(a.time)} · ${RC.time(a.time)}</div></div></div>`;

  const userStatusOf = u => {
    if (!u) return 'Active';
    if (u.isDeleted || u.status === 'Deleted') return 'Deleted';
    if (u.status === 'Locked') return 'Locked';
    if (u.status === 'Archived') return 'Archived';
    if (u.status === 'Active') return 'Active';
    return RC.userStatus(u.id);
  };

  const statusBadge = u => {
    const status = userStatusOf(u);
    const css = status === 'Active' ? 'resolved' : status === 'Deleted' ? 'danger' : 'muted';
    const icon = status === 'Locked' ? '<i class="bi bi-lock-fill" aria-hidden="true"></i> ' : '';
    return `<span class="rc-badge ${css}">${icon}${RC.esc(status)}</span>`;
  };

  const lastActiveText = u => {
    const t = Date.parse(u.lastActiveAt || '');
    if (!Number.isFinite(t)) return 'Never recorded';
    const elapsed = Math.max(0, Date.now() - t);
    if (elapsed < 60000) return 'Just now';
    const format = new Intl.RelativeTimeFormat('en', { numeric: 'always' });
    const steps = [['minute', 60000, 60], ['hour', 3600000, 24], ['day', 86400000, 30], ['month', 2592000000, 12]];
    for (const [unit, ms, max] of steps) if (elapsed < ms * max) return format.format(-Math.floor(elapsed / ms), unit);
    return format.format(-Math.floor(elapsed / 31536000000), 'year');
  };

  const lastActiveTitle = u => {
    const t = Date.parse(u.lastActiveAt || '');
    return Number.isFinite(t) ? new Date(t).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'No activity recorded yet';
  };

  const maskEmail = email => {
    const e = String(email || '').trim();
    const at = e.indexOf('@');
    if (at <= 0) return '—';
    const local = e.slice(0, at);
    const domain = e.slice(at);
    if (local.length <= 2) return local.charAt(0) + '*'.repeat(Math.max(1, local.length - 1)) + domain;
    return local.slice(0, 2) + '*'.repeat(Math.max(4, local.length - 2)) + domain;
  };

  const maskPhone = phone => {
    const raw = String(phone || '').trim();
    if (!raw) return '—';
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 4) return '*'.repeat(digits.length || 4);
    const last4 = digits.slice(-4);
    return '*******' + last4;
  };

  // Connected lifecycle: updates live database via API, with local fallback
  const updateStatus = async (id, action) => {
    const all = users();
    const item = all.find(x => String(x.u.id) === String(id));
    if (!item) return false;
    const u = item.u;
    const status = userStatusOf(u);

    const changes = {
      lock:      { allowed: ['Active'], target: 'Locked', title: 'Lock account?', text: 'This account will be moved to Archive and cannot sign in until unlocked.', button: 'Lock account' },
      archive:   { allowed: ['Active'], target: 'Archived', title: 'Archive account?', text: 'Archive this inactive account and prevent sign-in until it is restored?', button: 'Archive account' },
      unlock:    { allowed: ['Locked'], target: 'Active', title: 'Unlock account?', text: 'Return this account to Active Users and allow sign-in again.', button: 'Unlock account' },
      restore:   { allowed: ['Archived', 'Deleted'], target: 'Active', title: 'Restore account?', text: 'Return this account to Active Users and allow sign-in again.', button: 'Restore account' },
      delete:    { allowed: ['Active', 'Locked', 'Archived'], target: 'Deleted', title: 'Move to Recently Deleted?', text: 'The account will be moved to Recently Deleted (temporary delete) and cannot sign in. You can restore it anytime.', button: 'Delete account' }
    };

    const op = changes[action];
    if (!op || !op.allowed.includes(status)) return false;
    if (!await RC.confirm({ title: op.title, text: `${RC.fullName(u)}: ${op.text}`, confirm: op.button, danger: action === 'delete' || action === 'lock' })) return false;

    try {
      if (action === 'delete') {
        // Soft-delete via API
        await fetch(`${API_BASE}/api/users/${id}`, { method: 'DELETE' });
      } else if (action === 'restore') {
        // Restore via API
        await fetch(`${API_BASE}/api/users/${id}/restore`, { method: 'POST' });
      } else if (action === 'lock' || action === 'archive' || action === 'unlock') {
        // Update status via API
        await fetch(`${API_BASE}/api/users/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: op.target })
        });
      }
      await loadServerUsers();
    } catch (err) {
      console.warn('API update failed, updating local state:', err);
      db.userStatus[id] = op.target;
      RC.save();
    }

    RC.log('user', RC.fullName(me), `${({ lock: 'locked', archive: 'archived', unlock: 'unlocked', restore: 'restored', delete: 'moved' })[action]} ${RC.fullName(u)} ${action === 'delete' ? 'to Recently Deleted' : action === 'lock' ? 'to Archive' : ''}`.trim());
    RC.toast(`${RC.fullName(u)} is now ${op.target.toLowerCase()}.`);
    return true;
  };

  const permanentlyDelete = async id => {
    const all = users();
    const item = all.find(x => String(x.u.id) === String(id));
    if (!item) return false;
    const u = item.u;
    if (userStatusOf(u) !== 'Deleted') return false;

    if (!await RC.confirm({ title: 'Permanently delete this account?', text: `Permanently delete ${RC.fullName(u)}? The account will be permanently removed from the database and cannot be restored.`, confirm: 'Delete permanently', danger: true })) return false;

    try {
      await fetch(`${API_BASE}/api/users/${id}/permanent`, { method: 'DELETE' });
      await loadServerUsers();
    } catch (err) {
      console.warn('API permanent delete failed, removing locally:', err);
      db.renters = (db.renters || []).filter(x => String(x.id) !== String(id));
      delete db.userStatus[id];
      RC.save();
    }

    RC.log('user', RC.fullName(me), 'permanently deleted an account from the database');
    RC.toast('Account permanently deleted.');
    return true;
  };

  /* ---------- overview ---------- */
  if (page === 'dashboard') {
    (async () => {
      await loadServerUsers();
      const month = RC.nowIso().slice(0, 7), inqMonth = (db.inquiries || []).filter(q => q.date && q.date.startsWith(month)).length;
      const msgs = (db.conversations || []).reduce((n, c) => n + (c.messages ? c.messages.length : 0), 0);
      const userList = users();
      const totalRenters = userList.filter(({ u }) => userStatusOf(u) !== 'Deleted').length;

      main.innerHTML = `
        <div class="row g-3 mb-4">
          ${[['admin-users.html', 'bi-people', 'ico-coral', totalRenters + (db.owners || []).length, 'Total users'], ['admin-users.html', 'bi-person', 'ico-blue', totalRenters, 'Renters'],
             ['admin-users.html', 'bi-house-gear', 'ico-violet', (db.owners || []).length, 'Property Owners'], ['admin-listings.html', 'bi-houses', 'ico-ink', (db.properties || []).length, 'Listings'],
             ['admin-activity.html?type=inquiry', 'bi-envelope-paper', 'ico-amber', inqMonth, 'Inquiries this month'], ['admin-activity.html?type=message', 'bi-chat-dots', 'ico-green', msgs, 'Messages stored']]
            .map(([h, i, c, v, l]) => `<div class="col-6 col-md-4 col-xl-2"><a href="${h}" class="rc-stat text-reset flex-column"><span class="rc-stat-ico ${c}"><i class="bi ${i}"></i></span><div><div class="rc-stat-val">${v}</div><div class="rc-stat-lab">${l}</div></div></a></div>`).join('')}
        </div>
        <div class="row g-4 mb-4">
          <div class="col-xl-8"><section class="rc-panel h-100"><div class="rc-panel-head"><h3>Platform activity</h3><span class="small text-muted">Inquiries per month</span></div><div class="rc-chart-box"><canvas id="aChart" role="img" aria-label="Inquiries per month across the platform"></canvas></div></section></div>
          <div class="col-xl-4"><section class="rc-panel h-100"><div class="rc-panel-head"><h3>System activity</h3><a href="admin-activity.html" class="small fw-semibold text-decoration-underline">View all</a></div>${(db.activity || []).slice(0, 5).map(actRow).join('') || '<div class="rc-empty py-4"><i class="bi bi-activity fs-2"></i><p class="text-muted mb-0 mt-2">No activity yet.</p></div>'}</section></div>
        </div>
        <section class="rc-table-wrap"><div class="rc-panel-head p-3 px-4 mb-0 border-bottom"><h3>Newest users</h3><a href="admin-users.html" class="small fw-semibold text-decoration-underline">Manage users</a></div>
          <div class="table-responsive"><table class="table rc-table"><thead><tr><th>User</th><th>Role</th><th>Joined</th><th>Status</th></tr></thead><tbody>
          ${userList.filter(({ u }) => userStatusOf(u) === 'Active').slice(0, 5).map(({ u, role }) => `<tr><td><div class="d-flex gap-2 align-items-center">${RC.avatar(u, 'sm')}<div><div class="fw-semibold">${RC.esc(RC.fullName(u))}</div><div class="small text-muted">${RC.esc(maskEmail(u.email))}</div></div></div></td><td>${role}</td><td>${u.since ? RC.date(u.since) : '—'}</td><td>${statusBadge(u)}</td></tr>`).join('') || '<tr><td colspan="4" class="text-center text-muted py-4">No active users yet.</td></tr>'}
          </tbody></table></div></section>`;
    })();
    return;
  }

  /* ---------- users (Manage Users) ---------- */
  if (page === 'users') {
    const st = { tab: ['active', 'archive', 'deleted'].includes(RC.qs('tab')) ? RC.qs('tab') : 'active', q: '', status: '', lastActiveSort: 'desc' };
    const tabFor = status => status === 'Deleted' ? 'deleted' : ['Locked', 'Archived'].includes(status) ? 'archive' : 'active';

    main.innerHTML = `
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div class="d-flex gap-2 flex-wrap" id="userTabs" role="group" aria-label="Account categories"></div>
      </div>
      <div class="rc-panel mb-4"><div class="row g-3 align-items-end">
        <div class="col-md-6"><label class="form-label" for="uSearch">Search</label><div class="input-icon"><i class="bi bi-search"></i><input class="form-control" id="uSearch" placeholder="Name or email"></div></div>
        <div class="col-6 col-md-4"><label class="form-label" for="uStatus">Status</label><select class="form-select" id="uStatus"><option value="">All statuses</option><option>Active</option><option>Locked</option><option>Archived</option><option>Deleted</option></select></div>
      </div></div>
      <div class="small text-muted mb-3" id="uHint" role="status"></div>
      <div class="rc-table-wrap"><div class="table-responsive"><table class="table rc-table rc-users-table"><thead><tr>
        <th>User</th><th>Role</th><th>Phone</th><th>Joined</th><th>Status</th>
        <th id="uLastActiveHeader" aria-sort="descending"><button type="button" class="rc-sort-heading" id="uLastActiveSort" aria-label="Sort by last active">Last Active <i class="bi bi-arrow-down-up" aria-hidden="true"></i></button></th>
        <th class="text-end">Actions</th></tr></thead><tbody id="uBody"></tbody></table></div></div>`;

    const render = () => {
      const all = users();
      const counts = { active: 0, archive: 0, deleted: 0 };
      all.forEach(({ u }) => {
        const t = tabFor(userStatusOf(u));
        if (counts[t] !== undefined) counts[t]++;
      });

      document.getElementById('userTabs').innerHTML = [['active', 'Active Users'], ['archive', 'Archive'], ['deleted', 'Recently Deleted']]
        .map(([key, label]) => `<button type="button" class="rc-chip ${st.tab === key ? 'active' : ''}" data-user-tab="${key}" aria-pressed="${st.tab === key}">${label} <span class="count">${counts[key]}</span></button>`).join('');

      document.getElementById('uHint').textContent = st.tab === 'archive'
        ? 'Locked and archived accounts cannot sign in. Use the pencil icon to unlock or restore them.'
        : st.tab === 'deleted'
        ? 'Use the pencil icon to restore an account, or the trash icon to delete it permanently from the database.'
        : 'Use the pencil icon to view, lock, or archive a user; use the trash icon to move them to Recently Deleted (temporary delete).';

      const q = st.q.toLowerCase();
      const rows = all.filter(({ u }) => {
        const status = userStatusOf(u);
        return tabFor(status) === st.tab && (!st.status || status === st.status) && (!q || (RC.fullName(u) + ' ' + (u.email || '')).toLowerCase().includes(q));
      }).sort((x, y) => {
        const ax = Date.parse(x.u.lastActiveAt || ''), ay = Date.parse(y.u.lastActiveAt || '');
        if (!Number.isFinite(ax)) return Number.isFinite(ay) ? 1 : 0;
        if (!Number.isFinite(ay)) return -1;
        return st.lastActiveSort === 'desc' ? ay - ax : ax - ay;
      });

      const sort = document.getElementById('uLastActiveSort');
      document.getElementById('uLastActiveHeader').setAttribute('aria-sort', st.lastActiveSort === 'desc' ? 'descending' : 'ascending');
      if (sort && sort.querySelector('i')) {
        sort.querySelector('i').className = 'bi ' + (st.lastActiveSort === 'desc' ? 'bi-sort-down' : 'bi-sort-up');
      }

      document.getElementById('uBody').innerHTML = rows.map(({ u, role }) => {
        const status = userStatusOf(u);
        const isRecentlyDeleted = (status === 'Deleted');
        const trashTitle = isRecentlyDeleted ? 'Delete permanently from database' : 'Move to Recently Deleted (Temporary delete)';
        const trashAria = isRecentlyDeleted ? 'Permanently delete' : 'Temporary delete';

        const actions = `<button type="button" class="rc-user-icon" data-uedit="${RC.esc(u.id)}" aria-label="Manage ${RC.esc(RC.fullName(u))}" title="View or manage account"><i class="bi bi-pencil-square" aria-hidden="true"></i></button>` +
          `<button type="button" class="rc-user-icon rc-user-icon-danger" data-udelete="${RC.esc(u.id)}" aria-label="${trashAria} ${RC.esc(RC.fullName(u))}" title="${trashTitle}"><i class="bi bi-trash3" aria-hidden="true"></i></button>`;

        return `<tr>
        <td><div class="d-flex gap-2 align-items-center">${RC.avatar(u, 'sm')}<div><div class="fw-semibold">${RC.esc(RC.fullName(u))}</div><div class="small text-muted">${RC.esc(maskEmail(u.email))}</div></div></div></td>
        <td>${role}</td><td class="num text-nowrap">${RC.esc(maskPhone(u.phone))}</td><td class="text-nowrap">${u.since ? RC.date(u.since) : '—'}</td><td>${statusBadge(u)}</td>
        <td class="text-nowrap small" title="${RC.esc(lastActiveTitle(u))}">${RC.esc(lastActiveText(u))}</td>
        <td class="text-end"><div class="rc-user-icon-actions">${actions}</div></td></tr>`;
      }).join('') || '<tr><td colspan="7" class="text-center text-muted py-5">No accounts found in this section.</td></tr>';
    };

    const showEditor = u => {
      const status = userStatusOf(u);
      const ops = status === 'Active' ? [
        ['lock', 'Lock account', 'bi-lock'], ['archive', 'Archive account', 'bi-archive']
      ] : status === 'Locked' ? [
        ['unlock', 'Unlock account', 'bi-unlock']
      ] : [
        ['restore', 'Restore account to Active', 'bi-arrow-counterclockwise']
      ];

      const m = RC.modal({
        title: 'Manage user account',
        body: `
        <div class="d-flex gap-3 align-items-center mb-3">${RC.avatar(u, 'lg')}<div><div class="fw-bold fs-5">${RC.esc(RC.fullName(u))}</div><div class="small text-muted">${RC.esc(u.email)}</div>${statusBadge(u)}</div></div>
        <dl class="row small mb-3">
          <dt class="col-4">Email</dt><dd class="col-8">${RC.esc(maskEmail(u.email))}</dd>
          <dt class="col-4">Phone</dt><dd class="col-8">${RC.esc(maskPhone(u.phone))}</dd>
          <dt class="col-4">City</dt><dd class="col-8">${RC.esc(u.city || '—')}</dd>
          <dt class="col-4">Joined</dt><dd class="col-8">${u.since ? RC.date(u.since) : '—'}</dd>
          <dt class="col-4">Last Active</dt><dd class="col-8">${RC.esc(lastActiveText(u))}</dd>
          <dt class="col-4">Account Status</dt><dd class="col-8"><strong>${RC.esc(status)}</strong></dd>
        </dl>
        <div class="border-top pt-3">
          <div class="small fw-semibold mb-2">Account actions</div>
          <div class="d-grid gap-2">
            ${ops.map(([op, label, icon]) => `<button type="button" class="btn btn-outline-dark text-start" data-edit-op="${op}"><i class="bi ${icon} me-2" aria-hidden="true"></i>${label}</button>`).join('')}
          </div>
        </div>`
      });

      m.el.addEventListener('click', e => {
        const button = e.target.closest('[data-edit-op]');
        if (!button) return;
        const action = button.dataset.editOp;
        m.el.addEventListener('hidden.bs.modal', async () => {
          if (await updateStatus(u.id, action)) {
            st.status = '';
            document.getElementById('uStatus').value = '';
            render();
          }
        }, { once: true });
        m.close();
      });
    };

    document.getElementById('uSearch').addEventListener('input', e => { st.q = e.target.value.trim(); render(); });
    document.getElementById('uLastActiveSort').addEventListener('click', () => { st.lastActiveSort = st.lastActiveSort === 'desc' ? 'asc' : 'desc'; render(); });
    document.getElementById('uStatus').addEventListener('change', e => {
      st.status = e.target.value;
      if (st.status) st.tab = tabFor(st.status);
      render();
    });

    main.addEventListener('click', async e => {
      const tab = e.target.closest('[data-user-tab]');
      if (tab) { st.tab = tab.dataset.userTab; st.status = ''; document.getElementById('uStatus').value = ''; render(); return; }

      const del = e.target.closest('[data-udelete]');
      if (del) {
        const id = del.dataset.udelete;
        const all = users();
        const item = all.find(x => String(x.u.id) === String(id));
        const status = item ? userStatusOf(item.u) : '';
        const changed = status === 'Deleted' ? await permanentlyDelete(id) : await updateStatus(id, 'delete');
        if (changed) { st.status = ''; document.getElementById('uStatus').value = ''; render(); }
        return;
      }

      const edit = e.target.closest('[data-uedit]');
      if (edit) {
        const all = users();
        const item = all.find(x => String(x.u.id) === String(edit.dataset.uedit));
        if (item) showEditor(item.u);
      }
    });

    // Initial load from backend API
    (async () => {
      await loadServerUsers();
      render();
    })();
    return;
  }

  /* ---------- listings ---------- */
  if (page === 'listings') {
    let q = '';
    main.innerHTML = `<div class="d-flex flex-wrap gap-3 justify-content-between align-items-center mb-4"><div class="input-icon" style="min-width:min(320px,100%)"><i class="bi bi-search"></i><input class="form-control" id="lSearch" placeholder="Search listings or owners" aria-label="Search listings"></div><span class="small text-muted" id="lCount"></span></div>
      <div class="rc-table-wrap"><div class="table-responsive"><table class="table rc-table"><thead><tr><th>Property</th><th>Owner</th><th>Rent</th><th>Inquiries</th><th>Availability</th><th>Visibility</th><th class="text-end">Actions</th></tr></thead><tbody id="lBody"></tbody></table></div></div>`;
    const render = () => {
      const s = q.toLowerCase(), rows = (db.properties || []).filter(p => !s || (p.name + p.city + RC.fullName(RC.owner(p.ownerId))).toLowerCase().includes(s));
      document.getElementById('lCount').textContent = `${rows.length} listing${rows.length === 1 ? '' : 's'} · ${(db.properties || []).filter(p => p.hidden).length} hidden`;
      document.getElementById('lBody').innerHTML = rows.map(p => { const o = RC.owner(p.ownerId); return `<tr>
        <td><div class="d-flex gap-3 align-items-center">${RC.img(RC.cover(p), '', 'thumb')}<div class="min-w-0"><div class="fw-semibold text-truncate" style="max-width:240px">${RC.esc(p.name)}</div><div class="small text-muted">${RC.esc(p.city)} · ${p.type}</div></div></div></td>
        <td class="text-nowrap">${RC.esc(RC.fullName(o))}</td><td class="num fw-semibold">${RC.peso(p.price)}</td><td class="num">${(db.inquiries || []).filter(x => x.propertyId === p.id).length}</td>
        <td>${RC.availBadge(p.available, true)}</td><td>${p.hidden ? '<span class="rc-badge danger">Hidden</span>' : '<span class="rc-badge resolved">Public</span>'}</td>
        <td class="text-end text-nowrap"><a class="btn btn-light-soft btn-sm" href="property.html?id=${p.id}">View</a> <button class="btn btn-sm ${p.hidden ? 'btn-dark' : 'btn-outline-danger'}" data-hide="${p.id}">${p.hidden ? 'Restore' : 'Hide'}</button></td></tr>`; }).join('');
    };
    main.addEventListener('click', async e => {
      const b = e.target.closest('[data-hide]'); if (!b) return;
      const p = RC.prop(b.dataset.hide);
      if (!await RC.confirm({ title: p.hidden ? 'Restore listing?' : 'Hide listing?', text: p.hidden ? `“${RC.esc(p.name)}” will appear in search again.` : `“${RC.esc(p.name)}” will be removed from search and its page until you restore it. The owner can still see it.`, confirm: p.hidden ? 'Restore' : 'Hide listing', danger: !p.hidden })) return;
      p.hidden = !p.hidden; RC.log('listing', RC.fullName(me), `${p.hidden ? 'hid' : 'restored'} ${p.name}`); RC.save(); render(); RC.toast(`Listing ${p.hidden ? 'hidden' : 'restored'}`);
    });
    document.getElementById('lSearch').addEventListener('input', e => { q = e.target.value.trim(); render(); });
    render(); return;
  }

  /* ---------- reports ---------- */
  if (page === 'system-reports') {
    const all = db.inquiries || [], n = s => all.filter(q => q.status === s).length;
    const byCity = {}; all.forEach(q => { const p = RC.prop(q.propertyId); if (p) byCity[p.city] = (byCity[p.city] || 0) + 1; });
    const cities = Object.entries(byCity).sort((a, b) => b[1] - a[1]), maxC = Math.max(1, ...cities.map(c => c[1]));
    const top = (db.properties || []).map(p => ({ p, l: all.filter(q => q.propertyId === p.id) })).sort((a, b) => b.l.length - a.l.length).slice(0, 8);
    main.innerHTML = `
      <div class="d-flex justify-content-end mb-3 no-print"><button class="btn btn-dark" id="aPrint"><i class="bi bi-printer me-1"></i>Print report</button></div>
      <div class="row g-3 mb-4">${[['bi-envelope-paper', 'ico-coral', all.length, 'Total inquiries'], ['bi-hourglass-split', 'ico-amber', n('Pending'), 'Pending'], ['bi-arrow-repeat', 'ico-blue', n('Ongoing'), 'Ongoing'],
        ['bi-check2-circle', 'ico-green', n('Resolved'), 'Resolved'], ['bi-houses', 'ico-ink', (db.properties || []).filter(p => p.available && !p.hidden).length, 'Active listings'], ['bi-people', 'ico-violet', users().filter(x => userStatusOf(x.u) !== 'Deleted').length + (db.owners || []).length, 'Registered users']]
        .map(([i, c, v, l]) => `<div class="col-6 col-md-4 col-xl-2"><div class="rc-stat flex-column"><span class="rc-stat-ico ${c}"><i class="bi ${i}"></i></span><div><div class="rc-stat-val">${v}</div><div class="rc-stat-lab">${l}</div></div></div></div>`).join('')}</div>
      <div class="row g-4 mb-4">
        <div class="col-lg-5"><section class="rc-panel h-100"><div class="rc-panel-head"><h3>Inquiries by status</h3></div><div class="rc-chart-box sm"><canvas id="arStatus" role="img" aria-label="Inquiries by status"></canvas></div></section></div>
        <div class="col-lg-7"><section class="rc-panel h-100"><div class="rc-panel-head"><h3>Inquiries by city</h3></div><div class="d-grid gap-3">
          ${cities.map(([c, v]) => `<div><div class="d-flex justify-content-between small mb-1"><span class="fw-semibold">${RC.esc(c)}</span><span class="num text-muted">${v}</span></div><div class="rc-bar"><span style="width:${v / maxC * 100}%"></span></div></div>`).join('')}</div></section></div>
      </div>
      <section class="rc-table-wrap"><div class="rc-panel-head p-3 px-4 mb-0 border-bottom"><h3>Most inquired properties</h3></div>
        <div class="table-responsive"><table class="table rc-table"><thead><tr><th>Property</th><th>Owner</th><th>Inquiries</th><th>Resolved</th><th>Resolution rate</th></tr></thead><tbody>
        ${top.map(({ p, l }) => { const r = l.filter(q => q.status === 'Resolved').length; return `<tr><td class="fw-semibold">${RC.esc(p.name)}</td><td>${RC.esc(RC.fullName(RC.owner(p.ownerId)))}</td><td class="num">${l.length}</td><td class="num">${r}</td><td class="num">${l.length ? Math.round(r / l.length * 100) + '%' : '—'}</td></tr>`; }).join('')}
        </tbody></table></div></section>
      <p class="rc-demo-note mt-3"><i class="bi bi-info-circle"></i>BahayLink System Reports</p>`;
    document.getElementById('aPrint').addEventListener('click', () => window.print());
    return;
  }

  /* ---------- activity ---------- */
  let type = RC.qs('type') || '';
  const render = () => {
    const list = (db.activity || []).filter(a => !type || a.type === type).sort((a, b) => b.time.localeCompare(a.time));
    const groups = {}; list.forEach(a => { const d = RC.date(a.time, { weekday: 'long', month: 'long', day: 'numeric' }); (groups[d] = groups[d] || []).push(a); });
    main.innerHTML = `<div class="rc-tabs mb-4">${[['', 'All'], ['inquiry', 'Inquiries'], ['message', 'Messages'], ['listing', 'Listings'], ['status', 'Status changes'], ['user', 'Users']].map(([k, l]) => `<button class="rc-chip ${type === k ? 'active' : ''}" data-type="${k}">${l}</button>`).join('')}</div>
      ${Object.keys(groups).length ? Object.entries(groups).map(([d, items]) => `<section class="rc-panel mb-3"><h3 class="h6 text-muted mb-2">${d}</h3>${items.map(actRow).join('')}</section>`).join('') : '<div class="rc-empty bg-white"><i class="bi bi-activity"></i><p class="mt-2 mb-0 text-muted">No activity of this type yet.</p></div>'}`;
  };
  main.addEventListener('click', e => { const t = e.target.closest('[data-type]'); if (t) { type = t.dataset.type; render(); } });
  render();
})();

/* =========================================================
   BahayLink — core helpers, state and UI components.
   Mock data removed. Real application state is handled cleanly.
   ========================================================= */
window.RC = window.RC || {};
(function (RC) {
  const KEY = 'bahaylink-storage-v1';
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ---------- state loader ---------- */
  function load() {
    try {
      // Purge legacy mock keys from prior preview builds
      localStorage.removeItem('rentconnect-demo-v1');
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.properties)) {
        s.admins = clone(window.RC_DATA.admins || []);
        return s;
      }
    } catch (e) { /* storage blocked */ }
    return clone(window.RC_DATA);
  }

  RC.db = load();
  RC.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(RC.db)); }
    catch (e) { RC.toast('This browser could not save the change. It lasts until you reload.', 'error'); }
  };

  // Track activity locally on successful sign-in and authenticated page visits.
  RC.recordLastActive = function (userId, force = false) {
    const u = (RC.db.renters || []).find(x => x.id === userId) || (RC.db.owners || []).find(x => x.id === userId);
    if (!u || RC.userStatus(userId) !== 'Active') return;
    const previous = Date.parse(u.lastActiveAt || '');
    const now = Date.now();
    if (!force && Number.isFinite(previous) && now - previous >= 0 && now - previous < 60000) return;
    u.lastActiveAt = new Date(now).toISOString();
    RC.save();
  };

  RC.resetDemo = function () {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem('rentconnect-demo-v1');
    } catch (e) {}
    RC.db = clone(window.RC_DATA);
  };

  // Automatically sync properties from backend API if available
  RC.syncProperties = async function () {
    const API_BASE = (location.port === '5115') ? '' : 'http://localhost:5115';
    try {
      const res = await fetch(`${API_BASE}/api/properties`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          RC.db.properties = list.map(p => ({
            id: p.id,
            ownerId: p.ownerId,
            name: p.name,
            type: p.type,
            description: p.description,
            location: p.location,
            city: p.city,
            price: p.price,
            bedrooms: p.bedrooms,
            bathrooms: p.bathrooms,
            area: p.area,
            available: p.available,
            status: p.status,
            hidden: p.status === 'Hidden',
            isDeleted: !!p.isDeleted,
            amenities: p.amenities || [],
            requirements: p.requirements || [],
            images: p.images || [],
            listed: p.createdAt ? p.createdAt.slice(0, 10) : RC.nowIso().slice(0, 10)
          }));
          RC.save();
        }
      }
    } catch (e) {}
  };

  /* Sessions, sign-in and page guards live in js/auth.js (RC.Auth). */

  /* ---------- finders ---------- */
  RC.prop = id => (RC.db.properties || []).find(p => String(p.id) === String(id));
  RC.owner = id => (RC.db.owners || []).find(o => String(o.id) === String(id))
    || (RC.db.owners || []).find(o => o.id === 'o1')
    || (RC.db.owners || [])[0]
    || { id: id || 1, firstName: 'Maria', lastName: 'Santos', responseTime: 'Within a few hours', city: 'Tarlac', phone: '09171234567', verified: true, since: '2025-01-01' };
  RC.renter = id => (RC.db.renters || []).find(r => String(r.id) === String(id));
  RC.user = id => RC.owner(id) || RC.renter(id) || (RC.db.admins || []).find(a => String(a.id) === String(id)) || { id, firstName: 'Unknown', lastName: 'user', email: '' };
  RC.fullName = u => u ? `${u.firstName} ${u.lastName}` : '';
  RC.ownerProps = ownerId => (RC.db.properties || []).filter(p => String(p.ownerId) === String(ownerId) || String(ownerId) === 'o1' || ownerId == 1);
  RC.ownerInquiries = ownerId => (RC.db.inquiries || []).filter(q => {
    const p = RC.prop(q.propertyId);
    return p && (String(p.ownerId) === String(ownerId) || String(ownerId) === 'o1' || ownerId == 1);
  });
  RC.convosFor = (role, uid) => (RC.db.conversations || [])
    .filter(c => (role === 'owner' ? (String(c.ownerId) === String(uid) || String(uid) === 'o1' || uid == 1) : String(c.renterId) === String(uid)))
    .sort((a, b) => RC.lastMsg(b).time.localeCompare(RC.lastMsg(a).time));
  RC.lastMsg = c => c.messages[c.messages.length - 1] || { time: '', text: '' };
  RC.unreadCount = (role, uid) => RC.convosFor(role, uid).reduce((n, c) => n + (c.unread[role] || 0), 0);
  RC.notifsFor = role => (RC.db.notifications || []).filter(n => n.role === role).sort((a, b) => b.time.localeCompare(a.time));
  RC.addNotif = (role, type, text, link) => (RC.db.notifications || []).unshift({ id: RC.uid('n'), role, type, text, time: RC.nowIso(), read: false, link });
  RC.log = (type, actor, text) => (RC.db.activity || []).unshift({ time: RC.nowIso(), type, actor, text });
  RC.userStatus = id => { const status = (RC.db.userStatus || {})[id] || 'Active'; return status === 'Suspended' ? 'Locked' : status; };

  /* ---------- formatting ---------- */
  RC.uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  RC.nowIso = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 19); };
  RC.peso = n => '₱' + Number(n || 0).toLocaleString('en-PH');
  RC.date = (iso, o) => new Date(iso).toLocaleDateString('en-PH', o || { month: 'short', day: 'numeric', year: 'numeric' });
  RC.time = iso => new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  RC.timeAgo = function (iso) {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return 'just now';
    if (d < 3600) return Math.floor(d / 60) + 'm ago';
    if (d < 86400) return Math.floor(d / 3600) + 'h ago';
    if (d < 604800) return Math.floor(d / 86400) + 'd ago';
    return RC.date(iso, { month: 'short', day: 'numeric' });
  };
  RC.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  RC.qs = k => new URLSearchParams(location.search).get(k);
  RC.isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  /* ---------- images (with offline fallback) ---------- */
  RC.PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0F0F0"/><stop offset="1" stop-color="#F3F3F3"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><path d="M200 105l-62 50v58h40v-38h44v38h40v-58z" fill="none" stroke="#222222" stroke-width="8" stroke-linejoin="round"/></svg>');
  RC.imgFail = el => { el.onerror = null; el.src = RC.PLACEHOLDER; };
  RC.img = (src, alt = '', cls = '', extra = '') =>
    `<img src="${RC.esc(src || RC.PLACEHOLDER)}" alt="${RC.esc(alt)}" class="${cls}" loading="lazy" onerror="RC.imgFail(this)" ${extra}>`;
  RC.cover = p => (p.images && p.images[0]) || RC.PLACEHOLDER;

  /* ---------- small components ---------- */
  const AV = ['#111111', '#00A699', '#FC642D', '#484848', '#7B61FF', '#008489', '#B4A7D6', '#D93B30'];
  RC.avatar = function (u, size = '') {
    const name = RC.fullName(u) || '?';
    const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
    const ini = name.split(' ').filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase();
    return `<span class="rc-avatar ${size}" style="background:${AV[h % AV.length]}" aria-hidden="true">${RC.esc(ini)}</span>`;
  };
  RC.statusBadge = s => `<span class="rc-badge ${String(s).toLowerCase()}">${RC.esc(s)}</span>`;
  RC.availBadge = (av, plain) => av
    ? `<span class="rc-badge ${plain ? 'plain-available' : 'available'}">Available</span>`
    : `<span class="rc-badge ${plain ? 'plain-unavailable' : 'unavailable'}">Occupied</span>`;
  RC.TYPE_ICON = { House: 'bi-house-door', Condo: 'bi-building', Townhouse: 'bi-houses', Apartment: 'bi-buildings', Room: 'bi-door-closed' };
  RC.AMENITY_ICON = k => {
    const m = [['wi-fi', 'bi-wifi'], ['park', 'bi-car-front'], ['heater', 'bi-thermometer-sun'], ['air', 'bi-snow'], ['pool', 'bi-water'], ['gym', 'bi-heart-pulse'],
      ['secur', 'bi-shield-check'], ['gated', 'bi-shield-check'], ['cctv', 'bi-camera-video'], ['garden', 'bi-flower1'], ['pet', 'bi-heart'], ['laundry', 'bi-basket'],
      ['furnish', 'bi-lamp'], ['balcony', 'bi-door-open'], ['kitchen', 'bi-cup-hot'], ['view', 'bi-image'], ['fireplace', 'bi-fire'], ['meter', 'bi-lightning-charge'],
      ['study', 'bi-book'], ['water', 'bi-droplet'], ['roof', 'bi-sun'], ['terrace', 'bi-sun'], ['porch', 'bi-house'], ['patio', 'bi-sun'], ['maid', 'bi-person'], ['service', 'bi-tools']];
    const f = m.find(([w]) => k.toLowerCase().includes(w)); return f ? f[1] : 'bi-check2-circle';
  };

  RC.propertyCard = function (p) {
    const me = RC.me();
    const href = me ? `property.html?id=${p.id}` : `login.html?next=${encodeURIComponent(`property.html?id=${p.id}`)}`;
    return `<div class="col">
      <article class="rc-card">
        <a href="${href}" class="d-block text-reset" aria-label="${RC.esc(p.name)}">
          <div class="rc-card-media">${RC.img(RC.cover(p), p.name)}<span class="rc-card-badge">${RC.availBadge(p.available)}</span></div>
        </a>
        <div class="rc-card-body">
          <div class="d-flex justify-content-between gap-2"><h3 class="rc-card-title"><a href="${href}" class="text-reset text-decoration-none">${RC.esc(p.name)}</a></h3><span class="rc-card-meta text-nowrap"><i class="bi ${RC.TYPE_ICON[p.type]}"></i> ${p.type}</span></div>
          <div class="rc-card-meta"><i class="bi bi-geo-alt"></i> ${RC.esc(p.location)}</div>
          <div class="rc-card-meta">${p.bedrooms} bedroom${p.bedrooms > 1 ? 's' : ''} · ${p.bathrooms} bath${p.bathrooms > 1 ? 's' : ''} · ${p.area} sqm</div>
          <div class="rc-card-price"><strong class="num">${RC.peso(p.price)}</strong> <span class="text-muted">/ month</span></div>
          <div class="rc-card-actions"><a href="${href}" class="btn btn-outline-dark btn-sm btn-pill">View Details</a></div>
        </div>
      </article></div>`;
  };

  /* ---------- toast ---------- */
  RC.toast = function (msg, type = 'success') {
    let box = document.querySelector('.rc-toasts');
    if (!box) { box = document.createElement('div'); box.className = 'rc-toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const ic = { success: 'bi-check-circle-fill', error: 'bi-exclamation-circle-fill', info: 'bi-info-circle-fill' }[type];
    const t = document.createElement('div'); t.className = `rc-toast ${type}`; t.setAttribute('role', 'status');
    t.innerHTML = `<i class="bi ${ic}"></i><span>${RC.esc(msg)}</span>`;
    box.appendChild(t); setTimeout(() => t.remove(), 3600);
  };

  /* ---------- modal helpers (Bootstrap 5) ---------- */
  RC.modal = function ({ title, body, footer = '', size = '', onShown }) {
    const el = document.createElement('div');
    el.className = 'modal fade'; el.tabIndex = -1; el.setAttribute('aria-labelledby', 'rcModalTitle');
    el.innerHTML = `<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}"><div class="modal-content">
      <div class="modal-header"><h2 class="modal-title fs-5" id="rcModalTitle">${title}</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
      <div class="modal-body">${body}</div>${footer ? `<div class="modal-footer">${footer}</div>` : ''}</div></div>`;
    document.body.appendChild(el);
    const bs = new bootstrap.Modal(el);
    el.addEventListener('hidden.bs.modal', () => { bs.dispose(); el.remove(); });
    if (onShown) el.addEventListener('shown.bs.modal', () => onShown(el));
    bs.show();
    return { el, close: () => bs.hide() };
  };
  RC.confirm = function ({ title = 'Are you sure?', text = '', confirm = 'Confirm', danger = false }) {
    return new Promise(resolve => {
      let ok = false;
      const m = RC.modal({ title, size: 'modal-sm', body: `<p class="mb-0">${text}</p>`,
        footer: `<button class="btn btn-light-soft" data-bs-dismiss="modal">Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-dark'}" data-ok>${confirm}</button>` });
      m.el.querySelector('[data-ok]').addEventListener('click', () => { ok = true; m.close(); });
      m.el.addEventListener('hidden.bs.modal', () => resolve(ok));
    });
  };
  RC.POLICY = {
    terms: ['Terms of Service', 'BahayLink connects prospective renters with the property owner so they can ask questions and communicate about rental homes. BahayLink does not handle reservations, payments or lease contracts; any rental agreement is made directly between the renter and the owner. The owner is responsible for the accuracy of their listings, and users agree not to post misleading information or abusive messages.'],
    privacy: ['Privacy Policy', 'We collect only the information needed to handle rental inquiries: your name, email, phone number and the messages you send. Your details are shared only with the owner of the property you inquire about. We follow the Data Privacy Act of 2012 (RA 10173): you may request a copy or deletion of your data at any time by contacting privacy@bahaylink.ph.']
  };
  RC.showPolicy = k => RC.modal({ title: RC.POLICY[k][0], body: `<p class="mb-0">${RC.POLICY[k][1]}</p>` });

  /* ---------- password show/hide (any .pw-toggle next to an input) ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('.pw-toggle'); if (!b) return;
    const input = b.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.innerHTML = `<i class="bi ${show ? 'bi-eye-slash' : 'bi-eye'}"></i>`;
    b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
  document.addEventListener('click', e => { const p = e.target.closest('[data-policy]'); if (p) { e.preventDefault(); RC.showPolicy(p.dataset.policy); } });

  /* ---------- form validation helper ---------- */
  RC.setInvalid = function (input, msg) {
    input.classList.toggle('is-invalid', !!msg);
    let fb = input.closest('.rc-field')?.querySelector('.invalid-feedback');
    if (fb) { fb.textContent = msg || ''; fb.style.display = msg ? 'block' : ''; }
    return !msg;
  };
  RC.passwordScore = function (p) {
    let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(4, s);
  };
})(window.RC);

/* =========================================================
   BahayLink — authentication layer
   ---------------------------------------------------------
   Every page talks to RC.Auth only. Nothing else reads or
   writes the session, so switching to the real backend means
   changing ONE line: RC.AUTH_MODE = 'api'.

   PREVIEW MODE (current, frontend only)
   - Passwords are never stored or compared. The preview only
     checks that the email belongs to a sample renter/owner.
   - The role always comes from the account record, never from
     the user. Public registration is for renters only.
   - The single owner account (Maria Santos) has administrator
     features in the same dashboard; there is no separate admin identity.
   - Page guards below only redirect for a nicer experience.
     They are NOT security: anything in browser JavaScript can be
     changed by the user.

   BACKEND PHASE (ASP.NET Core)
   - Implement the endpoints used by ApiAuthProvider with
     ASP.NET Core Identity (hashed passwords, lockout, cookies).
   - The server decides the role ("Renter" or privileged "Owner").
     Public registration must ALWAYS create only Renter accounts.
     Admin and existing owner accounts are provisioned privately,
     never through public sign-up.
   - Protect controllers with [Authorize(Roles = "Admin")] etc.
   ========================================================= */
(function (RC) {
  RC.AUTH_MODE = 'preview'; // 'preview' now  →  'api' when the backend is ready

  const SKEY = 'rentconnect-session-v2'; // v2: sessions from the old role-switcher build are ignored
  RC.HOME = { renter: 'renter-dashboard.html', owner: 'owner-dashboard.html' };
  RC.roleName = r => ({ renter: 'Renter', owner: 'Property Owner/Administrator' }[r] || 'Guest');
  RC.isLocalDev = () => location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  // Validate PH mobile numbers and store them in one format (09XXXXXXXXX).
  RC.normalizePHMobile = value => {
    const raw = String(value || '').trim();
    if (!/^[+0-9()\s-]+$/.test(raw)) return '';
    const clean = raw.replace(/[()\s-]/g, '');
    const normalized = /^\+639\d{9}$/.test(clean) ? '0' + clean.slice(3) : clean;
    return /^09\d{9}$/.test(normalized) ? normalized : '';
  };

  /* Session record holds only { userId, role, preview } — never a password. */
  const store = {
    read() {
      try {
        const raw = sessionStorage.getItem(SKEY) || localStorage.getItem(SKEY);
        if (!raw) return null;
        const s = JSON.parse(raw);
        // Migrate a prior local-preview Administrator session to Maria's ONE account.
        if (s && s.role === 'admin' && (s.userId === 'a1' || s.userId === 'o1') && s.preview) {
          s.role = 'owner'; s.userId = 'o1';
          (sessionStorage.getItem(SKEY) ? sessionStorage : localStorage).setItem(SKEY, JSON.stringify(s));
        }
        return s;
      } catch (e) { return null; }
    },
    write(s, remember) {
      try { localStorage.removeItem(SKEY); sessionStorage.removeItem(SKEY); (remember ? localStorage : sessionStorage).setItem(SKEY, JSON.stringify(s)); } catch (e) {}
    },
    clear() { try { localStorage.removeItem(SKEY); sessionStorage.removeItem(SKEY); } catch (e) {} }
  };

  /* ---------- Preview provider (mock UI behaviour) ---------- */
  const MockAuthProvider = {
    mode: 'preview',
    // The one owner account includes administrator features; renters use their own accounts.
    findAccount(email) {
      const e = String(email).trim().toLowerCase();
      const r = RC.db.renters.find(u => u.email.toLowerCase() === e); if (r) return { user: r, role: 'renter' };
      const o = RC.db.owners.find(u => u.email.toLowerCase() === e); if (o) return { user: o, role: 'owner' };
      return null;
    },
    
    async login({ email, remember }) {
      const acct = this.findAccount(email);
      // Same message for "no account" and "wrong password", so the form doesn't reveal which emails exist.
      if (!acct) return { ok: false, error: 'Email or password is incorrect.' };
      if (RC.userStatus(acct.user.id) !== 'Active') return { ok: false, error: 'This account is unavailable. Contact support@bahaylink.ph.' };
      // PREVIEW: the password is not verified here. ApiAuthProvider sends it to the server instead.
      store.write({ userId: acct.user.id, role: acct.role, preview: true }, !!remember);
      RC.recordLastActive(acct.user.id, true);
      return { ok: true, role: acct.role, user: acct.user };
    },
    async register({ accountType, firstName, lastName, email, phone }) {
      if (accountType !== 'renter') return { ok: false, error: 'Only renter accounts can be created here.' };
      const normalizedPhone = RC.normalizePHMobile(phone);
      if (!normalizedPhone) return { ok: false, field: 'phone', error: 'Enter a valid Philippine mobile number.' };
      if (this.findAccount(email) || RC.db.admins.some(a => a.email.toLowerCase() === email.toLowerCase())) return { ok: false, field: 'email', error: 'An account already uses this email. Log in instead.' };
      const u = { id: RC.uid('r'), firstName, lastName, email, phone: normalizedPhone, city: '', since: RC.nowIso().slice(0, 10) };
      RC.db.renters.push(u);
      RC.log('user', RC.fullName(u), 'created a renter account');
      RC.addNotif('owner', 'system', `New renter account: ${RC.fullName(u)}`, 'admin-users.html');
      RC.save(); // profile only — the password is discarded
      return { ok: true, role: accountType };
    },
    async requestPasswordReset() { return { ok: true }; },
    async logout() { store.clear(); },
    session() { return store.read(); }
  };

  /* ---------- Backend provider (to be completed in the backend phase) ---------- */
  const ApiAuthProvider = {
    mode: 'api',
    _session: null,
    async _post(url, body) {
      const r = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
      const data = await r.json().catch(() => ({}));
      return { ok: r.ok, data };
    },
    // POST /api/auth/login  { email, password, rememberMe }  →  200 { role, user } | 401 { message }
    async login({ email, password, remember }) {
      const { ok, data } = await this._post('/api/auth/login', { email, password, rememberMe: !!remember });
      if (!ok) return { ok: false, error: data.message || 'Email or password is incorrect.' };
      this._session = { userId: data.user.id, role: data.role }; return { ok: true, role: data.role, user: data.user };
    },
    // POST /api/auth/register  { accountType: "renter", firstName, lastName, email, phone, password }
    // IMPORTANT: The SERVER must always create a renter, rejecting owner/admin sign-ups.
    async register(form) {
      // Frontend UX only; backend must independently enforce renter-only registration.
      const phone = RC.normalizePHMobile(form.phone);
      if (!phone) return { ok: false, field: 'phone', error: 'Enter a valid Philippine mobile number.' };
      const { ok, data } = await this._post('/api/auth/register', { ...form, phone, accountType: 'renter' });
      return ok ? { ok: true, role: data.role } : { ok: false, field: data.field, error: data.message || 'We couldn’t create your account.' };
    },
    async requestPasswordReset(email) { await this._post('/api/auth/forgot-password', { email }); return { ok: true }; },
    async logout() { await this._post('/api/auth/logout'); this._session = null; },
    // In the backend phase, load this once per page from GET /api/auth/me (cookie session).
    session() { return this._session; }
  };

  RC.Auth = RC.AUTH_MODE === 'api' ? ApiAuthProvider : MockAuthProvider;

  /* ---------- helpers used by the rest of the frontend ---------- */
  RC.session = () => RC.Auth.session();
  RC.signOut = () => RC.Auth.logout();
  RC.me = function () {
    const s = RC.session(); if (!s) return null;
    const u = RC.owner(s.userId) || RC.renter(s.userId) || RC.db.admins.find(a => a.id === s.userId);
    if (!u || RC.userStatus(u.id) !== 'Active') return null;
    RC.recordLastActive(u.id);
    return Object.assign({ role: s.role }, u);
  };

  /* Page guard — UX redirect only, not security (see header). Returns the user or null. */
  RC.requireRole = function (role) {
    const me = RC.me();
    const page = location.pathname.split('/').pop() + location.search;
    if (!me) { RC.blocked = true; location.replace('login.html?next=' + encodeURIComponent(page)); return null; }
    if (me.role !== role) { RC.blocked = true; location.replace(RC.HOME[me.role] + '?denied=1'); return null; }
    return me;
  };
  RC.safeNext = function (next, role) {
    // only allow same-site pages that belong to the signed-in role
    if (!next || !/^[a-z-]+\.html(\?[\w=&%.-]*)?$/i.test(next)) return null;
    if (next.startsWith('admin-') && role !== 'owner') return null;
    if (next.startsWith('owner-') && role !== 'owner') return null;
    return next;
  };

})(window.RC);

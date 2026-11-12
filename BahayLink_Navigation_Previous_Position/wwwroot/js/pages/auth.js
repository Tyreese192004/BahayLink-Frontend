/* Login and Sign Up pages.
   One login page for every account type. The role comes from the account (RC.Auth), never from the user.
   Preview mode: see js/auth.js — passwords are validated for format only and are never stored. */
(function () {
  const db = RC.db, main = document.getElementById('main');
  const mode = document.body.dataset.active; // 'login' | 'signup'
  const LOGO = `<a class="rc-logo mb-4" href="index.html"><svg class="rc-logo-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 3.5 13.2V29h9.2v-8.6h6.6V29h9.2V13.2z" fill="#222222"/><circle cx="16" cy="14.5" r="2.6" fill="#fff"/></svg><span>BahayLink</span></a>`;
  const media = (img, quote, who) => `<div class="rc-auth-media"><img src="${RC.esc(img || 'images/signup-house.jpg')}" alt="BahayLink" loading="eager" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center;"><div class="rc-auth-quote"><p class="fs-4 fw-semibold mb-2" style="max-width:26ch">${quote}</p>${who ? `<p class="mb-0 opacity-75">${who}</p>` : ''}</div></div>`;
  const pwField = (id, label, ac, extra = '') => `<div class="mb-3 rc-field"><label class="form-label" for="${id}">${label}</label>
    <div class="position-relative"><input class="form-control pe-5" id="${id}" type="password" autocomplete="${ac}"><button type="button" class="pw-toggle" aria-label="Show password"><i class="bi bi-eye"></i></button></div>${extra}<div class="invalid-feedback"></div></div>`;
  const $ = id => document.getElementById(id);
  const busy = (btn, on, label) => { btn.disabled = on; btn.innerHTML = on ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Please wait…' : label; };
  const alertBox = (t, kind = 'danger') => $('formAlert').innerHTML = t ? `<div class="alert alert-${kind} py-2 small d-flex gap-2 align-items-start" role="alert"><i class="bi ${kind === 'danger' ? 'bi-exclamation-circle' : kind === 'success' ? 'bi-check-circle' : 'bi-info-circle'} mt-1"></i><span>${t}</span></div>` : '';
  const previewNote = '';

  // already signed in → go to the right place
  const current = RC.me();
  if (current) { location.replace(RC.HOME[current.role]); return; }

  /* ---------- LOGIN ---------- */
  if (mode === 'login') {
    const email0 = RC.qs('email') || '';
    main.innerHTML = `<div class="rc-auth">
      ${media(db.IMG.auth, '“Because Everyone Deserves a Place to Belong.”', '')}
      <div class="rc-auth-form"><div class="inner">
        ${LOGO}
        <h1 class="h2 mb-1">Welcome back</h1><p class="text-muted mb-4">Log in to check your inquiries, messages and listings.</p>
        <div id="formAlert" aria-live="polite"></div>
        <form id="loginForm" novalidate>
          <div class="mb-3 rc-field"><label class="form-label" for="lEmail">Email address</label><input class="form-control" id="lEmail" type="email" autocomplete="username" placeholder="you@example.com" value="${RC.esc(email0)}"><div class="invalid-feedback"></div></div>
          ${pwField('lPass', 'Password', 'current-password')}
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div class="form-check"><input class="form-check-input" type="checkbox" id="lRemember"><label class="form-check-label" for="lRemember">Remember me</label></div>
            <a href="#" id="forgotLink" class="fw-semibold text-decoration-underline small">Forgot password?</a></div>
          <button class="btn btn-gradient w-100 btn-lg" type="submit" id="lBtn">Log in</button>
        </form>
        <p class="text-center mt-4 mb-0">Don’t have an account? <a href="signup.html" class="fw-semibold text-decoration-underline">Create an account</a></p>
        ${previewNote}
      </div></div></div>`;

    if (RC.qs('out')) alertBox('You’ve been logged out.', 'secondary');
    if (RC.qs('registered')) alertBox('Your account is ready. Log in to continue.', 'success');
    if (RC.qs('next')) alertBox('Please log in to continue.', 'info');
    (email0 ? $('lPass') : $('lEmail')).focus();

    $('loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      alertBox('');
      const email = $('lEmail').value.trim(), pw = $('lPass').value;
      let ok = RC.setInvalid($('lEmail'), !email ? 'Enter your email address.' : !RC.isEmail(email) ? 'That email address looks incomplete.' : '');
      ok = RC.setInvalid($('lPass'), !pw ? 'Enter your password.' : pw.length < 8 ? 'Passwords are at least 8 characters.' : '') && ok;
      if (!ok) return;
      busy($('lBtn'), true);
      const res = await RC.Auth.login({ email, password: pw, remember: $('lRemember').checked });
      if (!res.ok) { busy($('lBtn'), false, 'Log in'); alertBox(res.error); $('lPass').value = ''; $('lPass').focus(); return; }
      // the account's assigned role decides where to go
      location.href = RC.safeNext(RC.qs('next'), res.role) || RC.HOME[res.role];
    });

    $('forgotLink').addEventListener('click', e => {
      e.preventDefault();
      const m = RC.modal({ title: 'Reset your password', body: `<form id="fpForm" novalidate><p class="text-muted">Enter the email you signed up with and we’ll send you a link to reset your password.</p>
        <div class="mb-3 rc-field"><label class="form-label" for="fpEmail">Email address</label><input class="form-control" id="fpEmail" type="email" value="${RC.esc($('lEmail').value)}"><div class="invalid-feedback"></div></div>
        <button class="btn btn-dark w-100" type="submit">Send reset link</button>
        ${RC.AUTH_MODE === 'preview' ? '<p class="rc-demo-note mt-3 mb-0"><i class="bi bi-info-circle"></i>Preview build — the email is sent once the server is connected.</p>' : ''}</form>`, onShown: el => el.querySelector('#fpEmail').focus() });
      m.el.querySelector('#fpForm').addEventListener('submit', async ev => {
        ev.preventDefault(); const i = m.el.querySelector('#fpEmail');
        if (!RC.setInvalid(i, RC.isEmail(i.value.trim()) ? '' : 'Enter a valid email address.')) return;
        await RC.Auth.requestPasswordReset(i.value.trim());
        m.close(); RC.toast('If an account uses that email, a reset link is on its way.', 'info'); // same answer whether or not the email exists
      });
    });
    return;
  }

  /* ---------- SIGN UP ---------- */
  main.innerHTML = `<div class="rc-auth">
    ${media(db.IMG.ext5, 'Ask the owner directly. Keep every answer in one place.', 'Find your next home with BahayLink')}
    <div class="rc-auth-form"><div class="inner">
      ${LOGO}
      <h1 class="h2 mb-1">Create your renter account</h1><p class="text-muted mb-4">Sign up to explore rentals and send inquiries to the property owner.</p>
      <div id="formAlert" aria-live="polite"></div>
      <form id="suForm" novalidate>
        <div class="rc-name-row mb-3">
          <div class="rc-name-col-first rc-field">
            <label class="form-label" for="sFirst">First name</label>
            <input class="form-control" id="sFirst" autocomplete="given-name" placeholder="First name">
            <div class="invalid-feedback"></div>
          </div>
          <div class="rc-name-col-last rc-field">
            <label class="form-label" for="sLast">Last name</label>
            <input class="form-control" id="sLast" autocomplete="family-name" placeholder="Last name">
            <div class="invalid-feedback"></div>
          </div>
          <div class="rc-name-col-suffix rc-field">
            <label class="form-label text-nowrap" for="sSuffix">Suffix (Optional)</label>
            <select class="form-select" id="sSuffix" aria-label="Suffix (Optional)">
              <option value="">Select suffix</option>
              <option value="Jr.">Jr.</option>
              <option value="Sr.">Sr.</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
              <option value="V">V</option>
            </select>
          </div>
        </div>
        <div class="mb-3 rc-field">
          <label class="form-label" for="sEmail">Email address</label>
          <input class="form-control" id="sEmail" type="email" autocomplete="email" placeholder="you@example.com">
          <div class="invalid-feedback"></div>
        </div>
        <div class="mb-3 rc-field">
          <label class="form-label" for="sPhone">Contact number</label>
          <input class="form-control" id="sPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="13" placeholder="09XXXXXXXXX" required>
          <div class="invalid-feedback"></div>
        </div>
        ${pwField('sPass', 'Password', 'new-password', '<div class="rc-meter mt-2"><span id="sMeter"></span></div><div class="small text-muted mt-1" id="sMeterText">Use 8 or more characters with a mix of letters, numbers and symbols.</div>')}
        ${pwField('sConfirm', 'Confirm password', 'new-password')}
        <div class="form-check mb-4 rc-field"><input class="form-check-input" type="checkbox" id="sTerms"><label class="form-check-label small" for="sTerms">I agree to the <a href="#" data-policy="terms" class="text-decoration-underline">Terms of Service</a> and <a href="#" data-policy="privacy" class="text-decoration-underline">Privacy Policy</a>, and consent to the processing of my personal data under RA 10173.</label><div class="invalid-feedback"></div></div>
        <button class="btn btn-gradient w-100 btn-lg" type="submit" id="sBtn">Create Account</button>
      </form>
      <p class="text-center mt-4 mb-0">Already have an account? <a href="login.html" class="fw-semibold text-decoration-underline">Log in</a></p>
    </div></div></div>`;

  // Restrict First Name & Last Name to letters and spaces only (no numbers or special characters)
  const restrictToLetters = el => {
    if (!el) return;
    el.addEventListener('keydown', e => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) return;
      if (!/^[a-zA-ZñÑ\s]$/.test(e.key)) {
        e.preventDefault();
      }
    });
    el.addEventListener('input', () => {
      const clean = el.value.replace(/[^a-zA-ZñÑ\s]/g, '');
      if (el.value !== clean) el.value = clean;
    });
    el.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text') || '';
      const clean = text.replace(/[^a-zA-ZñÑ\s]/g, '');
      document.execCommand('insertText', false, clean);
    });
  };

  // Restrict Contact Number: allows Philippine numbers starting with 09 (11 digits) or +639 (13 characters), without adding auto spaces
  const restrictPhoneInput = el => {
    if (!el) return;
    el.setAttribute('maxlength', '13');
    el.addEventListener('keydown', e => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) return;
      if (e.key === '+') {
        if (el.selectionStart === 0 && !el.value.includes('+')) return;
        e.preventDefault();
        return;
      }
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        return;
      }
      const hasLeadingPlus = el.value.startsWith('+');
      const maxLen = hasLeadingPlus ? 13 : 11;
      if (el.value.length >= maxLen && el.selectionStart === el.selectionEnd) {
        e.preventDefault();
      }
    });
    el.addEventListener('input', () => {
      const v = el.value;
      const hasLeadingPlus = v.startsWith('+');
      const digits = v.replace(/\D/g, '');
      if (hasLeadingPlus) {
        el.value = ('+' + digits).slice(0, 13);
      } else {
        el.value = digits.slice(0, 11);
      }
    });
    el.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text') || '';
      const hasLeadingPlus = text.trim().startsWith('+');
      const digits = text.replace(/\D/g, '');
      if (hasLeadingPlus) {
        document.execCommand('insertText', false, ('+' + digits).slice(0, 13));
      } else {
        document.execCommand('insertText', false, digits.slice(0, 11));
      }
    });
  };

  restrictToLetters($('sFirst'));
  restrictToLetters($('sLast'));
  restrictPhoneInput($('sPhone'));

  const LEVELS = [['Too weak', '#C13515'], ['Weak', '#C13515'], ['Fair', '#D9822B'], ['Good', '#3B9C5A'], ['Strong', '#12774A']];
  $('sPass').addEventListener('input', () => {
    const v = $('sPass').value, s = RC.passwordScore(v);
    $('sMeter').style.width = v ? (s + 1) * 20 + '%' : 0; $('sMeter').style.background = LEVELS[s][1];
    $('sMeterText').textContent = v ? `Password strength: ${LEVELS[s][0]}` : 'Use 8 or more characters with a mix of letters, numbers and symbols.';
  });

  const rules = {
    sFirst: v => !v.trim() ? 'Enter your first name.' : v.trim().length < 2 ? 'First name must be at least 2 characters.' : !/^[a-zA-ZñÑ\s]+$/.test(v.trim()) ? 'Numbers and special characters are not allowed.' : '',
    sLast: v => !v.trim() ? 'Enter your last name.' : v.trim().length < 2 ? 'Last name must be at least 2 characters.' : !/^[a-zA-ZñÑ\s]+$/.test(v.trim()) ? 'Numbers and special characters are not allowed.' : '',
    sEmail: v => !RC.isEmail(v.trim()) ? 'Enter a valid email address.' : '',
    sPhone: v => {
      const val = v.trim();
      if (!val) return 'Enter your contact number.';
      if (!/^(09\d{9}|\+639\d{9})$/.test(val)) {
        return 'Please enter a valid Philippine mobile number (e.g. 09XXXXXXXXX or +639XXXXXXXXX).';
      }
      return '';
    },
    sPass: v => v.length < 8 ? 'Use at least 8 characters.' : RC.passwordScore(v) < 2 ? 'Add a number or symbol to make it stronger.' : '',
    sConfirm: v => !v ? 'Confirm your password.' : v !== $('sPass').value ? 'Passwords don’t match.' : ''
  };

  Object.keys(rules).forEach(id => $(id).addEventListener('blur', () => { if ($(id).value) RC.setInvalid($(id), rules[id]($(id).value)); }));

  // Modern Airbnb-style success popup with checkmark animation
  function showSuccessModal(email) {
    const old = document.getElementById('rcSuccessModal');
    if (old) old.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'rcSuccessModal';
    backdrop.className = 'rc-success-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.innerHTML = `
      <div class="rc-success-modal-card">
        <div class="rc-success-icon-wrap">
          <svg class="rc-checkmark-svg" viewBox="0 0 52 52" aria-hidden="true">
            <circle class="rc-checkmark-circle" cx="26" cy="26" r="23" fill="none"/>
            <path class="rc-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
          </svg>
        </div>
        <h2 class="rc-success-title">Account Created Successfully!</h2>
        <p class="rc-success-desc">Welcome to BahayLink! Your account is ready. You can now explore rental properties and send inquiries to the property owner.</p>
        <button type="button" class="rc-success-btn" id="modalContinueBtn">Continue to Login <span aria-hidden="true">&rarr;</span></button>
      </div>
    `;

    document.body.appendChild(backdrop);

    const proceed = () => {
      location.href = `login.html?registered=1&email=${encodeURIComponent(email)}`;
    };

    const btn = backdrop.querySelector('#modalContinueBtn');
    btn.focus();
    btn.addEventListener('click', proceed);

    const onKey = e => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        window.removeEventListener('keydown', onKey);
        proceed();
      }
    };
    window.addEventListener('keydown', onKey);
  }

  $('suForm').addEventListener('submit', async e => {
    e.preventDefault(); alertBox('');
    let ok = Object.keys(rules).map(id => RC.setInvalid($(id), rules[id]($(id).value))).every(Boolean);
    ok = RC.setInvalid($('sTerms'), $('sTerms').checked ? '' : 'Please accept the Terms and Privacy Policy to continue.') && ok;
    if (!ok) { document.querySelector('.is-invalid').focus(); return; }
    busy($('sBtn'), true);
    const email = $('sEmail').value.trim();
    const first = $('sFirst').value.trim();
    const last = $('sLast').value.trim();
    const suffix = $('sSuffix') ? $('sSuffix').value.trim() : '';
    const fullLastName = suffix ? `${last} ${suffix}` : last;

    const res = await RC.Auth.register({
      accountType: 'renter',
      firstName: first,
      lastName: fullLastName,
      suffix,
      email,
      phone: $('sPhone').value.trim(),
      password: $('sPass').value
    });

    if (!res.ok) {
      busy($('sBtn'), false, 'Create Account');
      if (res.field === 'email') RC.setInvalid($('sEmail'), res.error);
      else alertBox(res.error);
      return;
    }

    busy($('sBtn'), false, 'Create Account');
    showSuccessModal(email);
  });
})();

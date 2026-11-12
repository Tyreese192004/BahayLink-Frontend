/* Property details: gallery + lightbox, details, owner card, inquiry modal, message owner */
(async function () {
  if (RC.syncProperties) await RC.syncProperties();
  const db = RC.db, main = document.getElementById('main');
  const p = RC.prop(RC.qs('id'));
  if (!p || p.hidden || p.isDeleted) {
    main.innerHTML = `<div class="container-xxl py-5"><div class="rc-empty"><i class="bi bi-house-x"></i><h1 class="h4 mt-3">This listing isn’t available</h1><p class="text-muted">It may have been removed by the owner.</p><a class="btn btn-dark btn-pill" href="browse.html">Browse other homes</a></div></div>`;
    return;
  }
  document.title = `${p.name} · BahayLink`;
  const o = RC.owner(p.ownerId) || { id: p.ownerId || 1, firstName: 'Maria', lastName: 'Santos', responseTime: 'Within a few hours', city: p.city || 'Tarlac', phone: '09171234567', verified: true, since: '2025-01-01' };
  // Owners see property information without renter-only inquiry controls.
  const isOwnerView = RC.me()?.role === 'owner';
  const imgs = (p.images && p.images.length) ? p.images : [RC.PLACEHOLDER];
  const similar = (db.properties || []).filter(x => String(x.id) !== String(p.id) && !x.hidden && !x.isDeleted && (x.city === p.city || x.type === p.type)).slice(0, 4);

  main.innerHTML = `
  <div class="container-xxl py-4">
    <a href="browse.html" class="text-muted small d-inline-flex gap-1 align-items-center mb-3"><i class="bi bi-arrow-left"></i>Back to listings</a>
    <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
      <div><h1 class="h2 mb-2">${RC.esc(p.name)}</h1>
        <div class="rc-facts"><span><i class="bi bi-geo-alt"></i>${RC.esc(p.location)}</span><span><i class="bi ${RC.TYPE_ICON[p.type]}"></i>${p.type}</span>${RC.availBadge(p.available, true)}</div></div>
    </div>

    <div class="row gx-4 gx-xl-5 gy-4">
      <div class="${isOwnerView ? 'col-lg-12' : 'col-lg-8'}">
        <div class="rc-gallery mb-4">
          ${imgs.slice(0, 3).map((src, i) => `<button type="button" data-photo="${i}" aria-label="Open photo ${i + 1} of ${imgs.length}">${RC.img(src, `${p.name} photo ${i + 1}`)}</button>`).join('')}
          <button type="button" class="rc-gallery-all" data-photo="0"><i class="bi bi-grid-3x3-gap me-1"></i>Show all ${imgs.length} photos</button>
        </div>

        <div class="d-flex justify-content-between align-items-center gap-3 flex-wrap">
          <div><h2 class="h4 mb-1">${p.type} in ${RC.esc(p.city)}</h2>
            <div class="rc-facts"><span><i class="bi bi-door-open"></i>${p.bedrooms} bedroom${p.bedrooms > 1 ? 's' : ''}</span><span><i class="bi bi-droplet"></i>${p.bathrooms} bathroom${p.bathrooms > 1 ? 's' : ''}</span><span><i class="bi bi-arrows-fullscreen"></i>${p.area} sqm</span></div></div>
        </div>
        <div class="rc-divider"></div>
        <div class="rc-owner mb-1"><i class="bi bi-person-check fs-4"></i><div><div class="fw-semibold">Listed by ${RC.esc(RC.fullName(o))}</div><div class="text-muted small">Usually replies ${o.responseTime}</div></div></div>
        <div class="rc-owner"><i class="bi bi-calendar-check fs-4"></i><div><div class="fw-semibold">${p.available ? 'Available for move-in' : 'Currently occupied'}</div><div class="text-muted small">${p.available ? 'Send an inquiry to schedule a viewing.' : 'You can still ask the owner when it will be available.'}</div></div></div>
        <div class="rc-divider"></div>
        <h2 class="h5">About this home</h2><p class="text-muted" style="max-width:68ch">${RC.esc(p.description)}</p>
        <div class="rc-divider"></div>
        <h2 class="h5 mb-3">What this place offers</h2>
        <div class="row row-cols-1 row-cols-sm-2">${p.amenities.map(a => `<div class="col"><div class="rc-amenity"><i class="bi ${RC.AMENITY_ICON(a)}"></i>${RC.esc(a)}</div></div>`).join('')}</div>
        <div class="rc-divider"></div>
        <h2 class="h5 mb-3">Rental requirements</h2>
        <ul class="list-unstyled rc-req mb-0">${p.requirements.map(r => `<li><i class="bi bi-check-circle-fill"></i>${RC.esc(r)}</li>`).join('')}</ul>
        <div class="rc-divider"></div>
        <h2 class="h5 mb-3">Property Owner</h2>
        <div class="rc-panel">
          <div class="rc-owner mb-3"><div><div class="fw-bold fs-5">${RC.esc(RC.fullName(o))} ${o.verified ? '<i class="bi bi-patch-check-fill text-primary" title="Verified owner" style="color:var(--rc-primary)!important"></i>' : ''}</div>
            <div class="text-muted small">Owner since ${RC.date(o.since, { month: 'long', year: 'numeric' })} · ${RC.ownerProps(o.id).length} listings</div></div></div>
          <div class="row g-3 small"><div class="col-sm-4"><div class="text-muted">Response time</div><div class="fw-semibold">${o.responseTime}</div></div>
            <div class="col-sm-4"><div class="text-muted">Based in</div><div class="fw-semibold">${RC.esc(o.city)}</div></div>
            <div class="col-sm-4"><div class="text-muted">Phone</div><div class="fw-semibold">${RC.esc(o.phone || '0917 555 0142')}</div></div></div>
        </div>
      </div>

      ${isOwnerView ? '' : `<div class="col-lg-4 d-none d-lg-block">
        <aside class="rc-sticky-card">
          <div class="d-flex justify-content-between align-items-baseline mb-1"><div><span class="rc-price-lg num">${RC.peso(p.price)}</span> <span class="text-muted">/ month</span></div>${RC.availBadge(p.available, true)}</div>
          <div class="text-muted small mb-3">${p.bedrooms} bed · ${p.bathrooms} bath · ${p.area} sqm</div>
          <div class="d-grid gap-2">
            <button class="btn btn-gradient btn-lg" data-inquire><i class="bi bi-send me-1"></i>Send Inquiry</button>
            <button class="btn btn-outline-dark" data-message-owner><i class="bi bi-chat-dots me-1"></i>Message Owner</button>
          </div>
          <p class="text-center text-muted small mt-3 mb-0">No booking or payment happens here — inquiries are free.</p>
        </aside>
      </div>`}
    </div>

    ${similar.length ? `<div class="rc-divider"></div><h2 class="h4 mb-4">Similar homes</h2>
    <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-4">${similar.map(RC.propertyCard).join('')}</div>` : ''}
  </div>

  ${isOwnerView ? '' : `<div class="d-lg-none position-fixed bottom-0 start-0 end-0 bg-white border-top p-3 d-flex justify-content-between align-items-center gap-3 no-print" style="z-index:1025;padding-bottom:calc(1rem + env(safe-area-inset-bottom,0px))!important">
    <div><div class="fw-bold num">${RC.peso(p.price)} <span class="text-muted fw-normal small">/ month</span></div><div class="small">${p.available ? 'Available now' : 'Currently occupied'}</div></div>
    <button class="btn btn-gradient" data-inquire>Send Inquiry</button>
  </div>
  <div class="d-lg-none" style="height:84px"></div>`}`;

  /* ---------- lightbox gallery ---------- */
  function openGallery(start) {
    const m = RC.modal({ title: RC.esc(p.name), size: 'modal-xl', body: `
      <div id="pg" class="carousel slide" data-bs-ride="false"><div class="carousel-inner rounded-3 overflow-hidden">
        ${imgs.map((s, i) => `<div class="carousel-item ${i === start ? 'active' : ''}">${RC.img(s, `${p.name} photo ${i + 1}`, 'd-block')}</div>`).join('')}</div>
        ${imgs.length > 1 ? `<button class="carousel-control-prev" type="button" data-bs-target="#pg" data-bs-slide="prev"><span class="carousel-control-prev-icon"></span><span class="visually-hidden">Previous</span></button>
        <button class="carousel-control-next" type="button" data-bs-target="#pg" data-bs-slide="next"><span class="carousel-control-next-icon"></span><span class="visually-hidden">Next</span></button>` : ''}</div>
      <div class="text-center small text-muted mt-2" id="pgCount">${start + 1} / ${imgs.length}</div>` });
    m.el.addEventListener('slid.bs.carousel', e => m.el.querySelector('#pgCount').textContent = `${e.to + 1} / ${imgs.length}`);
  }

  /* ---------- inquiry modal ---------- */
  function openInquiry() {
    const me = RC.me(), r = me && me.role === 'renter' ? me : null;
    const m = RC.modal({ title: 'Send an inquiry', body: `
      <form id="inqForm" novalidate>
        <div class="d-flex gap-3 align-items-center p-2 rounded-3 mb-3" style="background:var(--rc-soft)">${RC.img(RC.cover(p), '', 'rounded-3', 'style="width:72px;height:56px;object-fit:cover"')}
          <div class="min-w-0"><div class="fw-semibold text-truncate">${RC.esc(p.name)}</div><div class="small text-muted">${RC.peso(p.price)} / month · ${RC.esc(p.city)}</div></div></div>
        <div class="mb-3"><label class="form-label" for="iqProp">Property</label><input class="form-control" id="iqProp" value="${RC.esc(p.name)}" readonly></div>
        <div class="mb-3 rc-field"><label class="form-label" for="iqName">Your name</label><input class="form-control" id="iqName" autocomplete="name" value="${r ? RC.esc(RC.fullName(r)) : ''}"><div class="invalid-feedback"></div></div>
        <div class="row g-3 mb-3"><div class="col-sm-6 rc-field"><label class="form-label" for="iqEmail">Email</label><input class="form-control" id="iqEmail" type="email" autocomplete="email" value="${r ? RC.esc(r.email) : ''}"><div class="invalid-feedback"></div></div>
          <div class="col-sm-6 rc-field"><label class="form-label" for="iqPhone">Phone <span class="text-muted fw-normal">(optional)</span></label><input class="form-control" id="iqPhone" type="tel" autocomplete="tel" value="${r ? RC.esc(r.phone) : ''}"><div class="invalid-feedback"></div></div></div>
        <div class="mb-2 rc-field"><label class="form-label" for="iqMsg">Inquiry message</label>
          <textarea class="form-control" id="iqMsg" rows="4" maxlength="1000" placeholder="Hi! Is this home still available? I’d like to schedule a viewing…"></textarea>
          <div class="d-flex justify-content-between"><div class="invalid-feedback"></div><small class="text-muted ms-auto" id="iqCount">0 / 1000</small></div></div>
        <div class="d-flex flex-wrap gap-2 mb-3">${['Is this still available?', 'Can I schedule a viewing?', 'Are pets allowed?', 'Is the rent negotiable?'].map(s => `<button type="button" class="rc-chip py-1 small" data-suggest>${s}</button>`).join('')}</div>
        <p class="rc-demo-note mb-3"><i class="bi bi-info-circle"></i>Demo only — your inquiry is saved in this browser, not sent to a server.</p>
        <button class="btn btn-gradient w-100" type="submit">Submit Inquiry</button>
      </form>`, onShown: el => {
        // Blur only the background behind the Send Inquiry dialog.
        document.querySelector('.modal-backdrop')?.classList.add('rc-inquiry-blur');
        el.querySelector(r ? '#iqMsg' : '#iqName').focus();
      } });
    const el = m.el, $ = s => el.querySelector(s);
    $('#iqMsg').addEventListener('input', () => $('#iqCount').textContent = `${$('#iqMsg').value.length} / 1000`);
    el.addEventListener('click', e => { const s = e.target.closest('[data-suggest]'); if (s) { const t = $('#iqMsg'); t.value = (t.value ? t.value.trim() + ' ' : '') + s.textContent; t.dispatchEvent(new Event('input')); t.focus(); } });
    $('#inqForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#iqName').value.trim(), email = $('#iqEmail').value.trim(), phone = $('#iqPhone').value.trim(), msg = $('#iqMsg').value.trim();
      const ok = [RC.setInvalid($('#iqName'), name.length < 2 ? 'Enter your full name.' : ''),
        RC.setInvalid($('#iqEmail'), !RC.isEmail(email) ? 'Enter a valid email address, like juan@gmail.com.' : ''),
        RC.setInvalid($('#iqPhone'), phone && !/^[0-9+\-\s()]{7,}$/.test(phone) ? 'Use digits only, like 0917 555 0142.' : ''),
        RC.setInvalid($('#iqMsg'), msg.length < 10 ? 'Write at least 10 characters so the owner knows what you need.' : '')].every(Boolean);
      if (!ok) { el.querySelector('.is-invalid').focus(); return; }
      // find or create the renter (customer info is saved automatically)
      let renter = r || db.renters.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (!renter) { const [first, ...rest] = name.split(' '); renter = { id: RC.uid('r'), firstName: first, lastName: rest.join(' ') || '', email, phone, city: '', since: RC.nowIso().slice(0, 10) }; db.renters.push(renter); }
      else if (phone && !renter.phone) renter.phone = phone;
      const q = { id: RC.uid('q'), propertyId: p.id, renterId: renter.id, message: msg, date: RC.nowIso(), status: 'Pending' };
      db.inquiries.unshift(q);
      const c = { id: RC.uid('c'), propertyId: p.id, renterId: renter.id, ownerId: p.ownerId, inquiryId: q.id, unread: { renter: 0, owner: 1 }, messages: [{ from: 'renter', text: msg, time: q.date }] };
      db.conversations.unshift(c);
      RC.addNotif('owner', 'inquiry', `New inquiry from ${RC.fullName(renter)} about ${p.name}`, `owner-inquiries.html?id=${q.id}`);
      RC.log('inquiry', RC.fullName(renter), `submitted an inquiry about ${p.name}`);
      RC.save();
      el.querySelector('.modal-body').innerHTML = `<div class="text-center py-3"><div class="rc-feature-ico mx-auto mb-3" style="background:var(--rc-resolved-bg);color:var(--rc-resolved)"><i class="bi bi-check2"></i></div>
        <h3 class="h5">Inquiry sent to ${RC.esc(o.firstName)}</h3><p class="text-muted">Owners on BahayLink usually reply ${o.responseTime}. You can follow your inquiry and keep chatting from Messages.</p>
        <div class="d-flex gap-2 justify-content-center flex-wrap">${r ? `<a class="btn btn-dark btn-pill" href="messages.html?c=${c.id}">Open conversation</a><a class="btn btn-light-soft btn-pill" href="my-inquiries.html">My Inquiries</a>` : `<a class="btn btn-dark btn-pill" href="signup.html">Create an account to track it</a>`}
        <button class="btn btn-light-soft btn-pill" data-bs-dismiss="modal">Close</button></div></div>`;
      RC.toast('Inquiry submitted (demo)');
      RC.renderChrome();
    });
  }

  function messageOwner() {
    const r = RC.me();
    if (!r) { location.href = 'login.html?next=' + encodeURIComponent('property.html?id=' + p.id); return; }
    if (r.role !== 'renter') { RC.toast('Messaging owners is available for renter accounts.', 'info'); return; }
    let c = db.conversations.find(x => x.propertyId === p.id && x.renterId === r.id);
    if (!c) { c = { id: RC.uid('c'), propertyId: p.id, renterId: r.id, ownerId: p.ownerId, inquiryId: null, unread: { renter: 0, owner: 0 }, messages: [] }; db.conversations.unshift(c); RC.save(); }
    location.href = `messages.html?c=${c.id}`;
  }

  main.addEventListener('click', e => {
    const ph = e.target.closest('[data-photo]'); if (ph) return openGallery(+ph.dataset.photo);
    if (e.target.closest('[data-inquire]')) return openInquiry();
    if (e.target.closest('[data-message-owner]')) return messageOwner();
  });
  if (!isOwnerView && RC.qs('inquire') === '1') openInquiry();
})();

/* Shared owner actions: update inquiry status, view inquiry, respond, availability toggle */
(function (RC) {
  const db = RC.db;
  const K = RC.owner_ = {};
  K.me = () => RC.me();
  K.statusSelect = q => `<select class="form-select rc-status-select ${q.status.toLowerCase()}" data-status-for="${q.id}" aria-label="Update status">${['Pending', 'Ongoing', 'Resolved'].map(s => `<option ${s === q.status ? 'selected' : ''}>${s}</option>`).join('')}</select>`;

  K.setStatus = function (id, status) {
    const q = db.inquiries.find(x => x.id === id); if (!q || q.status === status) return;
    q.status = status;
    const p = RC.prop(q.propertyId) || { name: 'a property' }, r = RC.renter(q.renterId);
    RC.addNotif('renter', 'status', `Your inquiry about ${p.name} is now ${status}`, 'my-inquiries.html');
    RC.log('status', RC.fullName(K.me()), `marked an inquiry from ${RC.fullName(r)} as ${status}`);
    RC.save(); RC.renderChrome(); RC.toast(`Inquiry marked as ${status}`);
  };
  K.respond = function (id) {
    const q = db.inquiries.find(x => x.id === id), p = RC.prop(q.propertyId);
    let c = db.conversations.find(x => x.inquiryId === id) || db.conversations.find(x => x.propertyId === q.propertyId && x.renterId === q.renterId);
    if (!c) { c = { id: RC.uid('c'), propertyId: q.propertyId, renterId: q.renterId, ownerId: p.ownerId, inquiryId: q.id, unread: { renter: 0, owner: 0 }, messages: [{ from: 'renter', text: q.message, time: q.date }] }; db.conversations.unshift(c); RC.save(); }
    location.href = `owner-messages.html?c=${c.id}`;
  };
  K.view = function (id, onChange) {
    const q = db.inquiries.find(x => x.id === id); if (!q) return;
    const p = RC.prop(q.propertyId) || { name: 'Removed listing', images: [], location: '' }, r = RC.renter(q.renterId);
    const others = db.inquiries.filter(x => x.renterId === q.renterId && x.id !== q.id && (RC.prop(x.propertyId) || {}).ownerId === p.ownerId).length;
    const m = RC.modal({ title: 'Inquiry details', size: 'modal-lg', body: `
      <div class="row g-4">
        <div class="col-md-7">
          <div class="small text-muted mb-1">Received ${RC.date(q.date)} at ${RC.time(q.date)}</div>
          <div class="p-3 rounded-3 mb-3" style="background:var(--rc-soft)">${RC.esc(q.message)}</div>
          <div class="d-flex gap-3 align-items-center">${RC.img(RC.cover(p), '', 'rounded-3', 'style="width:84px;height:64px;object-fit:cover"')}<div><div class="fw-semibold">${RC.esc(p.name)}</div><div class="small text-muted">${RC.esc(p.location)} · ${RC.peso(p.price)}/mo</div></div></div>
        </div>
        <div class="col-md-5"><div class="rc-panel p-3">
          <div class="d-flex gap-2 align-items-center mb-3">${RC.avatar(r)}<div class="min-w-0"><div class="fw-bold">${RC.esc(RC.fullName(r))}</div><div class="small text-muted">${others ? `${others} other inquir${others === 1 ? 'y' : 'ies'} with you` : 'First inquiry with you'}</div></div></div>
          <div class="small mb-1"><i class="bi bi-envelope me-2"></i><span class="user-select-all">${RC.esc(r.email)}</span></div>
          <div class="small mb-3"><i class="bi bi-telephone me-2"></i><span class="user-select-all">${RC.esc(r.phone || 'Not provided')}</span></div>
          <label class="form-label" for="mStatus">Status</label>
          <select class="form-select" id="mStatus">${['Pending', 'Ongoing', 'Resolved'].map(s => `<option ${s === q.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </div></div>
      </div>`,
      footer: `<button class="btn btn-light-soft" data-bs-dismiss="modal">Close</button><button class="btn btn-primary" data-respond><i class="bi bi-reply me-1"></i>Respond</button>` });
    m.el.querySelector('#mStatus').addEventListener('change', e => { K.setStatus(q.id, e.target.value); onChange && onChange(); });
    m.el.querySelector('[data-respond]').addEventListener('click', () => K.respond(q.id));
  };
  K.toggleAvail = function (pid, on) {
    const p = RC.prop(pid); p.available = on;
    RC.log('listing', RC.fullName(K.me()), `marked ${p.name} as ${on ? 'available' : 'occupied'}`);
    RC.save(); RC.toast(`${p.name} is now ${on ? 'available' : 'occupied'}`);
  };
  K.availSwitch = p => `<div class="rc-avail-switch ${p.available ? 'is-on' : 'is-off'}"><div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" role="switch" id="av-${p.id}" data-avail="${p.id}" ${p.available ? 'checked' : ''}></div><label class="form-check-label" for="av-${p.id}">${p.available ? 'Available' : 'Occupied'}</label><span class="rc-avail-indicator" aria-hidden="true"></span></div>`;

  // delegated handlers used on several owner pages
  document.addEventListener('change', e => {
    const s = e.target.closest('[data-status-for]'); if (s) { K.setStatus(s.dataset.statusFor, s.value); document.dispatchEvent(new Event('rc:refresh')); }
    const a = e.target.closest('[data-avail]'); if (a) {
      // Keep the same switch in the DOM while its thumb slides; re-render afterwards.
      const wrapper = a.closest('.rc-avail-switch');
      if (wrapper) {
        wrapper.classList.toggle('is-on', a.checked);
        wrapper.classList.toggle('is-off', !a.checked);
        const label = wrapper.querySelector('.form-check-label');
        if (label) label.textContent = a.checked ? 'Available' : 'Occupied';
      }
      K.toggleAvail(a.dataset.avail, a.checked);
      clearTimeout(K.availRefreshTimer);
      K.availRefreshTimer = setTimeout(() => document.dispatchEvent(new Event('rc:refresh')), 340);
    }
  });
  document.addEventListener('click', e => {
    const v = e.target.closest('[data-view-inq]'); if (v) K.view(v.dataset.viewInq, () => document.dispatchEvent(new Event('rc:refresh')));
    const r = e.target.closest('[data-respond-inq]'); if (r) K.respond(r.dataset.respondInq);
  });
})(window.RC);

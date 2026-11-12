/* Owner: Inquiry management — search, status/property/date filters, view, respond, update status */
(function () {
  if (RC.blocked) return;
  const db = RC.db, main = document.getElementById('main'), me = RC.me();
  const st = { q: '', status: RC.qs('status') || '', prop: RC.qs('property') || '', from: '', to: '' };
  const props = RC.ownerProps(me.id);
  main.innerHTML = `
    <div class="rc-panel mb-4"><div class="row g-3 align-items-end">
      <div class="col-lg-4"><label class="form-label" for="iSearch">Search</label><div class="input-icon"><i class="bi bi-search"></i><input class="form-control" id="iSearch" placeholder="Customer, email or message"></div></div>
      <div class="col-sm-6 col-lg-3"><label class="form-label" for="iProp">Property</label><select class="form-select" id="iProp"><option value="">All properties</option>${props.map(p => `<option value="${p.id}" ${st.prop === p.id ? 'selected' : ''}>${RC.esc(p.name)}</option>`).join('')}</select></div>
      <div class="col-6 col-sm-3 col-lg-2"><label class="form-label" for="iFrom">From</label><input class="form-control" type="date" id="iFrom"></div>
      <div class="col-6 col-sm-3 col-lg-2"><label class="form-label" for="iTo">To</label><input class="form-control" type="date" id="iTo"></div>
      <div class="col-lg-1"><button class="btn btn-light-soft w-100" id="iClear" title="Clear filters" aria-label="Clear filters"><i class="bi bi-x-lg"></i></button></div>
    </div></div>
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3"><div class="rc-tabs" id="iTabs" role="group" aria-label="Filter by status"></div><span class="small text-muted" id="iCount"></span></div>
    <div class="rc-table-wrap"><div class="table-responsive"><table class="table rc-table"><thead><tr><th>Customer</th><th>Property</th><th>Date</th><th>Message</th><th>Status</th><th class="text-end">Actions</th></tr></thead><tbody id="iBody"></tbody></table></div></div>`;
  const $ = id => document.getElementById(id);
  function render() {
    const all = RC.ownerInquiries(me.id).sort((a, b) => b.date.localeCompare(a.date)), q = st.q.toLowerCase();
    const base = all.filter(x => {
      const r = RC.renter(x.renterId);
      return (!st.prop || x.propertyId === st.prop) && (!st.from || x.date.slice(0, 10) >= st.from) && (!st.to || x.date.slice(0, 10) <= st.to) &&
        (!q || [RC.fullName(r), r.email, x.message, (RC.prop(x.propertyId) || {}).name].join(' ').toLowerCase().includes(q));
    });
    $('iTabs').innerHTML = ['', 'Pending', 'Ongoing', 'Resolved'].map(s => `<button class="rc-chip ${st.status === s ? 'active' : ''}" data-s="${s}" aria-pressed="${st.status === s}">${s || 'All'} <span class="count num">${s ? base.filter(x => x.status === s).length : base.length}</span></button>`).join('');
    const list = base.filter(x => !st.status || x.status === st.status);
    $('iCount').textContent = `Showing ${list.length} of ${all.length}`;
    $('iBody').innerHTML = list.length ? list.map(x => {
      const r = RC.renter(x.renterId), p = RC.prop(x.propertyId) || { name: 'Removed listing' };
      const c = db.conversations.find(cv => cv.inquiryId === x.id), un = c ? c.unread.owner : 0;
      return `<tr>
        <td><div class="d-flex gap-2 align-items-center">${RC.avatar(r, 'sm')}<div class="min-w-0"><div class="fw-semibold text-nowrap">${RC.esc(RC.fullName(r))}</div><div class="small text-muted">${RC.esc(r.email)}</div></div></div></td>
        <td><div class="d-flex gap-2 align-items-center">${RC.img(RC.cover(p), '', 'thumb')}<span class="text-truncate d-inline-block" style="max-width:180px">${RC.esc(p.name)}</span></div></td>
        <td class="text-nowrap num">${RC.date(x.date)}<div class="small text-muted">${RC.time(x.date)}</div></td>
        <td style="max-width:260px"><span class="d-block text-truncate">${RC.esc(x.message)}</span></td>
        <td>${RC.owner_.statusSelect(x)}</td>
        <td class="text-end text-nowrap"><button class="btn btn-light-soft btn-sm" data-view-inq="${x.id}">View</button> <button class="btn btn-dark btn-sm" data-respond-inq="${x.id}"><i class="bi bi-reply me-1"></i>Respond${un ? ` <span class="badge rounded-pill" style="background:var(--rc-primary)">${un}</span>` : ''}</button></td></tr>`;
    }).join('') : `<tr><td colspan="6"><div class="text-center text-muted py-5"><i class="bi bi-inbox fs-2"></i><p class="mt-2 mb-0">No customer inquiries yet. New inquiries about your properties will appear here.</p></div></td></tr>`;
  }
  $('iSearch').addEventListener('input', e => { st.q = e.target.value.trim(); render(); });
  $('iProp').addEventListener('change', e => { st.prop = e.target.value; render(); });
  $('iFrom').addEventListener('change', e => { st.from = e.target.value; render(); });
  $('iTo').addEventListener('change', e => { st.to = e.target.value; render(); });
  $('iClear').addEventListener('click', () => { Object.assign(st, { q: '', status: '', prop: '', from: '', to: '' }); ['iSearch', 'iProp', 'iFrom', 'iTo'].forEach(i => $(i).value = ''); render(); });
  main.addEventListener('click', e => { const t = e.target.closest('[data-s]'); if (t) { st.status = t.dataset.s; render(); } });
  document.addEventListener('rc:refresh', render);
  render();
  if (RC.qs('id')) RC.owner_.view(RC.qs('id'), render);
})();

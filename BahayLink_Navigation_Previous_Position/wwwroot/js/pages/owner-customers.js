/* Owner: Customers — saved automatically from inquiries */
(function () {
  if (RC.blocked) return;
  const db = RC.db, main = document.getElementById('main'), me = RC.me();
  let q = '';
  main.innerHTML = `
    <div class="d-flex flex-wrap gap-3 justify-content-between align-items-center mb-4">
      <div class="input-icon" style="min-width:min(320px,100%)"><i class="bi bi-search"></i><input class="form-control" id="cuSearch" placeholder="Search by name, email or phone" aria-label="Search customers"></div>
      <span class="rc-demo-note"><i class="bi bi-shield-lock"></i>Customer details are saved when renters inquire and are visible only to you (RA 10173).</span></div>
    <div class="rc-table-wrap"><div class="table-responsive"><table class="table rc-table"><thead><tr><th>Customer</th><th>Phone</th><th>Inquiries</th><th>Latest property</th><th>Last contact</th><th>Status</th><th class="text-end">Actions</th></tr></thead><tbody id="cuBody"></tbody></table></div></div>`;
  function customers() {
    const inqs = RC.ownerInquiries(me.id).sort((a, b) => b.date.localeCompare(a.date)), map = new Map();
    inqs.forEach(x => { if (!map.has(x.renterId)) map.set(x.renterId, []); map.get(x.renterId).push(x); });
    return [...map].map(([id, list]) => ({ r: RC.renter(id), list }));
  }
  function render() {
    const s = q.toLowerCase();
    const rows = customers().filter(({ r }) => !s || [RC.fullName(r), r.email, r.phone].join(' ').toLowerCase().includes(s));
    document.getElementById('cuBody').innerHTML = rows.length ? rows.map(({ r, list }) => `<tr>
      <td><div class="d-flex gap-2 align-items-center">${RC.avatar(r, 'sm')}<div><div class="fw-semibold">${RC.esc(RC.fullName(r))}</div><div class="small text-muted">${RC.esc(r.email)}</div></div></div></td>
      <td class="text-nowrap num">${RC.esc(r.phone || '—')}</td><td class="num">${list.length}</td>
      <td class="text-truncate" style="max-width:200px">${RC.esc((RC.prop(list[0].propertyId) || {}).name || '')}</td>
      <td class="text-nowrap">${RC.date(list[0].date)}</td><td>${RC.statusBadge(list[0].status)}</td>
      <td class="text-end"><button class="btn btn-light-soft btn-sm" data-cust="${r.id}">View</button></td></tr>`).join('')
      : '<tr><td colspan="7" class="text-center text-muted py-5">No customers match your search.</td></tr>';
  }
  main.addEventListener('click', e => {
    const b = e.target.closest('[data-cust]'); if (!b) return;
    const { r, list } = customers().find(x => x.r.id === b.dataset.cust);
    RC.modal({ title: 'Customer details', body: `
      <div class="d-flex gap-3 align-items-center mb-3">${RC.avatar(r, 'lg')}<div><div class="fw-bold fs-5">${RC.esc(RC.fullName(r))}</div><div class="small text-muted">Customer since ${RC.date(list[list.length - 1].date)}</div></div></div>
      <div class="row g-2 small mb-4"><div class="col-sm-6"><i class="bi bi-envelope me-2"></i><span class="user-select-all">${RC.esc(r.email)}</span></div><div class="col-sm-6"><i class="bi bi-telephone me-2"></i><span class="user-select-all">${RC.esc(r.phone || 'Not provided')}</span></div>${r.city ? `<div class="col-sm-6"><i class="bi bi-geo-alt me-2"></i>${RC.esc(r.city)}</div>` : ''}</div>
      <h3 class="h6">Inquiries (${list.length})</h3>
      ${list.map(x => `<div class="rc-list-item"><div class="flex-grow-1 min-w-0"><div class="rc-li-title">${RC.esc((RC.prop(x.propertyId) || {}).name || '')}</div><div class="rc-li-sub">${RC.date(x.date)} · ${RC.esc(x.message)}</div></div>${RC.statusBadge(x.status)}<button class="btn btn-sm btn-light-soft" data-respond-inq="${x.id}">Message</button></div>`).join('')}` });
  });
  document.getElementById('cuSearch').addEventListener('input', e => { q = e.target.value.trim(); render(); });
  render();
})();

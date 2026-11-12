/* Owner dashboard: stats, activity chart, recent inquiries, property overview, recent messages, quick actions */
(function () {
  if (RC.blocked) return;
  const db = RC.db, main = document.getElementById('main'), me = RC.me();
  let chart;
  function render() {
    const props = RC.ownerProps(me.id), inqs = RC.ownerInquiries(me.id).sort((a, b) => b.date.localeCompare(a.date));
    const count = s => inqs.filter(q => q.status === s).length, unread = RC.unreadCount('owner', me.id);
    const convos = RC.convosFor('owner', me.id).filter(c => c.messages.length).slice(0, 5);
    main.innerHTML = `
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div><h2 class="h4 mb-0">Welcome back, ${RC.esc(me.firstName)}</h2><p class="text-muted mb-0">${count('Pending') ? `${count('Pending')} inquir${count('Pending') === 1 ? 'y needs' : 'ies need'} a first reply.` : 'Every inquiry has a reply. Nice work.'}</p></div>
        <a href="owner-property-form.html" class="btn btn-primary btn-pill"><i class="bi bi-plus-lg me-1"></i>Add Property</a></div>
      <div class="row g-3 mb-4">
        ${[['owner-properties.html', 'bi-houses', 'ico-ink', props.length, 'Total Properties'], ['owner-inquiries.html', 'bi-envelope-paper', 'ico-coral', inqs.length, 'Total Inquiries'],
           ['owner-inquiries.html?status=Pending', 'bi-hourglass-split', 'ico-amber', count('Pending'), 'Pending Inquiries'], ['owner-inquiries.html?status=Ongoing', 'bi-arrow-repeat', 'ico-blue', count('Ongoing'), 'Ongoing Inquiries'],
           ['owner-inquiries.html?status=Resolved', 'bi-check2-circle', 'ico-green', count('Resolved'), 'Resolved Inquiries'], ['owner-messages.html', 'bi-chat-dots', 'ico-violet', unread, 'Unread Messages']]
          .map(([h, i, c, v, l]) => `<div class="col-6 col-md-4 col-xl-2"><a href="${h}" class="rc-stat text-reset flex-column"><span class="rc-stat-ico ${c}"><i class="bi ${i}"></i></span><div><div class="rc-stat-val">${v}</div><div class="rc-stat-lab">${l}</div></div></a></div>`).join('')}
      </div>
      <section class="mb-4" aria-labelledby="adminOverviewTitle">
        <div class="mb-3">
          <h3 class="h5 mb-1" id="adminOverviewTitle">Administration overview</h3>
          <p class="small text-muted mb-0">Your property-owner and administrator tools, together in one dashboard.</p>
        </div>
        <div class="row g-3 mb-3">
          ${[['admin-users.html', 'bi-people', 'ico-blue', db.renters.filter(u => RC.userStatus(u.id) !== 'Deleted').length, 'Registered Renters'],
             ['owner-properties.html', 'bi-houses', 'ico-ink', db.properties.length, 'Total Listings'],
             ['admin-activity.html', 'bi-activity', 'ico-violet', db.activity.length, 'System Activity']]
             .map(([h,i,c,v,l]) => `<div class="col-12 col-md-4"><a href="${h}" class="rc-stat text-reset flex-column h-100"><span class="rc-stat-ico ${c}"><i class="bi ${i}"></i></span><div><div class="rc-stat-val">${v}</div><div class="rc-stat-lab">${l}</div></div></a></div>`).join('')}
        </div>
        <div class="row g-3">
          <div class="col-lg-7"><div class="rc-panel h-100"><div class="rc-panel-head"><h4 class="h6 mb-0">Administration tools</h4></div><div class="row g-2">
            ${[['admin-users.html', 'bi-people', 'Manage users', 'View renter accounts and account status'],
               ['owner-reports.html', 'bi-bar-chart-line', 'Reports', 'View inquiry and system reports'],
               ['admin-activity.html', 'bi-activity', 'System activity', 'Review recorded actions']]
               .map(([h,i,t,d]) => `<div class="col-sm-6"><a class="rc-quick h-100" href="${h}"><i class="bi ${i}"></i><span><span class="fw-semibold d-block">${t}</span><span class="small text-muted">${d}</span></span></a></div>`).join('')}
          </div></div></div>
          <div class="col-lg-5"><div class="rc-panel h-100"><div class="rc-panel-head"><h4 class="h6 mb-0">Latest system activity</h4><a href="admin-activity.html" class="small fw-semibold text-decoration-underline">View all</a></div>
            ${db.activity.slice().sort((a,b) => b.time.localeCompare(a.time)).slice(0,4).map(a => `<div class="py-2 border-bottom"><div class="small"><strong>${RC.esc(a.actor)}</strong> ${RC.esc(a.text)}</div><div class="small text-muted">${RC.date(a.time)} · ${RC.time(a.time)}</div></div>`).join('') || '<p class="text-muted small mb-0">No system activity yet. New actions will appear here.</p>'}
          </div></div>
        </div>
      </section>
      <div class="mb-4">
        <section class="rc-panel"><div class="rc-panel-head"><h3>Inquiry activity</h3><span class="small text-muted">Last 6 months</span></div><div class="rc-chart-box"><canvas id="actChart" aria-label="Inquiries per month" role="img"></canvas></div></section>
      </div>
      <div class="row g-4 mb-4">
        <div class="col-xl-8"><section class="rc-table-wrap h-100"><div class="rc-panel-head p-3 px-4 mb-0 border-bottom"><h3>Recent inquiries</h3><a href="owner-inquiries.html" class="small fw-semibold text-decoration-underline">View all</a></div>
          <div class="table-responsive"><table class="table rc-table"><thead><tr><th>Customer</th><th>Property</th><th>Date</th><th>Status</th><th class="text-end">Action</th></tr></thead><tbody>
          ${inqs.slice(0, 6).map(q => { const r = RC.renter(q.renterId), p = RC.prop(q.propertyId) || {}; return `<tr>
            <td><div class="d-flex gap-2 align-items-center">${RC.avatar(r, 'sm')}<span class="fw-semibold text-nowrap">${RC.esc(RC.fullName(r))}</span></div></td>
            <td class="text-truncate" style="max-width:220px">${RC.esc(p.name)}</td><td class="text-nowrap num">${RC.date(q.date, { month: 'short', day: 'numeric' })}</td>
            <td>${RC.owner_.statusSelect(q)}</td><td class="text-end"><button class="btn btn-light-soft btn-sm" data-view-inq="${q.id}">View</button></td></tr>`; }).join('') || '<tr><td colspan="5" class="text-muted">No customer inquiries yet. New inquiries about your properties will appear here.</td></tr>'}
          </tbody></table></div></section></div>
        <div class="col-xl-4"><section class="rc-panel h-100"><div class="rc-panel-head"><h3>Recent messages</h3><a href="owner-messages.html" class="small fw-semibold text-decoration-underline">Inbox</a></div>
          ${convos.map(c => { const r = RC.renter(c.renterId), l = RC.lastMsg(c); return `<a class="rc-list-item" href="owner-messages.html?c=${c.id}">${RC.avatar(r)}<div class="flex-grow-1 min-w-0"><div class="rc-li-title">${RC.esc(RC.fullName(r))}</div><div class="rc-li-sub">${l.from === 'owner' ? 'You: ' : ''}${RC.esc(l.text)}</div></div>${c.unread.owner ? `<span class="rc-unread">${c.unread.owner}</span>` : `<small class="text-muted text-nowrap">${RC.timeAgo(l.time)}</small>`}</a>`; }).join('') || '<p class="text-muted mb-0">No messages yet.</p>'}
        </section></div>
      </div>
      <section class="rc-table-wrap"><div class="rc-panel-head p-3 px-4 mb-0 border-bottom"><h3>Property overview</h3><a href="owner-properties.html" class="small fw-semibold text-decoration-underline">Manage properties</a></div>
        <div class="table-responsive"><table class="table rc-table"><thead><tr><th>Property</th><th>Monthly rent</th><th>Open inquiries</th><th>Availability</th><th class="text-end">Actions</th></tr></thead><tbody>
        ${props.map(p => { const open = inqs.filter(q => q.propertyId === p.id && q.status !== 'Resolved').length; return `<tr>
          <td><div class="d-flex gap-3 align-items-center">${RC.img(RC.cover(p), '', 'thumb')}<div class="min-w-0"><div class="fw-semibold text-truncate" style="max-width:260px">${RC.esc(p.name)}</div><div class="small text-muted">${RC.esc(p.city)}</div></div></div></td>
          <td class="num fw-semibold">${RC.peso(p.price)}</td><td class="num">${open}</td><td>${RC.owner_.availSwitch(p)}</td>
          <td class="text-end text-nowrap"><a class="btn btn-light-soft btn-sm" href="owner-property-form.html?id=${p.id}">Edit</a> <a class="btn btn-light-soft btn-sm" href="property.html?id=${p.id}">View</a></td></tr>`; }).join('') || '<tr><td colspan="5" class="text-muted">No properties yet. <a href="owner-property-form.html" class="text-decoration-underline">Add your first listing</a>.</td></tr>'}
        </tbody></table></div></section>`;
    drawChart(inqs);
  }
  function drawChart(inqs) {
    const canvas = document.getElementById('actChart');
    if (!inqs.length) { canvas.parentElement.innerHTML = '<div class="rc-empty py-4"><i class="bi bi-graph-up fs-2"></i><h3 class="h6 mt-2">No inquiry activity yet</h3><p class="text-muted mb-0">Activity will appear when renters send inquiries.</p></div>'; return; }
    if (!window.Chart) { canvas.parentElement.innerHTML = '<p class="text-muted">The chart needs an internet connection to load Chart.js.</p>'; return; }
    const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
    const live = m => inqs.filter(q => q.date.startsWith(m));
    // fictional history for earlier months, real demo data where it exists
    const total = months.map(m => live(m).length);
    const resolved = months.map((m, i) => live(m).filter(q => q.status === 'Resolved').length);
    if (chart) chart.destroy();
    chart = new Chart(canvas, {
      type: 'line',
      data: { labels: months.map(m => new Date(m + '-01').toLocaleDateString('en-PH', { month: 'short' })),
        datasets: [{ label: 'Inquiries received', data: total, borderColor: '#222222', backgroundColor: 'rgba(34,34,34,.10)', fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: '#222222' },
                   { label: 'Resolved', data: resolved, borderColor: '#222222', backgroundColor: 'transparent', borderDash: [5, 4], tension: .35, pointRadius: 3, pointBackgroundColor: '#222' }] },
      options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#F0F0F0' } }, x: { grid: { display: false } } } }
    });
  }
  document.addEventListener('rc:refresh', render);
  render();
})();

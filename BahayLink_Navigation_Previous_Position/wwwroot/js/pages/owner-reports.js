/* Owner & System Unified Reports — summary cards, status chart, monthly chart, city breakdown, and property performance */
(function () {
  if (RC.blocked) return;
  const db = RC.db, main = document.getElementById('main'), me = RC.me();
  const charts = {};
  main.innerHTML = `
    <div id="rCards" class="row g-3 mb-4"></div>
    <div class="row g-4 mb-4">
      <div class="col-lg-6"><section class="rc-panel h-100"><div class="rc-panel-head"><h3>Inquiries by status</h3></div><div class="rc-chart-box sm"><canvas id="cStatus" role="img" aria-label="Inquiries by status"></canvas></div></section></div>
      <div class="col-lg-6"><section class="rc-panel h-100"><div class="rc-panel-head"><h3>Monthly inquiries</h3><span class="small text-muted">May – Oct 2026</span></div><div class="rc-chart-box sm"><canvas id="cMonthly" role="img" aria-label="Inquiries per month"></canvas></div></section></div>
    </div>
    <section class="rc-table-wrap mb-4"><div class="rc-panel-head p-3 px-4 mb-0 border-bottom"><h3>Property inquiry & performance statistics</h3></div>
      <div class="table-responsive"><table class="table rc-table"><thead><tr><th>Property</th><th>Total Inquiries</th><th>Pending</th><th>Ongoing</th><th>Resolved</th><th>Resolution rate</th><th style="min-width:140px">Share of inquiries</th></tr></thead><tbody id="rBody"></tbody></table></div></section>
    <p class="rc-demo-note mt-3"><i class="bi bi-info-circle"></i>Unified Reports: combines inquiry analytics and system-wide statistics.</p>`;
  const $ = id => document.getElementById(id);

  function render() {
    const all = RC.ownerInquiries(me.id);
    const list = all;
    const n = s => list.filter(q => q.status === s).length;
    const activeListings = (db.properties || []).filter(p => p.available && !p.hidden).length;

    $('rCards').innerHTML = [
      ['bi-envelope-paper', 'ico-coral', list.length, 'Total inquiries'],
      ['bi-hourglass-split', 'ico-amber', n('Pending'), 'Pending'],
      ['bi-arrow-repeat', 'ico-blue', n('Ongoing'), 'Ongoing'],
      ['bi-check2-circle', 'ico-green', n('Resolved'), 'Resolved'],
      ['bi-percent', 'ico-ink', list.length ? Math.round(n('Resolved') / list.length * 100) + '%' : '—', 'Resolution rate'],
      ['bi-houses', 'ico-violet', activeListings, 'Active listings']
    ].map(([i, c, v, l]) => `<div class="col-6 col-md-4 col-xl-2"><div class="rc-stat flex-column"><span class="rc-stat-ico ${c}"><i class="bi ${i}"></i></span><div><div class="rc-stat-val">${v}</div><div class="rc-stat-lab">${l}</div></div></div></div>`).join('');

    // Property inquiry rows

    const rows = RC.ownerProps(me.id).map(p => {
      const l = list.filter(q => q.propertyId === p.id);
      return { p, l };
    }).sort((a, b) => b.l.length - a.l.length);
    const max = Math.max(1, list.length);

    $('rBody').innerHTML = rows.map(({ p, l }) => {
      const r = l.filter(q => q.status === 'Resolved').length;
      const rate = l.length ? Math.round(r / l.length * 100) + '%' : '—';
      return `<tr>
        <td class="fw-semibold">${RC.esc(p.name)}</td>
        <td class="num">${l.length}</td>
        ${['Pending', 'Ongoing', 'Resolved'].map(s => `<td class="num">${l.filter(q => q.status === s).length}</td>`).join('')}
        <td class="num">${rate}</td>
        <td><div class="d-flex align-items-center gap-2"><div class="rc-bar flex-grow-1"><span style="width:${l.length / max * 100}%"></span></div><span class="small num text-muted" style="width:3ch">${Math.round(l.length / max * 100)}%</span></div></td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="text-muted">No properties yet.</td></tr>';

    if (!list.length) {
      ['cStatus', 'cMonthly'].forEach(id => {
        const el = $(id);
        if (!el) return;
        el.style.display = 'none';
        if (!el.nextElementSibling || !el.nextElementSibling.classList.contains('rc-chart-empty')) {
          el.insertAdjacentHTML('afterend', '<div class="rc-chart-empty rc-empty py-4"><i class="bi bi-bar-chart fs-2"></i><p class="text-muted mb-0 mt-2">No inquiry data yet.</p></div>');
        }
      });
      Object.keys(charts).forEach(k => { if (charts[k]) { charts[k].destroy(); charts[k] = null; } });
      return;
    }

    ['cStatus', 'cMonthly'].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.style.display = '';
      if (el.nextElementSibling && el.nextElementSibling.classList.contains('rc-chart-empty')) {
        el.nextElementSibling.remove();
      }
    });

    if (!window.Chart) return;
    charts.s && charts.s.destroy();
    charts.s = new Chart($('cStatus'), {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Ongoing', 'Resolved'],
        datasets: [{ data: [n('Pending'), n('Ongoing'), n('Resolved')], backgroundColor: ['#F2B441', '#3B82C4', '#1F9D63'], borderWidth: 0 }]
      },
      options: { maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } } }
    });

    if (!charts.m) {
      const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
      const data = months.map(m => all.filter(q => q.date.startsWith(m)).length);
      charts.m = new Chart($('cMonthly'), {
        type: 'bar',
        data: {
          labels: months.map(m => new Date(m + '-01').toLocaleDateString('en-PH', { month: 'short' })),
          datasets: [{ label: 'Inquiries', data, backgroundColor: months.map((m, i) => i === months.length - 1 ? '#222222' : '#777777'), borderRadius: 8 }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#F0F0F0' } }, x: { grid: { display: false } } } }
      });
    }
  }

  render();
})();

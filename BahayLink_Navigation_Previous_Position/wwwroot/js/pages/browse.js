/* Browse Rentals: search + filters over mock data, synced to the URL */
(function () {
  const db = RC.db, main = document.getElementById('main');
  const all = db.properties.filter(p => !p.hidden);
  const cities = ['Tarlac', 'Pangasinan', 'Pampanga', 'Quezon Province', 'Laguna'];
  const types = ['House', 'Apartment', 'Room'];
  const P = new URLSearchParams(location.search);
  const f = { q: P.get('q') || '', loc: P.get('loc') || '', min: P.get('min') || '', max: P.get('max') || '', type: ({Condo:'Apartment',Townhouse:'House'}[P.get('type')] || P.get('type') || ''), avail: P.get('avail') === '1', sort: P.get('sort') || 'low' };

  main.innerHTML = `
  <div class="container-xxl py-4">
    <div class="border-bottom mb-4"><div class="rc-typebar" id="typeBar" role="group" aria-label="Property type"></div></div>
    <div class="row g-4">
      <div class="col-lg-3">
        <div class="offcanvas-lg offcanvas-end" tabindex="-1" id="filters" aria-labelledby="filtersTitle">
          <div class="offcanvas-header border-bottom"><h2 class="offcanvas-title h5" id="filtersTitle">Filters</h2><button type="button" class="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#filters" aria-label="Close filters"></button></div>
          <div class="offcanvas-body p-lg-0">
            <form class="rc-filter-panel w-100" id="filterForm" novalidate>
              <h2 class="h6 d-none d-lg-block mb-3">Filters</h2>
              <div class="mb-3"><label class="form-label" for="fQ">Search</label>
                <div class="input-icon"><i class="bi bi-search"></i><input class="form-control" id="fQ" placeholder="Name, area or amenity" value="${RC.esc(f.q)}"></div></div>
              <div class="mb-3"><label class="form-label" for="fLoc">Location</label>
                <select class="form-select" id="fLoc"><option value="">All locations</option>${cities.map(c => `<option ${f.loc === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
              <div class="mb-3"><span class="form-label d-block">Monthly price (₱)</span>
                <div class="d-flex gap-2"><input class="form-control" id="fMin" type="number" min="0" step="500" placeholder="Min" aria-label="Minimum price" value="${f.min}">
                <input class="form-control" id="fMax" type="number" min="0" step="500" placeholder="Max" aria-label="Maximum price" value="${f.max}"></div>
                <div class="d-flex flex-wrap gap-1 mt-2">${[[0, 20000], [20000, 40000], [40000, 60000], [60000, '']].map(([a, b]) => `<button type="button" class="rc-chip py-1 px-2 small" data-range="${a},${b}">${b ? `${RC.peso(a)}–${RC.peso(b)}` : `${RC.peso(a)}+`}</button>`).join('')}</div>
                <div class="invalid-feedback" id="priceErr">Minimum price must be lower than the maximum.</div></div>
              <div class="mb-3"><label class="form-label" for="fType">Property type</label>
                <select class="form-select" id="fType"><option value="">Select property type</option>${types.map(t => `<option ${f.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
              <div class="form-check form-switch mb-3"><input class="form-check-input" type="checkbox" role="switch" id="fAvail" ${f.avail ? 'checked' : ''}><label class="form-check-label fw-semibold" for="fAvail">Available now only</label></div>
              <div class="mb-4"><label class="form-label" for="fSort">Sort by</label>
                <select class="form-select" id="fSort">${[['newest', 'Newest listings'], ['low', 'Price: low to high'], ['high', 'Price: high to low'], ['beds', 'Most bedrooms']].map(([v, l]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
              <div class="d-grid gap-2"><button type="button" class="btn btn-dark" id="clearBtn"><i class="bi bi-x-circle me-1"></i>Clear Filters</button>
                <button type="button" class="btn btn-dark d-lg-none" data-bs-dismiss="offcanvas" data-bs-target="#filters" id="showBtn">Show homes</button></div>
            </form>
          </div>
        </div>
      </div>
      <div class="col-lg-9">
        <div class="d-flex justify-content-between align-items-center gap-2 mb-3 flex-wrap">
          <div><h1 class="h4 mb-1" id="resultTitle">Rental homes</h1><div id="activeChips" class="d-flex flex-wrap gap-2"></div></div>
          <button class="btn btn-outline-dark btn-pill d-lg-none" data-bs-toggle="offcanvas" data-bs-target="#filters" aria-controls="filters"><i class="bi bi-sliders me-1"></i>Filters</button>
        </div>
        <div id="results" class="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-4" aria-live="polite"></div>
      </div>
    </div>
  </div>`;

  const $ = id => document.getElementById(id);
  function readForm() {
    Object.assign(f, { q: $('fQ').value.trim(), loc: $('fLoc').value, min: $('fMin').value, max: $('fMax').value, type: $('fType').value, avail: $('fAvail').checked, sort: $('fSort').value });
  }
  function syncUrl() {
    const q = new URLSearchParams();
    ['q', 'loc', 'min', 'max', 'type', 'sort'].forEach(k => { if (f[k] && !(k === 'sort' && f[k] === 'low')) q.set(k, f[k]); });
    if (f.avail) q.set('avail', '1');
    history.replaceState(null, '', 'browse.html' + (q.toString() ? '?' + q : ''));
  }
  function render() {
    const min = +f.min || 0, max = +f.max || Infinity;
    const okPrice = min <= max;
    $('priceErr').style.display = okPrice ? 'none' : 'block';
    $('typeBar').innerHTML = [['', 'All homes'], ...types.map(t => [t, t])].map(([k, l]) =>
      `<button class="rc-type-chip ${f.type === k ? 'active' : ''}" data-type="${k}"><i class="bi ${k ? RC.TYPE_ICON[k] : 'bi-grid-fill'}"></i><span>${l}</span></button>`).join('');

    const currentProperties = db.properties || [];
    const list = currentProperties.filter(p => !p.hidden && !p.isDeleted).filter(p => {
      if (f.type && p.type !== f.type) return false;
      if (f.loc && p.city !== f.loc && !p.location.toLowerCase().includes(f.loc.toLowerCase())) return false;
      if (f.avail && !p.available) return false;
      if (p.price < min || p.price > max) return false;
      if (f.q) {
        const hay = `${p.name} ${p.location} ${p.city} ${p.description} ${(p.amenities || []).join(' ')}`.toLowerCase();
        if (!hay.includes(f.q.toLowerCase())) return false;
      }
      return true;
    }).sort((a, b) => {
      if (f.sort === 'low') return a.price - b.price;
      if (f.sort === 'high') return b.price - a.price;
      if (f.sort === 'beds') return b.bedrooms - a.bedrooms;
      return (b.listed || '').localeCompare(a.listed || '');
    });

    $('resultTitle').textContent = `${list.length} home${list.length === 1 ? '' : 's'} for rent`;
    const chips = [];
    if (f.q) chips.push(['q', `“${f.q}”`]);
    if (f.loc) chips.push(['loc', f.loc]);
    if (f.type) chips.push(['type', f.type]);
    if (f.min || f.max) chips.push(['price', `${f.min ? RC.peso(f.min) : '₱0'} – ${f.max ? RC.peso(f.max) : 'any'}`]);
    if (f.avail) chips.push(['avail', 'Available now']);
    $('activeChips').innerHTML = chips.map(([k, l]) => `<button type="button" class="rc-chip py-1 small" data-unset="${k}">${RC.esc(l)} <i class="bi bi-x"></i></button>`).join('');
    $('results').innerHTML = list.length ? list.map(RC.propertyCard).join('') :
      `<div class="col-12 w-100"><div class="rc-empty"><i class="bi bi-house-slash"></i><h2 class="h5 mt-3">No homes match your filters</h2>
        <p class="text-muted">Try a wider price range, another location, or turn off “Available now only”.</p>
        <button class="btn btn-dark btn-pill" data-clear>Clear Filters</button></div></div>`;
    $('showBtn').textContent = `Show ${list.length} home${list.length === 1 ? '' : 's'}`;
    syncUrl();
  }
  function clearAll() {
    Object.assign(f, { q: '', loc: '', min: '', max: '', type: '', avail: false, sort: 'low' });
    $('fQ').value = ''; $('fLoc').value = ''; $('fMin').value = ''; $('fMax').value = ''; $('fType').value = ''; $('fAvail').checked = false; $('fSort').value = 'low';
    render();
  }

  $('filterForm').addEventListener('input', () => { readForm(); render(); });
  $('filterForm').addEventListener('submit', e => e.preventDefault());
  $('clearBtn').addEventListener('click', clearAll);
  main.addEventListener('click', e => {
    const t = e.target.closest('[data-type]'); if (t) { f.type = t.dataset.type; $('fType').value = f.type; render(); return; }
    const r = e.target.closest('[data-range]'); if (r) { const [a, b] = r.dataset.range.split(','); $('fMin').value = +a || ''; $('fMax').value = b; readForm(); render(); return; }
    const u = e.target.closest('[data-unset]'); if (u) { const k = u.dataset.unset; f[k] = k === 'avail' ? false : ''; const map = { q: 'fQ', loc: 'fLoc', type: 'fType', min: 'fMin', max: 'fMax' }; if (k === 'avail') $('fAvail').checked = false; else $(map[k]).value = ''; render(); return; }
    if (e.target.closest('[data-clear]')) clearAll();
  });

  (async () => {
    if (RC.syncProperties) await RC.syncProperties();
    render();
  })();
})();

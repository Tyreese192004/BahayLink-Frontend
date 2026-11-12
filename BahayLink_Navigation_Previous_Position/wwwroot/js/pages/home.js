/* Homepage: hero search, featured properties, how it works, why us, locations (Connected to Backend API) */
(function () {
  const me = RC.me();
  if (me && me.role === 'owner') {
    location.replace('owner-dashboard.html');
    return;
  }
  const db = RC.db, main = document.getElementById('main');
  const cities = ['Tarlac', 'Pangasinan', 'Pampanga', 'Quezon Province', 'Laguna'];
  const types = ['House', 'Apartment', 'Room'];
  const homepageTypes = ['Apartment', 'House', 'Room'];

  function render() {
    const visible = (db.properties || []).filter(p => !p.hidden && !p.isDeleted);
    const featured = visible.filter(p => p.available).sort((a, b) => a.price - b.price || a.name.localeCompare(b.name)).slice(0, 8);
    const cityCards = cities
      .map(c => ({ c, list: visible.filter(p => p.city === c) })).filter(x => x.list.length);

    main.innerHTML = `
    <section class="container-xxl pt-3 pt-lg-4">
      <div class="rc-hero">
        ${RC.img(db.IMG.hero, 'Modern house with large windows at dusk', '', 'fetchpriority="high" loading="eager"')}
        <div class="rc-hero-content">
          <h1 class="mb-3">Find Your Next Home with BahayLink</h1>
          <p class="mb-4">Explore beautiful rental homes and connect directly with the property owner.</p>
          <form class="rc-search" id="heroSearch" role="search" novalidate>
            <div class="seg"><label for="sLoc">Location</label>
              <select id="sLoc"><option value="">All locations</option>${cities.map(c => `<option>${c}</option>`).join('')}</select></div>
            <div class="seg"><label for="sMin">Min. monthly price</label><input id="sMin" type="number" min="0" step="500" inputmode="numeric" placeholder="₱ No minimum"></div>
            <div class="seg"><label for="sMax">Max. monthly price</label><input id="sMax" type="number" min="0" step="500" inputmode="numeric" placeholder="₱ No maximum"></div>
            <div class="seg"><label for="sType">Property type</label>
              <select id="sType">${types.map(t => `<option>${t}</option>`).join('')}</select></div>
            <button class="btn btn-dark btn-search" type="submit"><i class="bi bi-search"></i><span>Search</span></button>
          </form>
          <div id="heroSearchHint" class="small mt-2" aria-live="polite"></div>
        </div>
      </div>
    </section>

    <section class="container-xxl rc-section-sm">
      <div class="rc-home-typebar" aria-label="Browse by property type">
        ${homepageTypes.map(t => `<a class="rc-home-type-pill" href="browse.html?type=${encodeURIComponent(t)}"><i class="bi ${RC.TYPE_ICON[t]}" aria-hidden="true"></i><span>${t}</span><span class="rc-home-type-count">${visible.filter(p => p.type === t).length} listed</span></a>`).join('')}
      </div>
    </section>

    <section class="container-xxl pb-5" aria-labelledby="featTitle">
      <div class="d-flex justify-content-between align-items-end gap-3 mb-4 flex-wrap">
        <div><div class="rc-eyebrow mb-1">Featured properties</div><h2 id="featTitle" class="h3 mb-0">Homes available now</h2></div>
        <a href="browse.html" class="btn btn-dark btn-pill">View All Properties <i class="bi bi-arrow-right ms-1"></i></a>
      </div>
      <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-4">
        ${featured.length ? featured.map(RC.propertyCard).join('') : '<div class="col-12 w-100"><div class="rc-empty bg-white py-5 text-center"><i class="bi bi-houses"></i><h3 class="h5 mt-3">No rental properties available yet</h3><p class="text-muted mb-0">Check back soon or explore properties when owners post new listings.</p></div></div>'}
      </div>
    </section>

    <section class="rc-section" id="how" style="background:var(--rc-soft)" aria-labelledby="howTitle">
      <div class="container-xxl">
        <div class="text-center mb-5"><div class="rc-eyebrow mb-2">How BahayLink works</div><h2 id="howTitle" class="h2">From browsing to a clear answer, in three steps</h2></div>
        <div class="row g-4">
          ${[['Find a home', 'Browse listings with real photos, monthly rent, amenities and the documents each owner requires.'],
             ['Send an inquiry and talk to the owner', 'Ask about availability, viewing schedules and requirements, then continue the conversation through built-in messaging while tracking your inquiry status.'],
             ['Sightseeing', 'Arrange a property viewing with the owner, visit the location and see whether the rental home suits your needs.']]
            .map(([t, d], i) => `<div class="col-md-4"><div class="rc-step bg-white"><div class="rc-step-num">${i + 1}</div><h3 class="h5">${t}</h3><p class="text-muted mb-0">${d}</p></div></div>`).join('')}
        </div>
        <p class="text-center text-muted small mt-4 mb-0"><i class="bi bi-info-circle me-1"></i>BahayLink is for inquiries and communication. Leases and payments are arranged directly with the owner.</p>
      </div>
    </section>

    <section class="container-xxl rc-section pb-4">
      <div class="text-center mb-5"><div class="rc-eyebrow mb-2">Why renters choose BahayLink</div><h2 class="h2">Clear answers directly from the property owner</h2></div>
      <div class="row g-4 align-items-center">
        <div class="col-lg-5"><div class="rc-why-card">${RC.img(db.IMG.why, 'Bright interior with sofa and lamp')}</div></div>
        <div class="col-lg-7"><div class="row g-4">
          ${[['bi-chat-dots', 'Direct communication', 'Message the property owner directly to ask about terms, move-in dates and viewings.'],
             ['bi-chat-square-text', 'Every conversation saved', 'Your messages with each owner stay together, so you never scroll through other apps to find an answer.'],
             ['bi-signpost-split', 'Clear inquiry status', 'Pending, Ongoing or Resolved — both sides see the same status at a glance.'],
             ['bi-shield-lock', 'Your data is protected', 'Contact details are shared only with the owner you inquire with, in line with the Data Privacy Act of 2012.']]
            .map(([i, t, d]) => `<div class="col-sm-6"><div class="rc-feature"><span class="rc-feature-ico"><i class="bi ${i}"></i></span><div><h3 class="h6 mb-1">${t}</h3><p class="text-muted small mb-0">${d}</p></div></div></div>`).join('')}
        </div></div>
      </div>
    </section>

    <section class="container-xxl pb-5" aria-labelledby="locTitle">
      <div class="rc-eyebrow mb-1">Featured rental homes</div>
      <h2 id="locTitle" class="h3 mb-4">Popular locations</h2>
      <div class="row row-cols-2 row-cols-md-3 g-3 g-md-4">
        ${cityCards.length ? cityCards.map(({ c, list }) => `<div class="col"><a class="rc-city" href="browse.html?loc=${encodeURIComponent(c)}">${RC.img(RC.cover(list[0]), c)}<span>${c}<small>${list.length} rental${list.length > 1 ? 's' : ''} · from ${RC.peso(Math.min(...list.map(p => p.price)))}</small></span></a></div>`).join('') : '<div class="col-12 w-100"><div class="rc-empty bg-white py-4 text-center"><p class="text-muted mb-0">No locations listed yet.</p></div></div>'}
      </div>
    </section>

    <section class="container-xxl pb-4">
      <div class="rc-cta row g-0 align-items-stretch">
        <div class="col-md-6 p-4 p-lg-5 d-flex flex-column justify-content-center">
          <h2 class="h2">Find your next rental home with BahayLink</h2>
          <p class="opacity-75">Browse rental homes, send inquiries, and message the property owner in one convenient place.</p>
        </div>
        <div class="col-md-6">${RC.img(db.IMG.cta, 'Bright living room')}</div>
      </div>
    </section>`;

    const heroSearch = document.getElementById('heroSearch');
    if (heroSearch) {
      heroSearch.addEventListener('submit', e => {
        e.preventDefault();
        const min = document.getElementById('sMin').value, max = document.getElementById('sMax').value;
        const hint = document.getElementById('heroSearchHint');
        if (min && max && +min > +max) { hint.innerHTML = '<span class="badge text-bg-light">Minimum price must be lower than the maximum.</span>'; return; }
        const q = new URLSearchParams();
        const loc = document.getElementById('sLoc').value, type = document.getElementById('sType').value;
        if (loc) q.set('loc', loc); if (min) q.set('min', min); if (max) q.set('max', max); if (type) q.set('type', type);
        location.href = 'browse.html' + (q.toString() ? '?' + q : '');
      });
    }
  }

  (async () => {
    if (RC.syncProperties) await RC.syncProperties();
    render();
  })();
})();

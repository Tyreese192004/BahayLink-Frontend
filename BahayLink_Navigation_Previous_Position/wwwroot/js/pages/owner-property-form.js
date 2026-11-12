/* Owner: Add / Edit Property form with image previews (Connected to Backend API) */
(function () {
  if (RC.blocked) return;
  const db = RC.db, main = document.getElementById('main'), me = RC.me();
  const API_BASE = (location.port === '5115') ? '' : 'http://localhost:5115';
  const editing = RC.qs('id') ? RC.prop(RC.qs('id')) : null;
  if (editing) {
    document.body.dataset.title = 'Edit Property';
    const topH1 = document.querySelector('.rc-topbar h1');
    if (topH1) topH1.textContent = 'Edit Property';
    document.title = 'Edit Property · BahayLink';
  }
  const p = editing || {
    name: '',
    description: '',
    location: '',
    city: '',
    price: '',
    type: 'House',
    bedrooms: 1,
    bathrooms: 1,
    area: '',
    available: true,
    amenities: [],
    requirements: ['2 valid government IDs', 'Proof of income (payslip or COE)', '1 month advance + 2 months deposit'],
    images: []
  };
  const COMMON = ['Wi-Fi ready', 'Air conditioning', 'Parking for 1 car', 'Water heater', 'Fully furnished', 'Semi-furnished', 'Laundry area', 'Gated & guarded', 'CCTV', 'Pet friendly', 'Garden', 'Balcony', 'Pool', 'Gym', 'Own electric meter'];
  const amen = new Set(p.amenities || []);
  let images = [...(p.images || [])];
  const cities = ['Tarlac', 'Pangasinan', 'Pampanga', 'Quezon Province', 'Laguna'];

  main.innerHTML = `<form id="propForm" novalidate>
    <div class="row g-4">
      <div class="col-xl-8 d-grid gap-4">
        <section class="rc-panel"><h2 class="h5 mb-3">Basic information</h2>
          <div class="mb-3 rc-field"><label class="form-label" for="fName">Property name</label><input class="form-control" id="fName" maxlength="80" value="${RC.esc(p.name)}" placeholder="e.g. Modern Two-Storey House"><div class="invalid-feedback"></div></div>
          <div class="mb-3 rc-field"><label class="form-label" for="fType">Property type</label><select class="form-select" id="fType">${['House', 'Apartment', 'Room'].map(t => `<option ${p.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="rc-field"><label class="form-label" for="fDesc">Description</label><textarea class="form-control" id="fDesc" rows="5" maxlength="1200" placeholder="Describe the home, the neighborhood and what’s nearby.">${RC.esc(p.description)}</textarea>
            <div class="d-flex"><div class="invalid-feedback"></div><small class="text-muted ms-auto" id="descCount">${(p.description || '').length} / 1200</small></div></div>
        </section>
        <section class="rc-panel"><h2 class="h5 mb-3">Location and price</h2><div class="row g-3">
          <div class="col-md-7 rc-field"><label class="form-label" for="fLoc">Location / address</label><input class="form-control" id="fLoc" value="${RC.esc(p.location || p.address)}" placeholder="e.g. Tarlac City, Tarlac"><div class="invalid-feedback"></div></div>
          <div class="col-md-5 rc-field"><label class="form-label" for="fCity">Province</label><input class="form-control" id="fCity" list="cityList" value="${RC.esc(p.city)}" placeholder="Select or enter province"><datalist id="cityList">${cities.map(c => `<option value="${c}">`).join('')}</datalist><div class="invalid-feedback"></div></div>
          <div class="col-md-4 rc-field"><label class="form-label" for="fPrice">Monthly rental price (₱)</label><input class="form-control" id="fPrice" type="number" min="0" step="500" value="${p.price || ''}"><div class="invalid-feedback"></div></div>
          <div class="col-4 col-md-2 rc-field"><label class="form-label" for="fBed">Bedrooms</label><input class="form-control" id="fBed" type="number" min="0" max="20" value="${p.bedrooms}"><div class="invalid-feedback"></div></div>
          <div class="col-4 col-md-2 rc-field"><label class="form-label" for="fBath">Bathrooms</label><input class="form-control" id="fBath" type="number" min="1" max="20" value="${p.bathrooms}"><div class="invalid-feedback"></div></div>
          <div class="col-4 col-md-4 rc-field"><label class="form-label" for="fArea">Floor area (sqm)</label><input class="form-control" id="fArea" type="number" min="1" value="${p.area || ''}"><div class="invalid-feedback"></div></div>
        </div></section>
        <section class="rc-panel"><h2 class="h5 mb-1">Amenities</h2><p class="text-muted small">Select everything the home includes.</p>
          <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-2 mb-3" id="amenGrid"></div>
          <div class="input-group" style="max-width:420px"><input class="form-control" id="amenNew" placeholder="Add another amenity" aria-label="Add another amenity"><button class="btn btn-dark" type="button" id="amenAdd">Add</button></div>
        </section>
        <section class="rc-panel"><h2 class="h5 mb-1">Rental requirements</h2><p class="text-muted small">One requirement per line. Renters see these before they send an inquiry.</p>
          <textarea class="form-control" id="fReq" rows="4">${RC.esc((p.requirements || []).join('\n'))}</textarea></section>
      </div>
      <div class="col-xl-4 d-grid gap-4 align-content-start">
        <section class="rc-panel"><h2 class="h5 mb-3">Photos</h2>
          <label class="rc-drop d-block" id="drop" for="fFiles"><i class="bi bi-cloud-arrow-up"></i><div class="fw-semibold mt-2">Drag photos here or click to upload</div><div class="small text-muted">JPG or PNG · the first photo is the cover</div></label>
          <input type="file" id="fFiles" accept="image/*" multiple class="visually-hidden">
          <div class="rc-previews mt-3" id="previews"></div>
          <p class="rc-demo-note mt-2 mb-0"><i class="bi bi-info-circle"></i>Photos are saved and linked to the property listing.</p></section>
        <section class="rc-panel"><h2 class="h5 mb-3">Availability</h2>
          <div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="fAvail" ${p.available ? 'checked' : ''}><label class="form-check-label fw-semibold" for="fAvail">Available for rent</label></div>
          <p class="small text-muted mb-0 mt-1">Renters can still inquire about unavailable homes.</p></section>
        <div class="d-grid gap-2"><button class="btn btn-primary btn-lg" type="submit" id="submitBtn">${editing ? 'Save changes' : 'Publish property'}</button><a class="btn btn-light-soft" href="owner-properties.html">Cancel</a></div>
      </div>
    </div></form>`;

  const $ = id => document.getElementById(id);
  function renderAmen() {
    const list = [...new Set([...COMMON, ...amen])];
    $('amenGrid').innerHTML = list.map((a, i) => `<div class="col"><label class="rc-amen-check" for="am${i}"><input class="form-check-input m-0" type="checkbox" id="am${i}" data-amen="${RC.esc(a)}" ${amen.has(a) ? 'checked' : ''}><i class="bi ${RC.AMENITY_ICON(a)}"></i><span class="small">${RC.esc(a)}</span></label></div>`).join('');
  }
  function renderPreviews() {
    $('previews').innerHTML = images.map((src, i) => `<div class="rc-preview">${RC.img(src, `Photo ${i + 1}`)}${i === 0 ? '<span class="cover rc-badge muted no-dot">Cover</span>' : `<button type="button" class="cover btn btn-sm bg-white py-0 px-2 small" data-cover="${i}" style="width:auto;height:auto;border-radius:999px">Set cover</button>`}<button type="button" data-rm="${i}" aria-label="Remove photo ${i + 1}"><i class="bi bi-x-lg"></i></button></div>`).join('');
  }
  function addFiles(files) {
    [...files].filter(f => f.type && f.type.startsWith('image/')).forEach(f => {
      const fr = new FileReader();
      fr.onload = () => {
        const im = new Image();
        im.onload = () => {
          const s = Math.min(1, 1200 / im.width), c = document.createElement('canvas');
          c.width = im.width * s;
          c.height = im.height * s;
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          images.push(c.toDataURL('image/jpeg', .75));
          renderPreviews();
        };
        im.onerror = () => RC.toast(`${f.name} couldn’t be read as an image.`, 'error');
        im.src = fr.result;
      };
      fr.readAsDataURL(f);
    });
  }

  $('fFiles').addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));

  main.addEventListener('click', e => {
    const rm = e.target.closest('[data-rm]'); if (rm) { images.splice(+rm.dataset.rm, 1); renderPreviews(); }
    const cv = e.target.closest('[data-cover]'); if (cv) { const [x] = images.splice(+cv.dataset.cover, 1); images.unshift(x); renderPreviews(); }
  });
  main.addEventListener('change', e => { const a = e.target.dataset.amen; if (a) e.target.checked ? amen.add(a) : amen.delete(a); });
  $('amenAdd').addEventListener('click', () => { const v = $('amenNew').value.trim(); if (!v) return; amen.add(v); $('amenNew').value = ''; renderAmen(); });
  $('amenNew').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('amenAdd').click(); } });
  $('fDesc').addEventListener('input', () => $('descCount').textContent = `${$('fDesc').value.length} / 1200`);

  $('propForm').addEventListener('submit', async e => {
    e.preventDefault();
    const v = id => $(id).value.trim();
    const ok = [
      RC.setInvalid($('fName'), v('fName').length < 4 ? 'Give the property a name of at least 4 characters.' : ''),
      RC.setInvalid($('fDesc'), v('fDesc').length < 20 ? 'Write at least 20 characters so renters know what to expect.' : ''),
      RC.setInvalid($('fLoc'), v('fLoc') ? '' : 'Enter the location.'),
      RC.setInvalid($('fCity'), v('fCity') ? '' : 'Enter the city / province.'),
      RC.setInvalid($('fPrice'), +v('fPrice') > 0 ? '' : 'Enter the monthly rent in pesos.'),
      RC.setInvalid($('fBed'), v('fBed') !== '' && +v('fBed') >= 0 ? '' : 'Required.'),
      RC.setInvalid($('fBath'), +v('fBath') >= 1 ? '' : 'At least 1.'),
      RC.setInvalid($('fArea'), +v('fArea') > 0 ? '' : 'Enter the floor area.')
    ].every(Boolean);

    if (!ok) {
      const firstInvalid = document.querySelector('.is-invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    if (!images.length) RC.toast('Tip: listings with photos get more inquiries.', 'info');

    const submitBtn = $('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving to database...';

    const ownerUserId = me ? (me.id || me.userId) : null;
    const payload = {
      ownerId: (typeof ownerUserId === 'number') ? ownerUserId : null,
      name: v('fName'),
      type: v('fType'),
      description: v('fDesc'),
      location: v('fLoc'),
      city: v('fCity'),
      price: +v('fPrice'),
      bedrooms: +v('fBed'),
      bathrooms: +v('fBath'),
      area: +v('fArea'),
      available: $('fAvail').checked,
      amenities: [...amen],
      requirements: v('fReq').split('\n').map(s => s.trim()).filter(Boolean),
      images: images
    };

    let serverSaved = false;
    let createdProperty = null;
    let errorMsg = '';

    try {
      const url = editing ? `${API_BASE}/api/properties/${editing.id}` : `${API_BASE}/api/properties`;
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        createdProperty = await res.json();
        serverSaved = true;
      } else {
        const err = await res.json().catch(() => ({}));
        errorMsg = err.message || err.error || `Server responded with status ${res.status}`;
      }
    } catch (err) {
      errorMsg = `Hindi makakonekta sa backend server (${API_BASE}). Siguraduhing tumatakbo ang dotnet run.`;
    }

    if (!serverSaved) {
      submitBtn.disabled = false;
      submitBtn.textContent = editing ? 'Save changes' : 'Publish property';
      RC.toast(errorMsg, 'error');
      console.error('Failed to save to database:', errorMsg);
      return;
    }

    // Successfully saved to PostgreSQL database!
    const localData = {
      id: createdProperty.id,
      ownerId: createdProperty.ownerId,
      name: createdProperty.name,
      type: createdProperty.type,
      description: createdProperty.description,
      location: createdProperty.location,
      city: createdProperty.city,
      price: createdProperty.price,
      bedrooms: createdProperty.bedrooms,
      bathrooms: createdProperty.bathrooms,
      area: createdProperty.area,
      available: createdProperty.available,
      amenities: createdProperty.amenities,
      requirements: createdProperty.requirements,
      images: createdProperty.images,
      listed: (createdProperty.createdAt || RC.nowIso()).slice(0, 10)
    };

    if (editing) {
      Object.assign(editing, localData);
      RC.log('listing', RC.fullName(me), `updated ${localData.name}`);
    } else {
      db.properties = db.properties || [];
      db.properties.unshift(localData);
      RC.log('listing', RC.fullName(me), `published ${localData.name}`);
    }

    RC.save();
    RC.toast(editing ? 'Property updated in database!' : 'Property successfully saved to database!', 'success');

    setTimeout(() => {
      location.href = 'owner-properties.html';
    }, 700);
  });

  renderAmen();
  renderPreviews();
})();

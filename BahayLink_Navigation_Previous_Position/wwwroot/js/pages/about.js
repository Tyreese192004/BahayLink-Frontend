/* About BahayLink */
(function () {
  const db = RC.db, main = document.getElementById('main');
  main.innerHTML = `
  <section class="container-xxl pt-4">
    <div class="rc-hero" style="min-height:380px">
      ${RC.img(db.IMG.ext4, 'Modern home exterior', '', 'loading="eager"')}
      <div class="rc-hero-content">
        <h1 class="mb-3" style="max-width:20ch">A clearer way to ask about rental homes</h1>
        <p class="mb-0">BahayLink brings rental listings, inquiries and conversations together in one place, so renters get answers and the owner never loses a message.</p></div>
    </div>
  </section>
  <section class="container-xxl rc-section">
    <div class="row gx-4 gy-5">
      <div class="col-lg-5"><div class="rc-eyebrow mb-2">Why we built it</div><h2 class="h3">Inquiries were scattered across calls, texts and social media</h2></div>
      <div class="col-lg-7 text-muted" style="max-width:68ch">
        <p>The property owner answers rental questions through phone calls, text messages and chat apps at the same time. Messages get overlooked, replies are delayed, and it’s hard to tell which renters are still waiting.</p>
        <p class="mb-0">BahayLink gives the owner one dashboard for their listings and every inquiry, and gives renters a simple way to see photos, prices and requirements, ask a question, and follow the answer.</p></div>
    </div>
  </section>
  <section class="rc-section" id="how" style="background:var(--rc-soft)">
    <div class="container-xxl"><div class="text-center mb-5"><div class="rc-eyebrow mb-2">How it works</div><h2 class="h3">Three steps from browsing to an answer</h2></div>
      <div class="row g-4">${[['Find a home', 'Browse listings with photos, monthly rent, amenities and the documents each owner requires.'], ['Send an inquiry', 'Ask about availability, a viewing schedule or the requirements from the listing page.'], ['Talk to the owner', 'Continue in built-in messaging and follow your inquiry from Pending to Ongoing to Resolved.']]
        .map(([t, d], i) => `<div class="col-md-4"><div class="rc-step bg-white"><div class="rc-step-num">${i + 1}</div><h3 class="h5">${t}</h3><p class="text-muted mb-0">${d}</p></div></div>`).join('')}</div></div>
  </section>
  <section class="container-xxl rc-section">
    <div class="row g-4">
      <div class="col-md-6"><div class="rc-panel h-100"><h2 class="h5"><i class="bi bi-check2-circle me-2" style="color:var(--rc-resolved)"></i>What BahayLink does</h2>
        <ul class="text-muted mb-0"><li>Property listings with photos, prices, amenities and requirements</li><li>Inquiry forms and two-way text messaging</li><li>Inquiry status tracking and notifications</li><li>Customer records and basic inquiry reports for owners</li></ul></div></div>
      <div class="col-md-6"><div class="rc-panel h-100"><h2 class="h5"><i class="bi bi-info-circle me-2"></i>What happens outside BahayLink</h2>
        <ul class="text-muted mb-0"><li>Reservations and booking confirmations</li><li>Payments, billing and deposits</li><li>Lease contracts and tenant screening</li><li>Voice or video calls</li></ul></div></div>
    </div>
    <div class="rc-panel mt-4 d-flex flex-wrap gap-4 justify-content-between align-items-center">
      <div><h2 class="h5 mb-1">Contact us</h2><p class="text-muted mb-0">Questions about BahayLink or your data under RA 10173.</p></div>
      <div class="d-flex flex-wrap gap-4"><span><i class="bi bi-house-heart me-2"></i>Rental inquiries and communication</span></div>
    </div>
  </section>`;
})();

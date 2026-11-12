/* =========================================================
   BahayLink — data layer
   Mock data removed. Real records will be populated through
   the application or via the ASP.NET Core API backend.
   ========================================================= */
(function () {
  const U = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

  // UI layout and hero images
  const IMG = {
    hero: U('1600585154340-be6161a56a0c', 2000),
    auth: U('1600596542815-ffad4c1539a9', 1600),
    cta: U('1600607687939-ce8a6c25118c', 1400),
    ext5: 'images/signup-house.jpg',
    signup: 'images/signup-house.jpg'
  };

  // Primary Property Owner / Administrator account (Maria Santos)
  const owners = [
    {
      id: 'o1',
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria.santos@bahaylink.ph',
      phone: '0917 555 0142',
      city: 'Quezon City',
      since: '2026-10-28',
      responseTime: 'within a day',
      verified: true
    }
  ];

  // Clean data stores — zero mock/dummy records
  const renters = [];
  const properties = [];
  const inquiries = [];
  const conversations = [];
  const notifications = [];
  const activity = [];
  const monthlyHistory = {};

  window.RC_DATA = {
    IMG,
    owners,
    renters,
    properties,
    inquiries,
    conversations,
    notifications,
    activity,
    monthlyHistory,
    admins: [],
    userStatus: {},
    userStatusMeta: {}
  };
})();

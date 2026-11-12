# BahayLink — Frontend (Phase 1)

Frontend for **Web-Based House Rental Inquiry and Communication Management System**.
HTML5 · CSS3 · JavaScript · Bootstrap 5.3 · Bootstrap Icons · Chart.js. **No backend yet.**

## Run it
Open `wwwroot/index.html` in a browser (internet needed for Bootstrap, icons, fonts and sample photos).
Or serve the folder: `npx serve wwwroot` / VS Code Live Server.

### Signing in (preview build)
There is one login page, `login.html`, for every account. The role comes from the account, never from the user:
renters go to `renter-dashboard.html`, and Maria Santos (the single Property Owner/Administrator) goes to `owner-dashboard.html`.
Public sign-up creates **Renter accounts only**. The client/administrator and existing property-owner account cannot be created through public registration.

Until the backend exists the site runs in **preview mode** (`RC.AUTH_MODE = 'preview'` in `js/auth.js`):
- Sample emails work with any password of 8+ characters, e.g. `juan.delacruz@gmail.com` (renter) or
  `maria.santos@bahaylink.ph` (owner). Passwords are **never stored or verified** in the browser.
- New sign-ups are saved as profiles only (no password).
- Maria Santos has **one combined Owner/Administrator dashboard**. No second admin account or role switch is needed.

### Local development preview
`dev-preview.html` (not linked anywhere, works only from `file://` or `localhost`) opens the renter preview and Maria’s one combined Owner/Administrator preview, and can reset sample data. **Delete `dev-preview.html` and
`js/pages/dev-preview.js` before deployment.**

### What is NOT security yet
Page redirects in `js/auth.js` only improve the experience; anything in browser JavaScript can be changed.
Real protection is done in the backend phase:
1. ASP.NET Core Identity with hashed passwords, account lockout and secure cookies (HTTPS).
2. Create one privately provisioned owner/administrator account for Maria on the server; public registration must only create `Renter` accounts. Reject privileged sign-up requests on the server, regardless of the submitted role.
3. `[Authorize(Roles = "Owner")]` on owner and administration controllers, and `[Authorize(Roles = "Renter")]` on renter controllers.
4. Implement the endpoints used by `ApiAuthProvider` in `js/auth.js` (`/api/auth/login`, `/register`,
   `/forgot-password`, `/logout`, `/me`), then set `RC.AUTH_MODE = 'api'`.

## Pages
| Area | Pages |
|---|---|
| Public | `index.html`, `browse.html`, `property.html?id=p1`, `about.html` |
| Auth (UI only) | `login.html`, `signup.html` |
| Renter | `renter-dashboard.html`, `my-inquiries.html`, `messages.html`, `notifications.html`, `profile.html` |
| Owner | `owner-dashboard.html`, `owner-properties.html`, `owner-property-form.html` (add / `?id=` edit), `owner-inquiries.html`, `owner-messages.html`, `owner-customers.html`, `owner-reports.html`, `owner-notifications.html`, `owner-settings.html` |
| Administration within Maria’s dashboard | `admin-users.html`, `admin-listings.html`, `admin-reports.html`, `admin-activity.html` (all part of Maria’s Owner/Administrator sidebar). `admin-dashboard.html` redirects to `owner-dashboard.html`. |

## Structure
```
wwwroot/
  css/site.css            design system (colors, cards, chat, dashboard, responsive rules)
  js/data.js              mock data — one array per future database table
  js/core.js              sample-data state (localStorage), formatting, cards, badges, modals, toasts
  js/auth.js              sign-in layer: preview provider now, ASP.NET Core API provider stub for later
  js/layout.js            navbar, footer, dashboard sidebar/topbar, notification + profile dropdowns
  js/pages/*.js           one script per page
  images/                 favicon; put your own property photos here
```
Each HTML page declares its layout on `<body>` (`data-layout`, `data-active`, `data-role`) and loads its page script.

## Moving into ASP.NET Core MVC
1. Copy `css/`, `js/`, `images/` into your project's `wwwroot/`.
2. Make `Views/Shared/_Layout.cshtml` from the `<head>` and script tags of any page; put `@RenderBody()` inside `<main id="main">`.
   Use the same `<body data-…>` attributes (set them from `ViewData`). Create `_DashboardLayout.cshtml` the same way for owner/admin pages.
3. Each page becomes a view, e.g. `Views/Properties/Browse.cshtml`, with `@section Scripts { <script src="~/js/pages/browse.js"></script> }`.
4. Connect the backend by replacing reads/writes of `RC.db` (in `core.js` and page scripts) with `fetch()` calls to your controllers.
   The record shapes in `data.js` (properties, inquiries, conversations/messages, notifications, users) are a starting point for the database tables.
5. Authentication: see "What is NOT security yet" above — only `js/auth.js` needs to change on the frontend.

## Not included (by design)
Backend, database, real authentication, APIs, real-time messaging, email/OTP, booking, reservations, payments, billing, AI features.
All saves are demonstrations stored in the browser's localStorage.

## October 2026 — photo-consistent demo rental prices
The twelve original demo listings have revised **illustrative** monthly rents based on their visual presentation and property type, rather than verified local rental-market comparisons. The Browse Rentals quick price filters now span ₱0–₱20,000, ₱20,000–₱40,000, ₱40,000–₱60,000, and ₱60,000+. Existing stored seed listings are migrated once **only if their original price is unchanged**; owner-customized prices and new listings are preserved.


## Philippine-style apartment imagery update
- Replaced the lead photos for p9 (Corner Apartment in Calamba) and p11 (Bright Two-Bedroom Apartment in San Pablo) with locally bundled, AI-generated Philippine-inspired apartment illustrations.
- Apartment rental cards and property detail galleries read from the same property images array.
- Added narrow localStorage migration for the original Unsplash exterior photo URLs only; custom owner photos are not touched.
- Illustrative demo imagery only; images are not proof of real properties at the listed addresses. Other gallery images remain generic demo photos.


2026-10-24: Removed About page hero eyebrow and capstone attribution. Updated pink brand controls, logo marks, icons, and text accents to black/charcoal across frontend; layout and functionality retained.

## Combined Owner/Administrator (frontend-only)
Maria Santos is the sole owner/administrator (`maria.santos@bahaylink.ph`).
Open `wwwroot/dev-preview.html` locally and choose **Open Owner/Administrator dashboard**, or sign in on `login.html` with Maria's sample email and any 8+ character demo password. This does **not** check real credentials and must not be deployed as secure authentication.
The single sidebar contains property management, inquiries, messages, customers, inquiry reports, notifications, user management, listing moderation, system reports and activity.
Previously saved preview sessions and demo accounts are migrated where possible. If a browser still shows stale demo content, press **Reset sample data** in the local developer-preview page (this discards locally added demo records).

### Manage Users: Account Archive & Recently Deleted

On `admin-users.html`, Maria can manage renters using **Active Users**, **Archive**, and **Recently Deleted** tabs.
- **Lock** moves an account to Archive and prevents further demo logins. **Unlock** returns it to Active Users.
- **Archive** manually archives an inactive account and prevents demo login. **Restore** returns it to Active Users. No automatic inactivity monitoring exists without a backend.
- **Delete** soft-deletes an account into Recently Deleted. **Restore** brings it back; **Delete permanently** removes the sample renter record and linked inquiries/messages from this browser after confirmation.
- Maria's primary account cannot be locked, archived, or deleted.
- Email addresses and phone numbers are visually masked on Manage Users, including the user detail view. Masking is **not encryption**; full demo contact values remain in local browser storage.
- These actions are **frontend-only demo behavior** in browser `localStorage`. They are not server-side security or synchronized across users/devices.


### Manage Users: Last Active and compact actions
- **Last Active** displays a relative time such as “5 minutes ago” after an account signs in or navigates the demo on this browser. It says **Never recorded** if no activity has been captured. Click the column title to sort newest/oldest, with unrecorded accounts last.
- Under **Actions**, the pencil opens user details and context-specific actions: **Lock/Archive** for active renters; **Unlock/Restore** for archived accounts; **Restore** for deleted accounts. The separate red trash icon moves accounts to **Recently Deleted** or permanently deletes them from that section after confirmation. Maria remains protected.
- Activity timestamps are **local frontend preview data**, not centrally verified last-seen information. A backend will be required for accurate activity across devices and accounts.


### Renter sign-up contact number (frontend preview)
- A contact number is required during renter sign-up. Accepts PH mobile formats `09XXXXXXXXX` or `+639XXXXXXXXX` (spaces and dashes permitted); stores it as `09XXXXXXXXX` in local demo data.
- The newly registered renter number is visible in their Profile and masked in Manage Users.
- When the backend is added, validate and persist this value server-side; browser-side validation is not a security control.

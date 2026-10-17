# RSTI Inventory

Node.js + Express server with a SQLite database named **RoenDB** (file: `RoenDB.db`, already created, with the first admin account).

## Run locally (Node 22.13 or newer)

    npm install
    npm start

Open http://localhost:3000 and sign in with `admin` / `admin123`. Change the password under Profile right away, then create the Basic and View-only accounts from the Accounts page.

## Project layout

    server.js            API, login and role checks
    RoenDB.db            the database (users, products, log, requests, releases, events)
    db/schema.sql        table definitions
    db/init.js           creates RoenDB if missing (npm run init-db)
    public/login.html    sign-in page
    public/dashboard.html, warehouse.html, transaction.html, calendar.html,
           history.html, accounts.html, profile.html, help.html
    public/css/style.css shared look (white and #2660a2)
    public/js/           common.js (sidebar, API calls) and one script per page

## Going online

- Set `SESSION_SECRET` to a long random text and `NODE_ENV=production`.
- Keep `RoenDB.db` on a persistent disk (set `DB_FILE`, for example `/data/RoenDB.db`) and back it up regularly. A host that wipes its disk on every deploy will erase the records.
- Serve it over HTTPS (Render, Railway, Fly.io, or a VPS with Nginx).

## Stock rules built into the system

- **Pull-in**: adding stock in the Warehouse (or the + button on a product row) records a pull-in and adds the quantity to stock. Pull-ins show under History > Pull-ins.
- **Warehouse 1 and Warehouse 2** keep separate records. The same product name and SKU can exist in both. Products from an older RoenDB file are placed in Warehouse 1 the first time the server starts.
- **Expiry hold**: an expired product cannot be released or requested until an admin approves an exception (shield button on the product row, with a reason). The exception only covers that expiration date, so a new date lifts the hold.
- **Cost per unit** is stored and shown to admins only.
- **Pull-out PDF (A4)**: every release produces a real PDF file made by the server (`pdf.js`). It lists the items (SKU, warehouse, quantity, what a repack becomes), the purpose/notes, transaction type, client or reference, the finished product for blending, who requested it and who approved it, with e-signatures if they were uploaded. Open it from the pop-up after releasing, from **Transaction > Your Transaction**, or **Approved transactions**. When an admin makes the request, the PDF says it was self-approved. Set the company name with the `COMPANY` environment variable (default: Roentgen Separation Technologie Inc.).
- **Your Transaction** tab: lists everything you requested or released, with details, status (Pending, Approved, Rejected, plus who decided) and the PDF for approved ones.
- Only admins can approve a request. Basic users can only open the PDF of their own transactions.
- Item rows: Trading, Repacking and Others start with 1 item; Blending starts with 2 (and goes back to 1 when you switch to another type).

- **Reorder points** (admin): Warehouse > **Reorder** tab. Each product has an optional *Lead time (days)* (days from ordering to delivery, set by hand) and *Safety days* (spare days). Average daily use comes from releases in the last 90 days (or since the item was added) and needs at least 3 releases. Reorder point = average use x (lead time + safety days). If the product's *Low-stock alert level* is filled in, it overrides the calculation. Status: Reorder now, OK, Set lead time, or Not enough data. Suggested order = enough to get back above the reorder point plus 30 days of usage (`COVER_DAYS` in `public/js/common.js`). The Dashboard shows a "Need to reorder" count, and the tab can be downloaded as CSV.

- **Dashboard** (one page, no tabs): clickable cards (Products, Low stock, Expiring, Need to reorder, Pending requests) that open the matching Warehouse or Transaction tab; Needs attention lists; a 7-day release trend; a donut chart of products by type (Chemical, Equipment, Others) whose slices open the Warehouse filtered by that type; the Top 10 most used items (released most often in the last 90 days); Recent activities; Releases by type; Largest stock. Every item name opens its detail window.
- **Recent activities** depend on the role: admin sees everything in the system, basic users see their own requests, view-only accounts see recent stock additions and updates.
- **Notification bell** (top bar, all roles): admin gets everything that happens in the system, basic users get their pull-out requests approved or declined, view-only accounts get none (the button is there and says so). The red badge counts what is new since the bell was last opened (an admin's own actions are not counted). It refreshes every 45 seconds.
- The Warehouse has a new *Type of item* filter (All, Chemical, Equipment, Others).

- **Accounts** (admin): each account has an optional *Department* (Operations, Sales, Finance, Engineering, or Other typed in; the list is `DEPTS` in `public/js/common.js`). **Manage** edits name, username, department and role (you cannot change your own role). **Reset password** sets a new password (a *Generate* button makes a readable one), signs the user out everywhere, and by default makes them choose their own password at next sign-in. **Disable / Enable** blocks sign-in and signs the user out at once while keeping their history; you cannot disable yourself. The list can be filtered by department, and the global search also finds people by department. New accounts also ask for a new password at first sign-in unless you untick that box. Resets, edits and disables appear in History and in the admin's notifications.

- **Notification count**: the red number on the bell counts everything new since you last opened it, including your own actions (so it confirms that a save worked). It updates right after each save, not only every 45 seconds, and disappears at 0.
- **Accounts page** (v20): same look as the other pages. A banner, clickable summary tiles (All, Admins, Basic, View-only, Disabled), a toolbar with search and a department filter, and a list with avatars, role and status badges and Manage / Reset password / Disable buttons. Creating an account is a three-step form with role cards. The pop-ups show the person's avatar.

Run `npm install` after updating (the PDF feature adds the `pdfkit` package). The database upgrades itself on start.

- **Page-load effect** (v22): Transaction and Warehouse now fade in block by block like Accounts and the Dashboard, and the summary tiles count up. "Your Transaction" shows a shimmering placeholder while it loads. The helpers `fa()` and `countUp()` are in `public/js/common.js`, so any page can use them. Users who prefer reduced motion get no animation.
- **History page** (v22): a banner, clickable summary tiles (All, Releases, Pull-ins, Other changes), a toolbar (search, person filter, All time / Today / 7 days / 30 days, Export CSV) and a feed grouped by day with an icon and avatar for each event and a PDF button on releases. It draws 60 rows at a time with a "Show more" button.
- **Profile page** (v22): a banner with your avatar, role, department and signature status. The Profile tab has a numbered form (details, then password with a Show button, a strength meter and a "type it again" check) and an Account side card. The E-signature tab has a preview shown the way it prints above your name, plus drag-and-drop upload.
- **Sign-in page** (v23): a split layout with the company logo, a short summary of what the system does, and the form on the right (on phones only the form and logo show). The password has a Show/Hide button and a Caps Lock warning, the Sign in button shows a spinner while it checks, and a wrong password or an unreachable server gives a clear message.
- **Sidebar logo** (v24): the "RS" badge at the top of the sidebar is now the company logo mark (`public/img/favicon-192.png`).
- **Polish** (v25): the dashboard legends no longer overlap the donut or float to the right, KPI sub-text wraps instead of being clipped, and the page tabs move to their own row when they do not fit beside the search box. All loading and refresh effects (shimmer placeholders, fade-in, count-up numbers, growing bars, the sign-in spinner and the "Loading..." text in the bell) were removed, so pages show their data straight away.
- **Help page** (v26): a new Help item at the bottom of the sidebar with a Quick start, searchable How-to guides and an FAQ. It only shows what the signed-in role can do (Admin, Basic user, View-only). Files: `public/help.html`, `public/js/help.js`.
- **CSV export** (v27): every export now uses one shared helper (`downloadCsv` in `public/js/common.js`, UTF-8 with a BOM so Excel shows symbols correctly; text that starts with `=`, `+`, `@` is escaped so it cannot run as a formula). Warehouse: **Export CSV** on All products, Low stock and Expiring downloads exactly the rows in the list (search, warehouse and type filters included), for every role; the cost per unit and stock value columns are added for admins only. Dashboard: **Export report** in the banner downloads a sectioned report (summary, products by type and warehouse, low stock, expiring or expired, reorder for admins, top 10 used items, release mix, units released per day for the chosen range), for every role, using only the data that role already sees. The Reorder button is now **Export CSV** too, and History exports dates as `YYYY-MM-DD HH:MM`. The Help page has new guides for both exports.

- **Scan a QR code in the Transaction form** (Items section): **Scan QR code** opens the camera, reads the item's QR code (the static link `/warehouse.html/inventory=CODE`), and adds that item as a line, ready for its quantity. The field next to it accepts a handheld scanner (it types the link and presses Enter), a pasted link, or just the 7-digit inventory code. Expired, out-of-stock and unknown items are refused with a message. The live camera needs `https://` or `localhost`; over plain `http://` on a phone, the dialog's **Take or choose a photo** button still works. QR images are decoded in the browser with the bundled `public/js/jsQR.js` (jsQR, Apache-2.0), so nothing leaves the device.

- **Calendar** (sidebar, right below Dashboard, all roles): a full month grid plus an *Upcoming* list for scheduling future transactions, pull-ins, deliveries and other events. Admin and basic users add an event on a specific date and time (click a day to open the list of everything planned on it, then press **Add event**; or click the **+** on a day, or press **Add event** at the top). Each event has a title, a type, a date, an optional start and end time (or *All day*), an optional warehouse and notes. Click an event to see its details. Admins can change or delete any event; basic users only their own; view-only accounts can look but not add. Each date box in the grid shows at most two events, then **+N more**; click the day to see them all. Times read as `9am` or `1:30pm`. The month and year boxes and **Go to date** jump to any date. The legend above the grid hides or shows each type. Adding, editing and deleting events is recorded in History. Times are plain local clock times (no time zone conversion). Older `RoenDB.db` files get the new `events` table automatically the next time the server starts.
#   r s t i - i n v e n t o r y - s y s t e m  
 
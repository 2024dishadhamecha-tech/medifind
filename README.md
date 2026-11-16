# MediFind – Medicine Availability Finder

A web app that helps patients, family members and caregivers find medicines at nearby pharmacies. Search a medicine, see its **reported availability** (in stock / low stock / out of stock), and get each pharmacy's address, hours, phone number and directions.

## Features

- Medicine search by name, generic name or brand (with autocomplete)
- Availability status per pharmacy, with "reported X ago" timestamps
- "Use my location" to sort by distance (browser geolocation)
- Hide out-of-stock option
- One-tap **Call** and **Directions** (Google Maps) buttons
- Login / registration with **role-based access** (Admin, Pharmacy Staff, User)
- **Admin-only** stock management: mark Available / Low / Unavailable, set quantities, update one pharmacy or all pharmacies at once
- Responsive, accessible UI

## Tech stack

- **Frontend:** HTML, CSS, vanilla JavaScript (`public/`)
- **Backend:** Node.js + Express (`server.js`)
- **Data:** JSON file store, auto-created from demo data (`data/seed.js`)

## Run it

Requires [Node.js 18+](https://nodejs.org).

```bash
npm install
npm start
```

Open http://localhost:3000

In VS Code: open this folder, press **F5** (uses `.vscode/launch.json`), or run `npm run dev` in the terminal for auto-restart on changes.

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/medicines?q=para` | Autocomplete suggestions |
| GET | `/api/search?q=dolo&lat=19.07&lng=72.87&onlyAvailable=true` | Search; results grouped by medicine |
| GET | `/api/pharmacies/:id` | Pharmacy details |
| POST | `/api/auth/register` | `{ name, email, password }`. Always creates a normal **User** (any `role` sent is ignored) |
| POST | `/api/auth/login` | `{ email, password }` returns `{ token, user }` |
| GET | `/api/auth/me` | Current user (needs token) |
| PUT | `/api/stock` | **Admin only.** `{ pharmacyId, medicineId, status?, quantity? }`. Status: `in_stock`/`available`, `low_stock`, `out_of_stock`/`unavailable` |
| PUT | `/api/stock/bulk` | **Admin only.** `{ medicineId, status?, quantity?, pharmacyIds? }` (all pharmacies if `pharmacyIds` omitted) |

Send the token as `Authorization: Bearer <token>`. Missing/invalid/expired token → **401**. Logged in but not Admin → **403**.

## Roles and permissions

| Capability | Admin | Pharmacy Staff | User |
| --- | :-: | :-: | :-: |
| Search medicines, view availability and pharmacy details | ✅ | ✅ | ✅ |
| See exact stock quantities | ✅ | ❌ | ❌ |
| Update availability / quantities (button + API) | ✅ | ❌ | ❌ |

Demo accounts (created on first start in `data/users.json`):

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@medifind.test | Admin@123 |
| Pharmacy Staff | staff@medifind.test | Staff@123 |
| User | user@medifind.test | User@123 |

Security notes: passwords are hashed with scrypt; tokens are HMAC-signed and last 8 hours; the role is re-read from the user store on every request; the signing secret is generated into `data/.jwt-secret` (or set `JWT_SECRET`). Set `ADMIN_PASSWORD` before the first start to choose the admin password. **Change the demo passwords before any real use**, and serve over HTTPS.

## Project structure

```
medifind/
├── server.js          Express server + API
├── auth.js            Login, tokens, role middleware
├── data/seed.js       Demo pharmacies, medicines, stock generator
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
└── .vscode/launch.json
```

## Using real data

The pharmacies, phone numbers and stock levels are **sample data**. To go live:

1. Replace `data/seed.js` with real pharmacy records (or move to a database such as SQLite/PostgreSQL/MongoDB).
2. Add pharmacy login so shop owners update their own stock, instead of anonymous reports.
3. Add HTTPS, stronger rate limiting and input moderation before public launch.

Run `npm run reset-data` to regenerate the demo stock.

## Disclaimer

Availability is reported and may be out of date; users should call to confirm. This app does not provide medical advice.

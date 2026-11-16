const express = require('express');
const fs = require('fs');
const path = require('path');
const { pharmacies, medicines, buildInventory } = require('./data/seed');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
const INVENTORY_FILE = path.join(__dirname, 'data', 'inventory.json');
const STATUSES = ['in_stock', 'low_stock', 'out_of_stock'];
const STATUS_RANK = { in_stock: 0, low_stock: 1, out_of_stock: 2 };
const LOW_STOCK_LIMIT = 10; // quantity at or below this (but above 0) counts as "low stock"
const STATUS_ALIASES = { available: 'in_stock', unavailable: 'out_of_stock' };

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- Data layer (JSON file; swap for a real database later) ---------- */

function saveInventory(inv) {
  if (process.env.VERCEL) return;
  fs.writeFileSync(INVENTORY_FILE, JSON.stringify(inv, null, 2));
}

function loadInventory() {
  try {
    const inv = JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8'));
    // An inventory file made before a pharmacy was added to seed.js has no rows for it: add them.
    const have = new Set(inv.map((i) => i.pharmacyId));
    const missing = pharmacies.filter((p) => !have.has(p.id)).map((p) => p.id);
    if (missing.length) {
      inv.push(...buildInventory().filter((i) => missing.includes(i.pharmacyId)));
      saveInventory(inv);
    }
    return inv;
  } catch {
    const fresh = buildInventory();
    saveInventory(fresh);
    return fresh;
  }
}

let inventory = loadInventory();
const pharmacyById = new Map(pharmacies.map((p) => [p.id, p]));
const medicineById = new Map(medicines.map((m) => [m.id, m]));

/* ---------- Helpers ---------- */

function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function matchesQuery(medicine, q) {
  const haystack = [medicine.name, medicine.generic, medicine.category, ...medicine.brands]
    .join(' ')
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function parseCoord(value, min, max) {
  if (value === undefined || value === null || String(value).trim() === '') return null; // Number('') is 0, not "missing"
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/* ---------- API ---------- */

// Autocomplete suggestions
app.get('/api/medicines', (req, res) => {
  const q = String(req.query.q || '').trim();
  const list = q ? medicines.filter((m) => matchesQuery(m, q)) : medicines;
  res.json(list.slice(0, 10).map((m) => ({ id: m.id, name: m.name, brands: m.brands })));
});

// Search medicine -> pharmacies with availability (sorted by stock, then distance).
// Open to everyone; exact stock quantities are only included for Admins.
app.get('/api/search', auth.optionalAuth, (req, res) => {
  const isAdmin = req.user && req.user.role === auth.ROLES.ADMIN;
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    return res.status(400).json({ error: 'Please type at least 2 characters.' });
  }
  const onlyAvailable = req.query.onlyAvailable === 'true';
  const lat = parseCoord(req.query.lat, -90, 90);
  const lng = parseCoord(req.query.lng, -180, 180);
  const hasLocation = lat !== null && lng !== null;

  const groups = medicines
    .filter((m) => matchesQuery(m, q))
    .slice(0, 5)
    .map((medicine) => {
      let rows = inventory
        .filter((i) => i.medicineId === medicine.id)
        .map((i) => {
          const pharmacy = pharmacyById.get(i.pharmacyId);
          return {
            pharmacy,
            status: i.status,
            updatedAt: i.updatedAt,
            reports: i.reports || 1,
            ...(isAdmin ? { quantity: Number.isInteger(i.quantity) ? i.quantity : null } : {}),
            // exact great-circle distance (km); only rounded for display, never for sorting
            rawKm: hasLocation ? distanceKm(lat, lng, pharmacy.lat, pharmacy.lng) : null
          };
        });
      // Availability filter is applied BEFORE sorting and is independent of the order.
      if (onlyAvailable) rows = rows.filter((r) => r.status !== 'out_of_stock');

      rows.sort((a, b) =>
        hasLocation
          // With a location: strictly nearest -> farthest. Stock status only breaks exact ties.
          ? a.rawKm - b.rawKm ||
            STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
            a.pharmacy.name.localeCompare(b.pharmacy.name)
          // Without a location there is no distance, so show best availability first.
          : STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
            a.pharmacy.name.localeCompare(b.pharmacy.name)
      );

      rows = rows.map(({ rawKm, ...row }) => ({
        ...row,
        distanceKm: rawKm === null ? null : Math.round(rawKm * 10) / 10
      }));
      return { medicine, pharmacies: rows };
    });

  res.json({ query: q, hasLocation, groups });
});

// Pharmacy details
app.get('/api/pharmacies/:id', (req, res) => {
  const pharmacy = pharmacyById.get(req.params.id);
  if (!pharmacy) return res.status(404).json({ error: 'Pharmacy not found.' });
  res.json(pharmacy);
});

/* ---------- Authentication ---------- */

const authLimiter = auth.rateLimit(15, 10 * 60 * 1000, 'Too many attempts. Please try again in a few minutes.');

app.post('/api/auth/register', authLimiter, (req, res) => {
  const result = auth.register(req.body || {});
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  res.status(201).json({ token: auth.createToken(result.user), user: auth.publicUser(result.user) });
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  const result = auth.login(req.body || {});
  if (result.error) return res.status(401).json({ error: result.error });
  res.json({ token: auth.createToken(result.user), user: auth.publicUser(result.user) });
});

app.get('/api/auth/me', auth.authenticate, (req, res) => {
  res.json({ user: auth.publicUser(req.user) });
});

/* ---------- Stock management (ADMIN ONLY) ----------
   Every route below runs authenticate (valid token -> else 401) and then
   requireRole(admin) (else 403) BEFORE any data is read or changed. */

const adminOnly = [auth.authenticate, auth.requireRole(auth.ROLES.ADMIN)];

// Validates { status?, quantity? } and returns the values to store, or { error }.
function parseStockInput(body) {
  let { status, quantity } = body;
  if (typeof status === 'string') status = STATUS_ALIASES[status] || status;
  const hasStatus = status !== undefined && status !== null && status !== '';
  const hasQuantity = quantity !== undefined && quantity !== null && quantity !== '';

  if (!hasStatus && !hasQuantity) return { error: 'Provide a status and/or a quantity.' };
  if (hasStatus && !STATUSES.includes(status)) return { error: 'Invalid status.' };
  if (hasQuantity) {
    quantity = Number(quantity);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 100000) {
      return { error: 'Quantity must be a whole number from 0 to 100000.' };
    }
  }
  if (!hasStatus) {
    status = quantity === 0 ? 'out_of_stock' : quantity <= LOW_STOCK_LIMIT ? 'low_stock' : 'in_stock';
  } else if (hasQuantity && (status === 'out_of_stock') !== (quantity === 0)) {
    return { error: 'Quantity and status do not match: "Out of stock" means quantity 0.' };
  }
  return { status, quantity: hasQuantity ? quantity : undefined };
}

function applyStock(pharmacyId, medicineId, { status, quantity }, adminId) {
  let entry = inventory.find((i) => i.pharmacyId === pharmacyId && i.medicineId === medicineId);
  if (!entry) {
    entry = { pharmacyId, medicineId, status, reports: 0 };
    inventory.push(entry);
  }
  entry.status = status;
  if (quantity !== undefined) entry.quantity = quantity;
  else if (status === 'out_of_stock') entry.quantity = 0;
  else if (entry.quantity === 0) delete entry.quantity; // stale "0" no longer true
  entry.updatedAt = new Date().toISOString();
  entry.updatedBy = adminId;
  entry.reports = (entry.reports || 0) + 1;
  return entry;
}

// Update one medicine at one pharmacy: set status (Available/Unavailable/Low) and/or quantity.
app.put('/api/stock', adminOnly, (req, res) => {
  const { pharmacyId, medicineId } = req.body || {};
  if (!pharmacyById.has(pharmacyId) || !medicineById.has(medicineId)) {
    return res.status(400).json({ error: 'Unknown pharmacy or medicine.' });
  }
  const parsed = parseStockInput(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const entry = applyStock(pharmacyId, medicineId, parsed, req.user.id);
  saveInventory(inventory);
  res.json({ ok: true, entry });
});

// Update one medicine across several pharmacies at once (defaults to all pharmacies).
app.put('/api/stock/bulk', adminOnly, (req, res) => {
  const { medicineId } = req.body || {};
  if (!medicineById.has(medicineId)) return res.status(400).json({ error: 'Unknown medicine.' });
  let ids = req.body.pharmacyIds;
  if (ids === undefined) ids = pharmacies.map((p) => p.id);
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 || !ids.every((id) => pharmacyById.has(id))) {
    return res.status(400).json({ error: 'Invalid pharmacy list.' });
  }
  const parsed = parseStockInput(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  for (const id of new Set(ids)) applyStock(id, medicineId, parsed, req.user.id);
  saveInventory(inventory);
  res.json({ ok: true, updated: new Set(ids).size });
});

// The old anonymous endpoint is kept only so it is refused the same way (never writes).
app.post('/api/report', adminOnly, (req, res) => {
  res.status(410).json({ error: 'This endpoint was replaced by PUT /api/stock.' });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

app.listen(PORT, () => {
  console.log(`MediFind running at http://localhost:${PORT}`);
});

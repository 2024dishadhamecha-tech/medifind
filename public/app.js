const form = document.getElementById('searchForm');
const input = document.getElementById('q');
const datalist = document.getElementById('suggestions');
const resultsEl = document.getElementById('results');
const messageEl = document.getElementById('message');
const onlyAvailable = document.getElementById('onlyAvailable');
const locBtn = document.getElementById('locBtn');
const locStatus = document.getElementById('locStatus');
const dialog = document.getElementById('reportDialog');
const reportForm = document.getElementById('reportForm');
const reportTarget = document.getElementById('reportTarget');

const STATUS_LABEL = {
  in_stock: '✅ In stock',
  low_stock: '⚠️ Low stock',
  out_of_stock: '❌ Out of stock'
};

let coords = null;       // { lat, lng } once the user shares location
let lastQuery = '';
let reportCtx = null;    // { pharmacyId, medicineId } or { medicineId, all: true }

/* ---------- Session (login state) ---------- */

const TOKEN_KEY = 'medifind.token';
let session = { token: null, user: null };

function readStoredToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function storeToken(token) {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
}

// UI convenience only: the server independently enforces the Admin role on every stock change.
const isAdmin = () => session.user && session.user.role === 'admin';

// fetch() wrapper that sends the login token. A 401 means the session is gone: log out locally.
async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (session.token) headers.Authorization = `Bearer ${session.token}`;
  const res = await fetch(url, { ...options, headers });
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON error page */ }
  if (res.status === 401 && session.token) {
    setSession(null, null);
    if (lastQuery) search(lastQuery);
  }
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

function setSession(token, user) {
  session = { token, user };
  storeToken(token);
  renderAuthBar();
}

function renderAuthBar() {
  const bar = document.getElementById('authBar');
  bar.replaceChildren();
  if (!session.user) {
    const login = el('button', { type: 'button', class: 'btn btn-ghost', text: 'Log in' });
    const register = el('button', { type: 'button', class: 'btn btn-ghost', text: 'Register' });
    login.addEventListener('click', () => openAuth('login'));
    register.addEventListener('click', () => openAuth('register'));
    bar.append(login, register);
    return;
  }
  const logout = el('button', { type: 'button', class: 'btn btn-ghost', text: 'Log out' });
  logout.addEventListener('click', () => {
    setSession(null, null);
    if (lastQuery) search(lastQuery);
  });
  bar.append(
    el('span', { class: 'user-chip' },
      el('span', { text: session.user.name }),
      el('span', { class: `role-badge ${session.user.role}`, text: session.user.roleLabel })
    ),
    logout
  );
}

/* ---------- Helpers ---------- */

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

function timeAgo(iso) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.className = isError ? 'message error' : 'message';
}

/* ---------- Search ---------- */

async function search(query) {
  query = query.trim();
  if (query.length < 2) return;
  lastQuery = query;
  input.value = query;
  showMessage('Searching…');
  resultsEl.replaceChildren();

  const params = new URLSearchParams({ q: query, onlyAvailable: onlyAvailable.checked });
  if (coords) { params.set('lat', coords.lat); params.set('lng', coords.lng); }

  try {
    const data = await api(`/api/search?${params}`);
    render(data);
  } catch (err) {
    showMessage(err.message || 'Something went wrong. Please try again.', true);
  }
}

function render(data) {
  resultsEl.replaceChildren();
  if (data.groups.length === 0) {
    showMessage(`No medicine found for “${data.query}”. Try the generic name or a different spelling.`);
    return;
  }
  const total = data.groups.reduce((n, g) => n + g.pharmacies.length, 0);
  showMessage(
    total === 0
      ? 'No pharmacies match your filters. Try turning off “Hide out-of-stock”.'
      : data.hasLocation
        ? 'Sorted nearest to farthest from your location.'
        : 'Tip: tap “Use my location” to sort nearest to farthest.'
  );

  for (const group of data.groups) {
    const m = group.medicine;
    const head = el('div', { class: 'group-head' },
      el('h2', { text: m.name }),
      el('span', { class: 'tag', text: m.category }),
      el('span', { class: 'count', text: `${m.form}${m.brands.length ? ' · ' + m.brands.join(', ') : ''}` })
    );
    if (isAdmin()) {
      const all = el('button', { type: 'button', class: 'admin-all', text: 'Update all pharmacies' });
      all.addEventListener('click', () => openReport(m, null));
      head.append(all);
    }
    const cards = el('div', { class: 'cards' });
    if (group.pharmacies.length === 0) {
      cards.append(el('p', { class: 'muted', text: 'No pharmacies to show.' }));
    }
    for (const row of group.pharmacies) cards.append(card(m, row));
    resultsEl.append(el('div', { class: 'group' }, head, cards));
  }
}

function card(medicine, row) {
  const p = row.pharmacy;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;

  const info = el('div', {},
    el('h3', { text: p.name }),
    el('p', { class: 'meta' },
      el('span', { text: p.address }),
    ),
    el('p', { class: 'meta' },
      el('span', { text: `🕒 ${p.hours}` }),
      el('span', { text: `Reported ${timeAgo(row.updatedAt)}` }),
      isAdmin() ? el('span', { class: 'qty', text: row.quantity == null ? 'Qty: not set' : `Qty: ${row.quantity}` }) : null
    )
  );

  const side = el('div', { class: 'side' },
    el('span', { class: `badge ${row.status}`, text: STATUS_LABEL[row.status] }),
    row.distanceKm !== null ? el('span', { class: 'distance', text: `📍 ${row.distanceKm.toFixed(1)} km away` }) : null
  );

  // "Update availability" exists ONLY for a logged-in Admin.
  let reportBtn = null;
  if (isAdmin()) {
    reportBtn = el('button', { type: 'button', class: 'report', text: 'Update availability' });
    reportBtn.addEventListener('click', () => openReport(medicine, p));
  }

  const actions = el('div', { class: 'actions' },
    el('a', { class: 'primary', href: `tel:${p.phone.replace(/\s/g, '')}`, text: `📞 Call ${p.phone}` }),
    el('a', { href: mapsUrl, target: '_blank', rel: 'noopener', text: '🧭 Directions' }),
    reportBtn
  );

  return el('article', { class: `card ${row.status}` }, info, side, actions);
}

/* ---------- Suggestions ---------- */

let suggestTimer;
input.addEventListener('input', () => {
  clearTimeout(suggestTimer);
  const q = input.value.trim();
  if (q.length < 2) return;
  suggestTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/medicines?q=${encodeURIComponent(q)}`);
      const list = await res.json();
      datalist.replaceChildren(...list.map((m) => el('option', { value: m.name })));
    } catch { /* suggestions are optional */ }
  }, 200);
});

/* ---------- Events ---------- */

form.addEventListener('submit', (e) => {
  e.preventDefault();
  search(input.value);
});

document.querySelectorAll('.chip').forEach((chip) =>
  chip.addEventListener('click', () => search(chip.textContent))
);

onlyAvailable.addEventListener('change', () => lastQuery && search(lastQuery));

locBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    locStatus.textContent = 'Location is not supported in this browser.';
    return;
  }
  locStatus.textContent = 'Finding your location…';

  // Ask for the real GPS position (high accuracy). If the device can't produce one in time
  // (e.g. a laptop without GPS), fall back once to the browser's network-based location.
  const onPosition = (pos) => {
    coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    const acc = Math.round(pos.coords.accuracy);
    locStatus.textContent = `Location on ✓ (accurate to about ${acc >= 1000 ? (acc / 1000).toFixed(1) + ' km' : acc + ' m'})`;
    if (lastQuery) search(lastQuery);
  };
  const onFail = (err) => {
    locStatus.textContent =
      err.code === 1 ? 'Location permission was denied. Allow location access in your browser and try again.'
      : err.code === 3 ? 'Finding your location timed out. Please try again.'
      : 'Your location is unavailable right now. Please try again.';
  };
  navigator.geolocation.getCurrentPosition(
    onPosition,
    (err) => {
      if (err.code === 1) return onFail(err); // denied: retrying cannot help
      navigator.geolocation.getCurrentPosition(onPosition, onFail,
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
});

/* ---------- Report availability ---------- */

const reportError = document.getElementById('reportError');

// pharmacy === null means "this medicine at all pharmacies".
function openReport(medicine, pharmacy) {
  if (!isAdmin()) return;
  reportCtx = pharmacy
    ? { pharmacyId: pharmacy.id, medicineId: medicine.id }
    : { medicineId: medicine.id, all: true };
  reportTarget.textContent = pharmacy
    ? `${medicine.name} at ${pharmacy.name}`
    : `${medicine.name} at ALL pharmacies`;
  reportForm.reset();
  reportError.textContent = '';
  dialog.showModal();
}

document.getElementById('reportCancel').addEventListener('click', () => dialog.close());

reportForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new FormData(reportForm);
  const status = data.get('status');
  const quantity = String(data.get('quantity') || '').trim();
  if (!status || !reportCtx) return;

  const { all, ...target } = reportCtx;
  const body = { ...target, status };
  if (quantity !== '') body.quantity = Number(quantity);
  try {
    await api(all ? '/api/stock/bulk' : '/api/stock', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    dialog.close();
    await search(lastQuery);
    showMessage('Availability updated.');
  } catch (err) {
    reportError.textContent = err.message; // keep the dialog open so the admin can fix it
    if (!isAdmin()) dialog.close();
  }
});

/* ---------- Login / register ---------- */

const authDialog = document.getElementById('authDialog');
const authForm = document.getElementById('authForm');
const authError = document.getElementById('authError');
let authMode = 'login';

function setAuthMode(mode) {
  authMode = mode;
  const reg = mode === 'register';
  document.getElementById('authTitle').textContent = reg ? 'Create an account' : 'Log in';
  document.getElementById('authSubmit').textContent = reg ? 'Register' : 'Log in';
  document.getElementById('nameField').hidden = !reg;
  document.getElementById('authName').required = reg;
  document.getElementById('authPassword').autocomplete = reg ? 'new-password' : 'current-password';
  document.getElementById('authSwitchText').textContent = reg ? 'Already registered?' : 'New here?';
  document.getElementById('authSwitch').textContent = reg ? 'Log in' : 'Create an account';
  authError.textContent = '';
}

function openAuth(mode) {
  authForm.reset();
  setAuthMode(mode);
  authDialog.showModal();
}

document.getElementById('authCancel').addEventListener('click', () => authDialog.close());
document.getElementById('authSwitch').addEventListener('click', () =>
  setAuthMode(authMode === 'login' ? 'register' : 'login')
);

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    email: document.getElementById('authEmail').value,
    password: document.getElementById('authPassword').value
  };
  if (authMode === 'register') body.name = document.getElementById('authName').value;
  try {
    const data = await api(`/api/auth/${authMode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    setSession(data.token, data.user);
    authDialog.close();
    if (lastQuery) search(lastQuery);
  } catch (err) {
    authError.textContent = err.message;
  }
});

/* ---------- Restore a saved login on page load ---------- */

(async function init() {
  renderAuthBar();
  const token = readStoredToken();
  if (!token) return;
  session.token = token;
  try {
    const data = await api('/api/auth/me');
    setSession(token, data.user);
  } catch {
    setSession(null, null); // expired or invalid token
  }
})();

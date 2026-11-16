// Authentication + role-based authorization for MediFind.
// No external dependencies: passwords use scrypt, tokens are HMAC-SHA256 signed (JWT format).

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const SECRET_FILE = path.join(__dirname, 'data', '.jwt-secret');
const TOKEN_TTL_SECONDS = 8 * 60 * 60; // 8 hours

const ROLES = { ADMIN: 'admin', STAFF: 'pharmacy_staff', USER: 'user' };
const ROLE_LABELS = { admin: 'Admin', pharmacy_staff: 'Pharmacy Staff', user: 'User' };

/* ---------- Secret ---------- */

function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  try {
    return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(48).toString('hex');
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
    return secret;
  }
}
const SECRET = loadSecret();

/* ---------- Passwords ---------- */

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored).split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

const DUMMY_HASH = hashPassword('not-a-real-password'); // equalises timing for unknown emails

/* ---------- User store (JSON file) ---------- */

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function seedUsers() {
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const users = [
    { id: 'u1', name: 'Demo Admin', email: 'admin@medifind.test', passwordHash: hashPassword(adminPassword), role: ROLES.ADMIN },
    { id: 'u2', name: 'Demo Pharmacy Staff', email: 'staff@medifind.test', passwordHash: hashPassword('Staff@123'), role: ROLES.STAFF },
    { id: 'u3', name: 'Demo User', email: 'user@medifind.test', passwordHash: hashPassword('User@123'), role: ROLES.USER }
  ].map((u) => ({ ...u, createdAt: new Date().toISOString() }));
  saveUsers(users);
  console.log('Created demo accounts (change these before real use):');
  console.log('  admin@medifind.test / ' + adminPassword + '   (Admin)');
  console.log('  staff@medifind.test / Staff@123   (Pharmacy Staff)');
  console.log('  user@medifind.test  / User@123    (User)');
  return users;
}

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return seedUsers();
  }
}

let users = loadUsers();

const normEmail = (e) => String(e || '').trim().toLowerCase();
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, roleLabel: ROLE_LABELS[u.role] });

/* ---------- Tokens ---------- */

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

function createToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ sub: user.id, role: user.role, iat: now, exp: now + TOKEN_TTL_SECONDS }));
  return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
}

// Returns the current user record, or null when the token is missing/forged/expired.
// The role is read from the user store, never trusted from the token alone.
function userFromToken(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = Buffer.from(sign(`${header}.${payload}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  let claims;
  try {
    const head = JSON.parse(Buffer.from(header, 'base64url').toString());
    if (head.alg !== 'HS256') return null;
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
  if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
  return users.find((u) => u.id === claims.sub) || null;
}

/* ---------- Middleware ---------- */

function bearer(req) {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  return m ? m[1] : null;
}

// 401 unless a valid token is supplied.
function authenticate(req, res, next) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: 'Please log in to continue.' });
  const user = userFromToken(token);
  if (!user) return res.status(401).json({ error: 'Your session is invalid or has expired. Please log in again.' });
  req.user = user;
  next();
}

// Attaches req.user when a valid token is present, otherwise continues anonymously.
function optionalAuth(req, res, next) {
  const token = bearer(req);
  req.user = token ? userFromToken(token) : null;
  next();
}

// 403 unless the authenticated user has one of the allowed roles. Use after authenticate().
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: only an Admin can do this.' });
    }
    next();
  };
}

/* ---------- Register / login ---------- */

function register({ name, email, password }) {
  name = String(name || '').trim();
  email = normEmail(email);
  password = String(password || '');
  if (name.length < 2 || name.length > 60) return { error: 'Please enter your name (2–60 characters).' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return { error: 'Please enter a valid email address.' };
  if (password.length < 8 || password.length > 100) return { error: 'Password must be 8–100 characters.' };
  if (users.some((u) => u.email === email)) return { error: 'An account with this email already exists.', status: 409 };

  // Self-registration ALWAYS creates a normal user. Any "role" sent by the client is ignored.
  const user = {
    id: 'u' + crypto.randomBytes(6).toString('hex'),
    name,
    email,
    passwordHash: hashPassword(password),
    role: ROLES.USER,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  saveUsers(users);
  return { user };
}

function login({ email, password }) {
  const user = users.find((u) => u.email === normEmail(email));
  const ok = verifyPassword(String(password || ''), user ? user.passwordHash : DUMMY_HASH);
  return user && ok ? { user } : { error: 'Incorrect email or password.' };
}

/* ---------- Tiny in-memory rate limiter ---------- */

function rateLimit(max, windowMs, message) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) return res.status(429).json({ error: message });
    recent.push(now);
    hits.set(req.ip, recent);
    next();
  };
}

module.exports = {
  ROLES, createToken, authenticate, optionalAuth, requireRole,
  register, login, publicUser, rateLimit, userFromToken
};

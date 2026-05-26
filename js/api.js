// ── API CONFIG ────────────────────────────────────────────────────────────────
const API = 'https://campusgig-r5tz.onrender.com/api.php';

export async function apiFetch(action, params = {}, method = 'GET') {
  try {
    let url = `${API}?action=${action}`;
    const opts = { headers: { 'Content-Type': 'application/json' } };
    if (method === 'GET') {
      Object.entries(params).forEach(([k, v]) => url += `&${k}=${encodeURIComponent(v)}`);
      opts.method = 'GET';
    } else {
      opts.method = 'POST';
      opts.body   = JSON.stringify({ action, ...params });
    }
    const res  = await fetch(url, opts);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'API error');
    return json.data;
  } catch (e) {
    showToast('⚠️ ' + e.message);
    return null;
  }
}

// ── GLOBAL STATE ──────────────────────────────────────────────────────────────
export let currentUser = null;
export let selectedRole = 'student';
export let gigs     = [];
export let bookings = [];
export let users    = [];

export function setCurrentUser(u)  { currentUser  = u; }
export function setSelectedRole(r) { selectedRole = r; }
export function setGigs(data)      { gigs     = data; }
export function setBookings(data)  { bookings = data; }
export function setUsers(data)     { users    = data; }

// ── DATA LOADERS ──────────────────────────────────────────────────────────────
export async function loadGigs(all = false) {
  const data = await apiFetch('gigs', all ? { all: 1 } : {});
  if (data) {
    gigs = data.map(g => ({ ...g, id: Number(g.id), tutorEmail: g.tutor_email, desc: g.description }));
  }
}

export async function loadUsers() {
  const data = await apiFetch('users');
  if (data) users = data;
}

export async function loadBookings(userId, role) {
  const data = await apiFetch('bookings', userId ? { user_id: userId, role } : {});
  if (data) {
    bookings = data.map(b => ({
      ...b,
      gigId: b.gig_id,
      date: b.session_date,
      time: b.session_time,
      total: parseFloat(b.total)
    }));
  }
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
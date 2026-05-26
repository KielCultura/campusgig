import { apiFetch, showToast, currentUser, setCurrentUser, selectedRole, setSelectedRole } from './api.js';
import { addNotification, updateNotifBadge } from './notifications.js';
import { showLanding, showDashboard } from './router.js';

// ── MODAL OPEN/CLOSE ──────────────────────────────────────────────────────────
export function openAuthModal(tab) {
  document.getElementById('authModal').classList.add('active');
  switchTab(tab);
}
export function closeAuthModal() {
  document.getElementById('authModal').classList.remove('active');
}

export function switchTab(tab) {
  const l = tab === 'login';
  document.getElementById('loginTab').classList.toggle('active', l);
  document.getElementById('registerTab').classList.toggle('active', !l);
  document.getElementById('loginForm').classList.toggle('hidden', !l);
  document.getElementById('registerForm').classList.toggle('hidden', l);
  document.getElementById('authSubtitle').textContent = l ? 'Welcome back!' : 'Create your account';
}

export function selectRole(role) {
  setSelectedRole(role);
  document.getElementById('roleStudent').classList.toggle('selected', role === 'student');
  document.getElementById('roleTutor').classList.toggle('selected', role === 'tutor');
}

export function fillDemo(role) {
  const m = { student: 'student@uc.edu.ph', tutor: 'tutor@uc.edu.ph', admin: 'admin@uc.edu.ph' };
  document.getElementById('loginEmail').value    = m[role];
  document.getElementById('loginPassword').value = 'demo123';
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pw    = document.getElementById('loginPassword').value;
  if (!email || !pw) { showToast('Please fill in all fields'); return; }

  const u = await apiFetch('login', { email, password: pw }, 'POST');
  if (!u) return;

  setCurrentUser(u);
  localStorage.setItem('cg_user', JSON.stringify(u));
  closeAuthModal();
  showToast('👋 Welcome back, ' + u.name + '!');
  document.getElementById('notifBell')?.classList.remove('hidden');
  updateNotifBadge();
  setTimeout(() => showDashboard(), 400);
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
export async function handleRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pw    = document.getElementById('regPassword').value;
  if (!name || !email || !pw) { showToast('Please fill in all fields'); return; }
  if (pw.length < 6) { showToast('Password must be at least 6 characters'); return; }

  const u = await apiFetch('register', { name, email, password: pw, role: selectedRole }, 'POST');
  if (!u) return;

  setCurrentUser(u);
  localStorage.setItem('cg_user', JSON.stringify(u));
  closeAuthModal();
  showToast('🎉 Welcome to CampusGig, ' + name + '!');
  document.getElementById('notifBell')?.classList.remove('hidden');
  addNotification('system', `Welcome to CampusGig, ${name}! Start browsing services to get started.`);
  setTimeout(() => showDashboard(), 400);
}

// ── LOGOUT ────────────────────────────────────────────────────────────────────
export function logout() {
  setCurrentUser(null);
  localStorage.removeItem('cg_user');
  document.getElementById('notifBell')?.classList.add('hidden');
  showLanding();
  showToast('👋 Signed out');
}

// ── SESSION RESTORE ───────────────────────────────────────────────────────────
export function restoreSession() {
  const saved = localStorage.getItem('cg_user');
  if (!saved) return false;
  try {
    setCurrentUser(JSON.parse(saved));
    document.getElementById('notifBell')?.classList.remove('hidden');
    updateNotifBadge();
    return true;
  } catch(e) {
    localStorage.removeItem('cg_user');
    return false;
  }
}
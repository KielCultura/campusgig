import { currentUser, gigs, loadGigs, loadUsers, loadBookings } from './api.js';
import { connectWS } from './messaging.js';
import { updateNotifBadge } from './notifications.js';
import { renderGigs } from './gigs.js';
import { renderStudentDashboard } from './dashboard/dashboard-student.js';
import { renderTutorDashboard } from './dashboard/dashboard-tutor.js';
import { renderAdminDashboard } from './dashboard/dashboard-admin.js';

// ── SHOW LANDING ──────────────────────────────────────────────────────────────
export async function showLanding() {
  document.getElementById('landingView').style.display = '';
  document.getElementById('dashboardView').style.display = 'none';
  document.getElementById('sidebarNav').innerHTML = '';
  await loadGigs();
  renderGigs(gigs);
}

// ── SHOW DASHBOARD ────────────────────────────────────────────────────────────
export function showDashboard() {
  document.getElementById('landingView').style.display = 'none';
  document.getElementById('dashboardView').style.display = 'block';
  document.getElementById('sidebarName').textContent  = currentUser.name;
  document.getElementById('sidebarRole').textContent  = currentUser.role;
  document.getElementById('sidebarAvatar').textContent = currentUser.name[0].toUpperCase();

  if (currentUser.role === 'student') {
    renderStudentDashboard();
  } else if (currentUser.role === 'tutor') {
    renderTutorDashboard();
  } else {
    // Admin: load all data first, then render
    loadUsers()
      .then(() => loadGigs(true))
      .then(() => loadBookings())
      .then(() => renderAdminDashboard());
  }

  // Connect real-time messaging
  setTimeout(connectWS, 200);
}

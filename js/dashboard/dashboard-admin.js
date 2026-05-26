import { currentUser, gigs, bookings, users, apiFetch, showToast, loadGigs, loadUsers, loadBookings } from '../api.js';
import { buildSidebar } from './dashboard-student.js';
import { openMessages } from '../messaging.js';

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
export function renderAdminDashboard(s = 'home') {
  buildSidebar([
    { id:'home',     icon:'fa-house',         label:'Overview',     fn:`renderAdminDashboard('home')`,     active: s==='home' },
    { id:'users',    icon:'fa-users',          label:'Users',        fn:`renderAdminDashboard('users')`,    active: s==='users' },
    { id:'services', icon:'fa-briefcase',      label:'Services',     fn:`renderAdminDashboard('services')`, active: s==='services' },
    { id:'bookings', icon:'fa-calendar-check', label:'All Bookings', fn:`loadAndShowAdminBookings()`,       active: s==='bookings' },
    { id:'reports',  icon:'fa-chart-bar',      label:'Reports',      fn:`renderAdminDashboard('reports')`,  active: s==='reports' },
    { id:'messages', icon:'fa-message',        label:'Messages',     fn:`openMessages()`,                   active: s==='messages' },
  ]);

  const M    = document.getElementById('dashboardMain');
  const rev  = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.total, 0);
  const pend = gigs.filter(g => g.status === 'pending');

  if (s === 'home')          renderAdminHome(M, rev, pend);
  else if (s === 'users')    renderAdminUsers(M);
  else if (s === 'services') renderAdminServices(M, pend);
  else if (s === 'bookings') renderAdminBookings(M);
  else if (s === 'reports')  renderAdminReports(M, rev);
}

function renderAdminHome(M, rev, pend) {
  M.innerHTML = `<div class="fade-in">
    <h1 class="text-2xl font-bold font-display mb-1">Admin Overview ⚙️</h1>
    <p class="text-zinc-500 mb-8">Platform-wide statistics and activity.</p>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
      <div class="stat-card"><div class="text-2xl mb-1">👨‍🎓</div><p class="text-2xl font-bold">${users.filter(u=>u.role==='student').length}</p><p class="text-zinc-500 text-sm">Students</p></div>
      <div class="stat-card"><div class="text-2xl mb-1">👨‍🏫</div><p class="text-2xl font-bold">${users.filter(u=>u.role==='tutor').length}</p><p class="text-zinc-500 text-sm">Tutors</p></div>
      <div class="stat-card"><div class="text-2xl mb-1">📋</div><p class="text-2xl font-bold">${gigs.length}</p><p class="text-zinc-500 text-sm">Services</p></div>
      <div class="stat-card"><div class="text-2xl mb-1">💰</div><p class="text-2xl font-bold">&#8369;${rev}</p><p class="text-zinc-500 text-sm">Revenue</p></div>
    </div>
    ${pend.length ? `<div class="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600"><i class="fa-solid fa-clock"></i></div>
        <div><p class="font-semibold text-amber-800">${pend.length} service${pend.length > 1 ? 's' : ''} awaiting approval</p><p class="text-sm text-amber-600">Review tutor listings</p></div>
      </div>
      <button onclick="renderAdminDashboard('services')" class="text-sm bg-amber-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-amber-600">Review Now</button>
    </div>` : ''}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="card">
        <div class="p-5 border-b flex items-center justify-between"><p class="font-bold font-display">Recent Bookings</p><button onclick="loadAndShowAdminBookings()" class="text-xs text-[#272747] font-semibold">View All →</button></div>
        <table class="data-table"><thead><tr><th>Student</th><th>Tutor</th><th>Status</th><th>Fee</th></tr></thead><tbody>
          ${bookings.slice(0, 4).map(b => `<tr>
            <td class="text-sm font-medium">${b.student}</td>
            <td class="text-sm text-zinc-600">${b.tutor}</td>
            <td><span class="badge ${b.status==='confirmed'?'badge-green':b.status==='pending'?'badge-yellow':b.status==='completed'?'badge-blue':'badge-red'} text-xs">${b.status}</span></td>
            <td class="text-sm font-semibold text-[#272747]">&#8369;${b.total}</td>
          </tr>`).join('')}
        </tbody></table>
      </div>
      <div class="card">
        <div class="p-5 border-b flex items-center justify-between"><p class="font-bold font-display">Recent Users</p><button onclick="renderAdminDashboard('users')" class="text-xs text-[#272747] font-semibold">View All →</button></div>
        <table class="data-table"><thead><tr><th>Name</th><th>Role</th><th>Status</th></tr></thead><tbody>
          ${users.slice(0, 5).map(u => `<tr>
            <td><div class="flex items-center gap-2"><img src="${u.avatar}" class="avatar w-7 h-7"><span class="text-sm font-medium">${u.name}</span></div></td>
            <td><span class="badge ${u.role==='admin'?'badge-red':u.role==='tutor'?'badge-green':'badge-blue'}">${u.role}</span></td>
            <td><span class="badge ${u.status==='active'?'badge-green':'badge-red'}">${u.status}</span></td>
          </tr>`).join('')}
        </tbody></table>
      </div>
    </div>
  </div>`;
}

function renderAdminUsers(M) {
  M.innerHTML = `<div class="fade-in">
    <div class="flex items-center justify-between mb-6">
      <div><h1 class="text-2xl font-bold font-display">User Management</h1><p class="text-zinc-500">All ${users.length} accounts.</p></div>
    </div>
    <div class="card"><table class="data-table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${users.map(u => `<tr>
        <td><div class="flex items-center gap-3"><img src="${u.avatar}" class="avatar"><div><p class="font-semibold text-sm">${u.name}</p></div></div></td>
        <td class="text-sm text-zinc-600">${u.email}</td>
        <td><span class="badge ${u.role==='admin'?'badge-red':u.role==='tutor'?'badge-green':'badge-blue'}">${u.role}</span></td>
        <td class="text-sm text-zinc-500">${u.joined}</td>
        <td><span class="badge ${u.status==='active'?'badge-green':'badge-red'}">${u.status}</span></td>
        <td class="flex gap-2">
          <button onclick="toggleUser(${u.id})" class="text-xs ${u.status==='active'?'bg-red-50 text-red-600 hover:bg-red-100':'bg-green-50 text-green-600 hover:bg-green-100'} px-3 py-1.5 rounded-lg transition">${u.status==='active'?'Suspend':'Restore'}</button>
          ${u.role !== 'admin' ? `<button onclick="delUser(${u.id})" class="text-xs bg-zinc-100 text-zinc-600 px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition">Delete</button>` : ''}
        </td>
      </tr>`).join('')}
    </tbody></table></div>
  </div>`;
}

function renderAdminServices(M, pend) {
  M.innerHTML = `<div class="fade-in">
    <h1 class="text-2xl font-bold font-display mb-1">Service Management</h1>
    <p class="text-zinc-500 mb-6">Approve, manage, and remove listings.</p>
    ${pend.length ? `<div class="mb-6">
      <p class="font-semibold text-amber-700 mb-3 flex items-center gap-2"><i class="fa-solid fa-clock"></i> Pending Approval (${pend.length})</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${pend.map(g => `<div class="card p-4 border-l-4 border-amber-400">
          <div class="flex items-start gap-4">
            <img src="${g.image}" class="w-16 h-16 rounded-xl object-cover flex-shrink-0">
            <div class="flex-1">
              <p class="font-semibold text-sm">${g.title}</p>
              <p class="text-xs text-zinc-500">${g.tutor} • ${g.category} • &#8369;${g.price}/hr</p>
              <div class="flex gap-2 mt-3">
                <button onclick="approveG(${g.id})" class="text-xs bg-[#272747] text-white px-3 py-1.5 rounded-lg hover:bg-[#272747] font-semibold">Approve</button>
                <button onclick="rejectG(${g.id})" class="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100">Reject</button>
              </div>
            </div>
          </div>
        </div>`).join('')}
      </div>
    </div>` : ''}
    <div class="card"><table class="data-table"><thead><tr><th>Service</th><th>Tutor</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${gigs.map(g => `<tr>
        <td><div class="flex items-center gap-2"><img src="${g.image}" class="w-9 h-9 rounded-lg object-cover"><p class="font-medium text-sm">${g.title}</p></div></td>
        <td class="text-sm">${g.tutor}</td>
        <td><span class="badge badge-blue text-xs">${g.category}</span></td>
        <td class="font-semibold text-[#272747]">&#8369;${g.price}</td>
        <td><span class="badge ${g.status==='approved'?'badge-green':g.status==='pending'?'badge-yellow':'badge-red'}">${g.status}</span></td>
        <td class="flex gap-2">
          ${g.status === 'pending' ? `<button onclick="approveG(${g.id})" class="text-xs bg-[#272747]/10 text-[#272747] px-3 py-1.5 rounded-lg font-semibold hover:bg-[#272747]/10">Approve</button>` : ''}
          <button onclick="adminDelGig(${g.id})" class="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100">Remove</button>
        </td>
      </tr>`).join('')}
    </tbody></table></div>
  </div>`;
}

function renderAdminBookings(M) {
  M.innerHTML = `<div class="fade-in">
    <h1 class="text-2xl font-bold font-display mb-1">All Bookings</h1>
    <p class="text-zinc-500 mb-6">Platform-wide session tracking (${bookings.length} total).</p>
    <div class="card"><table class="data-table"><thead><tr><th>#</th><th>Student</th><th>Tutor</th><th>Service</th><th>Date</th><th>Status</th><th>Fee</th></tr></thead><tbody>
      ${bookings.map(b => { const g = gigs.find(x => x.id === b.gigId); return `<tr>
        <td class="text-zinc-400 text-xs">#${b.id}</td>
        <td class="font-medium text-sm">${b.student}</td>
        <td class="text-sm text-zinc-600">${b.tutor}</td>
        <td class="text-sm text-zinc-600">${g ? g.title.substring(0, 28) + '…' : 'N/A'}</td>
        <td class="text-sm">${b.date}</td>
        <td><span class="badge ${b.status==='confirmed'?'badge-green':b.status==='pending'?'badge-yellow':b.status==='completed'?'badge-blue':'badge-red'}">${b.status}</span></td>
        <td class="font-semibold text-[#272747]">&#8369;${b.total}</td>
      </tr>`; }).join('')}
    </tbody></table></div>
  </div>`;
}

function renderAdminReports(M, rev) {
  const byCat = {};
  gigs.forEach(g => { byCat[g.category] = (byCat[g.category] || 0) + 1; });
  const bySt = {};
  bookings.forEach(b => { bySt[b.status] = (bySt[b.status] || 0) + 1; });

  M.innerHTML = `<div class="fade-in">
    <h1 class="text-2xl font-bold font-display mb-1">Reports & Analytics</h1>
    <p class="text-zinc-500 mb-8">Platform performance overview.</p>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="card p-6"><h3 class="font-bold font-display mb-4">Services by Category</h3>
        ${Object.entries(byCat).map(([c, n]) => { const p = Math.round(n / gigs.length * 100); return `<div class="mb-3"><div class="flex justify-between text-sm mb-1"><span class="font-medium">${c}</span><span class="text-zinc-500">${n} (${p}%)</span></div><div class="bg-zinc-100 rounded-full h-2"><div class="bg-[#272747] h-2 rounded-full" style="width:${p}%"></div></div></div>`; }).join('')}
      </div>
      <div class="card p-6"><h3 class="font-bold font-display mb-4">Bookings by Status</h3>
        ${Object.entries(bySt).map(([st, n]) => { const p = Math.round(n / bookings.length * 100); const c = {confirmed:'bg-[#272747]',pending:'bg-amber-400',completed:'bg-blue-500',cancelled:'bg-red-400',declined:'bg-red-400'}[st] || 'bg-zinc-400'; return `<div class="mb-3"><div class="flex justify-between text-sm mb-1"><span class="font-medium capitalize">${st}</span><span class="text-zinc-500">${n} (${p}%)</span></div><div class="bg-zinc-100 rounded-full h-2"><div class="${c} h-2 rounded-full" style="width:${p}%"></div></div></div>`; }).join('')}
      </div>
      <div class="card p-6"><h3 class="font-bold font-display mb-4">User Breakdown</h3>
        ${[['Students','badge-blue', users.filter(u=>u.role==='student').length], ['Tutors','badge-green', users.filter(u=>u.role==='tutor').length], ['Admins','badge-red', users.filter(u=>u.role==='admin').length]].map(([l,b,n]) => `<div class="flex items-center justify-between py-3 border-b last:border-0"><span class="badge ${b}">${l}</span><span class="font-bold text-xl">${n}</span></div>`).join('')}
      </div>
      <div class="card p-6"><h3 class="font-bold font-display mb-4">Financial Summary</h3>
        <div class="space-y-3">
          <div class="flex justify-between py-3 border-b"><span class="text-zinc-500">Total Revenue</span><span class="font-bold text-[#272747]">&#8369;${rev}</span></div>
          <div class="flex justify-between py-3 border-b"><span class="text-zinc-500">Completed Sessions</span><span class="font-bold">${bookings.filter(b => b.status === 'completed').length}</span></div>
          <div class="flex justify-between py-3"><span class="text-zinc-500">Avg Session Value</span><span class="font-bold">&#8369;${bookings.length ? Math.round(bookings.reduce((s, b) => s + b.total, 0) / bookings.length) : 0}</span></div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── ADMIN ACTIONS ─────────────────────────────────────────────────────────────
export async function toggleUser(id) {
  const res = await apiFetch('toggle_user', { id }, 'POST');
  if (!res) return;
  await loadUsers();
  renderAdminDashboard('users');
  showToast('User ' + res.status);
}

export async function delUser(id) {
  if (!confirm('Delete this user?')) return;
  await apiFetch('delete_user', { id }, 'POST');
  await loadUsers();
  renderAdminDashboard('users');
  showToast('User deleted');
}

export async function approveG(id) {
  await apiFetch('approve_gig', { id }, 'POST');
  await loadGigs(true);
  renderAdminDashboard('services');
  showToast('✅ Service approved!');
}

export async function rejectG(id) {
  await apiFetch('reject_gig', { id }, 'POST');
  await loadGigs(true);
  renderAdminDashboard('services');
  showToast('Service rejected');
}

export async function adminDelGig(id) {
  if (!confirm('Remove this service?')) return;
  await apiFetch('delete_gig', { id }, 'POST');
  await loadGigs(true);
  renderAdminDashboard('services');
  showToast('Service removed');
}

export async function loadAndShowAdminBookings() {
  await loadBookings();
  renderAdminDashboard('bookings');
}


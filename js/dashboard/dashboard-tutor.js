import { currentUser, gigs, bookings, apiFetch, showToast, loadGigs, loadBookings } from '../api.js';
import { addNotification } from '../notifications.js';
import { buildSidebar } from './dashboard-student.js';

export function renderTutorDashboard(s = 'home') {
  buildSidebar([
    { id:'home',     icon:'fa-house',         label:'Dashboard',   fn:`renderTutorDashboard('home')`,     active: s==='home' },
    { id:'services', icon:'fa-briefcase',      label:'My Services', fn:`renderTutorDashboard('services')`, active: s==='services' },
    { id:'requests', icon:'fa-calendar-check', label:'Requests',    fn:`renderTutorDashboard('requests')`, active: s==='requests' },
    { id:'earnings', icon:'fa-peso-sign',      label:'Earnings',    fn:`renderTutorDashboard('earnings')`, active: s==='earnings' },
    { id:'messages', icon:'fa-message',         label:'Messages',    fn:`openMessages()`,                   active: s==='messages' },
    { id:'profile',  icon:'fa-user',            label:'My Profile',  fn:`renderTutorDashboard('profile')`,  active: s==='profile' },
  ]);

  const myG    = gigs.filter(g => g.tutorEmail === currentUser.email);
  const myB    = bookings.filter(b => b.tutorEmail === currentUser.email);
  const earned = myB.filter(b => b.status === 'completed').reduce((s, b) => s + b.total, 0);
  const M      = document.getElementById('dashboardMain');

  if (s === 'home')     renderTutorHome(M, myG, myB, earned);
  else if (s === 'services') renderTutorServices(M, myG);
  else if (s === 'requests') renderTutorRequests(M, myB);
  else if (s === 'earnings') renderTutorEarnings(M, myB, earned);
  else if (s === 'profile')  renderTutorProfile(M);
}

function renderTutorHome(M, myG, myB, earned) {
  M.innerHTML = `<div class="fade-in">
    <h1 class="text-2xl font-bold font-display mb-1">Tutor Dashboard 👨‍🏫</h1>
    <p class="text-zinc-500 mb-8">Manage your services and bookings.</p>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
      <div class="stat-card"><div class="text-2xl mb-1">📋</div><p class="text-2xl font-bold">${myG.length}</p><p class="text-zinc-500 text-xs">Services</p></div>
      <div class="stat-card"><div class="text-2xl mb-1">⏳</div><p class="text-2xl font-bold">${myB.filter(b=>b.status==='pending').length}</p><p class="text-zinc-500 text-xs">Pending</p></div>
      <div class="stat-card"><div class="text-2xl mb-1">📅</div><p class="text-2xl font-bold">${myB.length}</p><p class="text-zinc-500 text-xs">Total Sessions</p></div>
      <div class="stat-card"><div class="text-2xl mb-1">💰</div><p class="text-2xl font-bold">&#8369;${earned}</p><p class="text-zinc-500 text-xs">Earned</p></div>
    </div>
    ${myB.filter(b=>b.status==='pending').length ? `
      <h2 class="text-lg font-bold mb-4 font-display">Pending Requests</h2>
      <div class="card mb-8"><table class="data-table"><thead><tr><th>Student</th><th>Service</th><th>Date</th><th>Actions</th></tr></thead><tbody>
        ${myB.filter(b=>b.status==='pending').map(b=>{const g=gigs.find(x=>x.id===b.gigId);return`<tr>
          <td class="font-medium">${b.student}</td><td class="text-sm text-zinc-600">${g?.title||'N/A'}</td><td class="text-sm">${b.date}</td>
          <td class="flex gap-2"><button onclick="acceptB(${b.id})" class="text-xs bg-[#272747]/10 text-[#272747] px-3 py-1.5 rounded-lg font-semibold hover:bg-[#272747]/10">Accept</button><button onclick="declineB(${b.id})" class="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100">Decline</button></td>
        </tr>`;}).join('')}</tbody></table></div>` : ''}
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold font-display">My Services</h2>
      <button onclick="openAddServiceModal()" class="btn-primary text-sm py-2 px-4">+ Add Service</button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      ${myG.length ? myG.map(g=>`
        <div class="card"><img src="${g.image}" class="w-full h-36 object-cover">
        <div class="p-4"><span class="badge ${g.status==='approved'?'badge-green':g.status==='pending'?'badge-yellow':'badge-red'}">${g.status}</span>
        <p class="font-semibold text-sm mt-2 mb-1">${g.title}</p><p class="text-[#272747] font-bold">&#8369;${g.price}/hr</p>
        <p class="text-xs text-zinc-400 mt-1">⭐ ${g.rating} (${g.reviews} reviews)</p></div></div>`).join('') :
        `<div class="card p-8 text-center text-zinc-400 col-span-3"><p>No services yet.</p><button onclick="openAddServiceModal()" class="btn-primary mt-3">Add Your First Service</button></div>`}
    </div>
  </div>`;
}

function renderTutorServices(M, myG) {
  M.innerHTML = `<div class="fade-in">
    <div class="flex items-center justify-between mb-6">
      <div><h1 class="text-2xl font-bold font-display">My Services</h1><p class="text-zinc-500">All your current listings.</p></div>
      <button onclick="openAddServiceModal()" class="btn-primary">+ Add Service</button>
    </div>
    ${myG.length ? `<div class="card"><table class="data-table"><thead><tr><th>Service</th><th>Category</th><th>Price</th><th>Rating</th><th>Status</th><th></th></tr></thead><tbody>
      ${myG.map(g=>`<tr>
        <td><div class="flex items-center gap-3"><img src="${g.image}" class="w-10 h-10 rounded-lg object-cover"><p class="font-medium text-sm">${g.title}</p></div></td>
        <td><span class="badge badge-blue">${g.category}</span></td>
        <td class="font-semibold text-[#272747]">&#8369;${g.price}/hr</td>
        <td>${g.rating ? '⭐ '+g.rating+' ('+g.reviews+')' : '–'}</td>
        <td><span class="badge ${g.status==='approved'?'badge-green':g.status==='pending'?'badge-yellow':'badge-red'}">${g.status}</span></td>
        <td><button onclick="removeMyGig(${g.id})" class="text-xs text-red-500 hover:text-red-700">Remove</button></td>
      </tr>`).join('')}</tbody></table></div>` :
      `<div class="card p-12 text-center text-zinc-400"><p class="text-4xl mb-3">📋</p><p>No services yet.</p><button onclick="openAddServiceModal()" class="btn-primary mt-4">Add Service</button></div>`}
  </div>`;
}

function renderTutorRequests(M, myB) {
  M.innerHTML = `<div class="fade-in">
    <h1 class="text-2xl font-bold font-display mb-1">Session Requests</h1>
    <p class="text-zinc-500 mb-6">All booking requests from students.</p>
    ${myB.length ? `<div class="card"><table class="data-table"><thead><tr><th>Student</th><th>Service</th><th>Date</th><th>Status</th><th>Fee</th><th>Actions</th></tr></thead><tbody>
      ${myB.map(b=>{const g=gigs.find(x=>x.id===b.gigId);return`<tr>
        <td class="font-medium">${b.student}</td><td class="text-sm text-zinc-600">${g?.title||'N/A'}</td>
        <td class="text-sm">${b.date} ${b.time}</td>
        <td><span class="badge ${b.status==='confirmed'?'badge-green':b.status==='pending'?'badge-yellow':b.status==='completed'?'badge-blue':'badge-red'}">${b.status}</span></td>
        <td class="font-semibold text-[#272747]">&#8369;${b.total}</td>
        <td class="flex gap-2">
          ${b.status==='pending'?`<button onclick="acceptB(${b.id})" class="text-xs bg-[#272747]/10 text-[#272747] px-3 py-1.5 rounded-lg font-semibold hover:bg-[#272747]/10">Accept</button><button onclick="declineB(${b.id})" class="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100">Decline</button>`:''}
          ${b.status==='confirmed'?`<button onclick="markDone(${b.id})" class="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100">Mark Done</button>`:''}
        </td>
      </tr>`;}).join('')}</tbody></table></div>` :
      `<div class="card p-12 text-center text-zinc-400"><p class="text-4xl mb-3">📭</p><p>No booking requests yet.</p></div>`}
  </div>`;
}

function renderTutorEarnings(M, myB, earned) {
  const done = myB.filter(b => b.status === 'completed');
  M.innerHTML = `<div class="fade-in">
    <h1 class="text-2xl font-bold font-display mb-1">Earnings</h1>
    <p class="text-zinc-500 mb-6">Your payout history and summary.</p>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
      <div class="stat-card border-l-4 border-[#272747]"><p class="text-zinc-500 text-sm mb-1">Total Earned</p><p class="text-3xl font-bold text-[#272747]">&#8369;${earned}</p></div>
      <div class="stat-card border-l-4 border-blue-500"><p class="text-zinc-500 text-sm mb-1">Sessions Done</p><p class="text-3xl font-bold text-blue-600">${done.length}</p></div>
      <div class="stat-card border-l-4 border-amber-500"><p class="text-zinc-500 text-sm mb-1">Avg per Session</p><p class="text-3xl font-bold text-amber-600">&#8369;${done.length ? Math.round(earned/done.length) : 0}</p></div>
    </div>
    ${done.length ? `<div class="card"><table class="data-table"><thead><tr><th>Student</th><th>Service</th><th>Date</th><th>Amount</th></tr></thead><tbody>
      ${done.map(b=>{const g=gigs.find(x=>x.id===b.gigId);return`<tr><td class="font-medium">${b.student}</td><td class="text-sm text-zinc-600">${g?.title||'N/A'}</td><td class="text-sm">${b.date}</td><td class="font-semibold text-[#272747]">&#8369;${b.total}</td></tr>`;}).join('')}
    </tbody></table></div>` : `<div class="card p-12 text-center text-zinc-400">No completed sessions yet.</div>`}
  </div>`;
}

function renderTutorProfile(M) {
  M.innerHTML = `<div class="fade-in max-w-lg">
    <h1 class="text-2xl font-bold font-display mb-1">Tutor Profile</h1>
    <div class="card p-6">
      <div class="flex items-center gap-5 mb-6 pb-6 border-b"><img src="${currentUser.avatar}" class="w-16 h-16 rounded-2xl"><div><p class="font-bold text-lg">${currentUser.name}</p><p class="text-zinc-500 text-sm">${currentUser.email}</p><span class="badge badge-green mt-1">Tutor</span></div></div>
      <div class="space-y-4">
        <div><label class="block text-sm font-semibold mb-1.5">Full Name</label><input type="text" value="${currentUser.name}" class="form-input"></div>
        <div><label class="block text-sm font-semibold mb-1.5">Email</label><input type="email" value="${currentUser.email}" class="form-input"></div>
        <div><label class="block text-sm font-semibold mb-1.5">Bio</label><textarea class="form-input" rows="3" placeholder="Tell students about yourself..."></textarea></div>
        <button onclick="showToast('✅ Profile updated!')" class="btn-primary">Save Changes</button>
      </div>
    </div>
  </div>`;
}

// ── BOOKING ACTIONS ───────────────────────────────────────────────────────────
export function acceptB(id) {
  const b = bookings.find(x => x.id === id);
  if (b) { b.status = 'confirmed'; addNotification('booking', `You confirmed ${b.student}'s session booking.`); }
  renderTutorDashboard('requests');
  showToast('✅ Booking accepted!');
}

export function declineB(id) {
  const b = bookings.find(x => x.id === id);
  if (b) { b.status = 'declined'; addNotification('booking', `You declined ${b.student}'s booking request.`); }
  renderTutorDashboard('requests');
  showToast('Booking declined');
}

export function markDone(id) {
  const b = bookings.find(x => x.id === id);
  if (b) { b.status = 'completed'; addNotification('booking', `Session with ${b.student} marked as complete! 🎉`); }
  renderTutorDashboard('requests');
  showToast('🎉 Session marked complete!');
}

export function removeMyGig(id) {
  if (!confirm('Remove this service?')) return;
  const i = gigs.findIndex(g => g.id === id);
  if (i > -1) gigs.splice(i, 1);
  renderTutorDashboard('services');
  showToast('Service removed');
}

export function openAddServiceModal() {
  document.getElementById('addServiceModal')?.remove();
  const el = document.createElement('div');
  el.id = 'addServiceModal'; el.className = 'modal-overlay active';
  el.innerHTML = `<div class="bg-white rounded-3xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"><div class="p-8">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-2xl font-bold font-display">Add New Service</h3>
      <button onclick="document.getElementById('addServiceModal').remove()" class="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-200 text-lg">×</button>
    </div>
    <div class="space-y-4">
      <div><label class="block text-sm font-semibold mb-1.5">Service Title</label><input type="text" id="asTitle" class="form-input" placeholder="e.g. Python Tutoring"></div>
      <div><label class="block text-sm font-semibold mb-1.5">Category</label><select id="asCat" class="form-input"><option>ICT</option><option>Arts</option><option>Culinary</option><option>STEM</option><option>Business</option><option>Humanities</option></select></div>
      <div><label class="block text-sm font-semibold mb-1.5">Price (₱/hr)</label><input type="number" id="asPrice" class="form-input" placeholder="350"></div>
      <div><label class="block text-sm font-semibold mb-1.5">Description</label><textarea id="asDesc" class="form-input" rows="3" placeholder="Describe your service..."></textarea></div>
      <button onclick="submitTutorService()" class="btn-primary w-full">Submit for Review</button>
    </div>
  </div></div>`;
  document.body.appendChild(el);
}

export async function submitTutorService() {
  const t = document.getElementById('asTitle')?.value.trim();
  const c = document.getElementById('asCat')?.value;
  const p = document.getElementById('asPrice')?.value;
  const d = document.getElementById('asDesc')?.value || 'New service';
  if (!t || !p) { showToast('Please fill in all fields'); return; }
  const res = await apiFetch('add_gig', { title:t, category:c, price:parseFloat(p), description:d, tutor_id:currentUser.id }, 'POST');
  if (!res) return;
  await loadGigs(true);
  document.getElementById('addServiceModal')?.remove();
  renderTutorDashboard('services');
  showToast('✅ Service submitted for admin review!');
}

export async function loadAndShowTutorBookings() {
  if (currentUser) await loadBookings(currentUser.id, currentUser.role);
  renderTutorDashboard('requests');
}

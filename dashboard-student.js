import { currentUser, gigs, bookings, apiFetch, showToast, loadBookings } from './api.js';
import { savedGigs, toggleBookmark } from './bookmarks-reviews.js';
import { gigCardDash, showGigDetailDash, bookSession } from './gigs.js';
import { openMessages } from './messaging.js';

// ── SIDEBAR BUILDER ───────────────────────────────────────────────────────────
export function buildSidebar(items) {
  document.getElementById('sidebarNav').innerHTML = items.map(i => `
    <div class="sidebar-link${i.active ? ' active' : ''}" onclick="${i.fn}" id="nav_${i.id}">
      <i class="fa-solid ${i.icon}"></i>${i.label}
    </div>`).join('');
}

// ── STUDENT DASHBOARD ─────────────────────────────────────────────────────────
export function renderStudentDashboard(s = 'home') {
  buildSidebar([
    { id:'home',     icon:'fa-house',          label:'Dashboard',       fn:`renderStudentDashboard('home')`,     active: s==='home' },
    { id:'browse',   icon:'fa-compass',         label:'Browse Services', fn:`renderStudentDashboard('browse')`,   active: s==='browse' },
    { id:'bookings', icon:'fa-calendar-check',  label:'My Bookings',     fn:`loadAndShowStudentBookings()`,       active: s==='bookings' },
    { id:'saved',    icon:'fa-bookmark',         label:'Saved Gigs',      fn:`renderStudentDashboard('saved')`,    active: s==='saved' },
    { id:'messages', icon:'fa-message',          label:'Messages',        fn:`openMessages()`,                     active: s==='messages' },
    { id:'profile',  icon:'fa-user',             label:'My Profile',      fn:`renderStudentDashboard('profile')`,  active: s==='profile' },
  ]);

  const myB = bookings.filter(b => b.studentEmail === currentUser.email);
  const M   = document.getElementById('dashboardMain');

  if (s === 'home')     renderStudentHome(M, myB);
  else if (s === 'browse')   renderStudentBrowse(M);
  else if (s === 'bookings') renderStudentBookings(M, myB);
  else if (s === 'saved')    renderStudentSaved(M);
  else if (s === 'profile')  renderStudentProfile(M);
}

function renderStudentHome(M, myB) {
  M.innerHTML = `<div class="fade-in">
    <h1 class="text-2xl font-bold font-display mb-1">Welcome back, ${currentUser.name.split(' ')[0]}! 👋</h1>
    <p class="text-zinc-500 mb-8">Here's your learning activity.</p>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
      <div class="stat-card"><div class="flex items-center gap-4"><div class="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 text-xl"><i class="fa-solid fa-calendar-check"></i></div><div><p class="text-2xl font-bold">${myB.length}</p><p class="text-zinc-500 text-sm">Total Bookings</p></div></div></div>
      <div class="stat-card"><div class="flex items-center gap-4"><div class="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 text-xl"><i class="fa-solid fa-circle-check"></i></div><div><p class="text-2xl font-bold">${myB.filter(b=>b.status==='completed').length}</p><p class="text-zinc-500 text-sm">Completed</p></div></div></div>
      <div class="stat-card cursor-pointer hover:border-emerald-300" onclick="renderStudentDashboard('saved')"><div class="flex items-center gap-4"><div class="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 text-xl"><i class="fa-solid fa-bookmark"></i></div><div><p class="text-2xl font-bold">${savedGigs.size}</p><p class="text-zinc-500 text-sm">Saved Gigs</p></div></div></div>
    </div>
    <h2 class="text-lg font-bold mb-4 font-display">Upcoming Sessions</h2>
    ${myB.filter(b=>b.status!=='completed'&&b.status!=='cancelled').length ? `
      <div class="card mb-8"><table class="data-table"><thead><tr><th>Service</th><th>Tutor</th><th>Date</th><th>Status</th><th>Fee</th></tr></thead><tbody>
      ${myB.filter(b=>b.status!=='completed'&&b.status!=='cancelled').map(b=>{const g=gigs.find(x=>x.id===b.gigId);return`<tr><td class="font-medium">${g?.title||'N/A'}</td><td>${b.tutor}</td><td class="text-sm">${b.date} ${b.time}</td><td><span class="badge ${b.status==='confirmed'?'badge-green':'badge-yellow'}">${b.status}</span></td><td class="font-semibold text-emerald-600">&#8369;${b.total}</td></tr>`;}).join('')}
      </tbody></table></div>` : `<div class="card p-8 text-center text-zinc-400 mb-8">No upcoming sessions. <span class="text-emerald-600 cursor-pointer font-medium" onclick="renderStudentDashboard('browse')">Browse services →</span></div>`}
    <h2 class="text-lg font-bold mb-4 font-display">Recommended For You</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      ${gigs.filter(g=>g.status==='approved').slice(0,3).map(g=>`
        <div class="card cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1" onclick="showGigDetailDash(${g.id})">
          <img src="${g.image}" class="w-full h-36 object-cover">
          <div class="p-4"><span class="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full">${g.category}</span><p class="font-semibold mt-2 text-sm">${g.title}</p><div class="flex items-center justify-between mt-3"><span class="text-emerald-600 font-bold">&#8369;${g.price}/hr</span><span class="text-xs text-zinc-400">⭐ ${g.rating}</span></div></div>
        </div>`).join('')}
    </div>
  </div>`;
}

function renderStudentBrowse(M) {
  const maxP = Math.max(...gigs.map(g => g.price), 2000);
  M.innerHTML = `<div class="fade-in">
    <h1 class="text-2xl font-bold font-display mb-1">Browse Services</h1>
    <p class="text-zinc-500 mb-4">Find your perfect tutor.</p>
    <div class="filter-panel mb-4">
      <div class="flex flex-wrap gap-2 mb-4">
        <span class="text-sm font-semibold text-zinc-500 self-center mr-2">Category:</span>
        <button onclick="sFilter('all')" class="filter-pill active" id="fp_all">All</button>
        ${['ICT','STEM','Arts','Culinary','Business','Humanities'].map(c=>`<button onclick="sFilter('${c}')" class="filter-pill" id="fp_${c}">${c}</button>`).join('')}
      </div>
      <div class="grid md:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-semibold text-zinc-500 mb-2">Max Price: <span id="priceLabel">₱${maxP}/hr</span></label>
          <input type="range" class="range-slider" min="50" max="${maxP}" value="${maxP}" id="priceFilter" oninput="document.getElementById('priceLabel').textContent='₱'+this.value+'/hr';applyFilters()">
        </div>
        <div>
          <label class="block text-xs font-semibold text-zinc-500 mb-2">Min Rating</label>
          <div class="flex gap-1" id="ratingFilter">
            ${[1,2,3,4,5].map(n=>`<button onclick="setMinRating(${n})" id="rf_${n}" class="filter-pill text-xs px-3 py-1">${n}★+</button>`).join('')}
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-zinc-500 mb-2">Sort By</label>
          <select id="sortFilter" onchange="applyFilters()" class="form-input text-sm py-2">
            <option value="rating">⭐ Top Rated</option>
            <option value="price_asc">₱ Price: Low to High</option>
            <option value="price_desc">₱ Price: High to Low</option>
          </select>
        </div>
      </div>
    </div>
    <div id="browseGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      ${gigs.filter(g=>g.status==='approved').map(g=>gigCardDash(g)).join('')}
    </div>
  </div>`;
  window._browseCategory = 'all';
  window._minRating = 0;
}

function renderStudentBookings(M, myB) {
  M.innerHTML = `<div class="fade-in">
    <h1 class="text-2xl font-bold font-display mb-1">My Bookings</h1>
    <p class="text-zinc-500 mb-6">Track all your sessions.</p>
    ${myB.length ? `<div class="card"><table class="data-table"><thead><tr><th>Service</th><th>Tutor</th><th>Date & Time</th><th>Status</th><th>Fee</th><th></th></tr></thead><tbody>
      ${myB.map(b=>{const g=gigs.find(x=>x.id===b.gigId);return`<tr>
        <td class="font-medium text-sm">${g?.title||'N/A'}</td>
        <td class="text-sm">${b.tutor}</td>
        <td class="text-sm">${b.date}<br><span class="text-zinc-400">${b.time}</span></td>
        <td><span class="badge ${b.status==='confirmed'?'badge-green':b.status==='pending'?'badge-yellow':b.status==='completed'?'badge-blue':'badge-red'}">${b.status}</span></td>
        <td class="font-semibold text-emerald-600">&#8369;${b.total}</td>
        <td>${b.status==='pending'||b.status==='confirmed'?`<button onclick="cancelB(${b.id})" class="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100">Cancel</button>`:''}</td>
      </tr>`;}).join('')}
    </tbody></table></div>` : `<div class="card p-12 text-center text-zinc-400"><p class="text-4xl mb-3">📅</p><p>No bookings yet.</p><button onclick="renderStudentDashboard('browse')" class="btn-primary mt-4">Browse Services</button></div>`}
  </div>`;
}

function renderStudentSaved(M) {
  const savedList = gigs.filter(g => savedGigs.has(g.id) && g.status === 'approved');
  M.innerHTML = `<div class="fade-in">
    <h1 class="text-2xl font-bold font-display mb-1">Saved Gigs 🔖</h1>
    <p class="text-zinc-500 mb-6">Your bookmarked services.</p>
    ${savedList.length ? `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${savedList.map(g=>`
          <div class="card hover:shadow-lg transition-all hover:-translate-y-1">
            <div class="relative cursor-pointer" onclick="showGigDetailDash(${g.id})">
              <img src="${g.image}" class="w-full h-36 object-cover">
              <button class="bookmark-btn saved" style="position:absolute;top:8px;right:8px;"
                onclick="event.stopPropagation();toggleBookmark(${g.id});renderStudentDashboard('saved')">🔖</button>
            </div>
            <div class="p-4 cursor-pointer" onclick="showGigDetailDash(${g.id})">
              <span class="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full">${g.category}</span>
              <p class="font-semibold mt-2 text-sm">${g.title}</p>
              <p class="text-xs text-zinc-400 mt-1">${g.tutor}</p>
              <div class="flex items-center justify-between mt-3">
                <span class="text-emerald-600 font-bold">&#8369;${g.price}/hr</span>
                <span class="text-xs text-zinc-400">⭐ ${g.rating}</span>
              </div>
            </div>
          </div>`).join('')}
      </div>` : `
      <div class="card p-12 text-center text-zinc-400">
        <p class="text-4xl mb-3">🔖</p>
        <p class="font-medium mb-2">No saved gigs yet</p>
        <p class="text-sm mb-4">Bookmark services while browsing to save them here.</p>
        <button onclick="renderStudentDashboard('browse')" class="btn-primary">Browse Services</button>
      </div>`}
  </div>`;
}

function renderStudentProfile(M) {
  M.innerHTML = `<div class="fade-in max-w-lg">
    <h1 class="text-2xl font-bold font-display mb-1">My Profile</h1>
    <p class="text-zinc-500 mb-6">Manage your account.</p>
    <div class="card p-6">
      <div class="flex items-center gap-5 mb-6 pb-6 border-b">
        <img src="${currentUser.avatar}" class="w-16 h-16 rounded-2xl">
        <div><p class="font-bold text-lg">${currentUser.name}</p><p class="text-zinc-500 text-sm">${currentUser.email}</p><span class="badge badge-blue mt-1">Student</span></div>
      </div>
      <div class="space-y-4">
        <div><label class="block text-sm font-semibold mb-1.5">Full Name</label><input type="text" value="${currentUser.name}" class="form-input"></div>
        <div><label class="block text-sm font-semibold mb-1.5">Email</label><input type="email" value="${currentUser.email}" class="form-input"></div>
        <div><label class="block text-sm font-semibold mb-1.5">New Password</label><input type="password" placeholder="Leave blank to keep current" class="form-input"></div>
        <button onclick="showToast('✅ Profile updated!')" class="btn-primary">Save Changes</button>
      </div>
    </div>
  </div>`;
}

// ── FILTER HELPERS ────────────────────────────────────────────────────────────
export function sFilter(cat) {
  window._browseCategory = cat;
  document.querySelectorAll('.filter-pill[id^="fp_"]').forEach(b => b.classList.remove('active'));
  document.getElementById('fp_' + cat)?.classList.add('active');
  applyFilters();
}

export function setMinRating(r) {
  window._minRating = (window._minRating === r) ? 0 : r;
  document.querySelectorAll('[id^="rf_"]').forEach(b => b.classList.remove('active'));
  if (window._minRating > 0) document.getElementById('rf_' + window._minRating)?.classList.add('active');
  applyFilters();
}

export function applyFilters() {
  const grid = document.getElementById('browseGrid');
  if (!grid) return;
  const cat  = window._browseCategory || 'all';
  const minR = window._minRating || 0;
  const maxP = parseFloat(document.getElementById('priceFilter')?.value || 99999);
  const sort = document.getElementById('sortFilter')?.value || 'rating';
  let list = gigs.filter(g => g.status === 'approved');
  if (cat !== 'all') list = list.filter(g => g.category === cat);
  list = list.filter(g => parseFloat(g.price) <= maxP);
  if (minR > 0) list = list.filter(g => parseFloat(g.rating) >= minR);
  if (sort === 'price_asc')  list.sort((a,b) => a.price - b.price);
  else if (sort === 'price_desc') list.sort((a,b) => b.price - a.price);
  else list.sort((a,b) => parseFloat(b.rating) - parseFloat(a.rating));
  grid.innerHTML = list.length ? list.map(g => gigCardDash(g)).join('') : '<div class="col-span-3 text-center py-12 text-zinc-400">No services match your filters.</div>';
}

// ── BOOKING ACTIONS ───────────────────────────────────────────────────────────
export function cancelB(id) {
  const b = bookings.find(x => x.id === id);
  if (b) b.status = 'cancelled';
  renderStudentDashboard('bookings');
  showToast('Booking cancelled');
}

export async function loadAndShowStudentBookings() {
  if (currentUser) await loadBookings(currentUser.id, currentUser.role);
  renderStudentDashboard('bookings');
}
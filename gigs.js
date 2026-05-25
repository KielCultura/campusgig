import { gigs, currentUser, apiFetch, showToast, loadGigs } from './api.js';
import { savedGigs, toggleBookmark, renderReviewsList, setRating, submitReview, gigReviews } from './bookmarks-reviews.js';
import { addNotification } from './notifications.js';
import { openAuthModal } from './auth.js';

// ── GIG CARD GRID (landing) ───────────────────────────────────────────────────
export function renderGigs(list) {
  const c = document.getElementById('gigsContainer');
  if (!c) return;
  const visible = list.filter(g => g.status === 'approved');
  c.innerHTML = visible.length ? visible.map(g => `
    <div class="bg-white rounded-3xl overflow-hidden gig-card cursor-pointer border border-zinc-100 shadow-sm" onclick="showGigDetail(${g.id})">
      <div class="relative">
        <img src="${g.image}" class="w-full h-44 object-cover">
        <button class="bookmark-btn${savedGigs.has(g.id) ? ' saved' : ''}"
          style="position:absolute;top:10px;right:10px;"
          onclick="event.stopPropagation();toggleBookmark(${g.id})"
          id="bm_land_${g.id}">${savedGigs.has(g.id) ? '🔖' : '🔲'}</button>
      </div>
      <div class="p-5">
        <div class="flex items-center gap-3 mb-3">
          <img src="${g.avatar}" class="w-8 h-8 rounded-full">
          <div><p class="font-semibold text-sm">${g.tutor}</p><p class="text-xs text-zinc-400">${g.category}</p></div>
        </div>
        <h3 class="font-semibold text-base mb-4 leading-snug">${g.title}</h3>
        <div class="flex justify-between items-center">
          <div><span class="text-emerald-600 font-bold text-xl">&#8369;${g.price}</span><span class="text-zinc-400 text-xs">/hr</span></div>
          <div class="flex items-center gap-1 text-sm"><i class="fa-solid fa-star text-amber-400 text-xs"></i><span class="text-zinc-700 font-semibold">${g.rating}</span><span class="text-zinc-400 text-xs">(${g.reviews})</span></div>
        </div>
      </div>
    </div>`).join('')
    : '<div class="col-span-4 text-center py-16 text-zinc-400">No services found.</div>';
}

// ── GIG MODAL (landing) ───────────────────────────────────────────────────────
export function showGigDetail(gigId) {
  const g = gigs.find(x => x.id === gigId);
  if (!g) return;
  document.getElementById('modalContent').innerHTML = `
    <div class="flex justify-between items-start mb-5">
      <div><span class="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">${g.category}</span>
      <h2 class="text-2xl font-bold mt-2 font-display">${g.title}</h2></div>
      <button onclick="hideModal()" class="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-xl text-zinc-400">×</button>
    </div>
    <img src="${g.image}" class="w-full rounded-2xl mb-6 h-52 object-cover">
    <div class="flex items-center gap-4 mb-6">
      <img src="${g.avatar}" class="w-12 h-12 rounded-2xl">
      <div><p class="font-semibold">${g.tutor}</p><p class="text-sm text-zinc-500">UC Student Tutor</p></div>
      <div class="ml-auto flex items-center gap-2 bg-zinc-50 px-4 py-2 rounded-2xl border">
        <span class="text-amber-400">⭐</span>
        <div><p class="font-bold text-sm">${g.rating}</p><p class="text-xs text-zinc-400">${g.reviews} reviews</p></div>
      </div>
    </div>
    <p class="text-zinc-600 mb-6 leading-relaxed">${g.desc}</p>
    <div class="bg-zinc-50 border rounded-2xl p-5 flex items-center justify-between">
      <div><p class="text-xs text-zinc-400">Starting at</p><p class="text-3xl font-bold text-emerald-600">&#8369;${g.price}<span class="text-sm text-zinc-400 font-normal">/hr</span></p></div>
      <div class="flex gap-2">
        <button onclick="toggleBookmark(${g.id})" id="bm_modal_${g.id}" class="bookmark-btn${savedGigs.has(g.id) ? ' saved' : ''}">${savedGigs.has(g.id) ? '🔖' : '🔲'}</button>
        <button onclick="bookSession(${g.id})" class="btn-primary">Book a Session</button>
      </div>
    </div>
    <div class="mt-6">
      <h3 class="font-bold font-display mb-4">Reviews <span class="text-zinc-400 font-normal text-sm">(${(gigReviews[g.id] || []).length})</span></h3>
      <div id="reviewsList_${g.id}">${renderReviewsList(g.id)}</div>
      ${currentUser ? `
        <div class="mt-4 bg-zinc-50 rounded-2xl p-4 border">
          <p class="font-semibold text-sm mb-3">Leave a Review</p>
          <div class="flex gap-1 mb-3" id="starRow_${g.id}">
            ${[1,2,3,4,5].map(n => `<button class="star-btn" onclick="setRating(${g.id},${n})" id="star_${g.id}_${n}">☆</button>`).join('')}
          </div>
          <textarea id="reviewText_${g.id}" class="form-input mb-3 text-sm" rows="2" placeholder="Share your experience…"></textarea>
          <button onclick="submitReview(${g.id})" class="btn-primary text-sm py-2 px-4">Submit Review</button>
        </div>` : `
        <p class="text-sm text-zinc-400 mt-3 text-center">
          <span class="text-emerald-600 cursor-pointer font-medium" onclick="hideModal();openAuthModal('login')">Log in</span> to leave a review
        </p>`}
    </div>`;
  document.getElementById('gigModal').classList.add('active');
}

export function hideModal() {
  document.getElementById('gigModal').classList.remove('active');
}

// ── FILTERS & SEARCH (landing) ────────────────────────────────────────────────
export function filterByCategory(cat) {
  renderGigs(gigs.filter(g => g.category === cat));
  document.getElementById('gigsContainer').scrollIntoView({ behavior: 'smooth' });
}

export function showAllGigs() { renderGigs(gigs); }

export function performSearch() {
  const q = (
    document.getElementById('heroSearch')?.value ||
    document.getElementById('searchInput')?.value || ''
  ).toLowerCase().trim();
  if (!q) return renderGigs(gigs);
  renderGigs(gigs.filter(g =>
    g.title.toLowerCase().includes(q) ||
    g.category.toLowerCase().includes(q) ||
    g.tutor.toLowerCase().includes(q)
  ));
  document.getElementById('gigsContainer')?.scrollIntoView({ behavior: 'smooth' });
}

// ── BOOK SESSION ──────────────────────────────────────────────────────────────
export async function bookSession(gigId) {
  if (!currentUser) {
    hideModal();
    openAuthModal('login');
    showToast('Please log in to book');
    return;
  }
  const g = gigs.find(x => x.id == gigId);
  const res = await apiFetch('book', { gig_id: gigId, student_id: currentUser.id }, 'POST');
  if (!res) return;
  hideModal();
  addNotification('booking', `Your session with ${g ? g.tutor : 'the tutor'} has been requested! Awaiting confirmation.`);
  showToast('🎉 Session booked with ' + (g ? g.tutor : '') + '!');
}

// ── OFFER A SERVICE (landing nav) ─────────────────────────────────────────────
export function checkAuthForService() {
  if (!currentUser) { openAuthModal('login'); showToast('Please log in to offer a service'); return; }
  if (currentUser.role === 'tutor') showSellModal();
  else showToast('Only tutors can offer services. Register as a tutor!');
}

export function showSellModal()  { document.getElementById('sellModal').classList.add('active'); }
export function hideSellModal()  { document.getElementById('sellModal').classList.remove('active'); }

export async function submitService() {
  const title    = document.getElementById('serviceTitle').value.trim();
  const category = document.getElementById('serviceCategory').value;
  const price    = document.getElementById('servicePrice').value;
  const desc     = document.getElementById('serviceDesc').value || 'New service';
  if (!title || !price) { showToast('Please fill in all fields'); return; }
  const res = await apiFetch('add_gig', { title, category, price: parseFloat(price), description: desc, tutor_id: currentUser.id }, 'POST');
  if (!res) return;
  await loadGigs();
  hideSellModal();
  showToast('✅ Service submitted for review!');
}

// ── GIG CARD (dashboard browse) ───────────────────────────────────────────────
export function gigCardDash(g) {
  return `<div class="card hover:shadow-lg transition-all hover:-translate-y-1">
    <div class="relative cursor-pointer" onclick="showGigDetailDash(${g.id})">
      <img src="${g.image}" class="w-full h-40 object-cover">
      <button class="bookmark-btn${savedGigs.has(g.id) ? ' saved' : ''}" style="position:absolute;top:8px;right:8px;"
        onclick="event.stopPropagation();toggleBookmark(${g.id})" id="bm_dash_${g.id}">${savedGigs.has(g.id) ? '🔖' : '🔲'}</button>
    </div>
    <div class="p-5 cursor-pointer" onclick="showGigDetailDash(${g.id})">
      <div class="flex items-center gap-2 mb-3"><img src="${g.avatar}" class="w-7 h-7 rounded-full">
        <div><p class="text-sm font-semibold">${g.tutor}</p><p class="text-xs text-zinc-400">${g.category}</p></div>
      </div>
      <p class="font-semibold leading-snug mb-3">${g.title}</p>
      <div class="flex items-center justify-between">
        <span class="text-emerald-600 font-bold text-lg">&#8369;${g.price}<span class="text-xs text-zinc-400 font-normal">/hr</span></span>
        <span class="text-sm">⭐ ${g.rating}</span>
      </div>
    </div>
  </div>`;
}

// ── GIG DETAIL MODAL (dashboard) ─────────────────────────────────────────────
export function showGigDetailDash(gigId) {
  const g = gigs.find(x => x.id === gigId);
  if (!g) return;
  document.getElementById('dashGigModal')?.remove();
  const el = document.createElement('div');
  el.id = 'dashGigModal'; el.className = 'modal-overlay active';
  el.innerHTML = `<div class="bg-white rounded-3xl max-w-lg w-full mx-4 max-h-[90vh] overflow-auto"><div class="p-7">
    <div class="flex justify-between items-start mb-4">
      <div><span class="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">${g.category}</span>
      <h2 class="text-xl font-bold mt-2 font-display">${g.title}</h2></div>
      <button onclick="document.getElementById('dashGigModal').remove()" class="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-200">×</button>
    </div>
    <img src="${g.image}" class="w-full rounded-xl h-44 object-cover mb-5">
    <div class="flex items-center gap-3 mb-4">
      <img src="${g.avatar}" class="w-10 h-10 rounded-xl">
      <div><p class="font-semibold text-sm">${g.tutor}</p><p class="text-xs text-zinc-400">UC Student Tutor</p></div>
      <div class="ml-auto text-sm">⭐ ${g.rating} <span class="text-zinc-400">(${(gigReviews[g.id] || []).length})</span></div>
    </div>
    <p class="text-zinc-600 text-sm mb-5">${g.desc}</p>
    <div class="flex items-center justify-between bg-zinc-50 rounded-xl p-4 mb-5">
      <span class="text-2xl font-bold text-emerald-600">&#8369;${g.price}<span class="text-sm text-zinc-400 font-normal">/hr</span></span>
      <div class="flex gap-2">
        <button onclick="toggleBookmark(${g.id})" id="bm_ddash_${g.id}" class="bookmark-btn${savedGigs.has(g.id) ? ' saved' : ''}">${savedGigs.has(g.id) ? '🔖' : '🔲'}</button>
        <button onclick="bookSession(${g.id}); document.getElementById('dashGigModal').remove();" class="btn-primary">Book Session</button>
      </div>
    </div>
    <h3 class="font-bold font-display mb-3">Reviews <span class="text-zinc-400 font-normal text-sm">(${(gigReviews[g.id] || []).length})</span></h3>
    <div id="dashReviewsList_${g.id}">${renderReviewsList(g.id)}</div>
    ${currentUser ? `
      <div class="mt-4 bg-zinc-50 rounded-xl p-4 border">
        <p class="font-semibold text-sm mb-2">Leave a Review</p>
        <div class="flex gap-1 mb-2" id="starRow_${g.id}">
          ${[1,2,3,4,5].map(n => `<button class="star-btn" onclick="setRating(${g.id},${n})" id="star_${g.id}_${n}">☆</button>`).join('')}
        </div>
        <textarea id="reviewText_${g.id}" class="form-input mb-2 text-sm" rows="2" placeholder="Share your experience…"></textarea>
        <button onclick="submitReview(${g.id})" class="btn-primary text-sm py-2 px-4">Submit</button>
      </div>` : ''}
  </div></div>`;
  document.body.appendChild(el);
}
import { showToast, gigs, currentUser } from './api.js';
import { addNotification } from './notifications.js';

// ── BOOKMARKS ─────────────────────────────────────────────────────────────────
export let savedGigs = new Set(
  JSON.parse(localStorage.getItem('cg_saved') || '[]').map(Number)
);

export function toggleBookmark(gigId) {
  gigId = parseInt(gigId);
  if (savedGigs.has(gigId)) {
    savedGigs.delete(gigId);
    showToast('Removed from saved gigs');
  } else {
    savedGigs.add(gigId);
    showToast('🔖 Gig saved!');
    addNotification('bookmark', `You saved "${gigs.find(g => g.id === gigId)?.title || 'a gig'}" to your list.`);
  }
  localStorage.setItem('cg_saved', JSON.stringify([...savedGigs]));
  // Update all bookmark buttons for this gig across all contexts
  ['bm_land_', 'bm_dash_', 'bm_ddash_', 'bm_modal_'].forEach(pfx => {
    const btn = document.getElementById(pfx + gigId);
    if (btn) {
      btn.innerHTML = `<i class="${savedGigs.has(gigId) ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>`;
      btn.classList.toggle('saved', savedGigs.has(gigId));
    }
  });
}

// ── REVIEWS ───────────────────────────────────────────────────────────────────
export const gigReviews   = {};  // gigId → [{user, rating, text, date}]
export const pendingRating = {}; // gigId → number

export function renderReviewsList(gigId) {
  const reviews = gigReviews[gigId] || [];
  if (!reviews.length) return '<p class="text-sm text-zinc-400 text-center py-4">No reviews yet. Be the first!</p>';
  return reviews.map(r => `
    <div class="review-card">
      <div class="flex items-center justify-between mb-1">
        <span class="font-semibold text-sm">${r.user}</span>
        <span class="text-xs text-zinc-400">${r.date}</span>
      </div>
      <div class="text-base mb-1">${'⭐'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
      <p class="text-sm text-zinc-600">${r.text}</p>
    </div>`).join('');
}

export function setRating(gigId, n) {
  pendingRating[gigId] = n;
  for (let i = 1; i <= 5; i++) {
    const s = document.getElementById(`star_${gigId}_${i}`);
    if (s) s.textContent = i <= n ? '⭐' : '☆';
  }
}

export function submitReview(gigId) {
  const r = pendingRating[gigId];
  if (!r) { showToast('Please select a star rating'); return; }
  const txt = document.getElementById(`reviewText_${gigId}`)?.value.trim();
  if (!txt) { showToast('Please write a review'); return; }

  if (!gigReviews[gigId]) gigReviews[gigId] = [];
  gigReviews[gigId].unshift({
    user: currentUser.name, rating: r, text: txt,
    date: new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  });

  // Recalculate average
  const totalR = gigReviews[gigId].reduce((s, x) => s + x.rating, 0);
  const g = gigs.find(x => x.id === gigId);
  if (g) { g.rating = (totalR / gigReviews[gigId].length).toFixed(1); g.reviews = gigReviews[gigId].length; }

  pendingRating[gigId] = 0;
  const listEl = document.getElementById(`reviewsList_${gigId}`) || document.getElementById(`dashReviewsList_${gigId}`);
  if (listEl) listEl.innerHTML = renderReviewsList(gigId);

  addNotification('review', `${currentUser.name} left a ${r}★ review on "${g?.title || 'your service'}".`);
  showToast('✅ Review submitted!');
}
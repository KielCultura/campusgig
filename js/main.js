// ── IMPORTS ───────────────────────────────────────────────────────────────────
import { loadGigs, gigs, showToast } from '../api.js';
import { showLanding, showDashboard } from './router.js';
import { openAuthModal, closeAuthModal, switchTab, selectRole, fillDemo, handleLogin, handleRegister, logout, restoreSession } from '../auth.js';
import { renderGigs, showGigDetail, hideModal, filterByCategory, showAllGigs, performSearch, checkAuthForService, showSellModal, hideSellModal, submitService, bookSession, gigCardDash, showGigDetailDash } from '../gigs.js';
import { toggleBookmark } from '../bookmarks-reviews.js';
import { setRating, submitReview } from '../bookmarks-reviews.js';
import { toggleNotifPanel, markNotifRead, markAllNotifsRead, renderNotificationsView, clearNotifications, updateNotifBadge } from './notifications.js';
import { openMessages, openConversation, sendMessage, openNewChatModal, filterUserList, startChatWith } from './messaging.js';
import { renderStudentDashboard, buildSidebar, sFilter, setMinRating, applyFilters, cancelB, loadAndShowStudentBookings } from '../dashboard-student.js';
import { renderTutorDashboard, acceptB, declineB, markDone, removeMyGig, openAddServiceModal, submitTutorService, loadAndShowTutorBookings } from '../dashboard-tutor.js';
import { renderAdminDashboard, toggleUser, delUser, approveG, rejectG, adminDelGig, loadAndShowAdminBookings } from '../dashboard-admin.js';

// ── EXPOSE GLOBALS (used by inline onclick handlers in HTML) ──────────────────
// Auth
window.openAuthModal       = openAuthModal;
window.closeAuthModal      = closeAuthModal;
window.switchTab           = switchTab;
window.selectRole          = selectRole;
window.fillDemo            = fillDemo;
window.handleLogin         = handleLogin;
window.handleRegister      = handleRegister;
window.logout              = logout;

// Routing
window.showLanding         = showLanding;
window.showDashboard       = showDashboard;

// Gigs / Landing
window.renderGigs          = renderGigs;
window.showGigDetail       = showGigDetail;
window.hideModal           = hideModal;
window.filterByCategory    = filterByCategory;
window.showAllGigs         = showAllGigs;
window.performSearch       = performSearch;
window.checkAuthForService = checkAuthForService;
window.showSellModal       = showSellModal;
window.hideSellModal       = hideSellModal;
window.submitService       = submitService;
window.bookSession         = bookSession;
window.gigCardDash         = gigCardDash;
window.showGigDetailDash   = showGigDetailDash;

// Bookmarks & Reviews
window.toggleBookmark      = toggleBookmark;
window.setRating           = setRating;
window.submitReview        = submitReview;

// Notifications
window.toggleNotifPanel        = toggleNotifPanel;
window.markNotifRead           = markNotifRead;
window.markAllNotifsRead       = markAllNotifsRead;
window.renderNotificationsView = renderNotificationsView;
window.clearNotifications      = clearNotifications;

// Messaging
window.openMessages      = openMessages;
window.openConversation  = openConversation;
window.sendMessage       = sendMessage;
window.openNewChatModal  = openNewChatModal;
window.filterUserList    = filterUserList;
window.startChatWith     = startChatWith;

// Student Dashboard
window.renderStudentDashboard    = renderStudentDashboard;
window.sFilter                   = sFilter;
window.setMinRating              = setMinRating;
window.applyFilters              = applyFilters;
window.cancelB                   = cancelB;
window.loadAndShowStudentBookings = loadAndShowStudentBookings;

// Tutor Dashboard
window.renderTutorDashboard    = renderTutorDashboard;
window.acceptB                 = acceptB;
window.declineB                = declineB;
window.markDone                = markDone;
window.removeMyGig             = removeMyGig;
window.openAddServiceModal     = openAddServiceModal;
window.submitTutorService      = submitTutorService;
window.loadAndShowTutorBookings = loadAndShowTutorBookings;

// Admin Dashboard
window.renderAdminDashboard    = renderAdminDashboard;
window.toggleUser              = toggleUser;
window.delUser                 = delUser;
window.approveG                = approveG;
window.rejectG                 = rejectG;
window.adminDelGig             = adminDelGig;
window.loadAndShowAdminBookings = loadAndShowAdminBookings;

// ── INIT ──────────────────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  await loadGigs();
  renderGigs(gigs);

  const restored = restoreSession();
  if (restored) {
    updateNotifBadge();
    showDashboard();
  }
});
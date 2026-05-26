// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
let notifications = JSON.parse(localStorage.getItem('cg_notifs') || '[]');

const notifIcons = {
  booking:  { bg: '#dcfce7', emoji: '📅' },
  message:  { bg: '#dbeafe', emoji: '💬' },
  review:   { bg: '#fef9c3', emoji: '⭐' },
  bookmark: { bg: '#fce7f3', emoji: '🔖' },
  system:   { bg: '#f1f5f9', emoji: '🔔' },
};

export function addNotification(type, message) {
  notifications.unshift({
    id: Date.now(), type, message, read: false,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  if (notifications.length > 40) notifications = notifications.slice(0, 40);
  localStorage.setItem('cg_notifs', JSON.stringify(notifications));
  updateNotifBadge();
  renderNotifList();
}

export function updateNotifBadge() {
  const count = notifications.filter(n => !n.read).length;
  const nc = document.getElementById('notifCount');
  if (nc) { nc.textContent = count; nc.classList.toggle('hidden', count === 0); }
  const sb = document.getElementById('sidebarNotifBadge');
  if (sb) { sb.textContent = count; sb.classList.toggle('hidden', count === 0); }
}

export function renderNotifList() {
  const el = document.getElementById('notifList');
  if (!el) return;
  if (!notifications.length) {
    el.innerHTML = '<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px;">No notifications yet.</div>';
    return;
  }
  el.innerHTML = notifications.map(n => {
    const ic = notifIcons[n.type] || notifIcons.system;
    return `<div class="notif-item${n.read ? '' : ' unread'}" onclick="markNotifRead(${n.id})">
      <div class="notif-icon" style="background:${ic.bg}">${ic.emoji}</div>
      <div style="flex:1;min-width:0;">
        <p style="font-size:13px;line-height:1.4;${n.read ? 'color:#64748b' : 'font-weight:600;color:#0f172a'}">${n.message}</p>
        <p style="font-size:11px;color:#94a3b8;margin-top:3px;">${n.time}</p>
      </div>
      ${!n.read ? '<span style="width:8px;height:8px;background:#10b981;border-radius:50%;flex-shrink:0;margin-top:4px;"></span>' : ''}
    </div>`;
  }).join('');
}

export function markNotifRead(id) {
  const n = notifications.find(x => x.id === id);
  if (n) n.read = true;
  localStorage.setItem('cg_notifs', JSON.stringify(notifications));
  updateNotifBadge();
  renderNotifList();
}

export function markAllNotifsRead() {
  notifications.forEach(n => n.read = true);
  localStorage.setItem('cg_notifs', JSON.stringify(notifications));
  updateNotifBadge();
  renderNotifList();
}

export function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    renderNotifList();
    setTimeout(() => {
      const close = (e) => {
        if (!document.getElementById('notifBell')?.contains(e.target)) {
          panel.classList.add('hidden');
          document.removeEventListener('click', close);
        }
      };
      document.addEventListener('click', close);
    }, 0);
  }
}

export function renderNotificationsView() {
  const M = document.getElementById('dashboardMain');
  if (!M) return;
  markAllNotifsRead();
  M.innerHTML = `<div class="fade-in">
    <div class="flex items-center justify-between mb-6">
      <div><h1 class="text-2xl font-bold font-display mb-1">Notifications</h1><p class="text-zinc-500">Your recent activity updates.</p></div>
      <button onclick="clearNotifications()" class="text-sm text-zinc-400 hover:text-red-500 font-medium">Clear all</button>
    </div>
    <div class="card overflow-hidden" style="max-width:600px;">
      ${notifications.length ? notifications.map(n => {
        const ic = notifIcons[n.type] || notifIcons.system;
        return `<div class="notif-item">
          <div class="notif-icon" style="background:${ic.bg};width:40px;height:40px;">${ic.emoji}</div>
          <div style="flex:1;">
            <p class="text-sm" style="color:#0f172a">${n.message}</p>
            <p class="text-xs text-zinc-400 mt-1">${n.time}</p>
          </div>
        </div>`;
      }).join('') : '<div class="p-12 text-center text-zinc-400"><p class="text-4xl mb-3">🔔</p><p>No notifications yet.</p></div>'}
    </div>
  </div>`;
}

export function clearNotifications() {
  notifications = [];
  localStorage.removeItem('cg_notifs');
  renderNotificationsView();
}
import { currentUser, showToast } from '../api.js';
import { addNotification } from '../notifications.js';

// ── PUSHER CONFIG ─────────────────────────────────────────────────────────────
const PUSHER_KEY     = '4a874ebc8d8abeb0fcbf';
const PUSHER_CLUSTER = 'ap1';
const CHAT_API       = 'https://campusgig-r5tz.onrender.com/chat.php';

let pusher           = null;
let pusherChannel    = null;
export let activeConvId = null;
let allUsers         = [];
let msgConversations = [];

// ── REST HELPER ───────────────────────────────────────────────────────────────
async function chatFetch(action, body = {}) {
  try {
    const res = await fetch(CHAT_API + '?action=' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, user_id: currentUser.id })
    });
    const json = await res.json();
    return json.ok ? json.data : null;
  } catch(e) {
    console.warn('Chat API error:', e);
    return null;
  }
}

// ── PUSHER INIT ───────────────────────────────────────────────────────────────
export function connectWS() {
  if (pusher) return;
  pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
  pusherChannel = pusher.subscribe('user-' + currentUser.id);

  pusherChannel.bind('new-message', function(data) {
    if (data.conversation_id == activeConvId) {
      appendMessage(data.message);
      markRead(activeConvId);
    } else {
      loadConversations();
      if (data.message?.sender && data.message.sender !== currentUser.name) {
        addNotification('message', `New message from ${data.message.sender}.`);
      }
    }
    updateUnreadBadge();
  });

  loadConversations();
}

async function loadConversations() {
  const data = await chatFetch('get_conversations');
  if (data) { msgConversations = data; renderConvList(); }
}

async function markRead(convId) {
  await chatFetch('mark_read', { conversation_id: convId });
}

async function updateUnreadBadge() {
  const data = await chatFetch('unread_count');
  if (data !== null) {
    document.querySelectorAll('#sidebarNav .sidebar-link').forEach(el => {
      if (el.textContent.trim().startsWith('Messages')) {
        let dot = el.querySelector('.msg-dot');
        if (data > 0) {
          if (!dot) {
            dot = document.createElement('span');
            dot.className = 'msg-dot';
            dot.style.cssText = 'margin-left:auto;background:#ef4444;color:white;border-radius:999px;font-size:11px;font-weight:700;padding:1px 7px;';
            el.appendChild(dot);
          }
          dot.textContent = data;
        } else if (dot) { dot.remove(); }
      }
    });
  }
}

// ── OPEN MESSAGES VIEW ────────────────────────────────────────────────────────
export function openMessages() {
  const M = document.getElementById('dashboardMain');
  M.innerHTML = `
    <div class="fade-in" style="height:calc(100vh - 96px);">
      <div class="chat-layout" style="height:100%;">
        <div class="conv-list" id="convListPanel">
          <div style="padding:16px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
            <span class="font-bold font-display text-lg">Messages</span>
            <button class="new-chat-btn" onclick="openNewChatModal()">+ New Chat</button>
          </div>
          <div id="convListInner"><div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px;">Loading…</div></div>
        </div>
        <div class="chat-area" id="chatArea">
          <div class="chat-empty" id="chatEmpty">
            <div style="font-size:48px;">💬</div>
            <p class="font-semibold text-zinc-500">Select a conversation</p>
            <p class="text-sm">or start a new one with any user</p>
            <button class="new-chat-btn mt-2" onclick="openNewChatModal()">Start Chatting</button>
          </div>
        </div>
      </div>
    </div>`;

  connectWS();
  fetch(`https://campusgig-r5tz.onrender.com/api.php?action=users`)
    .then(r => r.json())
    .then(j => { if (j.ok) allUsers = j.data; });
}

function renderConvList() {
  const el = document.getElementById('convListInner');
  if (!el) return;
  if (!msgConversations.length) {
    el.innerHTML = '<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px;">No conversations yet.<br>Start one with any user!</div>';
    return;
  }
  el.innerHTML = msgConversations.map(c => `
    <div class="conv-item${c.id == activeConvId ? ' active' : ''}" onclick="openConversation(${c.id})">
      <div class="conv-avatar" style="background:${roleColor(c.other_role)}">${(c.other_name || '?')[0].toUpperCase()}</div>
      <div class="conv-meta">
        <div class="flex items-center justify-between">
          <span class="conv-name">${c.other_name}</span>
          ${c.unread_count > 0 ? `<span class="unread-badge">${c.unread_count}</span>` : ''}
        </div>
        <div class="conv-preview">${c.last_message || 'No messages yet'}</div>
      </div>
    </div>`).join('');
}

function roleColor(role) {
  return role === 'tutor' ? '#10b981' : role === 'admin' ? '#ef4444' : '#3b82f6';
}

export async function openConversation(convId) {
  activeConvId = convId;
  const conv = msgConversations.find(c => c.id == convId);
  const area = document.getElementById('chatArea');
  if (!area) return;

  area.innerHTML = `
    <div class="chat-header">
      <div class="conv-avatar" style="width:38px;height:38px;font-size:16px;background:${roleColor(conv?.other_role)}">${(conv?.other_name || '?')[0].toUpperCase()}</div>
      <div>
        <p class="font-semibold text-sm">${conv?.other_name || 'Chat'}</p>
        <p class="text-xs text-zinc-400 capitalize">${conv?.other_role || ''}</p>
      </div>
    </div>
    <div class="chat-messages" id="msgList"><div style="text-align:center;color:#94a3b8;padding:24px;font-size:13px;">Loading…</div></div>
    <div class="chat-input-area">
      <textarea id="msgInput" class="chat-input" rows="1" placeholder="Type a message…"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage();}"></textarea>
      <button class="chat-send-btn" onclick="sendMessage()"><i class="fa-solid fa-paper-plane"></i></button>
    </div>`;

  renderConvList();
  const msgs = await chatFetch('get_messages', { conversation_id: convId });
  if (msgs) renderMessages(msgs);
  await markRead(convId);
  await loadConversations();
}

function renderMessages(msgs) {
  const list = document.getElementById('msgList');
  if (!list) return;
  if (!msgs.length) {
    list.innerHTML = '<div style="text-align:center;color:#94a3b8;font-size:13px;padding:24px;">No messages yet. Say hi!</div>';
    return;
  }
  list.innerHTML = msgs.map(m => buildBubble(m)).join('');
  list.scrollTop = list.scrollHeight;
}

function appendMessage(m) {
  const list = document.getElementById('msgList');
  if (!list) return;
  const div = document.createElement('div');
  div.innerHTML = buildBubble(m);
  list.appendChild(div.firstElementChild);
  list.scrollTop = list.scrollHeight;
}

function buildBubble(m) {
  const mine = m.sender_id == currentUser.id;
  const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `
    <div style="display:flex;flex-direction:column;align-items:${mine ? 'flex-end' : 'flex-start'}">
      ${!mine ? `<span style="font-size:11px;color:#94a3b8;margin-bottom:3px;margin-left:4px;">${m.sender}</span>` : ''}
      <div class="msg-bubble ${mine ? 'mine' : 'theirs'}">${escapeHtml(m.body)}</div>
      <span class="msg-time ${mine ? '' : 'theirs'}">${time}</span>
    </div>`;
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export async function sendMessage() {
  const input = document.getElementById('msgInput');
  const body  = input?.value.trim();
  if (!body || !activeConvId) return;
  input.value = '';
  const msg = await chatFetch('send_message', { conversation_id: activeConvId, body });
  if (msg) appendMessage(msg);
}

export function openNewChatModal() {
  const others = allUsers.filter(u => u.id != currentUser.id);
  const el = document.createElement('div');
  el.id = 'newChatModal';
  el.className = 'modal-overlay active';
  el.innerHTML = `
    <div class="bg-white rounded-3xl max-w-md w-full mx-4 p-6 shadow-2xl fade-in" style="max-height:80vh;overflow-y:auto;">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold font-display">New Conversation</h3>
        <button onclick="document.getElementById('newChatModal').remove()" class="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-200">×</button>
      </div>
      <input type="text" id="userSearchInput" placeholder="Search users…" class="form-input mb-4" oninput="filterUserList(this.value)">
      <div id="userPickerList">
        ${others.map(u => `
          <div class="conv-item rounded-xl" onclick="startChatWith(${u.id})">
            <div class="conv-avatar" style="background:${roleColor(u.role)}">${u.name[0].toUpperCase()}</div>
            <div class="conv-meta">
              <p class="conv-name">${u.name}</p>
              <p class="conv-preview capitalize">${u.role}</p>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(el);
}

export function filterUserList(q) {
  const others = allUsers.filter(u => u.id != currentUser.id);
  const filtered = q ? others.filter(u => u.name.toLowerCase().includes(q.toLowerCase())) : others;
  document.getElementById('userPickerList').innerHTML = filtered.map(u => `
    <div class="conv-item rounded-xl" onclick="startChatWith(${u.id})">
      <div class="conv-avatar" style="background:${roleColor(u.role)}">${u.name[0].toUpperCase()}</div>
      <div class="conv-meta"><p class="conv-name">${u.name}</p><p class="conv-preview capitalize">${u.role}</p></div>
    </div>`).join('');
}

export async function startChatWith(otherUserId) {
  document.getElementById('newChatModal')?.remove();
  if (!document.getElementById('convListPanel')) openMessages();
  const conv = await chatFetch('open_conversation', { other_user_id: otherUserId });
  if (conv) {
    await loadConversations();
    openConversation(conv.id);
  }
}
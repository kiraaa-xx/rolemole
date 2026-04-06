let character = null;
let messages = [];
let pinnedIds = new Set();
let memoryRefreshed = false;
let user = JSON.parse(localStorage.getItem('rolemole_user') || 'null');

const params = new URLSearchParams(location.search);
const charId = params.get('id');

async function init() {
  if (!charId) { location.href = '/'; return; }
  if (!user) {
    user = { username: 'Traveler', display_name: 'Traveler', pfp_url: '' };
  }
  const res = await fetch(`/api/characters/${charId}`);
  character = await res.json();
  document.title = `${character.name} – Role Mole`;
  document.getElementById('char-name').textContent = character.name;
  document.getElementById('char-sub').textContent = [character.genre, character.pronouns].filter(Boolean).join(' · ');

  const pfpImg = document.getElementById('char-pfp');
  const pfpFallback = document.getElementById('char-pfp-fallback');
  pfpFallback.textContent = character.name[0].toUpperCase();
  if (character.pfp_url) {
    pfpImg.src = character.pfp_url;
    pfpImg.style.display = 'block';
    pfpImg.onload = () => { pfpFallback.style.display = 'none'; };
    pfpImg.onerror = () => { pfpImg.style.display = 'none'; pfpFallback.style.display = 'flex'; };
  } else {
    pfpImg.style.display = 'none';
    pfpFallback.style.display = 'flex';
  }

  if (!loadChat()) {
    if (character.intro_message) {
      const intro = character.intro_message
        .replace(/\{user\}/g, user.display_name || user.username || 'Traveler')
        .replace(/msg-action-text">/g, '')
        .replace(/msg-speech">/g, '')
        .replace(/<[^>]*>/g, '');
      addMessage('assistant', intro, true);
    }
  }
}

function saveChat() {
  const key = `rolemole_chat_${user.username}_${charId}`;
  localStorage.setItem(key, JSON.stringify({
    messages: messages,
    pinnedIds: [...pinnedIds]
  }));
}

function loadChat() {
  const key = `rolemole_chat_${user.username}_${charId}`;
  const saved = localStorage.getItem(key);
  if (!saved) return false;
  try {
    const data = JSON.parse(saved);
    messages = (data.messages || []).map(m => ({
      ...m,
      content: cleanText(m.content)
    }));
    pinnedIds = new Set(data.pinnedIds || []);
    saveChat();
    renderMessages();
    return messages.length > 0;
  } catch(e) {
    return false;
  }
}

function clearChat() {
  if (!confirm('Clear this entire chat? This cannot be undone.')) return;
  localStorage.removeItem(`rolemole_chat_${user.username}_${charId}`);
  messages = [];
  pinnedIds = new Set();
  if (character.intro_message) {
    const intro = character.intro_message.replace(/\{user\}/g, user.display_name || user.username || 'Traveler');
    addMessage('assistant', intro, true);
  }
}

function addMessage(role, content, isIntro = false) {
  const id = Date.now() + Math.random();
  const msg = { id, role, content, pinned: isIntro };
  messages.push(msg);
  if (isIntro) pinnedIds.add(id);

  if (role === 'assistant' && !isIntro) {
    renderMessages();
    saveChat();
    typewriterEffect(id, content);
  } else {
    renderMessages();
    saveChat();
  }
  return id;
}

function typewriterEffect(msgId, fullContent) {
  const container = document.getElementById('chat-messages');
  const msgEl = container.querySelector(`[data-id="${msgId}"] .msg-bubble`);
  if (!msgEl) return;

  const formatted = formatContent(fullContent);
  const words = formatted.split(' ');
  let current = 0;
  msgEl.innerHTML = '<span class="typing-cursor"></span>';

  const interval = setInterval(() => {
    if (current >= words.length) {
      clearInterval(interval);
      msgEl.innerHTML = formatContent(fullContent);
      return;
    }
    current += 2;
    msgEl.innerHTML = words.slice(0, current).join(' ') + ' <span class="typing-cursor"></span>';
    container.scrollTop = container.scrollHeight;
  }, 30);
}

function renderMessages() {
  const container = document.getElementById('chat-messages');
  container.innerHTML = messages.map(m => renderMsg(m)).join('');
  container.scrollTop = container.scrollHeight;
}

function renderMsg(m) {
  const isUser = m.role === 'user';
  const name = isUser ? (user.display_name || user.username || 'You') : character.name;

  const pfpHtml = isUser
    ? (user.pfp_url
        ? `<img src="${user.pfp_url}" style="width:32px;height:32px;border-radius:50%;object-fit:cover">`
        : `<div class="avatar-circle" style="width:32px;height:32px;font-size:12px">${name[0].toUpperCase()}</div>`)
    : (character.pfp_url
        ? `<img src="${character.pfp_url}" style="width:32px;height:32px;border-radius:50%;object-fit:cover">`
        : `<div class="avatar-circle" style="width:32px;height:32px;font-size:12px">${character.name[0].toUpperCase()}</div>`);

  const formattedContent = formatContent(m.content);
  const pinned = pinnedIds.has(m.id);

  return `<div class="msg-wrap ${isUser ? 'user' : ''}" data-id="${m.id}">
    <div class="msg-pfp">${pfpHtml}</div>
    <div class="msg-content">
      ${pinned ? `<div class="pin-badge"><i class="fa-solid fa-thumbtack"></i> Pinned</div>` : ''}
      <div class="msg-bubble">${formattedContent}</div>
      <div class="msg-actions">
        ${!isUser ? `<button class="msg-act-btn tts-btn" id="tts-btn-${m.id}" onclick="speakMessage(${m.id}, this)">
          <i class="fa-solid fa-volume-high"></i> Listen
        </button>` : ''}
        <button class="msg-act-btn" onclick="togglePin(${m.id})">
          <i class="fa-solid fa-thumbtack"></i> ${pinned ? 'Unpin' : 'Pin'}
        </button>
        ${isUser ? `
        <button class="msg-act-btn" onclick="editMsg(${m.id})"><i class="fa-solid fa-pen"></i> Edit</button>
        <button class="msg-act-btn" onclick="revertMsg(${m.id})"><i class="fa-solid fa-rotate-left"></i> Revert</button>` : ''}
        <button class="msg-act-btn del" onclick="deleteMsg(${m.id})"><i class="fa-solid fa-trash"></i> Delete</button>
      </div>
    </div>
  </div>`;
}

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/msg-action-text">/g, '')
    .replace(/msg-speech">/g, '')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<em[^>]*>/gi, '')
    .replace(/<\/em>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function formatContent(text) {
  const clean = text
    .replace(/[a-zA-Z0-9_:;.\s-]+">/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
  return clean
    .replace(/\*([^*\n]+)\*/g, '<i>*$1*</i>')
    .replace(/"([^"\n]+)"/g, '"<b>$1</b>"')
    .replace(/\n/g, '<br>');
}

function togglePin(id) {
  if (pinnedIds.has(id)) pinnedIds.delete(id);
  else pinnedIds.add(id);
  const msg = messages.find(m => m.id === id);
  if (msg) msg.pinned = pinnedIds.has(id);
  renderMessages();
  saveChat();
}

function deleteMsg(id) {
  messages = messages.filter(m => m.id !== id);
  pinnedIds.delete(id);
  renderMessages();
  saveChat();
}

function editMsg(id) {
  const msg = messages.find(m => m.id === id);
  if (!msg) return;
  const newText = prompt('Edit your message:', msg.content);
  if (newText !== null && newText.trim() !== '') {
    msg.content = newText.trim();
    renderMessages();
    saveChat();
  }
}

function revertMsg(id) {
  const idx = messages.findIndex(m => m.id === id);
  if (idx > 0) {
    messages = messages.slice(0, idx);
    pinnedIds = new Set([...pinnedIds].filter(pid => messages.some(m => m.id === pid)));
    renderMessages();
    saveChat();
  }
}

function showTyping() {
  const container = document.getElementById('chat-messages');
  const el = document.createElement('div');
  el.className = 'msg-wrap';
  el.id = 'typing-indicator';
  el.innerHTML = `
    <div class="msg-pfp">
      ${character.pfp_url
        ? `<img src="${character.pfp_url}" style="width:34px;height:34px;border-radius:50%;object-fit:cover">`
        : `<div class="avatar-circle" style="width:34px;height:34px;font-size:12px">${character.name[0]}</div>`}
    </div>
    <div class="typing-bubble">
      <span></span><span></span><span></span>
    </div>`;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || !character) return;
  input.value = '';
  
  const plainUserMsg = text;
  addMessage('user', plainUserMsg);
  showTyping();
  
  try {
    const pinnedMessages = messages.filter(m => pinnedIds.has(m.id));
    const chatHistory = messages.map(m => ({
      role: m.role,
      content: m.content
    }));
    
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId: charId,
        messages: chatHistory,
        pinnedMessages: pinnedMessages.map(m => ({ role: m.role, content: m.content })),
        username: user.display_name || user.username || 'Traveler',
        userGender: user.gender || '',
        userPronouns: user.pronouns || '',
        responseLength,
        responseMood
      })
    });;
    const data = await res.json();
    hideTyping();
    memoryRefreshed = false;
    if (data.reply) {
      addMessage('assistant', data.reply);
    } else {
      addMessage('assistant', data.error || 'Something went wrong.');
    }
  } catch (e) {
    console.error('Chat error:', e);
    hideTyping();
    addMessage('assistant', 'Connection error. Please check your server.');
  }
}

function refreshCharacter() {
  memoryRefreshed = true;
  const allButtons = document.querySelectorAll('.chat-header-actions button');
  allButtons.forEach(btn => {
    btn.style.color = '#27ae60';
    setTimeout(() => btn.style.color = '', 2000);
  });
  const notice = document.createElement('div');
  notice.style.cssText = 'text-align:center;font-size:12px;color:#27ae60;padding:8px;';
  notice.textContent = '✓ Character memory refreshed — AI will remember everything on next message';
  const container = document.getElementById('chat-messages');
  container.appendChild(notice);
  container.scrollTop = container.scrollHeight;
  setTimeout(() => notice.remove(), 3000);
}

function goAbout() {
  window.location.href = `/about?id=${charId}`;
}

init();
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('chat-input');
  if (textarea) {
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    });
  }
});
let responseLength = 'medium';
let responseMood = 'normal';

function setLength(val, btn) {
  responseLength = val;
  btn.closest('.segmented').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function setMood(val, btn) {
  responseMood = val;
  btn.closest('.segmented').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function toggleControls() {
  const bar = document.getElementById('chat-controls');
  const btn = document.getElementById('controls-toggle-btn');
  const isVisible = bar.style.display !== 'none';
  bar.style.display = isVisible ? 'none' : 'flex';
  btn.classList.toggle('active', !isVisible);
}
let currentPlayingBtn = null;

async function speakMessage(id, btn) {
  const msg = messages.find(m => m.id === id);
  if (!msg) return;

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (currentPlayingBtn) {
      currentPlayingBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Listen';
      currentPlayingBtn.classList.remove('playing');
    }
    if (currentPlayingBtn === btn) {
      currentPlayingBtn = null;
      return;
    }
  }

  currentPlayingBtn = btn;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';

  const cleanContent = msg.content
    .replace(/<[^>]*>/g, '')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/"/g, '')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanContent);
  const voiceName = character.voice_id || 'en-US-JennyNeural';
  const langCode = voiceName.startsWith('en-GB') ? 'en-GB' : 'en-US';
  const isMale = ['en-US-GuyNeural','en-US-ChristopherNeural','en-GB-RyanNeural','en-US-EricNeural'].includes(voiceName);

  const voices = window.speechSynthesis.getVoices();
  const matched = voices.find(v =>
    v.lang.startsWith(langCode) &&
    (isMale
      ? v.name.toLowerCase().match(/david|mark|guy|james|richard/)
      : !v.name.toLowerCase().match(/david|mark|guy|james|richard/))
  ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

  if (matched) utterance.voice = matched;
  utterance.lang = langCode;
  utterance.pitch = isMale ? 0.85 : 1.1;
  utterance.rate = 1.0;

  try {
    const emotionRes = await fetch('/api/emotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanContent.slice(0, 200) })
    });
    if (emotionRes.ok) {
      const d = await emotionRes.json();
      utterance.rate = d.speed || 1.0;
    }
  } catch(e) {}

  btn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop';
  btn.classList.add('playing');

  utterance.onend = () => {
    btn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Listen';
    btn.classList.remove('playing');
    currentPlayingBtn = null;
  };
  utterance.onerror = () => {
    btn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Listen';
    btn.classList.remove('playing');
    currentPlayingBtn = null;
  };

  window.speechSynthesis.speak(utterance);
}
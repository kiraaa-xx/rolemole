if (!localStorage.getItem('rolemole_user')) {
  window.location.href = '/login';
}
const API = '';
let allCharacters = [];
let activeGenre = 'all';

async function loadCharacters() {
  try {
    const res = await fetch(`${API}/api/characters`);
    allCharacters = await res.json();
    renderCharacters(allCharacters);
    updateNavAvatar();
  } catch (e) {
    document.getElementById('characters-list').innerHTML = '<div class="loading">Failed to load characters.</div>';
  }
}

function renderCharacters(chars) {
  const list = document.getElementById('characters-list');
  if (!chars.length) { list.innerHTML = '<div class="loading">No characters found.</div>'; return; }
  list.innerHTML = chars.map(c => `
    <div class="char-row" onclick="goChat('${c.id}')">
      ${c.pfp_url
        ? `<img class="char-row-pfp" src="${c.pfp_url}" alt="${c.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : ''}
      <div class="char-row-pfp-fallback" style="${c.pfp_url ? 'display:none' : ''}">
        <i class="fa-solid fa-masks-theater"></i>
      </div>
      <div class="char-row-info">
        <div class="char-row-name">${c.name}</div>
        <div class="char-row-desc">${c.short_description || ''}</div>
      </div>
      <div class="char-row-meta">
        <span class="char-chats"><i class="fa-solid fa-comment"></i> ${c.chat_count || 0}</span>
      </div>
      <div class="char-row-actions" onclick="event.stopPropagation()">
        <span class="genre-badge badge-${c.genre}" style="margin-right:4px">${c.genre}</span>
        <button class="btn-about" onclick="goAbout('${c.id}')"><i class="fa-solid fa-circle-info"></i> About</button>
        <button class="btn-chat" onclick="goChat('${c.id}')"><i class="fa-solid fa-comments"></i> Chat</button>
      </div>
    </div>
  `).join('');
}

function filterCharacters() {
  const q = document.getElementById('search-input').value.toLowerCase();
  const filtered = allCharacters.filter(c =>
    (activeGenre === 'all' || c.genre === activeGenre) &&
    (c.name.toLowerCase().includes(q) || (c.short_description || '').toLowerCase().includes(q))
  );
  renderCharacters(filtered);
}

function filterGenre(genre, el) {
  activeGenre = genre;
  document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  filterCharacters();
}

function goChat(id) {
  window.location.href = `/chat?id=${id}`;
}
function goAbout(id) {
  window.location.href = `/about?id=${id}`;
}

function updateNavAvatar() {
  const user = JSON.parse(localStorage.getItem('rolemole_user') || 'null');
  const el = document.getElementById('nav-avatar');
  if (!el) return;
  if (user?.pfp_url) {
    el.outerHTML = `<img src="${user.pfp_url}" class="avatar-circle nav-avatar" style="object-fit:cover" onerror="this.outerHTML='<div class=\\'avatar-circle\\'>${(user.display_name || user.username || '?')[0].toUpperCase()}</div>'">`;
  } else if (user) {
    el.textContent = (user.display_name || user.username || '?')[0].toUpperCase();
  }
}

loadCharacters();
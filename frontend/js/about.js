const API = '';
const params = new URLSearchParams(location.search);
const charId = params.get('id');

async function loadAbout() {
  if (!charId) { location.href = '/'; return; }
  const res = await fetch(`/api/characters/${charId}`);
  const c = await res.json();
  document.title = `${c.name} – Role Mole`;

  document.getElementById('about-name').textContent = c.name;
  document.getElementById('about-desc').textContent = c.short_description || '';
  document.getElementById('about-backstory').textContent = c.backstory || 'No backstory provided.';
  document.getElementById('about-personality').textContent = c.personality || 'No personality info.';

  const pfp = document.getElementById('about-pfp');
  const fallback = document.getElementById('about-pfp-fallback');
  if (c.pfp_url) {
    pfp.src = c.pfp_url;
    pfp.style.display = 'block';
    fallback.style.display = 'none';
  } else {
    fallback.textContent = c.name[0].toUpperCase();
  }

  if (c.writing_style) {
    document.getElementById('about-style').textContent = c.writing_style;
    document.getElementById('card-style').style.display = 'block';
  }

  const badges = document.getElementById('about-badges');
  badges.innerHTML = [
    c.genre ? `<span class="genre-badge badge-${c.genre}">${c.genre}</span>` : '',
    c.pronouns ? `<span class="pronoun-badge">${c.pronouns}</span>` : '',
    c.gender ? `<span class="pronoun-badge">${c.gender}</span>` : ''
  ].join('');

  document.getElementById('about-chat-btn').href = `/chat?id=${charId}`;
}

loadAbout();
const API = '';
let adminToken = localStorage.getItem('rolemole_admin_token');
let editingId = null;

function checkAuth() {
  if (adminToken) { showPanel(); loadChars(); showSection('characters'); }
  else { document.getElementById('login-screen').style.display = 'flex'; }
}

async function adminLogin(e) {
  e.preventDefault();
  const pw = document.getElementById('admin-password').value;
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw })
  });
  const data = await res.json();
  if (data.token) {
    adminToken = data.token;
    localStorage.setItem('rolemole_admin_token', adminToken);
    showPanel();
    loadChars();
  } else {
    const err = document.getElementById('login-error');
    err.style.display = 'block';
    err.textContent = 'Wrong password';
  }
}

function showPanel() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
}

function adminLogout() {
  localStorage.removeItem('rolemole_admin_token');
  adminToken = null;
  location.reload();
}

function showSection(name) {
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`section-${name}`).style.display = 'flex';
  document.querySelector(`[onclick="showSection('${name}')"]`).classList.add('active');
  if (name === 'create' && !editingId) resetForm();
}

async function loadChars() {
  const res = await fetch('/api/characters');
  const chars = await res.json();
  document.getElementById('total-chars').textContent = chars.length;
  const list = document.getElementById('admin-chars-list');
  list.innerHTML = chars.length ? chars.map(c => `
    <div class="admin-char-card">
      ${c.pfp_url
        ? `<img class="admin-char-pfp" src="${c.pfp_url}" alt="${c.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : ''}
      <div class="admin-char-pfp-fallback" style="${c.pfp_url ? 'display:none' : 'display:flex'}">
        ${c.name[0].toUpperCase()}
      </div>
      <div class="admin-char-info">
        <div class="admin-char-name">${c.name}</div>
        <div class="admin-char-sub">
          ${c.genre ? `<span class="genre-badge badge-${c.genre}">${c.genre}</span>` : ''}
          ${c.pronouns ? c.pronouns : ''}
        </div>
      </div>
      <div class="admin-char-actions">
        <button class="btn-edit" onclick="editChar('${c.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
        <button class="btn-delete" onclick="deleteChar('${c.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
      </div>
    </div>
  `).join('') : '<div class="loading">No characters yet. Create one!</div>';
}

function resetForm() {
  editingId = null;
  document.getElementById('form-title').innerHTML = '<i class="fa-solid fa-plus"></i> Create Character';
  ['f-name','f-genre','f-gender','f-pronouns','f-pfp','f-desc','f-personality','f-backstory','f-intro','f-style','edit-id'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('admin-pfp-preview').innerHTML = '<i class="fa-solid fa-image" style="color:var(--muted)"></i>';
  document.getElementById('prompt-preview').style.display = 'none';
  document.getElementById('form-msg').textContent = '';
}

async function editChar(id) {
  const res = await fetch(`/api/characters/${id}`);
  const c = await res.json();
  editingId = id;
  document.getElementById('form-title').innerHTML = '<i class="fa-solid fa-pen"></i> Edit Character';
  document.getElementById('edit-id').value = id;
  document.getElementById('f-name').value = c.name || '';
  document.getElementById('f-genre').value = c.genre || '';
  document.getElementById('f-gender').value = c.gender || '';
  document.getElementById('f-pronouns').value = c.pronouns || '';
  document.getElementById('f-pfp').value = c.pfp_url || '';
  document.getElementById('f-desc').value = c.short_description || '';
  document.getElementById('f-personality').value = c.personality || '';
  document.getElementById('f-backstory').value = c.backstory || '';
  document.getElementById('f-intro').value = c.intro_message || '';
  document.getElementById('f-style').value = c.writing_style || '';
  if (document.getElementById('f-voice')) document.getElementById('f-voice').value = c.voice_id || 'af_heart';
  if (c.pfp_url) {
    document.getElementById('admin-pfp-preview').innerHTML = `<img src="${c.pfp_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  }
  showSection('create');
}

async function deleteChar(id) {
  if (!confirm('Delete this character? This cannot be undone.')) return;
  await fetch(`/api/characters/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  loadChars();
}

function previewAdminPfp(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('admin-pfp-preview').innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  };
  reader.readAsDataURL(file);
  document.getElementById('f-pfp').value = '';
}

function previewAdminPfpUrl(url) {
  if (!url) return;
  document.getElementById('admin-pfp-preview').innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.innerHTML='<i class=\\'fa-solid fa-image\\' style=\\'color:var(--muted)\\'></i>'">`;
}

async function uploadAdminPfp(file, name) {
  const SUPABASE_URL = 'https://gpmlzxfozpitsghffwbw.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwbWx6eGZvenBpdHNnaGZmd2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTY0MzgsImV4cCI6MjA5MDYzMjQzOH0.UHWnvJuy9-HwesanIW7pwvMh399EJG1oi35z6MKAv_8';
  const ext = file.name.split('.').pop();
  const filename = `char_${name}_${Date.now()}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${filename}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON}`,
      'Content-Type': file.type,
      'x-upsert': 'true'
    },
    body: file
  });
  if (!res.ok) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${filename}`;
}

async function saveCharacter(e) {
  e.preventDefault();
  const msg = document.getElementById('form-msg');

  let pfpUrl = document.getElementById('f-pfp').value.trim();
  const pfpFile = document.getElementById('f-pfp-file') ? document.getElementById('f-pfp-file').files[0] : null;
  if (pfpFile) {
    msg.textContent = 'Uploading image...';
    msg.className = 'form-msg';
    const uploaded = await uploadAdminPfp(pfpFile, document.getElementById('f-name').value);
    if (uploaded) pfpUrl = uploaded;
  }

  const data = {
    name: document.getElementById('f-name').value,
    genre: document.getElementById('f-genre').value,
    gender: document.getElementById('f-gender').value,
    pronouns: document.getElementById('f-pronouns').value,
    pfp_url: pfpUrl,
    voice_id: document.getElementById('f-voice') ? document.getElementById('f-voice').value : 'af_heart',
    short_description: document.getElementById('f-desc').value,
    personality: document.getElementById('f-personality').value,
    backstory: document.getElementById('f-backstory').value,
    intro_message: document.getElementById('f-intro').value,
    writing_style: document.getElementById('f-style').value
  };

  const url = editingId ? `/api/characters/${editingId}` : '/api/characters';
  const method = editingId ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify(data)
  });
  const result = await res.json();

  if (result.id) {
    msg.textContent = editingId ? 'Character updated!' : 'Character created!';
    msg.className = 'form-msg success';
    setTimeout(() => { showSection('characters'); loadChars(); resetForm(); }, 1200);
  } else {
    msg.textContent = result.error || 'Error saving character.';
    msg.className = 'form-msg error';
  }
}

function previewPrompt() {
  const name = document.getElementById('f-name').value || 'Character';
  const personality = document.getElementById('f-personality').value || '...';
  const style = document.getElementById('f-style').value;
  const backstory = document.getElementById('f-backstory').value;
  const preview = `You are ${name}, an AI character in Role Mole.\n\nPERSONALITY:\n${personality}\n\n${backstory ? `ABOUT YOU:\n${backstory}\n\n` : ''}${style ? `WRITING STYLE:\n${style}\n\n` : ''}RULES:\n- Always stay in character as ${name}\n- Use * for actions, "" for speech`;
  document.getElementById('prompt-preview-text').textContent = preview;
  document.getElementById('prompt-preview').style.display = 'block';
}

checkAuth();
const SUPABASE_URL = 'https://gpmlzxfozpitsghffwbw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwbWx6eGZvenBpdHNnaGZmd2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTY0MzgsImV4cCI6MjA5MDYzMjQzOH0.UHWnvJuy9-HwesanIW7pwvMh399EJG1oi35z6MKAv_8';

let currentUser = JSON.parse(localStorage.getItem('rolemole_user') || 'null');

if (!currentUser) {
  window.location.href = '/login';
}

function updatePfpCircle(url, fallbackLetter) {
  const circle = document.getElementById('pfp-circle');
  if (url) {
    circle.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.innerHTML='<i class=\\'fa-solid fa-user\\' style=\\'font-size:28px;color:var(--muted)\\'></i>'">`;
  } else {
    circle.innerHTML = `<div class="avatar-circle" style="width:80px;height:80px;font-size:28px">${fallbackLetter || '?'}</div>`;
  }
}

function loadProfile() {
  if (!currentUser) return;
  document.getElementById('username').value = currentUser.username || '';
  document.getElementById('display_name').value = currentUser.display_name || '';
  document.getElementById('gender').value = currentUser.gender || '';
  document.getElementById('pronouns').value = currentUser.pronouns || '';
  document.getElementById('pfp_url').value = currentUser.pfp_url || '';
  document.getElementById('pfp-name').textContent = currentUser.display_name || currentUser.username || 'Your Profile';
  document.getElementById('pfp-username').textContent = currentUser.username ? `@${currentUser.username}` : '';
  updatePfpCircle(currentUser.pfp_url, (currentUser.display_name || currentUser.username || '?')[0].toUpperCase());
}

function previewPfp(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('pfp-circle').innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  };
  reader.readAsDataURL(file);
  document.getElementById('pfp_url').value = '';
}

function previewPfpUrl(url) {
  if (!url) return;
  updatePfpCircle(url, '?');
  document.getElementById('pfp-file').value = '';
}

async function uploadPfp(file, username) {
  const ext = file.name.split('.').pop();
  const filename = `user_${username}_${Date.now()}.${ext}`;
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

async function saveProfile(e) {
  e.preventDefault();
  const msg = document.getElementById('profile-msg');
  msg.textContent = 'Saving...';
  msg.className = 'form-msg';

  let pfpUrl = document.getElementById('pfp_url').value.trim();
  const pfpFile = document.getElementById('pfp-file').files[0];

  if (pfpFile) {
    msg.textContent = 'Uploading photo...';
    const uploaded = await uploadPfp(pfpFile, currentUser.username);
    if (uploaded) {
      pfpUrl = uploaded;
    } else {
      msg.textContent = 'Image upload failed. Try a URL instead.';
      msg.className = 'form-msg error';
      return;
    }
  }

  const updated = {
    ...currentUser,
    display_name: document.getElementById('display_name').value.trim(),
    gender: document.getElementById('gender').value,
    pronouns: document.getElementById('pronouns').value,
    pfp_url: pfpUrl
  };

  try {
    await fetch(`/api/users/${currentUser.username}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    localStorage.setItem('rolemole_user', JSON.stringify(updated));
    currentUser = updated;
    msg.textContent = 'Profile saved!';
    msg.className = 'form-msg success';
    loadProfile();
    setTimeout(() => msg.textContent = '', 3000);
  } catch(err) {
    msg.textContent = 'Failed to save. Try again.';
    msg.className = 'form-msg error';
  }
}

function logout() {
  if (!confirm('Log out of Role Mole?')) return;
  localStorage.removeItem('rolemole_user');
  window.location.href = '/login';
}

loadProfile();
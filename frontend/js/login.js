const SUPABASE_URL = 'https://gpmlzxfozpitsghffwbw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwbWx6eGZvenBpdHNnaGZmd2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNTY0MzgsImV4cCI6MjA5MDYzMjQzOH0.UHWnvJuy9-HwesanIW7pwvMh399EJG1oi35z6MKAv_8';

if (localStorage.getItem('rolemole_user')) {
  window.location.href = '/';
}

function switchTab(tab) {
  document.getElementById('login-form').style.display = tab === 'login' ? 'flex' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'flex' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

function previewPfp(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('pfp-preview');
    preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  };
  reader.readAsDataURL(file);
  document.getElementById('pfp-url').value = '';
}

function previewPfpUrl(url) {
  if (!url) return;
  const preview = document.getElementById('pfp-preview');
  preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.innerHTML='<i class=\\'fa-solid fa-user\\' style=\\'font-size:24px\\'></i>'">`;
  document.getElementById('pfp-file').value = '';
}

async function uploadPfp(file, username) {
  const ext = file.name.split('.').pop();
  const filename = `${username}_${Date.now()}.${ext}`;
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

async function doLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const msg = document.getElementById('login-msg');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.user) {
      localStorage.setItem('rolemole_user', JSON.stringify(data.user));
      window.location.href = '/';
    } else {
      msg.textContent = data.error || 'Invalid username or password';
      msg.className = 'form-msg error';
    }
  } catch(err) {
    msg.textContent = 'Connection error. Is the server running?';
    msg.className = 'form-msg error';
  }
}

async function doRegister(e) {
  e.preventDefault();
  const msg = document.getElementById('register-msg');
  const username = document.getElementById('reg-username').value.trim().toLowerCase();
  const display_name = document.getElementById('reg-display').value.trim();
  const password = document.getElementById('reg-password').value;
  const gender = document.getElementById('reg-gender').value;
  const pronouns = document.getElementById('reg-pronouns').value;
  const pfpFile = document.getElementById('pfp-file').files[0];
  const pfpUrl = document.getElementById('pfp-url').value.trim();

  msg.textContent = 'Creating account...';
  msg.className = 'form-msg';

  let finalPfpUrl = pfpUrl;
  if (pfpFile) {
    msg.textContent = 'Uploading profile picture...';
    finalPfpUrl = await uploadPfp(pfpFile, username);
    if (!finalPfpUrl) {
      msg.textContent = 'Image upload failed. Try a URL instead.';
      msg.className = 'form-msg error';
      return;
    }
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, display_name, password, gender, pronouns, pfp_url: finalPfpUrl })
    });
    const data = await res.json();
    if (data.user) {
      localStorage.setItem('rolemole_user', JSON.stringify(data.user));
      window.location.href = '/';
    } else {
      msg.textContent = data.error || 'Registration failed';
      msg.className = 'form-msg error';
    }
  } catch(err) {
    msg.textContent = 'Connection error. Is the server running?';
    msg.className = 'form-msg error';
  }
}
function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.innerHTML = isHidden ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
}
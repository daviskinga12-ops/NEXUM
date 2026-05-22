// ═══════════════════════════════════════════════════
// NEXUM — JS PATCHES (apply to index.html)
// ═══════════════════════════════════════════════════
// Three changes to make in your <script> block:
//
// 1. REPLACE the auth object (localStorage → sessionStorage + expiry)
// 2. REPLACE the window load handler (add API warm-up ping)
// 3. REPLACE the api() helper (add timeout so cold starts don't hang silently)
// ═══════════════════════════════════════════════════


// ─── PATCH 1: REPLACE THIS ───────────────────────
// OLD:
const auth = {
  save: (token, user) => {
    localStorage.setItem('nxm_token', token);
    localStorage.setItem('nxm_user', JSON.stringify(user));
  },
  token: () => localStorage.getItem('nxm_token'),
  user: () => JSON.parse(localStorage.getItem('nxm_user') || 'null'),
  clear: () => { localStorage.removeItem('nxm_token'); localStorage.removeItem('nxm_user'); },
  isLoggedIn: () => !!localStorage.getItem('nxm_token'),
};

// NEW (sessionStorage + expiry check):
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

const auth = {
  save: (token, user) => {
    const payload = { token, user, exp: Date.now() + TOKEN_TTL_MS };
    sessionStorage.setItem('nxm_session', JSON.stringify(payload));
  },
  _get: () => {
    try {
      const raw = sessionStorage.getItem('nxm_session');
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (Date.now() > payload.exp) { sessionStorage.removeItem('nxm_session'); return null; }
      return payload;
    } catch { return null; }
  },
  token: () => auth._get()?.token || null,
  user: () => auth._get()?.user || null,
  clear: () => sessionStorage.removeItem('nxm_session'),
  isLoggedIn: () => !!auth._get(),
};


// ─── PATCH 2: REPLACE THIS ───────────────────────
// OLD:
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('loading').classList.add('hidden'), 1800);
});

// NEW (adds warm-up ping to wake Render before user hits register):
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('loading').classList.add('hidden'), 1800);

  // Silently warm up the Render backend so it's ready when users register
  fetch(`${API}/health`, { method: 'GET' }).catch(() => {});
});


// ─── PATCH 3: REPLACE THIS ───────────────────────
// OLD:
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth.token()) headers['Authorization'] = `Bearer ${auth.token()}`;
  if (options.apiKey) headers['x-api-key'] = options.apiKey;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// NEW (adds 15s timeout so cold-start hangs show a clear error):
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth.token()) headers['Authorization'] = `Bearer ${auth.token()}`;
  if (options.apiKey) headers['x-api-key'] = options.apiKey;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API}${path}`, { ...options, headers, signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Request timed out. The server may be waking up — please try again in a moment.');
    throw err;
  }
}

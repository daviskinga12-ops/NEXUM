# NEXUM — Fixes

Three issues fixed. Here's what to do for each.

---

## Fix 1 — vercel.json (build warning)

**Problem:** `builds` key in your vercel.json causes Vercel to ignore your Project Settings dashboard.

**Fix:** Replace the contents of `vercel.json` in your repo with the new `vercel.json` in this folder:

```json
{
  "version": 2,
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

This is all you need for a static SPA. Clean, no warning.

---

## Fix 2 — Render cold start (slow API)

**Problem:** Render's free tier spins down after ~15 minutes of inactivity. The first user request after idle can hang for 10–30 seconds with no feedback.

**Two-part fix in `index.html`:**

1. **Warm-up ping on page load** — fires a silent `GET /health` request the moment anyone visits the site, so by the time they click "Get Verified" the server is already awake.

2. **15-second timeout with clear error message** — if a request takes too long, users now see: *"Request timed out. The server may be waking up — please try again in a moment."* instead of a silent hang.

Apply the changes from `js-patches.js` — see **PATCH 2** and **PATCH 3**.

> **Long-term fix:** Upgrade Render to a paid plan ($7/month) for always-on servers, or migrate the backend to a Vercel serverless function which has no cold start.

---

## Fix 3 — Auth token security (localStorage → sessionStorage)

**Problem:** Storing JWT tokens in `localStorage` exposes them to XSS attacks — any injected script on your page can steal the token.

**Fix:** Switch to `sessionStorage` with an 8-hour expiry check.

- `sessionStorage` is scoped to the browser tab and cleared when it closes
- Expiry check logs users out after 8 hours automatically
- Tokens are no longer accessible to scripts from other origins

Apply the changes from `js-patches.js` — see **PATCH 1**.

> **Best practice upgrade (requires backend change):** The gold standard is `httpOnly` cookies set by your backend on `/auth/verify-otp`. These are completely inaccessible to JavaScript. Talk to your backend dev about setting `Set-Cookie: nxm_token=...; HttpOnly; Secure; SameSite=Strict`.

---

## Applying the patches

1. Open `index.html` in your editor
2. Find each `// OLD:` block in `js-patches.js`
3. Replace it with the corresponding `// NEW:` block
4. Commit and push — Vercel will auto-deploy

All three changes are backward-compatible. No backend changes needed for fixes 1 and 2. Fix 3 will log out existing sessions once (one-time, expected).

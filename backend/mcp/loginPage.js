const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

// Server-rendered sign-in page for the MCP connector. No scripts, so it works
// under the backend's Content-Security-Policy.
export function renderLoginPage({ clientName, request, email = '', error, cancelUrl, expired = false }) {
  const app = escapeHtml(clientName || 'An AI assistant');

  const body = expired
    ? `<h1>Sign-in link expired</h1>
       <p class="muted">Go back to Claude and click <strong>Connect</strong> again.</p>`
    : `<h1>Sign in to YDesk</h1>
       <p class="muted"><strong>${app}</strong> wants to access your YDesk claims. It will be able to do what you can do in YDesk, as you.</p>
       ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
       <form method="post" action="/oauth/login">
         <input type="hidden" name="request" value="${escapeHtml(request)}">
         <label for="email">Email</label>
         <input id="email" name="email" type="email" autocomplete="username" required value="${escapeHtml(email)}">
         <label for="password">Password</label>
         <input id="password" name="password" type="password" autocomplete="current-password" required>
         <button type="submit">Sign in and allow</button>
       </form>
       ${cancelUrl ? `<a class="cancel" href="${escapeHtml(cancelUrl)}">Cancel</a>` : ''}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sign in to YDesk</title>
<style>
  :root { color-scheme: light dark; --bg: #f5f5f4; --card: #fff; --text: #1c1917; --muted: #57534e; --border: #d6d3d1; --accent: #ca8a04; --error: #b91c1c; }
  @media (prefers-color-scheme: dark) { :root { --bg: #1c1917; --card: #292524; --text: #f5f5f4; --muted: #a8a29e; --border: #44403c; --error: #f87171; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px; background: var(--bg); color: var(--text); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { width: 100%; max-width: 380px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 28px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  .muted { color: var(--muted); margin: 0 0 20px; }
  .error { color: var(--error); margin: 0 0 16px; }
  label { display: block; font-weight: 600; margin: 12px 0 4px; }
  input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: transparent; color: inherit; font: inherit; }
  button { width: 100%; margin-top: 20px; padding: 11px; border: 0; border-radius: 8px; background: var(--accent); color: #1c1917; font: inherit; font-weight: 600; cursor: pointer; }
  .cancel { display: block; text-align: center; margin-top: 14px; color: var(--muted); }
</style>
</head>
<body><main>${body}</main></body>
</html>`;
}

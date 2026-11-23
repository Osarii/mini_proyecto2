import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Interceptor seguro para adjuntar automáticamente el token anti-CSRF (X-CSRF-Token)
// y cookies SameSite=Lax en todas las peticiones POST/PUT/DELETE hacia /api
const originalFetch = window.fetch.bind(window);
let cachedCsrfToken = null;

async function ensureCsrfToken() {
  if (cachedCsrfToken) return cachedCsrfToken;
  const res = await originalFetch('/api/security/csrf-token', { credentials: 'include' });
  const data = await res.json();
  cachedCsrfToken = data.csrfToken;
  return cachedCsrfToken;
}

window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  const method = (init.method || 'GET').toUpperCase();

  if (url.startsWith('/api') && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = await ensureCsrfToken();
    const headers = new Headers(init.headers || {});
    headers.set('X-CSRF-Token', token);
    return originalFetch(input, { ...init, headers, credentials: 'include' });
  }

  return originalFetch(input, { ...init, credentials: 'include' });
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

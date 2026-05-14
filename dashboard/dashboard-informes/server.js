const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3000;

const PROXY_TARGET = process.env.ODOO_URL || 'http://raspberry.local:8069';
const ODOO_DB = process.env.ODOO_DB || 'prueba';

// ── Odoo session management ──
// Odoo 18 requires a session cookie with db context to route JSON-RPC requests.
// We request /web?db=XXX to get a session cookie, then relay it to all proxied calls.
let odooSessionCookie = null;

async function getOdooSession() {
  try {
    const url = `${PROXY_TARGET}/web?db=${ODOO_DB}`;
    const res = await fetch(url, { redirect: 'manual' });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      odooSessionCookie = setCookie.split(';')[0];
      console.log(`[proxy] Odoo session acquired for db=${ODOO_DB}`);
    } else {
      console.warn('[proxy] No session cookie received from Odoo');
    }
  } catch (err) {
    console.warn('[proxy] Odoo session failed, retrying in 10s:', err.message);
  }
}

getOdooSession();
setInterval(getOdooSession, 30 * 60 * 1000); // renew every 30 min

app.use(createProxyMiddleware({
  target: PROXY_TARGET,
  changeOrigin: true,
  pathFilter: '/nfc/api',
  on: {
    proxyReq: (proxyReq) => {
      if (odooSessionCookie) {
        const existing = proxyReq.getHeader('Cookie') || proxyReq.getHeader('cookie') || '';
        const merged = existing ? `${existing}; ${odooSessionCookie}` : odooSessionCookie;
        proxyReq.setHeader('Cookie', merged);
      }
    },
  },
}));

app.use(createProxyMiddleware({
  target: PROXY_TARGET,
  changeOrigin: true,
  pathFilter: '/nfc/test',
}));

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Proxy /nfc/api → ${PROXY_TARGET}`);
});
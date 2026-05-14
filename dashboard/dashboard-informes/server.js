const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { PORT, ODOO_URL, ODOO_DB } = require('./config');

const app = express();

const PROXY_TARGET = process.env.ODOO_URL || ODOO_URL;
const db = process.env.ODOO_DB || ODOO_DB;

// ── Odoo session management ──
// Odoo 18 requires a session cookie with db context to route JSON-RPC requests.
// We request /web?db=XXX to get a session cookie, then relay it to all proxied calls.
let odooSessionCookie = null;

async function getOdooSession() {
  try {
    const url = `${PROXY_TARGET}/web?db=${db}`;
    const res = await fetch(url, { redirect: 'manual' });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      odooSessionCookie = setCookie.split(';')[0];
      console.log(`[proxy] Odoo session acquired for db=${db}`);
    } else {
      console.warn('[proxy] No session cookie received from Odoo');
    }
  } catch (err) {
    console.warn('[proxy] Odoo session failed, retrying in 10s:', err.message);
  }
}

getOdooSession();
setInterval(getOdooSession, 30 * 60 * 1000); // renew every 30 min

// ── NFC scan capture (long‑polling) ──
// Browser calls GET /nfc/api/leer-uid to wait for a physical card scan.
// When the NFC reader sends a UID via POST /nfc/read, we capture it and
// resolve all pending browser requests.
// Must be BEFORE the /nfc/api proxy so Express handles it directly.
let pendingScanQueue = []; // [{ resolve, timeout }]

app.get('/nfc/api/leer-uid', (req, res) => {
  const timeoutMs = 30000;

  const timeout = setTimeout(() => {
    pendingScanQueue = pendingScanQueue.filter(p => p.resolve !== resolve);
    res.json({ status: 'timeout' });
  }, timeoutMs);

  const resolve = (uid) => {
    res.json({ status: 'ok', uid: uid });
  };

  pendingScanQueue.push({ resolve, timeout });
  console.log(`[proxy] Browser waiting for NFC scan (${pendingScanQueue.length} pending)`);
});

// ── /nfc/api proxy (JSON‑RPC to Odoo) ──
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

// ── /nfc/test proxy ──
app.use(createProxyMiddleware({
  target: PROXY_TARGET,
  changeOrigin: true,
  pathFilter: '/nfc/test',
}));

// ── /nfc/read UID capture ──
// Buffer the POST body manually, extract UID to resolve pending browser scans,
// then forward the request to Odoo and return its response.
app.post('/nfc/read', (req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    let uid = null;
    try {
      const data = JSON.parse(body);
      uid = data.params && data.params.uid;
    } catch (_) {}

    if (uid) {
      console.log(`[proxy] NFC scanned: ${uid}`);
      while (pendingScanQueue.length) {
        const pending = pendingScanQueue.shift();
        clearTimeout(pending.timeout);
        pending.resolve(uid);
      }
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (odooSessionCookie) headers['Cookie'] = odooSessionCookie;
      const odooRes = await fetch(`${PROXY_TARGET}/nfc/read`, {
        method: 'POST',
        headers,
        body,
      });
      const odooBody = await odooRes.text();
      res.status(odooRes.status).set('Content-Type', odooRes.headers.get('Content-Type') || 'application/json').send(odooBody);
    } catch (err) {
      res.status(502).json({ jsonrpc: '2.0', error: { message: 'Proxy error: ' + err.message } });
    }
  });
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Proxy /nfc/api → ${PROXY_TARGET}`);
});

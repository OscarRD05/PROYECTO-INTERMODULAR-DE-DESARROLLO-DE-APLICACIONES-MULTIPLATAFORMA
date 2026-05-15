const APP_CONFIG = {
  ODOO_URL: 'http://192.168.0.35:8069',
  ODOO_DB: 'prueba',
  PORT: 3000
};

if (typeof window !== 'undefined') window.APP_CONFIG = APP_CONFIG;
if (typeof module !== 'undefined') module.exports = APP_CONFIG;

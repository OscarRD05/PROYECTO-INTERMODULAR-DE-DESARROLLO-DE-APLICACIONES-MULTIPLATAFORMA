const APP_CONFIG = {
  ODOO_URL: 'http://raspberry.local:8069',
  ODOO_DB: 'prueba',
  PORT: 3000
};

if (typeof window !== 'undefined') window.APP_CONFIG = APP_CONFIG;
if (typeof module !== 'undefined') module.exports = APP_CONFIG;

from odoo import http
from odoo.http import request

class NFCController(http.Controller):

    @http.route('/nfc/api/login', type='json', auth='none', methods=['POST'], cors='*', csrf=False)
    def api_login(self, db, login, password, **kwargs):
        uid = request.session.authenticate(db, login, password)
        if uid:
            return {"status": "ok", "uid": uid}
        return {"status": "error", "message": "Autenticación fallida"}

    @http.route('/nfc/api/search', type='json', auth='user', methods=['POST'], cors='*', csrf=False)
    def api_search(self, model, domain, fields, **kwargs):
        records = request.env[model].sudo().search_read(domain, fields)
        return {"status": "ok", "records": records}

    @http.route('/nfc/api/log', type='json', auth='user', methods=['POST'], cors='*', csrf=False)
    def api_log(self, uid_nfc, alumno_id, tipo='entrada', **kwargs):
        log = request.env['nfc.log'].sudo().create({
            'uid_nfc': uid_nfc,
            'alumno_id': alumno_id,
            'tipo': tipo
        })
        return {"status": "ok", "log_id": log.id}

    @http.route('/nfc/read', type='json', auth='public', methods=['POST'], cors='*', csrf=False)
    def nfc_read(self, uid=None, **kwargs):
        if not uid:
            return {"status": "error", "message": "NO UID"}

        request.env['nfc.log'].sudo().create({
            'uid_nfc': uid, 
            'alumno_id': request.env['nfc.alumno'].sudo().search([('uid_nfc', '=', uid)], limit=1).id
        })

        return {"status": "ok", "uid": uid}

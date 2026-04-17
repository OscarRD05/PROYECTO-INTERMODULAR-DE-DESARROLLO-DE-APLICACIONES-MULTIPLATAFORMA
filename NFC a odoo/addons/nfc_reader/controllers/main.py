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
    def api_log(self, alumno_id, tipo='entrada', **kwargs):
        log = request.env['nfc.registro_asistencia'].sudo().create({
            'alumno_id': alumno_id,
            'tipo': tipo
        })
        return {"status": "ok", "log_id": log.id}

    @http.route('/nfc/read', type='json', auth='public', methods=['POST'], cors='*', csrf=False)
    def nfc_read(self, uid=None, **kwargs):
        if not uid:
            return {"status": "error", "message": "NO UID"}

        # Buscar alumno por UID de tarjeta RFID (nuevo nombre de campo)
        alumno = request.env['nfc.alumno'].sudo().search([('uid_tarjeta_rfid', '=', uid)], limit=1)
        
        if alumno:
            request.env['nfc.registro_asistencia'].sudo().create({
                'alumno_id': alumno.id,
                'tipo': 'entrada'
            })
            return {"status": "ok", "uid": uid, "alumno": alumno.nombre_completo}
        
        return {"status": "error", "message": "Alumno no encontrado"}

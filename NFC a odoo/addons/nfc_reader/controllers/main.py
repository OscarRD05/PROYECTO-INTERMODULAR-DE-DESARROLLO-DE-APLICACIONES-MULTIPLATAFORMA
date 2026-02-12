from odoo import http
from odoo.http import request

class NFCController(http.Controller):

    @http.route('/nfc/read', type='json', auth='public', methods=['POST'], csrf=False)
    def nfc_read(self, uid=None, **kwargs):
        if not uid:
            return {"status": "error", "message": "NO UID"}

        request.env['nfc.log'].sudo().create({
            'uid': uid
        })

        return {"status": "ok", "uid": uid}

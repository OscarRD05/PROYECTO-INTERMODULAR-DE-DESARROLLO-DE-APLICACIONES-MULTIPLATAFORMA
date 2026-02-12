from odoo import models, fields

class NFCLog(models.Model):
    _name = "nfc.log"
    _description = "Registro NFC"

    uid = fields.Char(string="UID")
    date = fields.Datetime(default=fields.Datetime.now)

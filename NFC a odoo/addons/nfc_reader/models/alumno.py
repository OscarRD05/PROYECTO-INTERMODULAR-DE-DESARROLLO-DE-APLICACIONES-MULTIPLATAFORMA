from odoo import models, fields

class Alumno(models.Model):
    _name = "nfc.alumno"
    _description = "Alumno con tarjeta NFC"

    name = fields.Char(string="Nombre", required=True)
    dni = fields.Char(string="DNI")
    cial = fields.Char(string="CIAL")
    curso = fields.Char(string="Curso")
    uid_nfc = fields.Char(string="UID NFC", required=True)

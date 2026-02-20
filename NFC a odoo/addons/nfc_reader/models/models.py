from odoo import models, fields


# =========================
# MODELO ALUMNO
# =========================
class Alumno(models.Model):
    _name = "nfc.alumno"
    _description = "Alumno con tarjeta NFC"

    name = fields.Char(string="Nombre", required=True)
    dni = fields.Char(string="DNI")
    cial = fields.Char(string="CIAL")
    curso = fields.Char(string="Curso")
    uid_nfc = fields.Char(string="UID NFC", required=True)
    activo = fields.Boolean(string="Activo", default=True)


# =========================
# MODELO REGISTRO NFC
# =========================
class NFCLog(models.Model):
    _name = "nfc.log"
    _description = "Registro de lecturas NFC"
    _order = "fecha desc"

    alumno_id = fields.Many2one(
        "nfc.alumno",
        string="Alumno",
        required=True,
        ondelete="cascade"
    )

    uid_nfc = fields.Char(string="UID NFC", required=True)

    fecha = fields.Datetime(
        string="Fecha de lectura",
        default=fields.Datetime.now
    )

    tipo = fields.Selection(
        [
            ("entrada", "Entrada"),
            ("salida", "Salida"),
        ],
        string="Tipo",
        default="entrada"
    )

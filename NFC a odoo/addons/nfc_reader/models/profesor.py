from odoo import models, fields


class Profesor(models.Model):
    _name = "nfc.profesor"
    _description = "Profesor"
    _rec_name = "nombre_completo"

    nombre_completo = fields.Char(string="Nombre completo", required=True)
    dni_nie = fields.Char(string="DNI / NIE")
    uid_tarjeta_rfid = fields.Char(string="UID Tarjeta RFID")

    # Vinculado al perfil de usuario de Odoo
    usuario_id = fields.Many2one(
        "res.users",
        string="Usuario",
        ondelete="set null",
    )

    # Cursos de los que es tutor
    cursos_ids = fields.One2many(
        "nfc.curso_grupo",
        "tutor_id",
        string="Cursos / Grupos",
    )

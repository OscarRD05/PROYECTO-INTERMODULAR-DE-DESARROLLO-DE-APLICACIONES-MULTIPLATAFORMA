from odoo import models, fields


class Alumno(models.Model):
    _name = "nfc.alumno"
    _description = "Alumno"
    _rec_name = "nombre_completo"

    nombre_completo = fields.Char(string="Nombre completo", required=True)
    matricula = fields.Char(string="Matrícula")
    uid_tarjeta_rfid = fields.Char(string="UID Tarjeta RFID", required=True)
    permiso_salida = fields.Boolean(string="Permiso de salida", default=False)
    fotografia = fields.Binary(string="Fotografía")

    curso_id = fields.Many2one(
        "nfc.curso_grupo",
        string="Curso / Grupo",
        ondelete="set null",
    )

    asistencia_ids = fields.One2many(
        "nfc.registro_asistencia",
        "alumno_id",
        string="Registros de asistencia",
    )

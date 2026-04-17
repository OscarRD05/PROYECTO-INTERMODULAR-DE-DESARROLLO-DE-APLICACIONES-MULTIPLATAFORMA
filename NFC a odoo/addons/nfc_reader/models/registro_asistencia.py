from odoo import models, fields


class RegistroAsistencia(models.Model):
    _name = "nfc.registro_asistencia"
    _description = "Registro de Asistencia"
    _order = "fecha_hora desc"
    _rec_name = "alumno_id"

    fecha_hora = fields.Datetime(
        string="Fecha y hora",
        required=True,
        default=fields.Datetime.now,
    )

    justificado = fields.Boolean(string="Justificado", default=False)

    alumno_id = fields.Many2one(
        "nfc.alumno",
        string="Alumno",
        required=True,
        ondelete="cascade",
    )

    tipo = fields.Selection(
        [
            ("entrada", "Entrada"),
            ("salida", "Salida"),
        ],
        string="Tipo",
        required=True,
        default="entrada",
    )

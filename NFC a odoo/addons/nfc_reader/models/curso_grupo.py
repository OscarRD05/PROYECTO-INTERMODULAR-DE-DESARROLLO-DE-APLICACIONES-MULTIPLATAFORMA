from odoo import models, fields


class CursoGrupo(models.Model):
    _name = "nfc.curso_grupo"
    _description = "Curso / Grupo"
    _rec_name = "nombre_grupo"

    nombre_grupo = fields.Char(string="Nombre del grupo", required=True)
    aula_asignada = fields.Char(string="Aula asignada")

    tutor_id = fields.Many2one(
        "nfc.profesor",
        string="Tutor",
        ondelete="set null",
    )

    alumnos_ids = fields.One2many(
        "nfc.alumno",
        "curso_id",
        string="Alumnos",
    )

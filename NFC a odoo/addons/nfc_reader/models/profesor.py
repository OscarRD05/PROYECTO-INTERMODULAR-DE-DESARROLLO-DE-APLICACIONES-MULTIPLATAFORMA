from odoo import models, fields, api


class Profesor(models.Model):
    _name = "nfc.profesor"
    _description = "Profesor"
    _rec_name = "nombre_completo"

    nombre_completo = fields.Char(string="Nombre completo", required=True)
    dni_nie = fields.Char(string="DNI / NIE")
    uid_tarjeta_rfid = fields.Char(string="UID Tarjeta RFID")
    fotografia = fields.Binary(string="Fotografía")

    usuario_id = fields.Many2one(
        "res.users",
        string="Usuario",
        ondelete="set null",
    )

    cursos_ids = fields.One2many(
        "nfc.curso_grupo",
        "tutor_id",
        string="Cursos / Grupos",
    )

    def _sync_uid_to_employee(self):
        for rec in self:
            if not rec.usuario_id:
                continue
            employee = self.env['hr.employee'].sudo().search(
                [('user_id', '=', rec.usuario_id.id)], limit=1)
            if employee:
                employee.barcode = rec.uid_tarjeta_rfid or False

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        records._sync_uid_to_employee()
        return records

    def write(self, vals):
        res = super().write(vals)
        if 'uid_tarjeta_rfid' in vals or 'usuario_id' in vals:
            self._sync_uid_to_employee()
        return res
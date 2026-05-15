from odoo import models, fields, api
from odoo.exceptions import ValidationError
import re

LETRAS_DNI = "TRWAGMYFPDXBNJZSQVHLCKE"


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

    @api.constrains('dni_nie')
    def _check_dni_nie(self):
        for rec in self:
            if not rec.dni_nie:
                continue
            dni = rec.dni_nie.upper().strip()
            if not re.match(r'^[0-9]{8}[A-Z]$|^[XYZ][0-9]{7}[A-Z]$', dni):
                raise ValidationError(
                    "El DNI/NIE '%s' no tiene un formato válido.\n"
                    "DNI: 8 dígitos + 1 letra (ej: 12345678A)\n"
                    "NIE: Letra X/Y/Z + 7 dígitos + 1 letra (ej: X1234567A)"
                    % rec.dni_nie
                )
            if dni[0] in 'XYZ':
                numero = int(str('XYZ'.index(dni[0])) + dni[1:8])
            else:
                numero = int(dni[:8])
            letra_correcta = LETRAS_DNI[numero % 23]
            if dni[-1] != letra_correcta:
                raise ValidationError(
                    "La letra del DNI/NIE '%s' no es correcta. "
                    "Debería ser '%s'." % (rec.dni_nie, letra_correcta)
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
from passlib.context import CryptContext
from odoo import models, fields, api

_crypt_context = CryptContext(schemes=["bcrypt", "pbkdf2_sha256"], deprecated="auto")


class Alumno(models.Model):
    _name = "nfc.alumno"
    _description = "Alumno"
    _rec_name = "nombre_completo"

    nombre_completo = fields.Char(string="Nombre completo", required=True)
    matricula = fields.Char(string="Matrícula")
    cial = fields.Char(string="CIAL")
    uid_tarjeta_rfid = fields.Char(string="UID Tarjeta RFID", required=True)
    permiso_salida = fields.Boolean(string="Permiso de salida", default=False)
    fotografia = fields.Binary(string="Fotografía")
    contrasenia = fields.Char(string="Contraseña", password=True, copy=False)

    curso_id = fields.Many2one("nfc.curso_grupo", string="Curso / Grupo", ondelete="set null")
    asistencia_ids = fields.One2many("nfc.registro_asistencia", "alumno_id", string="Registros de asistencia")

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("contrasenia"):
                vals["contrasenia"] = _crypt_context.hash(vals["contrasenia"])
        return super().create(vals_list)

    def write(self, vals):
        if vals.get("contrasenia"):
            raw = vals["contrasenia"]
            if not _crypt_context.identify(raw):
                vals["contrasenia"] = _crypt_context.hash(raw)
        return super().write(vals)

    def check_password(self, password_plano):
        self.ensure_one()
        if not self.contrasenia:
            return False
        return _crypt_context.verify(password_plano, self.contrasenia)

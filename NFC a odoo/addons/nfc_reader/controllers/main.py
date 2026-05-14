from odoo import http, api, SUPERUSER_ID
from odoo.http import request
from datetime import datetime, timedelta
import logging

_logger = logging.getLogger(__name__)

class NFCController(http.Controller):

    def _get_env(self, db):
        """Helper para obtener el entorno de Odoo en rutas auth='none'"""
        if not db:
            return None
        registry = http.root.session_store.get_registry(db)
        if not registry:
            return None
        # Creamos un cursor y un entorno
        cr = registry.cursor()
        return api.Environment(cr, SUPERUSER_ID, {})

    @http.route('/nfc/test', type='http', auth='none', cors='*', csrf=False)
    def api_test(self, **kwargs):
        return "OK - NFC Reader module loaded (auth=none)"

    @http.route('/nfc/api/login', type='json', auth='none', cors='*', csrf=False)
    def api_login(self, **kwargs):
        db = kwargs.get('db')
        login = kwargs.get('login')
        password = kwargs.get('password')
        try:
            if not all([db, login, password]):
                return {"status": "error", "message": "Faltan parámetros"}
            uid = request.session.authenticate(db, {'login': login, 'password': password, 'type': 'password'})
            if uid:
                return {"status": "ok", "uid": uid}
            return {"status": "error", "message": "Autenticación fallida"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @http.route('/nfc/api/dashboard', type='json', auth='none', cors='*', csrf=False)
    def api_dashboard(self, **kwargs):
        db = kwargs.get('db')
        env = self._get_env(db)
        if not env: return {"status": "error", "message": "Base de datos no encontrada"}
        
        try:
            Registro = env['nfc.registro_asistencia']
            hoy = datetime.now()
            inicio_semana = hoy - timedelta(days=hoy.weekday())
            inicio_semana = inicio_semana.replace(hour=0, minute=0, second=0, microsecond=0)

            salidas = Registro.search_count([('tipo', '=', 'salida'), ('fecha_hora', '>=', inicio_semana)])
            incidencias = Registro.search_count([('tipo', '=', 'salida'), ('justificado', '=', False), ('fecha_hora', '>=', inicio_semana)])
            asistencias = Registro.search_count([('tipo', '=', 'entrada'), ('fecha_hora', '>=', inicio_semana)])

            grafica = []
            dias = ['L', 'M', 'X', 'J', 'V']
            for i in range(5):
                d_inicio = inicio_semana + timedelta(days=i)
                d_fin = d_inicio + timedelta(days=1)
                conteo = Registro.search_count([('tipo', '=', 'salida'), ('fecha_hora', '>=', d_inicio), ('fecha_hora', '<', d_fin)])
                grafica.append({'dia': dias[i], 'valor': conteo})

            return {
                "status": "ok",
                "kpis": {"salidas": salidas, "incidencias": incidencias, "activos": asistencias},
                "grafica": grafica
            }
        finally:
            env.cr.close()

    @http.route('/nfc/api/alumnos', type='json', auth='none', cors='*', csrf=False)
    def api_alumnos(self, **kwargs):
        db = kwargs.get('db')
        env = self._get_env(db)
        if not env: return {"status": "error", "message": "DB error"}
        
        try:
            alumnos = env['nfc.alumno'].search([])
            resultado = []
            hoy = datetime.now()
            inicio_semana = (hoy - timedelta(days=hoy.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
            
            for a in alumnos:
                resultado.append({
                    'id': a.id,
                    'nombre': a.nombre_completo,
                    'grupo': a.curso_id.nombre_grupo if a.curso_id else 'Sin grupo',
                    'nfc': a.uid_tarjeta_rfid or '',
                    'recreo': a.permiso_salida,
                    'faltasTotal': env['nfc.registro_asistencia'].search_count([('alumno_id', '=', a.id), ('tipo', '=', 'salida')]),
                    'faltasSemanal': env['nfc.registro_asistencia'].search_count([('alumno_id', '=', a.id), ('tipo', '=', 'salida'), ('fecha_hora', '>=', inicio_semana)]),
                })
            return {"status": "ok", "alumnos": resultado}
        finally:
            env.cr.close()

    @http.route('/nfc/api/profesores', type='json', auth='none', cors='*', csrf=False)
    def api_profesores(self, **kwargs):
        db = kwargs.get('db')
        env = self._get_env(db)
        if not env: return {"status": "error", "message": "DB error"}
        try:
            profesores = env['nfc.profesor'].search([])
            resultado = [{
                'id': p.id,
                'nombre': p.nombre_completo,
                'grupo': ', '.join(p.cursos_ids.mapped('nombre_grupo')) if p.cursos_ids else 'Sin grupo',
                'nfc': p.uid_tarjeta_rfid or '',
            } for p in profesores]
            return {"status": "ok", "profesores": resultado}
        finally:
            env.cr.close()

    @http.route('/nfc/api/vincular_nfc', type='json', auth='none', cors='*', csrf=False)
    def api_vincular_nfc(self, **kwargs):
        db = kwargs.get('db')
        env = self._get_env(db)
        tipo = kwargs.get('tipo')
        reg_id = kwargs.get('registro_id')
        uid_nfc = kwargs.get('uid_nfc')
        if not env: return {"status": "error", "message": "DB error"}
        try:
            model = 'nfc.alumno' if tipo == 'alumno' else 'nfc.profesor'
            record = env[model].browse(reg_id)
            if record.exists():
                record.write({'uid_tarjeta_rfid': uid_nfc})
                return {"status": "ok", "message": "Vinculado"}
            return {"status": "error", "message": "No encontrado"}
        finally:
            env.cr.close()

    @http.route('/nfc/api/toggle_permiso', type='json', auth='none', cors='*', csrf=False)
    def api_toggle_permiso(self, **kwargs):
        db = kwargs.get('db')
        env = self._get_env(db)
        alumno_id = kwargs.get('alumno_id')
        if not env: return {"status": "error", "message": "DB error"}
        try:
            alumno = env['nfc.alumno'].browse(alumno_id)
            if alumno.exists():
                alumno.write({'permiso_salida': not alumno.permiso_salida})
                return {"status": "ok", "permiso_salida": alumno.permiso_salida}
            return {"status": "error", "message": "No encontrado"}
        finally:
            env.cr.close()

    @http.route('/nfc/api/search', type='json', auth='none', cors='*', csrf=False)
    def api_search(self, **kwargs):
        db = kwargs.get('db')
        env = self._get_env(db)
        model = kwargs.get('model')
        domain = kwargs.get('domain', [])
        fields = kwargs.get('fields', [])
        if not env: return {"status": "error", "message": "DB error"}
        try:
            records = env[model].search_read(domain, fields)
            return {"status": "ok", "records": records}
        finally:
            env.cr.close()

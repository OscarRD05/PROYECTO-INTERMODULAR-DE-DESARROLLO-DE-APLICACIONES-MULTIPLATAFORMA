from odoo import http
from odoo.http import request
from datetime import datetime, timedelta
from odoo.http import Response
import json
import logging

_logger = logging.getLogger(__name__)


class NFCController(http.Controller):

    @http.route('/nfc/test', type='http', auth='none', cors='*', csrf=False)
    def api_test(self, **kwargs):
        return "OK - NFC Reader module loaded"

    @http.route('/hola', type='http', auth='public', csrf=False)
    def hola(self, **kwargs):
        return "FUNCIONA"

    @http.route('/nfc/api/login', type='json', auth='none', cors='*', csrf=False)
    def api_login(self, **kwargs):
        db = kwargs.get('db')
        login = kwargs.get('login')
        password = kwargs.get('password')

        try:
            if not all([db, login, password]):
                return {"status": "error", "message": f"Faltan parámetros. Recibido: db={db}, login={login}"}

            _logger.info("Intento de login API: DB=%s, User=%s", db, login)
            
            credential = {
                'login': login,
                'password': password,
                'type': 'password'
            }
            uid = request.session.authenticate(db, credential)

            if uid:
                return {"status": "ok", "uid": uid}
            return {"status": "error", "message": "Autenticación fallida"}
        except Exception as e:
            _logger.error("Error en login API: %s", str(e))
            return {"status": "error", "message": str(e)}

    @http.route('/nfc/api/search', type='json', auth='public', cors='*', csrf=False)
    def api_search(self, model, domain, fields, **kwargs):
        records = request.env[model].sudo().search_read(domain, fields)
        return {"status": "ok", "records": records}

    @http.route(
    '/nfc/api/search_maui',
    type='http',
    auth='public',
    cors='*',
    csrf=False,
    methods=['POST']
    )
    def api_search_maui(self, **kwargs):
    
        try:
            data = json.loads(request.httprequest.data)
    
            params = data.get("params", {})
    
            model = params.get("model")
            domain = params.get("domain", [])
            fields = params.get("fields", [])
    
            records = request.env[model].sudo().search_read(
                domain,
                fields
            )
    
            response = {
                "status": "ok",
                "records": records
            }
    
            return Response(
                json.dumps(response),
                content_type='application/json'
            )
    
        except Exception as e:
    
            response = {
                "status": "error",
                "message": str(e)
            }
    
            return Response(
                json.dumps(response),
                content_type='application/json'
            )
    
    @http.route('/nfc/api/log', type='json', auth='public', cors='*', csrf=False)
    def api_log(self, alumno_id, tipo='entrada', **kwargs):
        log = request.env['nfc.registro_asistencia'].sudo().create({
            'alumno_id': alumno_id,
            'tipo': tipo
        })
        return {"status": "ok", "log_id": log.id}

    @http.route('/nfc/read', type='json', auth='public', cors='*', csrf=False)
    def nfc_read(self, uid=None, **kwargs):
        if not uid:
            return {"status": "error", "message": "NO UID"}

        alumno = request.env['nfc.alumno'].sudo().search([('uid_tarjeta_rfid', '=', uid)], limit=1)
        if alumno:
            request.env['nfc.registro_asistencia'].sudo().create({
                'alumno_id': alumno.id,
                'tipo': 'entrada'
            })
            return {"status": "ok", "uid": uid, "alumno": alumno.nombre_completo}
        return {"status": "error", "message": "Alumno no encontrado"}

    @http.route('/nfc/api/alumnos', type='json', auth='public', cors='*', csrf=False)
    def api_alumnos(self, **kwargs):
        Alumno = request.env['nfc.alumno'].sudo()
        Registro = request.env['nfc.registro_asistencia'].sudo()
        alumnos = Alumno.search([])
        resultado = []
        hoy = datetime.now()
        inicio_semana = hoy - timedelta(days=hoy.weekday())
        inicio_semana = inicio_semana.replace(hour=0, minute=0, second=0, microsecond=0)

        for a in alumnos:
            faltas_total = Registro.search_count([('alumno_id', '=', a.id), ('tipo', '=', 'salida')])
            faltas_semanal = Registro.search_count([
                ('alumno_id', '=', a.id),
                ('tipo', '=', 'salida'),
                ('fecha_hora', '>=', inicio_semana.strftime('%Y-%m-%d %H:%M:%S'))
            ])
            resultado.append({
                'id': a.id,
                'nombre': a.nombre_completo,
                'grupo': a.curso_id.nombre_grupo if a.curso_id else 'Sin grupo',
                'nfc': a.uid_tarjeta_rfid or '',
                'recreo': a.permiso_salida,
                'faltasTotal': faltas_total,
                'faltasSemanal': faltas_semanal,
            })
        return {"status": "ok", "alumnos": resultado}

    @http.route('/nfc/api/profesores', type='json', auth='public', cors='*', csrf=False)
    def api_profesores(self, **kwargs):
        Profesor = request.env['nfc.profesor'].sudo()
        profesores = Profesor.search([])
        resultado = []
        for p in profesores:
            grupos = ', '.join(p.cursos_ids.mapped('nombre_grupo')) if p.cursos_ids else 'Sin grupo'
            resultado.append({
                'id': p.id,
                'nombre': p.nombre_completo,
                'grupo': grupos,
                'nfc': p.uid_tarjeta_rfid or '',
            })
        return {"status": "ok", "profesores": resultado}

    @http.route('/nfc/api/dashboard', type='json', auth='public', cors='*', csrf=False)
    def api_dashboard(self, **kwargs):
        Registro = request.env['nfc.registro_asistencia'].sudo()
        hoy = datetime.now()
        inicio_semana = hoy - timedelta(days=hoy.weekday())
        inicio_semana = inicio_semana.replace(hour=0, minute=0, second=0, microsecond=0)

        salidas_semana = Registro.search_count([('tipo', '=', 'salida'), ('fecha_hora', '>=', inicio_semana.strftime('%Y-%m-%d %H:%M:%S'))])
        incidencias = Registro.search_count([('tipo', '=', 'salida'), ('justificado', '=', False), ('fecha_hora', '>=', inicio_semana.strftime('%Y-%m-%d %H:%M:%S'))])
        asistencias_semana = Registro.search_count([('tipo', '=', 'entrada'), ('fecha_hora', '>=', inicio_semana.strftime('%Y-%m-%d %H:%M:%S'))])

        dias_labels = ['L', 'M', 'X', 'J', 'V']
        grafica = []
        for i in range(5):
            dia_inicio = inicio_semana + timedelta(days=i)
            dia_fin = dia_inicio + timedelta(days=1)
            conteo = Registro.search_count([
                ('tipo', '=', 'salida'),
                ('fecha_hora', '>=', dia_inicio.strftime('%Y-%m-%d %H:%M:%S')),
                ('fecha_hora', '<', dia_fin.strftime('%Y-%m-%d %H:%M:%S'))
            ])
            grafica.append({'dia': dias_labels[i], 'valor': conteo})

        return {
            "status": "ok",
            "kpis": {"salidas": salidas_semana, "incidencias": incidencias, "activos": asistencias_semana},
            "grafica": grafica,
        }

    @http.route('/nfc/api/vincular_nfc', type='json', auth='public', cors='*', csrf=False)
    def api_vincular_nfc(self, tipo, registro_id, uid_nfc, **kwargs):
        if tipo == 'alumno': record = request.env['nfc.alumno'].sudo().browse(registro_id)
        elif tipo == 'profesor': record = request.env['nfc.profesor'].sudo().browse(registro_id)
        else: return {"status": "error", "message": "Tipo no válido"}

        if not record.exists(): return {"status": "error", "message": "Registro no encontrado"}
        record.write({'uid_tarjeta_rfid': uid_nfc})
        return {"status": "ok", "message": "NFC vinculado"}

    @http.route('/nfc/api/toggle_permiso', type='json', auth='public', cors='*', csrf=False)
    def api_toggle_permiso(self, alumno_id, **kwargs):
        alumno = request.env['nfc.alumno'].sudo().browse(alumno_id)
        if not alumno.exists(): return {"status": "error", "message": "No encontrado"}
        alumno.write({'permiso_salida': not alumno.permiso_salida})
        return {"status": "ok", "permiso_salida": alumno.permiso_salida}

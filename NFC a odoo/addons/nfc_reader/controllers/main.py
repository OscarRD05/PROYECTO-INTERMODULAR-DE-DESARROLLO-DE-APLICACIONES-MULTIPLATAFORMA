from odoo import http
from odoo.http import request, Response
from datetime import datetime, timedelta
import json
import logging

_logger = logging.getLogger(__name__)

class NFCController(http.Controller):

    @http.route('/nfc/test', type='http', auth='none', cors='*', methods=['GET', 'OPTIONS'], csrf=False)
    def api_test(self, **kwargs):
        if request.httprequest.method == 'OPTIONS':
            return self._cors_preflight_response()
        return "Conexión OK - El servidor responde"

    def _cors_preflight_response(self):
        """Respuesta para preflight CORS (OPTIONS)."""
        return Response(
            '',
            status=204,
            headers=[
                ('Access-Control-Allow-Origin', '*'),
                ('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'),
                ('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization'),
                ('Access-Control-Max-Age', '86400'),
            ]
        )

    def _json_response(self, data, status=200):
        """Helper para devolver JSON con headers de CORS manuales."""
        return Response(
            json.dumps(data),
            status=status,
            headers=[
                ('Content-Type', 'application/json'),
                ('Access-Control-Allow-Origin', '*'),
                ('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'),
                ('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization'),
                ('Access-Control-Max-Age', '86400'),
            ]
        )

    @http.route('/nfc/api/login', type='http', auth='none', methods=['OPTIONS'], cors='*', csrf=False, save_session=False)
    def api_login_options(self, **kwargs):
        """Manejador dedicado para preflight CORS del endpoint de login."""
        return self._cors_preflight_response()

    @http.route('/nfc/api/login', type='http', auth='none', methods=['POST'], cors='*', csrf=False, save_session=False)
    def api_login(self, **kwargs):
        try:
            body = json.loads(request.httprequest.data)
            params = body.get('params', {})
            db = params.get('db')
            login = params.get('login')
            password = params.get('password')

            if not all([db, login, password]):
                return self._json_response({"status": "error", "message": "Faltan parámetros (db, login, password)"})

            uid = request.session.authenticate(db, login, password)
            if uid:
                return self._json_response({"status": "ok", "uid": uid})
            return self._json_response({"status": "error", "message": "Autenticación fallida"})
        except Exception as e:
            _logger.error("Error en login API: %s", str(e))
            return self._json_response({"status": "error", "message": str(e)})

    @http.route('/nfc/api/search', type='json', auth='user', cors='*', csrf=False)
    def api_search(self, model, domain, fields, **kwargs):
        records = request.env[model].sudo().search_read(domain, fields)
        return {"status": "ok", "records": records}

    @http.route('/nfc/api/log', type='json', auth='user', cors='*', csrf=False)
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

    # ═══════════════════════════════════════════════════════════════
    #  ENDPOINTS PARA EL DASHBOARD
    # ═══════════════════════════════════════════════════════════════

    @http.route('/nfc/api/alumnos', type='json', auth='user', cors='*', csrf=False)
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

    @http.route('/nfc/api/profesores', type='json', auth='user', cors='*', csrf=False)
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

    @http.route('/nfc/api/dashboard', type='json', auth='user', cors='*', csrf=False)
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

    @http.route('/nfc/api/vincular_nfc', type='json', auth='user', cors='*', csrf=False)
    def api_vincular_nfc(self, tipo, registro_id, uid_nfc, **kwargs):
        if tipo == 'alumno': record = request.env['nfc.alumno'].sudo().browse(registro_id)
        elif tipo == 'profesor': record = request.env['nfc.profesor'].sudo().browse(registro_id)
        else: return {"status": "error", "message": "Tipo no válido"}
        
        if not record.exists(): return {"status": "error", "message": "Registro no encontrado"}
        record.write({'uid_tarjeta_rfid': uid_nfc})
        return {"status": "ok", "message": "NFC vinculado"}

    @http.route('/nfc/api/toggle_permiso', type='json', auth='user', cors='*', csrf=False)
    def api_toggle_permiso(self, alumno_id, **kwargs):
        alumno = request.env['nfc.alumno'].sudo().browse(alumno_id)
        if not alumno.exists(): return {"status": "error", "message": "No encontrado"}
        alumno.write({'permiso_salida': not alumno.permiso_salida})
        return {"status": "ok", "permiso_salida": alumno.permiso_salida}
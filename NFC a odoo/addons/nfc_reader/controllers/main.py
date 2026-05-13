from odoo import http
from odoo.http import request
from datetime import datetime, timedelta
import logging

_logger = logging.getLogger(__name__)


class NFCController(http.Controller):

    @http.route(
        '/nfc/test',
        type='http',
        auth='none',
        cors='*',
        methods=['GET']
    )
    def api_test(self, **kwargs):
        return "Conexión OK - El servidor responde"

    # ═══════════════════════════════════════════════
    # LOGIN
    # ═══════════════════════════════════════════════

    @http.route(
        '/nfc/api/login',
        type='json',
        auth='none',
        methods=['POST'],
        cors='*',
        csrf=False
    )
    def api_login(self, db, login, password, **kwargs):

        try:
            uid = request.session.authenticate(
                db,
                login,
                password
            )

            if uid:
                return {
                    "status": "ok",
                    "uid": uid
                }

            return {
                "status": "error",
                "message": "Autenticación fallida"
            }

        except Exception as e:
            _logger.error("Error login API: %s", str(e))

            return {
                "status": "error",
                "message": str(e)
            }

    # ═══════════════════════════════════════════════
    # SEARCH
    # ═══════════════════════════════════════════════

    @http.route(
        '/nfc/api/search',
        type='json',
        auth='user',
        cors='*',
        csrf=False
    )
    def api_search(self, model, domain, fields, **kwargs):

        records = request.env[model].sudo().search_read(
            domain,
            fields
        )

        return {
            "status": "ok",
            "records": records
        }

    # ═══════════════════════════════════════════════
    # LOG ASISTENCIA
    # ═══════════════════════════════════════════════

    @http.route(
        '/nfc/api/log',
        type='json',
        auth='user',
        cors='*',
        csrf=False
    )
    def api_log(self, alumno_id, tipo='entrada', **kwargs):

        log = request.env['nfc.registro_asistencia'].sudo().create({
            'alumno_id': alumno_id,
            'tipo': tipo
        })

        return {
            "status": "ok",
            "log_id": log.id
        }

    # ═══════════════════════════════════════════════
    # NFC DIRECTO
    # ═══════════════════════════════════════════════

    @http.route(
        '/nfc/read',
        type='json',
        auth='public',
        cors='*',
        csrf=False
    )
    def nfc_read(self, uid=None, **kwargs):

        if not uid:
            return {
                "status": "error",
                "message": "NO UID"
            }

        alumno = request.env['nfc.alumno'].sudo().search([
            ('uid_tarjeta_rfid', '=', uid)
        ], limit=1)

        if alumno:

            request.env['nfc.registro_asistencia'].sudo().create({
                'alumno_id': alumno.id,
                'tipo': 'entrada'
            })

            return {
                "status": "ok",
                "uid": uid,
                "alumno": alumno.nombre_completo
            }

        return {
            "status": "error",
            "message": "Alumno no encontrado"
        }

    # ═══════════════════════════════════════════════
    # DASHBOARD ALUMNOS
    # ═══════════════════════════════════════════════

    @http.route(
        '/nfc/api/alumnos',
        type='json',
        auth='user',
        cors='*',
        csrf=False
    )
    def api_alumnos(self, **kwargs):

        Alumno = request.env['nfc.alumno'].sudo()
        Registro = request.env['nfc.registro_asistencia'].sudo()

        alumnos = Alumno.search([])

        resultado = []

        hoy = datetime.now()

        inicio_semana = hoy - timedelta(days=hoy.weekday())
        inicio_semana = inicio_semana.replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0
        )

        for a in alumnos:

            faltas_total = Registro.search_count([
                ('alumno_id', '=', a.id),
                ('tipo', '=', 'salida')
            ])

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

        return {
            "status": "ok",
            "alumnos": resultado
        }

    # ═══════════════════════════════════════════════
    # DASHBOARD PROFESORES
    # ═══════════════════════════════════════════════

    @http.route(
        '/nfc/api/profesores',
        type='json',
        auth='user',
        cors='*',
        csrf=False
    )
    def api_profesores(self, **kwargs):

        Profesor = request.env['nfc.profesor'].sudo()

        profesores = Profesor.search([])

        resultado = []

        for p in profesores:

            grupos = ', '.join(
                p.cursos_ids.mapped('nombre_grupo')
            ) if p.cursos_ids else 'Sin grupo'

            resultado.append({
                'id': p.id,
                'nombre': p.nombre_completo,
                'grupo': grupos,
                'nfc': p.uid_tarjeta_rfid or '',
            })

        return {
            "status": "ok",
            "profesores": resultado
        }

    # ═══════════════════════════════════════════════
    # DASHBOARD KPIS
    # ═══════════════════════════════════════════════

    @http.route(
        '/nfc/api/dashboard',
        type='json',
        auth='user',
        cors='*',
        csrf=False
    )
    def api_dashboard(self, **kwargs):

        Registro = request.env['nfc.registro_asistencia'].sudo()

        hoy = datetime.now()

        inicio_semana = hoy - timedelta(days=hoy.weekday())
        inicio_semana = inicio_semana.replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0
        )

        salidas_semana = Registro.search_count([
            ('tipo', '=', 'salida'),
            ('fecha_hora', '>=', inicio_semana.strftime('%Y-%m-%d %H:%M:%S'))
        ])

        incidencias = Registro.search_count([
            ('tipo', '=', 'salida'),
            ('justificado', '=', False),
            ('fecha_hora', '>=', inicio_semana.strftime('%Y-%m-%d %H:%M:%S'))
        ])

        asistencias_semana = Registro.search_count([
            ('tipo', '=', 'entrada'),
            ('fecha_hora', '>=', inicio_semana.strftime('%Y-%m-%d %H:%M:%S'))
        ])

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

            grafica.append({
                'dia': dias_labels[i],
                'valor': conteo
            })

        return {
            "status": "ok",
            "kpis": {
                "salidas": salidas_semana,
                "incidencias": incidencias,
                "activos": asistencias_semana
            },
            "grafica": grafica,
        }

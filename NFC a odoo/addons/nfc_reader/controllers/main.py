from odoo import http
from odoo.http import request
from datetime import datetime, timedelta
from odoo.http import Response
import json
import logging

_logger = logging.getLogger(__name__)


class NFCController(http.Controller):

    @staticmethod
    def _generate_uid_variants(uid_hex):
        """Genera variantes de formato UID para comparar lo que lee Android (hex)
        con lo que lee Windows (decimal little-endian, 10 digitos).

        Ejemplo: Android lee '534e2d1e630001' ->primeros 4 bytes invertidos
        -> '1E2D4E53' -> decimal 506285651 -> zero-pad '0506285651' (formato Odoo).
        """
        variants = set()
        uid_hex = uid_hex.replace(':', '').replace('-', '').lower()

        # Hex tal cual (lo que lee Android)
        variants.add(uid_hex)
        variants.add(uid_hex.upper())

        try:
            byte_count = len(uid_hex) // 2
            if byte_count > 0 and len(uid_hex) == byte_count * 2:
                raw_bytes = bytes.fromhex(uid_hex)

                # Decimal little-endian de los primeros 4 bytes (formato Windows/Odoo)
                if byte_count >= 4:
                    first4 = raw_bytes[:4]
                    int4_le = int.from_bytes(first4, byteorder='little')
                    variants.add(str(int4_le))
                    variants.add(f'{int4_le:010d}')

                # Decimal little-endian de todos los bytes
                int_le = int.from_bytes(raw_bytes, byteorder='little')
                variants.add(str(int_le))
                variants.add(f'{int_le:010d}')
        except (ValueError, TypeError):
            pass

        return [v for v in variants if v]

    @http.route('/nfc/api/scan_uid', type='json', auth='public', cors='*', csrf=False)
    def api_scan_uid(self, uid, **kwargs):
        """Busca un alumno por UID NFC probando multiples formatos de conversión."""
        Alumno = request.env['nfc.alumno'].sudo()

        variants = self._generate_uid_variants(uid)
        _logger.info("NFC scan_uid: raw=%s, trying %d variants", uid, len(variants))

        for variant in variants:
            alumno = Alumno.search([('uid_tarjeta_rfid', '=', variant)], limit=1)
            if alumno:
                _logger.info("NFC scan_uid: matched variant=%s -> alumno=%s", variant, alumno.nombre_completo)
                curso = alumno.curso_id.nombre_grupo if alumno.curso_id else 'Sin curso'
                return {
                    "status": "ok",
                    "alumno": {
                        "id": alumno.id,
                        "nombre_completo": alumno.nombre_completo,
                        "curso_id": [alumno.curso_id.id, curso] if alumno.curso_id else False,
                        "permiso_salida": alumno.permiso_salida,
                        "uid_tarjeta_rfid": alumno.uid_tarjeta_rfid or '',
                    },
                    "matched_variant": variant,
                }

        _logger.info("NFC scan_uid: no match for uid=%s", uid)
        return {"status": "ok", "alumno": None}

    @http.route('/nfc/test', type='http', auth='none', cors='*', csrf=False)
    def api_test(self, **kwargs):
        return "OK - NFC Reader module loaded"

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
    
    @http.route('/nfc/api/log', type='json', auth='public', cors='*', csrf=False)
    def api_log(self, alumno_id, tipo='entrada', profesor_id=None, justificado=False, **kwargs):
        vals = {
            'alumno_id': alumno_id,
            'tipo': tipo,
            'justificado': justificado,
        }
        if profesor_id:
            vals['profesor_id'] = profesor_id
        record = request.env['nfc.registro_asistencia'].sudo().create(vals)
        return {"status": "ok", "log_id": record.id}

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

    @http.route('/nfc/api/registros_alumno', type='json', auth='public', cors='*', csrf=False)
    def api_registros_alumno(self, alumno_id, **kwargs):
        Registro = request.env['nfc.registro_asistencia'].sudo()
        registros = Registro.search([('alumno_id', '=', alumno_id)], limit=50)
        resultado = [{
            'id': r.id,
            'fecha_hora': r.fecha_hora.strftime('%Y-%m-%d %H:%M'),
            'tipo': r.tipo,
            'justificado': r.justificado,
            'motivo': r.motivo or '',
        } for r in registros]
        return {"status": "ok", "registros": resultado}

    @http.route('/nfc/api/justificar_falta', type='json', auth='public', cors='*', csrf=False)
    def api_justificar_falta(self, registro_id, justificado=True, **kwargs):
        record = request.env['nfc.registro_asistencia'].sudo().browse(registro_id)
        if not record.exists():
            return {"status": "error", "message": "Registro no encontrado"}
        record.write({'justificado': justificado})
        return {"status": "ok", "justificado": record.justificado}

    @http.route('/nfc/api/registrar_salida_anticipada', type='json', auth='public', cors='*', csrf=False)
    def api_registrar_salida_anticipada(self, alumno_id, motivo='', profesor_id=None, justificado=False, **kwargs):
        vals = {
            'alumno_id': alumno_id,
            'tipo': 'salida_anticipada',
            'justificado': justificado,
        }
        if motivo:
            vals['motivo'] = motivo
        if profesor_id:
            vals['profesor_id'] = profesor_id
        record = request.env['nfc.registro_asistencia'].sudo().create(vals)
        return {"status": "ok", "id": record.id}

    @http.route('/nfc/api/faltas', type='json', auth='public', cors='*', csrf=False)
    def api_faltas(self, **kwargs):
        Registro = request.env['nfc.registro_asistencia'].sudo()
        registros = Registro.search([], order='fecha_hora desc', limit=200)
        resultado = [{
            'id': r.id,
            'alumno': r.alumno_id.nombre_completo if r.alumno_id else 'Desconocido',
            'fecha_hora': r.fecha_hora.strftime('%Y-%m-%d %H:%M'),
            'tipo': r.tipo,
            'justificado': r.justificado,
            'motivo': r.motivo or '',
        } for r in registros]
        return {"status": "ok", "faltas": resultado}

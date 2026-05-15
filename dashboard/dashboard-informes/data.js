// ═══════════════════════════════════════════════════════════════
// OdooService - Clase para comunicarse con el controlador de Odoo
// ═══════════════════════════════════════════════════════════════
class OdooService {
  constructor(db) {
    this.db = db;
    this.uid = null;
    this.login_user = null;
    this.login_pass = null;
  }

  async callApi(endpoint, params = {}) {
    params = params || {};
    params.db = this.db;

    const body = {
      jsonrpc: "2.0",
      params: params,
      id: Math.floor(Math.random() * 1000000)
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

      const data = await response.json();
      if (data.error) throw new Error(data.error.data.message || data.error.message);
      if (data.result.status === "error") throw new Error(data.result.message);

      return data.result;
    } catch (error) {
      console.error("Error en Odoo API:", error);
      throw error;
    }
  }

  async login(username, password) {
    const result = await this.callApi('/nfc/api/login', {
      db: this.db,
      login: username,
      password: password
    });
    this.uid = result.uid;
    this.login_user = username;
    this.login_pass = password;
    return result.uid;
  }
}

// ═══════════════════════════════════════════════════════════════
// Variables globales (como "ventas" en el tutorial)
// ═══════════════════════════════════════════════════════════════
let odoo = null;
let chartInstance = null;

// Datos originales (sin filtrar) — equivalente al array "ventas" del tutorial
let datosGrafica = [];      // [{dia, valor}] — datos de la gráfica del dashboard
let datosAlumnos = [];      // array de alumnos sin filtrar
let datosProfesores = [];   // array de profesores sin filtrar
let datosUsuarios = [];     // alumnos + profesores combinados para NFC
let datosFaltas = [];       // registros de asistencia sin filtrar

// Datos filtrados (los que se muestran actualmente en tabla y gráfico)
let datosActuales = [];

// Vista activa
let vistaActual = 'dashboard';

// ═══════════════════════════════════════════════════════════════
// Referencias a elementos del DOM
// ═══════════════════════════════════════════════════════════════
const loginOverlay = document.getElementById("login-overlay");
const loginError = document.getElementById("login-error");
const appContainer = document.getElementById("app-container");
const loadingSpinner = document.getElementById("loading-spinner");
const sessionInfo = document.getElementById("session-info");

// ═══════════════════════════════════════════════════════════════
// Inicialización — Cargar config guardada (localStorage)
// ═══════════════════════════════════════════════════════════════
window.onload = () => {
  const savedConfig = localStorage.getItem('odoo_config');
  if (savedConfig) {
    const config = JSON.parse(savedConfig);
    document.getElementById("login-db").value = config.db;
    document.getElementById("login-user").value = config.user;
  } else if (typeof APP_CONFIG !== 'undefined') {
    document.getElementById("login-db").value = APP_CONFIG.ODOO_DB;
  }

  // Inicializar gráfico vacío (tutorial: inicializarGrafico)
  inicializarGrafico();
};

// ═══════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════
document.getElementById("btn-login").onclick = async () => {
  const db = document.getElementById("login-db").value.trim();
  const user = document.getElementById("login-user").value.trim();
  const pass = document.getElementById("login-pass").value;

  if (!db || !user || !pass) {
    showLoginError("Por favor, rellena Base de datos, correo y contraseña.");
    return;
  }

  loginError.style.display = "none";
  document.getElementById("btn-login").innerText = "CONECTANDO...";
  document.getElementById("btn-login").disabled = true;

  try {
    odoo = new OdooService(db);
    await odoo.login(user, pass);

    localStorage.setItem('odoo_config', JSON.stringify({ db, user }));

    loginOverlay.classList.add("d-none");
    appContainer.classList.remove("d-none");
    sessionInfo.innerText = `Conectado como ${user}`;

    await cargarTabla('dashboard');
  } catch (error) {
    showLoginError("Fallo de autenticación: " + error.message);
    document.getElementById("btn-login").innerText = "ENTRAR";
    document.getElementById("btn-login").disabled = false;
  }
};

function showLoginError(msg) {
  loginError.innerText = msg;
  loginError.style.display = "block";
}

document.getElementById("btn-logout").onclick = () => {
  localStorage.removeItem('odoo_config');
  location.reload();
};

// ═══════════════════════════════════════════════════════════════
// NAVEGACIÓN
// ═══════════════════════════════════════════════════════════════
const vistas = {
  dashboard: document.getElementById("vista-dashboard"),
  alumnos: document.getElementById("vista-alumnos"),
  profesores: document.getElementById("vista-profesores"),
  nfc: document.getElementById("vista-nfc"),
  faltas: document.getElementById("vista-faltas")
};

const botonesNav = {
  dashboard: document.getElementById("btn-dashboard"),
  alumnos: document.getElementById("btn-alumnos"),
  profesores: document.getElementById("btn-profesores"),
  nfc: document.getElementById("btn-nfc"),
  faltas: document.getElementById("btn-faltas")
};

function ocultarVistas() {
  Object.values(vistas).forEach(v => v.classList.add("d-none"));
  Object.values(botonesNav).forEach(b => {
    b.classList.remove("active", "bg-primary-subtle", "text-primary", "fw-semibold");
    b.classList.add("text-dark");
  });
}

function mostrarVista(nombre) {
  ocultarVistas();
  vistas[nombre].classList.remove("d-none");
  botonesNav[nombre].classList.add("active", "bg-primary-subtle", "text-primary", "fw-semibold");
  botonesNav[nombre].classList.remove("text-dark");
  vistaActual = nombre;
}

botonesNav.dashboard.onclick = (e) => { e.preventDefault(); cargarTabla('dashboard'); };
botonesNav.alumnos.onclick = (e) => { e.preventDefault(); cargarTabla('alumnos'); };
botonesNav.profesores.onclick = (e) => { e.preventDefault(); cargarTabla('profesores'); };
botonesNav.nfc.onclick = (e) => { e.preventDefault(); cargarTabla('nfc'); };
botonesNav.faltas.onclick = (e) => { e.preventDefault(); cargarTabla('faltas'); };

// ═══════════════════════════════════════════════════════════════
// cargarTabla — Carga datos y rellena tabla HTML por DOM
// (Equivalente a la función cargarTabla del tutorial que rellena
//  la tabla con innerHTML usando un bucle sobre los datos)
// ═══════════════════════════════════════════════════════════════
async function cargarTabla(tipo) {
  mostrarVista(tipo);

  if (tipo !== 'dashboard') {
    vistas[tipo].classList.add("opacity-50");
  }
  loadingSpinner.classList.remove("d-none");

  try {
    if (tipo === 'dashboard') {
      const data = await odoo.callApi('/nfc/api/dashboard');
      datosGrafica = data.grafica;
      datosActuales = [...datosGrafica];

      // KPIs desde la API
      document.getElementById("kpi-salidas").innerText = data.kpis.salidas;
      document.getElementById("kpi-incidencias").innerText = data.kpis.incidencias;
      document.getElementById("kpi-activos").innerText = data.kpis.activos;

      // KPIs calculados con reduce/length (tutorial)
      calcularKPIs(datosActuales, 'dashboard');

      // Rellenar el filtro de días con opciones únicas
      rellenarFiltroDashboard(datosGrafica);

      // Renderizar gráfico
      renderizarGrafico(datosActuales);

    } else if (tipo === 'alumnos') {
      const data = await odoo.callApi('/nfc/api/alumnos');
      datosAlumnos = data.alumnos;
      datosActuales = [...datosAlumnos];

      calcularKPIs(datosActuales, 'alumnos');
      renderTablaAlumnos(datosActuales);

    } else if (tipo === 'profesores') {
      const data = await odoo.callApi('/nfc/api/profesores');
      datosProfesores = data.profesores;
      datosActuales = [...datosProfesores];

      rellenarFiltroProfesores(datosProfesores);
      calcularKPIs(datosActuales, 'profesores');
      renderTablaProfesores(datosActuales);

    } else if (tipo === 'nfc') {
      const dataAlumnos = await odoo.callApi('/nfc/api/alumnos');
      const dataProfesores = await odoo.callApi('/nfc/api/profesores');

      const alumnos = dataAlumnos.alumnos.map(a => ({ ...a, rol: 'Estudiante' }));
      const profesores = dataProfesores.profesores.map(p => ({ ...p, rol: 'Profesor' }));

      datosUsuarios = [...alumnos, ...profesores];
      datosActuales = [...datosUsuarios];

      calcularKPIs(datosActuales, 'nfc');
      renderTablaNFC(datosActuales);

    } else if (tipo === 'faltas') {
      const data = await odoo.callApi('/nfc/api/faltas');
      datosFaltas = data.faltas;
      datosActuales = [...datosFaltas];

      calcularKPIs(datosActuales, 'faltas');
      renderTablaFaltas(datosActuales);
    }

  } catch (error) {
    alert("Error cargando datos: " + error.message);
  } finally {
    loadingSpinner.classList.add("d-none");
    if (tipo !== 'dashboard') {
      vistas[tipo].classList.remove("opacity-50");
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// calcularKPIs — Calcula totales con .length y .reduce()
// (Tutorial: Calcula total pedidos e ingresos totales)
// ═══════════════════════════════════════════════════════════════
function calcularKPIs(datos, tipo) {
  if (tipo === 'dashboard') {
    // Total de días registrados — usando .length
    const totalDias = datos.length;
    document.getElementById("kpi-total-dias").innerText = totalDias;

    // Total de salidas — usando .reduce()
    const totalSalidas = datos.reduce((acumulado, dia) => acumulado + dia.valor, 0);
    document.getElementById("kpi-total-salidas").innerText = totalSalidas;

    // Media de salidas por día — .reduce() / .length
    const media = totalDias > 0 ? (totalSalidas / totalDias).toFixed(1) : 0;
    document.getElementById("kpi-media-salidas").innerText = media;

    // Día con más salidas — usando .reduce() con comparación
    const diaMax = datos.reduce((max, dia) => dia.valor > max.valor ? dia : max, datos[0] || { dia: '-', valor: 0 });
    document.getElementById("kpi-max-dia").innerText = diaMax.dia;

  } else if (tipo === 'alumnos') {
    // Total alumnos — .length
    document.getElementById("kpi-total-alumnos").innerText = datos.length;

    // Con permiso recreo — .filter().length
    const conPermiso = datos.filter(a => a.recreo).length;
    document.getElementById("kpi-con-permiso").innerText = conPermiso;

    // Total faltas — .reduce()
    const totalFaltas = datos.reduce((sum, a) => sum + a.faltasTotal, 0);
    document.getElementById("kpi-total-faltas").innerText = totalFaltas;

    // Media faltas/alumno — .reduce() / .length
    const mediaFaltas = datos.length > 0 ? (totalFaltas / datos.length).toFixed(1) : 0;
    document.getElementById("kpi-media-faltas").innerText = mediaFaltas;

  } else if (tipo === 'profesores') {
    // Total profesores — .length
    document.getElementById("kpi-total-profesores").innerText = datos.length;

    // Con NFC vinculado — .filter().length
    const conNfc = datos.filter(p => p.nfc && p.nfc.trim() !== '').length;
    document.getElementById("kpi-profesores-nfc").innerText = conNfc;

    // Grupos únicos — usando .map() + Set + .length
    const grupos = [...new Set(datos.map(p => p.grupo))];
    document.getElementById("kpi-grupos-unicos").innerText = grupos.length;

  } else if (tipo === 'nfc') {
    // Total usuarios — .length
    document.getElementById("kpi-total-usuarios").innerText = datos.length;

    // Con NFC vinculado — .filter().length
    const vinculados = datos.filter(u => u.nfc && u.nfc.trim() !== '').length;
    document.getElementById("kpi-nfc-vinculados").innerText = vinculados;

    // Sin NFC — .filter().length
    const noVinculados = datos.filter(u => !u.nfc || u.nfc.trim() === '').length;
    document.getElementById("kpi-nfc-no-vinculados").innerText = noVinculados;

    // Porcentaje vinculado — .reduce() para contar, luego calcular %
    const porcentaje = datos.length > 0 ? ((vinculados / datos.length) * 100).toFixed(1) : 0;
    document.getElementById("kpi-nfc-porcentaje").innerText = porcentaje + "%";

  } else if (tipo === 'faltas') {
    document.getElementById("kpi-faltas-total").innerText = datos.length;

    const justificados = datos.filter(r => r.justificado).length;
    document.getElementById("kpi-faltas-justificados").innerText = justificados;

    const noJustificados = datos.filter(r => !r.justificado).length;
    document.getElementById("kpi-faltas-no-justificados").innerText = noJustificados;

    const porcentaje = datos.length > 0 ? ((justificados / datos.length) * 100).toFixed(1) : 0;
    document.getElementById("kpi-faltas-porcentaje").innerText = porcentaje + "%";
  }
}

// ═══════════════════════════════════════════════════════════════
// Renderizado de tablas por DOM (tutorial: innerHTML + bucle)
// ═══════════════════════════════════════════════════════════════

function renderTablaAlumnos(datos) {
  const tbody = document.getElementById("tabla-alumnos");
  // Obtener tbody por ID y generar filas con innerHTML (patrón del tutorial)
  tbody.innerHTML = datos.map(a => `
    <tr>
      <td>
        <button class="btn btn-link p-0 text-decoration-none fw-bold" onclick='verFichaAlumno(${JSON.stringify(a).replace(/'/g, "&#39;")})'>
          ${a.nombre}
        </button>
      </td>
      <td>${a.recreo ? "Sí" : "No"}</td>
      <td>${a.faltasTotal}</td>
      <td>${a.faltasSemanal}</td>
      <td>
        <label class="switch">
          <input type="checkbox" ${a.recreo ? "checked" : ""} onchange="togglePermiso(${a.id})">
          <span class="slider"></span>
        </label>
      </td>
    </tr>
  `).join("");
}

function renderTablaProfesores(datos) {
  const tbody = document.getElementById("tabla-profesores");
  tbody.innerHTML = datos.map(p => `
    <tr>
      <td>${p.nombre}</td>
      <td>${p.grupo}</td>
      <td>${p.nfc ? p.nfc : '<span class="text-danger fw-bold">NINGUNO</span>'}</td>
    </tr>
  `).join("");
}

function renderTablaNFC(datos) {
  const tbody = document.getElementById("tabla-nfc");
  const select = document.getElementById("select-usuario");

  // Tabla
  tbody.innerHTML = datos.map(u => `
    <tr>
      <td>${u.nombre}</td>
      <td>${u.rol}</td>
      <td>${u.nfc ? u.nfc : '<span class="text-danger fw-bold">NINGUNO</span>'}</td>
    </tr>
  `).join("");

  // Select de usuarios para vincular
  select.innerHTML = datos.map(u => `
    <option value="${u.rol === 'Estudiante' ? 'alumno' : 'profesor'}:${u.id}">
      ${u.nombre} (${u.rol})
    </option>
  `).join("");
}

function renderTablaFaltas(datos) {
  const tbody = document.getElementById("tabla-faltas");
  const tipoLabel = { 'entrada': 'Entrada', 'salida': 'Salida', 'salida_anticipada': 'Salida Anticipada' };
  tbody.innerHTML = datos.map(r => `
    <tr>
      <td>${r.alumno}</td>
      <td>${r.fecha_hora}</td>
      <td>${tipoLabel[r.tipo] || r.tipo}</td>
      <td>
        <div class="form-check form-switch d-inline-block">
          <input class="form-check-input" type="checkbox" ${r.justificado ? 'checked' : ''}
            onchange="toggleJustificadoFaltas(${r.id}, this.checked)">
        </div>
        ${r.justificado ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-danger">No</span>'}
      </td>
      <td>${r.motivo || '-'}</td>
    </tr>
  `).join("");
}

// ═══════════════════════════════════════════════════════════════
// Filtros dinámicos — Usando .filter() (tutorial)
// Escuchamos el evento change del select y filtramos los datos
// ═══════════════════════════════════════════════════════════════

// --- Filtro Dashboard: por día de la semana ---
document.getElementById("filtro-dashboard").addEventListener("change", function() {
  const valor = this.value;
  if (valor === "todos") {
    datosActuales = [...datosGrafica];
  } else {
    // Usamos .filter() para filtrar los datos (patrón del tutorial)
    datosActuales = datosGrafica.filter(d => d.dia === valor);
  }
  calcularKPIs(datosActuales, 'dashboard');
  renderizarGrafico(datosActuales);
});

// --- Filtro Alumnos: por permiso recreo ---
document.getElementById("filtro-alumnos").addEventListener("change", function() {
  const valor = this.value;
  if (valor === "todos") {
    datosActuales = [...datosAlumnos];
  } else if (valor === "con-permiso") {
    // .filter() — patrón del tutorial
    datosActuales = datosAlumnos.filter(a => a.recreo === true);
  } else if (valor === "sin-permiso") {
    datosActuales = datosAlumnos.filter(a => a.recreo === false);
  }
  calcularKPIs(datosActuales, 'alumnos');
  renderTablaAlumnos(datosActuales);
});

// --- Filtro Profesores: por grupo ---
document.getElementById("filtro-profesores").addEventListener("change", function() {
  const valor = this.value;
  if (valor === "todos") {
    datosActuales = [...datosProfesores];
  } else {
    datosActuales = datosProfesores.filter(p => p.grupo === valor);
  }
  calcularKPIs(datosActuales, 'profesores');
  renderTablaProfesores(datosActuales);
});

// --- Filtro NFC: por rol ---
document.getElementById("filtro-nfc").addEventListener("change", function() {
  aplicarFiltroNFC();
});

function aplicarFiltroNFC() {
  const valor = document.getElementById("filtro-nfc").value;
  if (valor === "todos") {
    datosActuales = [...datosUsuarios];
  } else if (valor === "estudiante") {
    datosActuales = datosUsuarios.filter(u => u.rol === 'Estudiante');
  } else if (valor === "profesor") {
    datosActuales = datosUsuarios.filter(u => u.rol === 'Profesor');
  }
  calcularKPIs(datosActuales, 'nfc');
  renderTablaNFC(datosActuales);
}

// --- Filtro Faltas: por tipo y justificación ---
document.getElementById("filtro-faltas-tipo").addEventListener("change", aplicarFiltroFaltas);
document.getElementById("filtro-faltas-justificado").addEventListener("change", aplicarFiltroFaltas);

function aplicarFiltroFaltas() {
  const tipo = document.getElementById("filtro-faltas-tipo").value;
  const justificado = document.getElementById("filtro-faltas-justificado").value;

  datosActuales = [...datosFaltas];

  if (tipo !== "todos") {
    datosActuales = datosActuales.filter(r => r.tipo === tipo);
  }
  if (justificado === "justificado") {
    datosActuales = datosActuales.filter(r => r.justificado === true);
  } else if (justificado === "no-justificado") {
    datosActuales = datosActuales.filter(r => r.justificado === false);
  }

  calcularKPIs(datosActuales, 'faltas');
  renderTablaFaltas(datosActuales);
}

// ═══════════════════════════════════════════════════════════════
// Rellenar filtros con opciones dinámicas
// ═══════════════════════════════════════════════════════════════

function rellenarFiltroDashboard(datos) {
  const select = document.getElementById("filtro-dashboard");
  // Obtener valores únicos con .map() + Set (patrón del tutorial)
  const dias = [...new Set(datos.map(d => d.dia))];
  select.innerHTML = '<option value="todos">Todos los días</option>' +
    dias.map(d => `<option value="${d}">${d}</option>`).join("");
}

function rellenarFiltroProfesores(datos) {
  const select = document.getElementById("filtro-profesores");
  const grupos = [...new Set(datos.map(p => p.grupo))];
  select.innerHTML = '<option value="todos">Todos</option>' +
    grupos.map(g => `<option value="${g}">${g}</option>`).join("");
}

// ═══════════════════════════════════════════════════════════════
// GRÁFICOS — Chart.js (tutorial)
// ═══════════════════════════════════════════════════════════════

// Colores para las barras (una por cada barra diferente)
const coloresBarras = [
  'rgba(59, 130, 246, 0.7)',
  'rgba(239, 68, 68, 0.7)',
  'rgba(34, 197, 94, 0.7)',
  'rgba(234, 179, 8, 0.7)',
  'rgba(168, 85, 247, 0.7)',
  'rgba(249, 115, 22, 0.7)',
  'rgba(20, 184, 166, 0.7)'
];
const coloresBarrasBorde = [
  'rgb(59, 130, 246)',
  'rgb(239, 68, 68)',
  'rgb(34, 197, 94)',
  'rgb(234, 179, 8)',
  'rgb(168, 85, 247)',
  'rgb(249, 115, 22)',
  'rgb(20, 184, 166)'
];

/**
 * inicializarGrafico — Crea el gráfico estático inicial
 * (Tutorial: Llama a esta función al cargar la página)
 */
function inicializarGrafico() {
  const ctx = document.getElementById("miGrafico");
  if (!ctx) return;

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Lun", "Mar", "Mié", "Jue", "Vie"],
      datasets: [{
        label: "Número de salidas",
        data: [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

/**
 * renderizarGrafico — Actualiza el gráfico con datos reales usando .map()
 * (Tutorial: Chart.js necesita arrays separados de labels y valores.
 *  Usamos .map() para extraerlos de nuestro array de objetos.)
 *
 * Ejemplo del tutorial:
 *   // Tenemos: [ {nombre:A, valor:10}, {nombre:B, valor:20} ]
 *   // Chart.js necesita:
 *   //   Labels: ['A', 'B']
 *   //   Data: [10, 20]
 */
function renderizarGrafico(datos) {
  const ctx = document.getElementById("miGrafico");

  if (chartInstance) {
    chartInstance.destroy();
  }

  // Usamos .map() para separar labels y valores (patrón del tutorial)
  const labels = datos.map(d => d.dia);
  const valores = datos.map(d => d.valor);

  // Barras de colores diferentes por posición
  const bgColors = datos.map((_, i) => coloresBarras[i % coloresBarras.length]);
  const borderColors = datos.map((_, i) => coloresBarrasBorde[i % coloresBarrasBorde.length]);

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Número de salidas",
        data: valores,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// PDF — jsPDF + jsPDF-AutoTable (tutorial)
// ═══════════════════════════════════════════════════════════════

document.getElementById("btn-pdf-dashboard").addEventListener("click", () => descargarPDF('dashboard'));
document.getElementById("btn-pdf-alumnos").addEventListener("click", () => descargarPDF('alumnos'));
document.getElementById("btn-pdf-profesores").addEventListener("click", () => descargarPDF('profesores'));
document.getElementById("btn-pdf-nfc").addEventListener("click", () => descargarPDF('nfc'));
document.getElementById("btn-pdf-faltas").addEventListener("click", () => descargarPDF('faltas'));

/**
 * descargarPDF — Genera un informe PDF con jsPDF
 * (Tutorial: Genera PDF con título, tabla de datos con autoTable,
 *  gráfico capturado del canvas con toDataURL, y KPIs)
 */
function descargarPDF(tipo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let titulo, columnas, filas;
  let startY = 50;

  if (tipo === 'dashboard') {
    titulo = "Informe de Control de Asistencia";
    doc.setFontSize(20);
    doc.text(titulo, 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text("Fecha: " + new Date().toLocaleDateString(), 10, 30);

    // KPIs en el PDF
    const kpiSalidas = document.getElementById("kpi-salidas").innerText;
    const kpiIncidencias = document.getElementById("kpi-incidencias").innerText;
    const kpiActivos = document.getElementById("kpi-activos").innerText;
    const kpiTotalDias = document.getElementById("kpi-total-dias").innerText;
    const kpiTotalSalidas = document.getElementById("kpi-total-salidas").innerText;
    const kpiMediaSalidas = document.getElementById("kpi-media-salidas").innerText;

    doc.setFontSize(14);
    doc.text("Resumen de KPIs", 10, 42);
    doc.setFontSize(11);
    doc.text(`Salidas Anticipadas: ${kpiSalidas}  |  Errores: ${kpiIncidencias}  |  Asistencias: ${kpiActivos}`, 10, 50);
    doc.text(`Total días: ${kpiTotalDias}  |  Suma salidas: ${kpiTotalSalidas}  |  Media: ${kpiMediaSalidas}`, 10, 57);

    // Gráfico: capturar canvas con toDataURL (patrón del tutorial)
    const canvas = document.getElementById("miGrafico");
    if (canvas) {
      const imagenGrafico = canvas.toDataURL('image/jpeg', 1.0);
      doc.addImage(imagenGrafico, 'JPEG', 15, 65, 180, 80);
    }

    // Tabla de datos del gráfico con autoTable
    columnas = ["Día", "Salidas"];
    filas = datosActuales.map(d => [d.dia, d.valor]);
    startY = 155;

  } else if (tipo === 'alumnos') {
    titulo = "Informe de Alumnos";
    doc.setFontSize(20);
    doc.text(titulo, 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Fecha: " + new Date().toLocaleDateString(), 10, 30);

    // KPIs
    const totalAlumnos = document.getElementById("kpi-total-alumnos").innerText;
    const conPermiso = document.getElementById("kpi-con-permiso").innerText;
    const totalFaltas = document.getElementById("kpi-total-faltas").innerText;
    const mediaFaltas = document.getElementById("kpi-media-faltas").innerText;
    doc.setFontSize(11);
    doc.text(`Total: ${totalAlumnos}  |  Con permiso: ${conPermiso}  |  Faltas: ${totalFaltas}  |  Media: ${mediaFaltas}`, 10, 42);

    columnas = ["Nombre", "Permiso Recreo", "Faltas Totales", "Faltas Semanales"];
    filas = datosActuales.map(a => [a.nombre, a.recreo ? "Sí" : "No", a.faltasTotal, a.faltasSemanal]);
    startY = 50;

  } else if (tipo === 'profesores') {
    titulo = "Informe de Profesores";
    doc.setFontSize(20);
    doc.text(titulo, 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Fecha: " + new Date().toLocaleDateString(), 10, 30);

    const totalProfs = document.getElementById("kpi-total-profesores").innerText;
    const conNfc = document.getElementById("kpi-profesores-nfc").innerText;
    const grupos = document.getElementById("kpi-grupos-unicos").innerText;
    doc.setFontSize(11);
    doc.text(`Total: ${totalProfs}  |  Con NFC: ${conNfc}  |  Grupos: ${grupos}`, 10, 42);

    columnas = ["Nombre", "Grupo", "NFC"];
    filas = datosActuales.map(p => [p.nombre, p.grupo, p.nfc || "-"]);
    startY = 50;

  } else if (tipo === 'nfc') {
    titulo = "Informe de Vinculación NFC";
    doc.setFontSize(20);
    doc.text(titulo, 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Fecha: " + new Date().toLocaleDateString(), 10, 30);

    const totalUsu = document.getElementById("kpi-total-usuarios").innerText;
    const vinculados = document.getElementById("kpi-nfc-vinculados").innerText;
    const noVinc = document.getElementById("kpi-nfc-no-vinculados").innerText;
    const porc = document.getElementById("kpi-nfc-porcentaje").innerText;
    doc.setFontSize(11);
    doc.text(`Total: ${totalUsu}  |  Con NFC: ${vinculados}  |  Sin NFC: ${noVinc}  |  %: ${porc}`, 10, 42);

    columnas = ["Nombre", "Rol", "NFC"];
    filas = datosActuales.map(u => [u.nombre, u.rol, u.nfc || "-"]);
    startY = 50;

  } else if (tipo === 'faltas') {
    titulo = "Informe de Faltas";
    doc.setFontSize(20);
    doc.text(titulo, 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Fecha: " + new Date().toLocaleDateString(), 10, 30);

    const totalF = document.getElementById("kpi-faltas-total").innerText;
    const justif = document.getElementById("kpi-faltas-justificados").innerText;
    const noJustif = document.getElementById("kpi-faltas-no-justificados").innerText;
    const porcF = document.getElementById("kpi-faltas-porcentaje").innerText;
    doc.setFontSize(11);
    doc.text(`Total: ${totalF}  |  Justificados: ${justif}  |  No justificados: ${noJustif}  |  %: ${porcF}`, 10, 42);

    const tipoLabel = { 'entrada': 'Entrada', 'salida': 'Salida', 'salida_anticipada': 'Salida Anticipada' };
    columnas = ["Alumno", "Fecha", "Tipo", "Justificado", "Motivo"];
    filas = datosActuales.map(r => [r.alumno, r.fecha_hora, tipoLabel[r.tipo] || r.tipo, r.justificado ? "Sí" : "No", r.motivo || "-"]);
    startY = 50;
  }

  // Generar tabla con autoTable (patrón del tutorial)
  doc.autoTable({
    head: [columnas],
    body: filas,
    startY: startY,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [59, 130, 246] }
  });

  doc.save(`informe_${tipo}.pdf`);
}

// ═══════════════════════════════════════════════════════════════
// Permisos y NFC
// ═══════════════════════════════════════════════════════════════

let fichaAlumnoActual = null;

window.verFichaAlumno = async (a) => {
  fichaAlumnoActual = a;
  const ficha = document.getElementById("ficha-alumno");
  document.getElementById("ficha-nombre").innerText = a.nombre;
  document.getElementById("ficha-grupo").innerText = a.grupo;
  const nfcSpan = document.getElementById("ficha-nfc");
  if (a.nfc) {
    nfcSpan.innerText = a.nfc;
    nfcSpan.className = '';
  } else {
    nfcSpan.innerText = "NINGUNO";
    nfcSpan.className = 'text-danger fw-bold';
  }
  document.getElementById("ficha-recreo").innerText = a.recreo ? "SÍ" : "NO";
  const registrosBody = document.getElementById("ficha-registros-body");
  registrosBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Cargando...</td></tr>';
  ficha.classList.remove("d-none");
  ficha.scrollIntoView({ behavior: "smooth" });
  await cargarRegistrosAlumno(a.id);
};

async function cargarRegistrosAlumno(alumnoId) {
  const registrosBody = document.getElementById("ficha-registros-body");
  try {
    const data = await odoo.callApi('/nfc/api/registros_alumno', { alumno_id: alumnoId });
    const registros = data.registros;
    if (!registros.length) {
      registrosBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin registros</td></tr>';
      return;
    }
    const tipoLabel = { 'entrada': 'Entrada', 'salida': 'Salida', 'salida_anticipada': 'Salida Anticipada' };
    registrosBody.innerHTML = registros.map(r => `
      <tr>
        <td>${r.fecha_hora}</td>
        <td>${tipoLabel[r.tipo] || r.tipo}</td>
        <td>
          <div class="form-check form-switch d-inline-block">
            <input class="form-check-input" type="checkbox" ${r.justificado ? 'checked' : ''}
              onchange="toggleJustificado(${r.id}, this.checked)">
          </div>
          ${r.justificado ? '<span class="badge bg-success">Justificado</span>' : '<span class="badge bg-danger">No justificado</span>'}
        </td>
        <td>${r.motivo || '-'}</td>
      </tr>
    `).join("");
  } catch (error) {
    registrosBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error cargando registros</td></tr>';
  }
}

async function toggleJustificado(registroId, justificado) {
  try {
    await odoo.callApi('/nfc/api/justificar_falta', {
      registro_id: registroId,
      justificado: justificado
    });
    if (fichaAlumnoActual) {
      await cargarRegistrosAlumno(fichaAlumnoActual.id);
    }
  } catch (error) {
    alert("Error justificando falta: " + error.message);
    if (fichaAlumnoActual) {
      await cargarRegistrosAlumno(fichaAlumnoActual.id);
    }
  }
}

async function toggleJustificadoFaltas(registroId, justificado) {
  try {
    await odoo.callApi('/nfc/api/justificar_falta', {
      registro_id: registroId,
      justificado: justificado
    });
    await cargarTabla('faltas');
  } catch (error) {
    alert("Error justificando falta: " + error.message);
    await cargarTabla('faltas');
  }
}

async function togglePermiso(id) {
  try {
    await odoo.callApi('/nfc/api/toggle_permiso', { alumno_id: id });
    cargarTabla('alumnos');
  } catch (error) {
    alert("Error actualizando permiso: " + error.message);
  }
}

document.getElementById("btn-vincular").onclick = async () => {
  const selectVal = document.getElementById("select-usuario").value;
  const uid = document.getElementById("input-nfc").value.trim();

  if (!uid) return alert("Introduce un UID de tarjeta");

  const [tipo, id] = selectVal.split(":");

  try {
    await odoo.callApi('/nfc/api/vincular_nfc', {
      tipo: tipo,
      registro_id: parseInt(id),
      uid_nfc: uid
    });
    alert("Tarjeta vinculada con éxito");
    document.getElementById("input-nfc").value = "";
    cargarTabla('nfc');
  } catch (error) {
    alert("Error vinculando tarjeta: " + error.message);
  }
};

document.getElementById("input-nfc").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("btn-vincular").click();
  }
});
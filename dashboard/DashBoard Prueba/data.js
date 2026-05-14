/**
 * OdooService - Clase para comunicarse con el controlador de Odoo
 */
class OdooService {
  constructor(baseUrl, db) {
    this.baseUrl = baseUrl;
    this.db = db;
    this.uid = null;
    this.login_user = null;
    this.login_pass = null;
  }

  async callApi(endpoint, params = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    params = params || {};
    params.db = this.db;

    const body = {
      jsonrpc: "2.0",
      params: params,
      id: Math.floor(Math.random() * 1000000)
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.data.message || data.error.message);
      }

      if (data.result.status === "error") {
        throw new Error(data.result.message);
      }

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

// Variables globales del Dashboard
let odoo = null;
let chartInstance = null;
let listaUsuarios = []; // Alumnos + Profesores combinados para el select de vinculación

// Elementos del DOM
const loginOverlay = document.getElementById("login-overlay");
const loginError = document.getElementById("login-error");
const appContainer = document.getElementById("app-container");
const loadingSpinner = document.getElementById("loading-spinner");
const sessionInfo = document.getElementById("session-info");

// Inicialización
window.onload = () => {
  const savedConfig = localStorage.getItem('odoo_config');
  if (savedConfig) {
    const config = JSON.parse(savedConfig);
    document.getElementById("login-url").value = config.url;
    document.getElementById("login-db").value = config.db;
    document.getElementById("login-user").value = config.user;
  }
};

// --- LOGIN ---
document.getElementById("btn-login").onclick = async () => {
  const url = document.getElementById("login-url").value.trim();
  const db = document.getElementById("login-db").value.trim();
  const user = document.getElementById("login-user").value.trim();
  const pass = document.getElementById("login-pass").value;

  if (!url || !db || !user || !pass) {
    showLoginError("Por favor, rellena todos los campos.");
    return;
  }

  loginError.style.display = "none";
  document.getElementById("btn-login").innerText = "CONECTANDO...";
  document.getElementById("btn-login").disabled = true;

  try {
    odoo = new OdooService(url, db);
    await odoo.login(user, pass);

    // Guardar config (menos pass)
    localStorage.setItem('odoo_config', JSON.stringify({ url, db, user }));

    // Mostrar App
    loginOverlay.classList.add("d-none");
    appContainer.classList.remove("d-none");
    sessionInfo.innerText = `Conectado como ${user}`;

    // Cargar datos iniciales
    await cargarDashboard();
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

// --- NAVEGACIÓN ---
const vistas = {
  dashboard: document.getElementById("vista-dashboard"),
  alumnos: document.getElementById("vista-alumnos"),
  profesores: document.getElementById("vista-profesores"),
  nfc: document.getElementById("vista-nfc")
};

const botonesNav = {
  dashboard: document.getElementById("btn-dashboard"),
  alumnos: document.getElementById("btn-alumnos"),
  profesores: document.getElementById("btn-profesores"),
  nfc: document.getElementById("btn-nfc")
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
}

botonesNav.dashboard.onclick = (e) => { e.preventDefault(); cargarDashboard(); };
botonesNav.alumnos.onclick = (e) => { e.preventDefault(); cargarAlumnos(); };
botonesNav.profesores.onclick = (e) => { e.preventDefault(); cargarProfesores(); };
botonesNav.nfc.onclick = (e) => { e.preventDefault(); cargarNFC(); };

// --- CARGA DE DATOS ---

async function cargarDashboard() {
  mostrarVista('dashboard');
  loadingSpinner.classList.remove("d-none");
  vistas.dashboard.classList.add("opacity-50");

  try {
    const data = await odoo.callApi('/nfc/api/dashboard');

    document.getElementById("kpi-salidas").innerText = data.kpis.salidas;
    document.getElementById("kpi-incidencias").innerText = data.kpis.incidencias;
    document.getElementById("kpi-activos").innerText = data.kpis.activos;

    renderGrafica(data.grafica);
  } catch (error) {
    alert("Error cargando dashboard: " + error.message);
  } finally {
    loadingSpinner.classList.add("d-none");
    vistas.dashboard.classList.remove("opacity-50");
  }
}

function renderGrafica(datos) {
  const ctx = document.getElementById("grafico");
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: datos.map(g => g.dia),
      datasets: [{
        label: "Número de salidas",
        data: datos.map(g => g.valor),
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

async function cargarAlumnos() {
  mostrarVista('alumnos');
  loadingSpinner.classList.remove("d-none");
  const tabla = document.getElementById("tabla-alumnos");
  tabla.innerHTML = "";

  try {
    const data = await odoo.callApi('/nfc/api/alumnos');
    const alumnos = data.alumnos;

    tabla.innerHTML = alumnos.map(a => `
      <tr>
        <td>
          <button class="btn btn-link p-0 text-decoration-none fw-bold" onclick="verFichaAlumno(${JSON.stringify(a).replace(/"/g, '&quot;')})">
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
  } catch (error) {
    alert("Error cargando alumnos: " + error.message);
  } finally {
    loadingSpinner.classList.add("d-none");
  }
}

window.verFichaAlumno = (a) => {
  const ficha = document.getElementById("ficha-alumno");
  document.getElementById("ficha-nombre").innerText = a.nombre;
  document.getElementById("ficha-grupo").innerText = a.grupo;
  document.getElementById("ficha-nfc").innerText = a.nfc || "No vinculada";
  document.getElementById("ficha-recreo").innerText = a.recreo ? "SÍ" : "NO";

  ficha.classList.remove("d-none");
  ficha.scrollIntoView({ behavior: "smooth" });
};

async function togglePermiso(id) {
  try {
    await odoo.callApi('/nfc/api/toggle_permiso', { alumno_id: id });
    // Recargar para ver cambios
    cargarAlumnos();
  } catch (error) {
    alert("Error actualizando permiso: " + error.message);
  }
}

async function cargarProfesores() {
  mostrarVista('profesores');
  loadingSpinner.classList.remove("d-none");
  const tabla = document.getElementById("tabla-profesores");
  tabla.innerHTML = "";

  try {
    const data = await odoo.callApi('/nfc/api/profesores');
    tabla.innerHTML = data.profesores.map(p => `
      <tr>
        <td>${p.nombre}</td>
        <td>${p.grupo}</td>
        <td>${p.nfc || "-"}</td>
      </tr>
    `).join("");
  } catch (error) {
    alert("Error cargando profesores: " + error.message);
  } finally {
    loadingSpinner.classList.add("d-none");
  }
}

async function cargarNFC() {
  mostrarVista('nfc');
  loadingSpinner.classList.remove("d-none");

  try {
    const dataAlumnos = await odoo.callApi('/nfc/api/alumnos');
    const dataProfesores = await odoo.callApi('/nfc/api/profesores');

    const alumnos = dataAlumnos.alumnos.map(a => ({ ...a, rol: 'Estudiante' }));
    const profesores = dataProfesores.profesores.map(p => ({ ...p, rol: 'Profesor' }));

    listaUsuarios = [...alumnos, ...profesores];
    renderTablaNFC();
  } catch (error) {
    alert("Error cargando datos NFC: " + error.message);
  } finally {
    loadingSpinner.classList.add("d-none");
  }
}

function renderTablaNFC() {
  const filtro = document.getElementById("filtro-nfc").value;
  const tabla = document.getElementById("tabla-nfc");
  const select = document.getElementById("select-usuario");

  const filtrados = listaUsuarios.filter(u =>
    filtro === "todos" ||
    (filtro === "estudiante" && u.rol === "Estudiante") ||
    (filtro === "profesor" && u.rol === "Profesor")
  );

  tabla.innerHTML = filtrados.map(u => `
    <tr>
      <td>${u.nombre}</td>
      <td>${u.rol}</td>
      <td>${u.nfc || "-"}</td>
    </tr>
  `).join("");

  select.innerHTML = filtrados.map(u => `
    <option value="${u.rol === 'Estudiante' ? 'alumno' : 'profesor'}:${u.id}">
      ${u.nombre} (${u.rol})
    </option>
  `).join("");
}

document.getElementById("filtro-nfc").onchange = renderTablaNFC;

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
    cargarNFC();
  } catch (error) {
    alert("Error vinculando tarjeta: " + error.message);
  }
};
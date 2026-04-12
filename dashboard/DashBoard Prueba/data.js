const kpis = { salidas: 142, incidencias: 12, activos: 1238 };

const grafica = [
  { dia: "L", valor: 25 },
  { dia: "M", valor: 18 },
  { dia: "X", valor: 30 },
  { dia: "J", valor: 20 },
  { dia: "V", valor: 10 }
];

const usuarios = [
  { nombre: "Ángel Cristo Castro Martín", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:01", recreo: true, faltasTotal: 12, faltasSemanal: 2 },
  { nombre: "Manuel Delgado Dorta", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:02", recreo: false, faltasTotal: 5, faltasSemanal: 0 },
  { nombre: "Diego Domínguez Hernández", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:03", recreo: true, faltasTotal: 8, faltasSemanal: 1 },
  { nombre: "Jerónimo Errecart Cardozo", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:04", recreo: false, faltasTotal: 15, faltasSemanal: 3 },
  { nombre: "Víctor Fernández Díaz", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:05", recreo: true, faltasTotal: 3, faltasSemanal: 0 },
  { nombre: "Joel González Socas", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:06", recreo: true, faltasTotal: 7, faltasSemanal: 2 },
  { nombre: "Ayoze González Socas", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:07", recreo: false, faltasTotal: 10, faltasSemanal: 1 },
  { nombre: "Cristopher Méndez Cervantes", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:08", recreo: true, faltasTotal: 4, faltasSemanal: 0 },
  { nombre: "Nel Méndez García", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:09", recreo: false, faltasTotal: 9, faltasSemanal: 2 },
  { nombre: "Alexander Pérez Domínguez", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:10", recreo: true, faltasTotal: 6, faltasSemanal: 1 },
  { nombre: "Marcos Javier Pérez Gómez", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:11", recreo: true, faltasTotal: 2, faltasSemanal: 0 },
  { nombre: "Eliel Besay Pérez Martín", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:12", recreo: false, faltasTotal: 11, faltasSemanal: 4 },
  { nombre: "Alberto Rodríguez Afonso", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:13", recreo: true, faltasTotal: 1, faltasSemanal: 0 },
  { nombre: "Kilian Omar Rodríguez Díaz", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:14", recreo: true, faltasTotal: 5, faltasSemanal: 1 },
  { nombre: "Óscar Rodríguez Dorta", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:15", recreo: false, faltasTotal: 0, faltasSemanal: 0 },
  { nombre: "Pablo Rodríguez Martín", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:16", recreo: true, faltasTotal: 14, faltasSemanal: 2 },
  { nombre: "Pablo Tejeda Zafra", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:17", recreo: false, faltasTotal: 8, faltasSemanal: 0 },
  { nombre: "Gael Vera Ramón", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:18", recreo: true, faltasTotal: 3, faltasSemanal: 1 },

  { nombre: "Arturo Juan Jiménez González", rol: "Profesor", grupo: "2º DAM", nfc: "PF:01", recreo: false },
  { nombre: "Inés Mesa Díaz", rol: "Profesor", grupo: "2º DAM", nfc: "PF:02", recreo: false },
  { nombre: "Rayco Guerra Dámaso", rol: "Profesor", grupo: "2º DAM", nfc: "PF:03", recreo: false },
  { nombre: "Raúl Perera Rojas", rol: "Profesor", grupo: "2º DAM", nfc: "PF:04", recreo: false },
  { nombre: "Melissa Méndez Luis", rol: "Profesor", grupo: "2º DAM", nfc: "PF:05", recreo: false },
  { nombre: "María Candelaria González Delgado", rol: "Profesor", grupo: "2º DAM", nfc: "PF:06", recreo: false }
];


document.getElementById("kpi-salidas").innerText = kpis.salidas;
document.getElementById("kpi-incidencias").innerText = kpis.incidencias;
document.getElementById("kpi-activos").innerText = kpis.activos;

new Chart(document.getElementById("grafico"), {
  type: "bar",
  data: {
    labels: grafica.map(g => g.dia),
    datasets: [{ label: "Número de salidas", data: grafica.map(g => g.valor) }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false
  }
});

const btnDashboard = document.getElementById("btn-dashboard");
const btnAlumnos = document.getElementById("btn-alumnos");
const btnProfesores = document.getElementById("btn-profesores");
const btnNFC = document.getElementById("btn-nfc");

const vistaDashboard = document.getElementById("vista-dashboard");
const vistaAlumnos = document.getElementById("vista-alumnos");
const vistaProfesores = document.getElementById("vista-profesores");
const vistaNFC = document.getElementById("vista-nfc");

const tablaAlumnos = document.getElementById("tabla-alumnos");
const tablaProfesores = document.getElementById("tabla-profesores");
const tablaNFC = document.getElementById("tabla-nfc");
const filtroNFC = document.getElementById("filtro-nfc");

const fichaAlumno = document.getElementById("ficha-alumno");
const fichaNombre = document.getElementById("ficha-nombre");
const fichaGrupo = document.getElementById("ficha-grupo");
const fichaNFC = document.getElementById("ficha-nfc");
const fichaRecreo = document.getElementById("ficha-recreo");

const selectUsuario = document.getElementById("select-usuario");
const inputNFC = document.getElementById("input-nfc");
const btnVincular = document.getElementById("btn-vincular");

let alumnoActual = null;

function ocultarTodo() {
  vistaDashboard.classList.add("d-none");
  vistaAlumnos.classList.add("d-none");
  vistaProfesores.classList.add("d-none");
  vistaNFC.classList.add("d-none");
}

btnDashboard.onclick = e => {
  e.preventDefault();
  ocultarTodo();
  vistaDashboard.classList.remove("d-none");
};

btnAlumnos.onclick = e => {
  e.preventDefault();
  ocultarTodo();
  vistaAlumnos.classList.remove("d-none");
  activarMenu(btnAlumnos);

  const alumnos = usuarios.filter(u => u.rol === "Estudiante");
  fichaAlumno.classList.add("d-none");

  tablaAlumnos.innerHTML = alumnos.map((a, i) => `
    <tr>
      <td>
        <button class="btn btn-link p-0" onclick="verAlumno(${i})">
          ${a.nombre}
        </button>
      </td>
      <td>${a.recreo ? "Sí" : "No"}</td>
      <td>${a.faltasTotal}</td>
      <td>${a.faltasSemanal}</td>
      <td>
        <label class="switch">
          <input type="checkbox" ${a.recreo ? "checked" : ""} onchange="toggleRecreo(${i})">
          <span class="slider"></span>
        </label>
      </td>
    </tr>
  `).join("");
};


window.verAlumno = i => {
  const a = usuarios.filter(u => u.rol === "Estudiante")[i];
  alumnoActual = a;

  fichaNombre.innerText = a.nombre;
  fichaGrupo.innerText = a.grupo;
  fichaNFC.innerText = a.nfc ?? "-";
  fichaRecreo.innerText = a.recreo ? "Sí" : "No";

  fichaAlumno.classList.remove("d-none");
  fichaAlumno.scrollIntoView({ behavior: "smooth" });
};

window.toggleRecreo = i => {
  const a = usuarios.filter(u => u.rol === "Estudiante")[i];
  a.recreo = !a.recreo;
  btnAlumnos.click();
};


btnProfesores.onclick = e => {
  e.preventDefault();
  ocultarTodo();
  vistaProfesores.classList.remove("d-none");
  activarMenu(btnProfesores);

  tablaProfesores.innerHTML = usuarios
    .filter(u => u.rol === "Profesor")
    .map(p => `<tr><td>${p.nombre}</td><td>${p.grupo}</td><td>${p.nfc ?? "-"}</td></tr>`)
    .join("");
};


btnNFC.onclick = e => {
  e.preventDefault();
  ocultarTodo();
  vistaNFC.classList.remove("d-none");
  activarMenu(btnNFC);

  renderTablaNFC();
};


function renderTablaNFC() {
  const rolFiltro = filtroNFC.value;
  
  tablaNFC.innerHTML = usuarios
    .filter(u => rolFiltro === "todos" || u.rol.toLowerCase() === rolFiltro)
    .map(u => `<tr><td>${u.nombre}</td><td>${u.rol}</td><td>${u.nfc ?? "-"}</td></tr>`)
    .join("");

  selectUsuario.innerHTML = usuarios
    .map((u, i) => ({ u, i }))
    .filter(({ u }) => rolFiltro === "todos" || u.rol.toLowerCase() === rolFiltro)
    .map(({ u, i }) => `<option value="${i}">${u.nombre} (${u.rol})</option>`)
    .join("");
}

filtroNFC.addEventListener("change", renderTablaNFC);

function activarMenu(botonActivo) {
  const botones = [btnDashboard, btnAlumnos, btnProfesores, btnNFC];

  botones.forEach(btn => {
    btn.classList.remove("active", "bg-primary-subtle", "text-primary", "fw-semibold");
    btn.classList.add("text-dark");
  });

  botonActivo.classList.add("active", "bg-primary-subtle", "text-primary", "fw-semibold");
  botonActivo.classList.remove("text-dark");
}


btnVincular.onclick = () => {
  const i = selectUsuario.value;
  const uid = inputNFC.value.trim();

  if (!uid) return alert("Introduce UID");

  usuarios[i].nfc = uid;
  inputNFC.value = "";
  renderTablaNFC();
};

btnDashboard.onclick = e => {
  e.preventDefault();
  ocultarTodo();
  vistaDashboard.classList.remove("d-none");
  activarMenu(btnDashboard);
};


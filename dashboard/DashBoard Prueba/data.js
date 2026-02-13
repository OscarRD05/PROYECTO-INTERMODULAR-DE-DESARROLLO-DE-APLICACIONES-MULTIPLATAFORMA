const kpis = { salidas: 142, incidencias: 3, activos: 98 };

const grafica = [
    { dia: "L", valor: 25 },
    { dia: "M", valor: 18 },
    { dia: "X", valor: 30 },
    { dia: "J", valor: 20 },
    { dia: "V", valor: 10 }
];

const usuarios = [
    { nombre: "Ángel Cristo Castro Martín", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:01", recreo: true },
    { nombre: "Manuel Delgado Dorta", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:02", recreo: false },
    { nombre: "Diego Domínguez Hernández", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:03", recreo: true },
    { nombre: "Jerónimo Errecart Cardozo", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:04", recreo: false },
    { nombre: "Víctor Fernández Díaz", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:05", recreo: true },
    { nombre: "Joel González Socas", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:06", recreo: true },
    { nombre: "Ayoze González Socas", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:07", recreo: false },
    { nombre: "Cristopher Méndez Cervantes", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:08", recreo: true },
    { nombre: "Nel Méndez García", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:09", recreo: false },
    { nombre: "Alexander Pérez Domínguez", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:10", recreo: true },
    { nombre: "Marcos Javier Pérez Gómez", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:11", recreo: true },
    { nombre: "Eliel Besay Pérez Martín", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:12", recreo: false },
    { nombre: "Alberto Rodríguez Afonso", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:13", recreo: true },
    { nombre: "Kilian Omar Rodríguez Díaz", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:14", recreo: true },
    { nombre: "Óscar Rodríguez Dorta", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:15", recreo: false },
    { nombre: "Pablo Rodríguez Martín", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:16", recreo: true },
    { nombre: "Pablo Tejeda Zafra", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:17", recreo: false },
    { nombre: "Gael Vera Ramón", rol: "Estudiante", grupo: "2º DAM", nfc: "04:A2:18", recreo: true },

    { nombre: "Arturo Juan Jiménez González", rol: "Profesor", grupo: "2º DAM", nfc: "PF:01", recreo: false },
    { nombre: "Inés Mesa Díaz", rol: "Profesor", grupo: "2º DAM", nfc: "PF:02", recreo: false },
    { nombre: "Rayco Guerra Dámaso", rol: "Profesor", grupo: "2º DAM", nfc: "PF:03", recreo: false },
    { nombre: "Raúl Perera Rojas", rol: "Profesor", grupo: "2º DAM", nfc: "PF:04", recreo: false },
    { nombre: "Melissa Méndez Luis", rol: "Profesor", grupo: "2º DAM", nfc: "PF:05", recreo: false },
    { nombre: "María Candelaria González Delgado", rol: "Profesor", grupo: "2º DAM", nfc: "PF:06", recreo: false }
];


/* KPIs */
document.getElementById("kpi-salidas").innerText = kpis.salidas;
document.getElementById("kpi-incidencias").innerText = kpis.incidencias;
document.getElementById("kpi-activos").innerText = kpis.activos + "%";

/* Gráfico */
new Chart(document.getElementById("grafico"), {
    type: "bar",
    data: {
        labels: grafica.map(g => g.dia),
        datasets: [{ data: grafica.map(g => g.valor) }]
    }
});

/* Vistas */
const vistaDashboard = document.getElementById("vista-dashboard");
const vistaAlumnos = document.getElementById("vista-alumnos");
const vistaProfesores = document.getElementById("vista-profesores");
const vistaNFC = document.getElementById("vista-nfc");

function ocultarTodo() {
    vistaDashboard.classList.add("d-none");
    vistaAlumnos.classList.add("d-none");
    vistaProfesores.classList.add("d-none");
    vistaNFC.classList.add("d-none");
}

/* Navegación */
document.getElementById("btn-dashboard").onclick = e => {
    e.preventDefault();
    ocultarTodo();
    vistaDashboard.classList.remove("d-none");
};

/* ===== ALUMNOS ===== */

const tablaAlumnos = document.getElementById("tabla-alumnos");
const fichaAlumno = document.getElementById("ficha-alumno");
const fichaNombre = document.getElementById("ficha-nombre");
const fichaGrupo = document.getElementById("ficha-grupo");
const fichaNFC = document.getElementById("ficha-nfc");
const fichaRecreo = document.getElementById("ficha-recreo");

let alumnoActual = null;

document.getElementById("btn-alumnos").onclick = e => {
    e.preventDefault();
    ocultarTodo();
    vistaAlumnos.classList.remove("d-none");

    const alumnos = usuarios.filter(u => u.rol === "Estudiante");

    tablaAlumnos.innerHTML = "";
    fichaAlumno.classList.add("d-none");

    alumnos.forEach((a, i) => {
        tablaAlumnos.innerHTML += `
        <tr>
            <td><button class="btn btn-link p-0" onclick="verAlumno(${i})">${a.nombre}</button></td>
            <td>${a.recreo ? "Sí" : "No"}</td>
            <td>
                <button class="btn btn-sm ${a.recreo ? "btn-success" : "btn-secondary"}"
                        onclick="toggleRecreo(${i})">
                    ${a.recreo ? "ON" : "OFF"}
                </button>
            </td>
        </tr>`;
    });
};

window.verAlumno = function(index) {
    const a = usuarios.filter(u => u.rol === "Estudiante")[index];

    alumnoActual = a;

    fichaNombre.innerText = a.nombre;
    fichaGrupo.innerText = a.grupo;
    fichaNFC.innerText = a.nfc ?? "Sin vincular";
    fichaRecreo.innerText = a.recreo ? "Sí" : "No";

    fichaAlumno.classList.remove("d-none");
};

window.toggleRecreo = function(index) {
    const a = usuarios.filter(u => u.rol === "Estudiante")[index];
    a.recreo = !a.recreo;
    document.getElementById("btn-alumnos").click();
};

btnToggleFicha.onclick = () => {
    if (!alumnoActual) return;
    alumnoActual.recreo = !alumnoActual.recreo;
    document.getElementById("btn-alumnos").click();
};


const tablaProfesores = document.getElementById("tabla-profesores");

document.getElementById("btn-profesores").onclick = e => {
    e.preventDefault();
    ocultarTodo();
    vistaProfesores.classList.remove("d-none");

    tablaProfesores.innerHTML = usuarios
        .filter(u => u.rol === "Profesor")
        .map(p => `<tr><td>${p.nombre}</td><td>${p.grupo}</td><td>${p.nfc ?? "-"}</td></tr>`)
        .join("");
};


const selectUsuario = document.getElementById("select-usuario");
const inputNFC = document.getElementById("input-nfc");
const tablaNFC = document.getElementById("tabla-nfc");

document.getElementById("btn-nfc").onclick = e => {
    e.preventDefault();
    ocultarTodo();
    vistaNFC.classList.remove("d-none");

    selectUsuario.innerHTML = usuarios
        .map((u, i) => `<option value="${i}">${u.nombre} (${u.rol})</option>`)
        .join("");

    renderTablaNFC();
};

function renderTablaNFC() {
    tablaNFC.innerHTML = usuarios
        .map(u => `<tr><td>${u.nombre}</td><td>${u.rol}</td><td>${u.nfc ?? "-"}</td></tr>`)
        .join("");
}

document.getElementById("btn-vincular").onclick = () => {
    const i = selectUsuario.value;
    const uid = inputNFC.value.trim();
    if (!uid) return alert("Introduce UID");

    usuarios[i].nfc = uid;
    inputNFC.value = "";
    renderTablaNFC();
};

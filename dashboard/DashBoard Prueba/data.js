const kpis = {
    salidas: 142,
    incidencias: 3,
    activos: 98
};

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


const kpiSalidas = document.getElementById("kpi-salidas");
const kpiIncidencias = document.getElementById("kpi-incidencias");
const kpiActivos = document.getElementById("kpi-activos");

function cargarKPIs() {
    kpiSalidas.innerText = kpis.salidas;
    kpiIncidencias.innerText = kpis.incidencias;
    kpiActivos.innerText = kpis.activos + "%";
}

let chart = null;

function renderGrafico() {
    const ctx = document.getElementById("grafico");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: grafica.map(g => g.dia),
            datasets: [{
                label: "Salidas",
                data: grafica.map(g => g.valor),
                backgroundColor: "rgba(54,162,235,0.5)"
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}


const vistaDashboard = document.getElementById("vista-dashboard");
const vistaAlumnos = document.getElementById("vista-alumnos");
const vistaProfesores = document.getElementById("vista-profesores");

const btnDashboard = document.getElementById("btn-dashboard");
const btnAlumnos = document.getElementById("btn-alumnos");
const btnProfesores = document.getElementById("btn-profesores");

const tablaAlumnos = document.getElementById("tabla-alumnos");
const tablaProfesores = document.getElementById("tabla-profesores");


function ocultarTodo() {
    vistaDashboard.classList.add("d-none");
    vistaAlumnos.classList.add("d-none");
    vistaProfesores.classList.add("d-none");
    vistaNFC.classList.add("d-none");
}

btnDashboard.addEventListener("click", (e) => {
    e.preventDefault();
    ocultarTodo();
    vistaDashboard.classList.remove("d-none");
});


btnAlumnos.addEventListener("click", (e) => {
    e.preventDefault();
    ocultarTodo();
    vistaAlumnos.classList.remove("d-none");

    const soloAlumnos = usuarios.filter(u => u.rol === "Estudiante");

    tablaAlumnos.innerHTML = "";
    soloAlumnos.forEach(a => {
        tablaAlumnos.innerHTML += `
        <tr>
            <td>${a.nombre}</td>
            <td>${a.grupo}</td>
            <td>${a.nfc ?? "Sin vincular"}</td>
            <td>${a.recreo ? "Sí" : "No"}</td>
        </tr>`;
    });
});

btnProfesores.addEventListener("click", (e) => {
    e.preventDefault();
    ocultarTodo();
    vistaProfesores.classList.remove("d-none");

    const soloProfes = usuarios.filter(u => u.rol === "Profesor");

    tablaProfesores.innerHTML = "";
    soloProfes.forEach(p => {
        tablaProfesores.innerHTML += `
        <tr>
            <td>${p.nombre}</td>
            <td>${p.grupo}</td>
            <td>${p.nfc ?? "Sin vincular"}</td>
        </tr>`;
    });
});


cargarKPIs();
renderGrafico();


/* ================= NFC ================= */

const vistaNFC = document.getElementById("vista-nfc");
const btnNFC = document.getElementById("btn-nfc");

const selectUsuario = document.getElementById("select-usuario");
const inputNFC = document.getElementById("input-nfc");
const btnVincular = document.getElementById("btn-vincular");
const tablaNFC = document.getElementById("tabla-nfc");


function cargarSelectUsuarios() {
    selectUsuario.innerHTML = "";

    usuarios.forEach((u, i) => {
        selectUsuario.innerHTML += `
            <option value="${i}">
                ${u.nombre} (${u.rol})
            </option>
        `;
    });
}


function renderTablaNFC() {
    tablaNFC.innerHTML = "";

    usuarios.forEach(u => {
        tablaNFC.innerHTML += `
        <tr>
            <td>${u.nombre}</td>
            <td>${u.rol}</td>
            <td>${u.nfc ?? "Sin vincular"}</td>
        </tr>`;
    });
}


btnNFC.addEventListener("click", (e) => {
    e.preventDefault();
    ocultarTodo();
    vistaNFC.classList.remove("d-none");

    cargarSelectUsuarios();
    renderTablaNFC();
});


btnVincular.addEventListener("click", () => {
    const index = selectUsuario.value;
    const uid = inputNFC.value.trim();

    if (!uid) {
        alert("Introduce un UID de tarjeta");
        return;
    }

    usuarios[index].nfc = uid;

    inputNFC.value = "";

    renderTablaNFC();
});

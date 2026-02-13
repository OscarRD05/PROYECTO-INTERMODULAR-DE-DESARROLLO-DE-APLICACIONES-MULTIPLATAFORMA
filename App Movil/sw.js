<script>
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js');
    }

    const viewLogin = document.getElementById('view-login');
    const viewScanner = document.getElementById('view-scanner');
    const userInput = document.getElementById('user');
    const passInput = document.getElementById('pass');
    const errorMsg = document.getElementById('error-msg');
    
    const API_URL = '/api'; 

    const idProfeGuardado = localStorage.getItem('id_profe');
    if (idProfeGuardado) {
        const nombreProfe = localStorage.getItem('nombre_profe');
        mostrarPantallaEscaner(nombreProfe);
    }

    document.getElementById('btn-login').addEventListener('click', async () => {
        const usuario = userInput.value;
        const password = passInput.value;
        
        errorMsg.innerText = "Verificando...";

        if (usuario === "agonzalez" && password === "profe123") {
            localStorage.setItem('id_profe', 1);
            localStorage.setItem('nombre_profe', "Ayoze González");
            mostrarPantallaEscaner("Ayoze González");
            return; 
        }

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: usuario, pass: password })
            });

            const data = await response.json();

            if (data.exito) {
                localStorage.setItem('id_profe', data.id_profe);
                localStorage.setItem('nombre_profe', data.nombre);
                mostrarPantallaEscaner(data.nombre);
            } else {
                errorMsg.innerText = "❌ Usuario o contraseña incorrectos";
            }
        } catch (error) {
            console.error(error);
            errorMsg.innerText = "⚠️ Error de conexión (Usa 'agonzalez' para probar)";
        }
    });

    document.getElementById('btn-nfc').addEventListener("click", async () => {
        const log = document.getElementById("log");
        log.innerText = "⏳ Acerca la tarjeta al reverso del móvil...";

        try {
            const ndef = new NDEFReader();
            await ndef.scan();
            
            ndef.onreading = async event => {
                const uid = event.serialNumber;
                log.innerText = "🔄 Procesando tarjeta: " + uid;
                
                procesarFichaje(uid);
            };

        } catch (error) {
            log.innerText = "⚠️ Error NFC: " + error;
        }
    });

    async function procesarFichaje(uid) {
        const idProfe = localStorage.getItem('id_profe');
        const cardContainer = document.getElementById('resultado-container');
        const log = document.getElementById("log");

        try {
            const response = await fetch(`${API_URL}/fichar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid_nfc: uid, id_profe: idProfe })
            });

            const alumno = await response.json();

            if (alumno.encontrado) {
                cardContainer.style.display = "block";
                document.getElementById('nombre-alumno').innerText = alumno.nombre;
                document.getElementById('curso-alumno').innerText = alumno.curso;
                document.getElementById('foto-alumno').src = "/fotos/" + alumno.foto;

                const statusText = document.getElementById('status-text');

                if (alumno.autorizado) {
                    document.body.style.backgroundColor = "#d4edda"; 
                    statusText.innerText = "✅ AUTORIZADO";
                    statusText.style.color = "#155724";
                    statusText.style.backgroundColor = "#c3e6cb";
                } else {
                    document.body.style.backgroundColor = "#f8d7da"; 
                    statusText.innerText = "⛔ NO AUTORIZADO";
                    statusText.style.color = "#721c24";
                    statusText.style.backgroundColor = "#f5c6cb";
                }
                log.innerText = ""; 
            } else {
                alert("Tarjeta no reconocida");
                document.body.style.backgroundColor = "#fff3cd"; 
            }

        } catch (error) {
            console.log(error);
            log.innerText = "❌ Error: No conecta con Python. (UID leído: " + uid + ")";
        }
    }

    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.clear(); 
        location.reload();    
    });

    function mostrarPantallaEscaner(nombre) {
        viewLogin.classList.remove('activa');
        viewScanner.classList.add('activa');
        document.getElementById('welcome-msg').innerText = "Hola, " + nombre;
        document.body.style.backgroundColor = "#f4f4f9"; 
        document.getElementById('error-msg').innerText = "";
    }
</script>
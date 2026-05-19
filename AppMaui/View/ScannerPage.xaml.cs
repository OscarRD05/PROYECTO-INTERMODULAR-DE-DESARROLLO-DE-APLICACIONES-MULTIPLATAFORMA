using App.Services;

namespace App.View;

public partial class ScannerPage : ContentPage
{
    // Servicio encargado de comunicarse con Odoo.
    private readonly OdooService _odoo = new();

    // Variable que guarda el alumno actualmente seleccionado.
    private AlumnoResult? _alumnoActual;

    // Constructor de la página.
    // Inicializa los componentes y configura el NFC.
    public ScannerPage()
    {
        InitializeComponent();

        // Activa la escucha NFC.
        SubscribeNfc();

        // Actualiza el estado del NFC en pantalla.
        UpdateNfcStatus();
    }

    // Se suscribe al evento NFC en Android.
    private void SubscribeNfc()
    {
#if ANDROID
        MainActivity.NfcTagDiscovered += OnNfcTagDiscovered;
#endif
    }

    // Elimina la suscripción NFC.
    private void UnsubscribeNfc()
    {
#if ANDROID
        MainActivity.NfcTagDiscovered -= OnNfcTagDiscovered;
#endif
    }

    // Comprueba el estado del NFC y muestra mensajes en pantalla.
    private void UpdateNfcStatus()
    {
#if ANDROID

        // Comprueba si el dispositivo soporta NFC.
        if (!MainActivity.NfcSupported)
        {
            StatusLabel.Text = "NFC no soportado, usa búsqueda manual";
            return;
        }

        // Comprueba si el NFC está activado.
        if (!MainActivity.NfcEnabled)
        {
            StatusLabel.Text = "NFC desactivado, usa búsqueda manual";
            return;
        }

        // Estado normal.
        StatusLabel.Text = "Esperando tarjeta NFC...";

#else
        // Mensaje para plataformas sin NFC.
        StatusLabel.Text = "NFC no disponible en esta plataforma";
#endif
    }

    // Método que se ejecuta al detectar una tarjeta NFC.
    private void OnNfcTagDiscovered(string uid)
    {
        MainThread.BeginInvokeOnMainThread(async () =>
        {
            // Muestra el UID detectado.
            BusquedaEntry.Text = uid;

            // Actualiza el estado.
            StatusLabel.Text = $"UID: {uid} - Buscando...";

            // Busca automáticamente el alumno.
            await BuscarAlumnoPorUid(uid);
        });
    }

    // Se ejecuta al pulsar Enter en el buscador.
    private async void OnBusquedaCompleted(object? sender, EventArgs e)
    {
        // Obtiene el texto escrito.
        string texto = BusquedaEntry.Text?.Trim() ?? "";

        // Comprueba que no esté vacío.
        if (string.IsNullOrWhiteSpace(texto))
            return;

        // Realiza la búsqueda manual.
        await BuscarAlumnoManual(texto);
    }

    // Se ejecuta al pulsar el botón Buscar.
    private async void OnBusquedaClicked(object? sender, EventArgs e)
    {
        // Obtiene el texto escrito.
        string texto = BusquedaEntry.Text?.Trim() ?? "";

        // Comprueba que exista contenido.
        if (string.IsNullOrWhiteSpace(texto))
            return;

        // Realiza la búsqueda.
        await BuscarAlumnoManual(texto);
    }

    // Busca un alumno usando el UID NFC.
    private async Task BuscarAlumnoPorUid(string uidHex)
    {
        try
        {
            // Muestra estado de carga.
            StatusLabel.Text = "Buscando alumno...";
            LoadingIndicator.IsVisible = true;
            LoadingIndicator.IsRunning = true;

            // Oculta mensajes anteriores.
            RegistroStatusLabel.IsVisible = false;

            // Busca el alumno en Odoo.
            _alumnoActual = await _odoo.BuscarAlumnoPorUidAsync(uidHex);

            // Si no existe alumno...
            if (_alumnoActual == null)
            {
                AlumnoCard.IsVisible = false;
                StatusLabel.Text = $"Alumno no encontrado (UID: {uidHex})";
                return;
            }

            // Muestra la información del alumno.
            MostrarAlumno(_alumnoActual);

            StatusLabel.Text = "Alumno encontrado";
        }
        catch (Exception ex)
        {
            // Muestra errores inesperados.
            await DisplayAlertAsync("Error", ex.Message, "OK");

            StatusLabel.Text = "Error al buscar";
        }
        finally
        {
            // Oculta el indicador de carga.
            LoadingIndicator.IsRunning = false;
            LoadingIndicator.IsVisible = false;
        }
    }

    // Busca alumno manualmente por nombre o UID.
    private async Task BuscarAlumnoManual(string texto)
    {
        try
        {
            // Activa indicador de carga.
            StatusLabel.Text = "Buscando alumno...";
            LoadingIndicator.IsVisible = true;
            LoadingIndicator.IsRunning = true;

            RegistroStatusLabel.IsVisible = false;

            // Busca alumno en Odoo.
            _alumnoActual = await _odoo.BuscarAlumnoAsync(texto);

            // Si no se encuentra...
            if (_alumnoActual == null)
            {
                AlumnoCard.IsVisible = false;
                StatusLabel.Text = $"Alumno no encontrado (UID: {texto})";
                return;
            }

            // Muestra datos del alumno.
            MostrarAlumno(_alumnoActual);

            StatusLabel.Text = "Alumno encontrado";
        }
        catch (Exception ex)
        {
            // Manejo de errores.
            await DisplayAlertAsync("Error", ex.Message, "OK");

            StatusLabel.Text = "Error al buscar";
        }
        finally
        {
            // Oculta carga.
            LoadingIndicator.IsRunning = false;
            LoadingIndicator.IsVisible = false;
        }
    }

    // Muestra la información visual del alumno.
    private void MostrarAlumno(AlumnoResult alumno)
    {
        // Hace visible la tarjeta.
        AlumnoCard.IsVisible = true;

        // Muestra nombre y curso.
        NombreAlumnoLabel.Text = alumno.Nombre;
        CursoAlumnoLabel.Text = alumno.Curso;

        // Comprueba permisos de salida.
        if (alumno.PermisoSalida)
        {
            // Estado autorizado.
            EstadoFrame.BackgroundColor = Color.FromArgb("#28a745");
            EstadoLabel.Text = "AUTORIZADO";

            // Muestra botón recreo.
            BtnSalidaRecreo.IsVisible = true;
        }
        else
        {
            // Estado denegado.
            EstadoFrame.BackgroundColor = Color.FromArgb("#dc3545");
            EstadoLabel.Text = "DENEGADO";

            // Oculta botón recreo.
            BtnSalidaRecreo.IsVisible = false;
        }
    }

    // Método general para registrar asistencias.
    private async Task RegistrarAsistencia(
        string tipo,
        string mensajeExito,
        bool justificado = false)
    {
        // Comprueba si hay alumno seleccionado.
        if (_alumnoActual == null)
        {
            await DisplayAlertAsync("Error", "Busca un alumno primero", "OK");
            return;
        }

        try
        {
            // Muestra carga.
            LoadingIndicator.IsVisible = true;
            LoadingIndicator.IsRunning = true;

            // Registra asistencia en Odoo.
            bool ok = await _odoo.RegistrarAsistenciaAsync(
                _alumnoActual.Id,
                tipo,
                App.LoggedInProfesorId,
                justificado);

            RegistroStatusLabel.IsVisible = true;

            // Si todo sale bien...
            if (ok)
            {
                RegistroStatusLabel.Text = mensajeExito;
                RegistroStatusLabel.TextColor = Colors.Green;
            }
            else
            {
                // Error de registro.
                RegistroStatusLabel.Text = "Error al registrar";
                RegistroStatusLabel.TextColor = Colors.Red;
            }
        }
        catch (Exception ex)
        {
            // Manejo de errores.
            RegistroStatusLabel.IsVisible = true;
            RegistroStatusLabel.Text = $"Error: {ex.Message}";
            RegistroStatusLabel.TextColor = Colors.Red;
        }
        finally
        {
            // Oculta carga.
            LoadingIndicator.IsRunning = false;
            LoadingIndicator.IsVisible = false;
        }
    }

    // Registra una entrada.
    private async void OnRegistrarEntrada(object? sender, EventArgs e)
        => await RegistrarAsistencia(
            "entrada",
            "Entrada registrada",
            justificado: false);

    // Registra salida al recreo.
    private async void OnRegistrarSalidaRecreo(object? sender, EventArgs e)
        => await RegistrarAsistencia(
            "salida_recreo",
            "Salida recreo registrada",
            justificado: true);

    // Registra una salida anticipada.
    private async void OnRegistrarSalidaAnticipada(object? sender, EventArgs e)
    {
        // Comprueba que exista un alumno.
        if (_alumnoActual == null)
        {
            await DisplayAlertAsync("Error", "Busca un alumno primero", "OK");
            return;
        }

        // Pide el motivo de salida.
        string? motivo = await DisplayPromptAsync(
            "Salida Anticipada",
            "Motivo de la salida (opcional):",
            "Registrar",
            "Cancelar");

        // Si cancela, termina.
        if (motivo == null)
            return;

        try
        {
            // Activa carga.
            LoadingIndicator.IsVisible = true;
            LoadingIndicator.IsRunning = true;

            // Registra la salida anticipada.
            bool ok = await _odoo.RegistrarSalidaAnticipadaAsync(
                _alumnoActual.Id,
                motivo ?? "",
                App.LoggedInProfesorId);

            RegistroStatusLabel.IsVisible = true;

            // Resultado correcto.
            if (ok)
            {
                RegistroStatusLabel.Text = "Salida anticipada registrada";
                RegistroStatusLabel.TextColor = Colors.Green;
            }
            else
            {
                // Error de registro.
                RegistroStatusLabel.Text = "Error al registrar";
                RegistroStatusLabel.TextColor = Colors.Red;
            }
        }
        catch (Exception ex)
        {
            // Manejo de errores.
            RegistroStatusLabel.IsVisible = true;
            RegistroStatusLabel.Text = $"Error: {ex.Message}";
            RegistroStatusLabel.TextColor = Colors.Red;
        }
        finally
        {
            // Oculta indicador de carga.
            LoadingIndicator.IsRunning = false;
            LoadingIndicator.IsVisible = false;
        }
    }

    // Se ejecuta cuando la página aparece.
    protected override void OnAppearing()
    {
        base.OnAppearing();

        // Actualiza el estado NFC.
        UpdateNfcStatus();
    }

    // Se ejecuta cuando la página desaparece.
    protected override void OnDisappearing()
    {
        base.OnDisappearing();
    }

    // Destructor de la página.
    // Libera la suscripción NFC.
    ~ScannerPage()
    {
        UnsubscribeNfc();
    }
}

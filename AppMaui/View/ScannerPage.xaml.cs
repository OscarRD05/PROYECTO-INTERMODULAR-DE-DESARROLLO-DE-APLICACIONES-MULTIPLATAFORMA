using App.Services;

namespace App.View;

public partial class ScannerPage : ContentPage
{
    private readonly OdooService _odoo = new();
    private AlumnoResult? _alumnoActual;

    public ScannerPage()
    {
        InitializeComponent();
        SubscribeNfc();
        UpdateNfcStatus();
    }

    private void SubscribeNfc()
    {
#if ANDROID
        MainActivity.NfcTagDiscovered += OnNfcTagDiscovered;
#endif
    }

    private void UnsubscribeNfc()
    {
#if ANDROID
        MainActivity.NfcTagDiscovered -= OnNfcTagDiscovered;
#endif
    }

    private void UpdateNfcStatus()
    {
#if ANDROID
        if (!MainActivity.NfcSupported)
        {
            StatusLabel.Text = "NFC no soportado, usa búsqueda manual";
            return;
        }

        if (!MainActivity.NfcEnabled)
        {
            StatusLabel.Text = "NFC desactivado, usa búsqueda manual";
            return;
        }

        StatusLabel.Text = "Esperando tarjeta NFC...";
#else
        StatusLabel.Text = "NFC no disponible en esta plataforma";
#endif
    }

    private void OnNfcTagDiscovered(string uid)
    {
        MainThread.BeginInvokeOnMainThread(async () =>
        {
            BusquedaEntry.Text = uid;
            StatusLabel.Text = $"UID: {uid} - Buscando...";
            await BuscarAlumnoPorUid(uid);
        });
    }

    private async void OnBusquedaCompleted(object? sender, EventArgs e)
    {
        string texto = BusquedaEntry.Text?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(texto))
            return;

        await BuscarAlumnoManual(texto);
    }

    private async void OnBusquedaClicked(object? sender, EventArgs e)
    {
        string texto = BusquedaEntry.Text?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(texto))
            return;

        await BuscarAlumnoManual(texto);
    }

    private async Task BuscarAlumnoPorUid(string uidHex)
    {
        try
        {
            StatusLabel.Text = "Buscando alumno...";
            LoadingIndicator.IsVisible = true;
            LoadingIndicator.IsRunning = true;
            RegistroStatusLabel.IsVisible = false;

            _alumnoActual = await _odoo.BuscarAlumnoPorUidAsync(uidHex);

            if (_alumnoActual == null)
            {
                AlumnoCard.IsVisible = false;
                StatusLabel.Text = $"Alumno no encontrado (UID: {uidHex})";
                return;
            }

            MostrarAlumno(_alumnoActual);
            StatusLabel.Text = "Alumno encontrado";
        }
        catch (Exception ex)
        {
            await DisplayAlertAsync("Error", ex.Message, "OK");
            StatusLabel.Text = "Error al buscar";
        }
        finally
        {
            LoadingIndicator.IsRunning = false;
            LoadingIndicator.IsVisible = false;
        }
    }

    private async Task BuscarAlumnoManual(string texto)
    {
        try
        {
            StatusLabel.Text = "Buscando alumno...";
            LoadingIndicator.IsVisible = true;
            LoadingIndicator.IsRunning = true;
            RegistroStatusLabel.IsVisible = false;

            _alumnoActual = await _odoo.BuscarAlumnoAsync(texto);

            if (_alumnoActual == null)
            {
                AlumnoCard.IsVisible = false;
                StatusLabel.Text = $"Alumno no encontrado (UID: {texto})";
                return;
            }

            MostrarAlumno(_alumnoActual);
            StatusLabel.Text = "Alumno encontrado";
        }
        catch (Exception ex)
        {
            await DisplayAlertAsync("Error", ex.Message, "OK");
            StatusLabel.Text = "Error al buscar";
        }
        finally
        {
            LoadingIndicator.IsRunning = false;
            LoadingIndicator.IsVisible = false;
        }
    }

    private void MostrarAlumno(AlumnoResult alumno)
    {
        AlumnoCard.IsVisible = true;
        NombreAlumnoLabel.Text = alumno.Nombre;
        CursoAlumnoLabel.Text = alumno.Curso;

        if (alumno.PermisoSalida)
        {
            EstadoFrame.BackgroundColor = Color.FromArgb("#28a745");
            EstadoLabel.Text = "AUTORIZADO";
            BtnSalidaRecreo.IsVisible = true;
        }
        else
        {
            EstadoFrame.BackgroundColor = Color.FromArgb("#dc3545");
            EstadoLabel.Text = "DENEGADO";
            BtnSalidaRecreo.IsVisible = false;
        }
    }

    private async Task RegistrarAsistencia(string tipo, string mensajeExito, bool justificado = false)
    {
        if (_alumnoActual == null)
        {
            await DisplayAlertAsync("Error", "Busca un alumno primero", "OK");
            return;
        }

        try
        {
            LoadingIndicator.IsVisible = true;
            LoadingIndicator.IsRunning = true;

            bool ok = await _odoo.RegistrarAsistenciaAsync(
                _alumnoActual.Id, tipo, App.LoggedInProfesorId, justificado);

            RegistroStatusLabel.IsVisible = true;

            if (ok)
            {
                RegistroStatusLabel.Text = mensajeExito;
                RegistroStatusLabel.TextColor = Colors.Green;
            }
            else
            {
                RegistroStatusLabel.Text = "Error al registrar";
                RegistroStatusLabel.TextColor = Colors.Red;
            }
        }
        catch (Exception ex)
        {
            RegistroStatusLabel.IsVisible = true;
            RegistroStatusLabel.Text = $"Error: {ex.Message}";
            RegistroStatusLabel.TextColor = Colors.Red;
        }
        finally
        {
            LoadingIndicator.IsRunning = false;
            LoadingIndicator.IsVisible = false;
        }
    }

    private async void OnRegistrarEntrada(object? sender, EventArgs e)
        => await RegistrarAsistencia("entrada", "Entrada registrada", justificado: false);

    private async void OnRegistrarSalidaRecreo(object? sender, EventArgs e)
        => await RegistrarAsistencia("salida_recreo", "Salida recreo registrada", justificado: true);

    private async void OnRegistrarSalidaAnticipada(object? sender, EventArgs e)
    {
        if (_alumnoActual == null)
        {
            await DisplayAlertAsync("Error", "Busca un alumno primero", "OK");
            return;
        }

        string? motivo = await DisplayPromptAsync(
            "Salida Anticipada",
            "Motivo de la salida (opcional):",
            "Registrar",
            "Cancelar");

        if (motivo == null)
            return;

        try
        {
            LoadingIndicator.IsVisible = true;
            LoadingIndicator.IsRunning = true;

            bool ok = await _odoo.RegistrarSalidaAnticipadaAsync(
                _alumnoActual.Id, motivo ?? "", App.LoggedInProfesorId);

            RegistroStatusLabel.IsVisible = true;

            if (ok)
            {
                RegistroStatusLabel.Text = "Salida anticipada registrada";
                RegistroStatusLabel.TextColor = Colors.Green;
            }
            else
            {
                RegistroStatusLabel.Text = "Error al registrar";
                RegistroStatusLabel.TextColor = Colors.Red;
            }
        }
        catch (Exception ex)
        {
            RegistroStatusLabel.IsVisible = true;
            RegistroStatusLabel.Text = $"Error: {ex.Message}";
            RegistroStatusLabel.TextColor = Colors.Red;
        }
        finally
        {
            LoadingIndicator.IsRunning = false;
            LoadingIndicator.IsVisible = false;
        }
    }

    protected override void OnAppearing()
    {
        base.OnAppearing();
        UpdateNfcStatus();
    }

    protected override void OnDisappearing()
    {
        base.OnDisappearing();
    }

    ~ScannerPage()
    {
        UnsubscribeNfc();
    }
}
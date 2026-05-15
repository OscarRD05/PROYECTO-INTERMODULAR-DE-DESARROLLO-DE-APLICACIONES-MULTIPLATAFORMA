using App.Services;
using Plugin.NFC;

namespace App.View;

public partial class ScannerPage : ContentPage
{
    private readonly OdooService _odoo = new();
    private AlumnoResult? _alumnoActual;

    public ScannerPage()
    {
        InitializeComponent();
        StartNfc();
    }

    private void StartNfc()
    {
        try
        {
            if (!CrossNFC.IsSupported)
            {
                StatusLabel.Text = "NFC no soportado en este dispositivo";
                return;
            }

            if (!CrossNFC.Current.IsAvailable)
            {
                StatusLabel.Text = "NFC desactivado, usa busqueda manual";
                return;
            }

            CrossNFC.Current.OnTagDiscovered += Current_OnTagDiscovered;
            CrossNFC.Current.StartListening();
            StatusLabel.Text = "Esperando tarjeta NFC...";
        }
        catch (Exception ex)
        {
            StatusLabel.Text = "Error NFC: usa busqueda manual";
        }
    }

    private async void Current_OnTagDiscovered(ITagInfo tagInfo, bool format)
    {
        try
        {
            string uid = BitConverter.ToString(tagInfo.Identifier);

            await MainThread.InvokeOnMainThreadAsync(async () =>
            {
                BusquedaEntry.Text = uid;
                await BuscarAlumno(uid);
            });
        }
        catch (Exception ex)
        {
            await MainThread.InvokeOnMainThreadAsync(async () =>
            {
                await DisplayAlert("Error NFC", ex.Message, "OK");
            });
        }
    }

    private async void OnBusquedaCompleted(object sender, EventArgs e)
    {
        string texto = BusquedaEntry.Text?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(texto))
            return;

        await BuscarAlumno(texto);
    }

    private async void OnBusquedaClicked(object sender, EventArgs e)
    {
        string texto = BusquedaEntry.Text?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(texto))
            return;

        await BuscarAlumno(texto);
    }

    private async Task BuscarAlumno(string texto)
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
                StatusLabel.Text = "Alumno no encontrado";
                return;
            }

            MostrarAlumno(_alumnoActual);
            StatusLabel.Text = "Alumno encontrado";
        }
        catch (Exception ex)
        {
            await DisplayAlert("Error", ex.Message, "OK");
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

    private async Task RegistrarAsistencia(string tipo, string mensajeExito)
    {
        if (_alumnoActual == null)
        {
            await DisplayAlert("Error", "Busca un alumno primero", "OK");
            return;
        }

        try
        {
            LoadingIndicator.IsVisible = true;
            LoadingIndicator.IsRunning = true;

            bool ok = await _odoo.RegistrarAsistenciaAsync(_alumnoActual.Id, tipo);

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

    private async void OnRegistrarEntrada(object sender, EventArgs e)
        => await RegistrarAsistencia("entrada", "Entrada registrada");

    private async void OnRegistrarSalida(object sender, EventArgs e)
        => await RegistrarAsistencia("salida", "Salida registrada");

    private async void OnRegistrarSalidaRecreo(object sender, EventArgs e)
        => await RegistrarAsistencia("salida_recreo", "Salida recreo registrada");

    private async void OnRegistrarSalidaAnticipada(object sender, EventArgs e)
    {
        if (_alumnoActual == null)
        {
            await DisplayAlert("Error", "Busca un alumno primero", "OK");
            return;
        }

        string motivo = await DisplayPromptAsync(
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
                _alumnoActual.Id, motivo ?? "");

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

    private async void OnSettingsClicked(object sender, EventArgs e)
    {
        await Navigation.PushAsync(new SettingsPage());
    }

    private async void OnLogoutClicked(object sender, EventArgs e)
    {
        bool salir = await DisplayAlert("Salir", "Cerrar sesion?", "Si", "No");

        if (salir)
        {
            try { CrossNFC.Current.StopListening(); } catch { }

            App.LoggedInUid = -1;
            await Navigation.PopAsync();
        }
    }

    protected override void OnAppearing()
    {
        base.OnAppearing();

        try
        {
            if (CrossNFC.IsSupported && CrossNFC.Current.IsAvailable)
            {
                CrossNFC.Current.StartListening();
            }
        }
        catch { }
    }

    protected override void OnDisappearing()
    {
        base.OnDisappearing();

        try
        {
            if (CrossNFC.IsSupported)
            {
                CrossNFC.Current.StopListening();
            }
        }
        catch { }
    }
}
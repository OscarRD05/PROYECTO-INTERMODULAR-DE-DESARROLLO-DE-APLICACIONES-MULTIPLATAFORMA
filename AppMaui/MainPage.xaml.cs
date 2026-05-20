using App.Services;
using App.View;

namespace App;

public partial class MainPage : ContentPage
{
    // Servicio encargado de comunicarse con Odoo.
    private readonly OdooService _odoo = new();

    // Constructor de la página.
    public MainPage()
    {
        // Inicializa todos los componentes visuales del XAML.
        InitializeComponent();
    }

    // Método que se ejecuta al pulsar el botón "ENTRAR".
    private async void OnLoginClicked(object? sender, EventArgs e)
    {
        // Limpia mensajes de error anteriores.
        ErrorLabel.Text = "";

        // Obtiene el usuario y contraseña escritos por el usuario.
        string usuario = UserEntry.Text?.Trim() ?? "";
        string password = PasswordEntry.Text ?? "";

        // Comprueba que los campos no estén vacíos.
        if (string.IsNullOrWhiteSpace(usuario) || string.IsNullOrWhiteSpace(password))
        {
            ErrorLabel.Text = "Introduce usuario y contrasena";
            return;
        }

        // Obtiene la configuración guardada del servidor Odoo.
        string url = App.OdooUrl;
        string db = App.OdooDb;

        // Comprueba que exista configuración.
        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(db))
        {
            ErrorLabel.Text = "Configura el servidor en Config";
            return;
        }

        try
        {
            // Muestra el indicador de carga.
            LoadingIndicator.IsVisible = true;
            LoadingIndicator.IsRunning = true;

            // Desactiva el botón mientras se realiza el login.
            LoginButton.IsEnabled = false;

            // Realiza el login y verifica si esta en Odoo.
            var (ok, uid, error) =
                await _odoo.LoginAsync(db, usuario, password);

            // Si el login es correcto...
            if (ok)
            {
                // Guarda el UID del usuario autenticado.
                App.LoggedInUid = uid;

                // Busca el profesor relacionado con ese usuario.
                App.LoggedInProfesorId =
                    await _odoo.BuscarProfesorAsync(uid);

                // Navega hacia ScannerPage.
                await Navigation.PushAsync(new ScannerPage());

                return;
            }

            // Muestra mensaje si las credenciales fallan.
            ErrorLabel.Text =
                string.IsNullOrWhiteSpace(error)
                ? "Usuario o contrasena incorrectos"
                : error;
        }
        catch (Exception ex)
        {
            // Captura errores inesperados.
            ErrorLabel.Text = $"Error: {ex.Message}";
        }
        finally
        {
            // Oculta indicador de carga.
            LoadingIndicator.IsRunning = false;
            LoadingIndicator.IsVisible = false;

            // Reactiva el botón de login.
            LoginButton.IsEnabled = true;
        }
    }

    // Método que abre la pantalla de configuración.
    private async void OnSettingsClicked(object? sender, EventArgs e)
    {
        // Navega hacia SettingsPage.
        await Navigation.PushAsync(new SettingsPage());
    }
}

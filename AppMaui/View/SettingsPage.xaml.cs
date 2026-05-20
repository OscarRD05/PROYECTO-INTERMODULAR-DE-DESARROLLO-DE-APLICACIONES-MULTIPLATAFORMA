using App.Services;

namespace App.View;

public partial class SettingsPage : ContentPage
{
    // Constructor de la página.
    public SettingsPage()
    {
        InitializeComponent();

        // Carga automáticamente la configuración guardada.
        //
        // Muestra en pantalla:
        // - la URL del servidor
        // - y la base de datos guardada previamente.
        UrlEntry.Text = App.OdooUrl;
        DbEntry.Text = App.OdooDb;
    }

    // Método que se ejecuta al pulsar "Probar conexión".
    private async void OnTestConnection(object? sender, EventArgs e)
    {
        // Obtiene la URL escrita por el usuario.
        string url = UrlEntry.Text?.Trim() ?? "";

        // Comprueba que la URL no esté vacía.
        if (string.IsNullOrWhiteSpace(url))
        {
            TestResultLabel.Text = "Introduce una URL";
            TestResultLabel.TextColor = Colors.Red;
            return;
        }

        // Desactiva el botón mientras se realiza la prueba.
        TestButton.IsEnabled = false;

        // Muestra mensaje de carga.
        TestResultLabel.Text = "Probando...";
        TestResultLabel.TextColor = Colors.Gray;

        try
        {
            // Crea una instancia de OdooService.
            var service = new OdooService();

            // Comprueba si el servidor responde correctamente.
            bool ok = await service.TestConnectionAsync(url);

            // Muestra el resultado de la conexión.
            TestResultLabel.Text =
                ok ? "Conexion exitosa" : "No se pudo conectar";

            TestResultLabel.TextColor =
                ok ? Colors.Green : Colors.Red;
        }
        catch (Exception ex)
        {
            // Captura errores inesperados.
            TestResultLabel.Text = $"Error: {ex.Message}";
            TestResultLabel.TextColor = Colors.Red;
        }
        finally
        {
            // Reactiva el botón.
            TestButton.IsEnabled = true;
        }
    }

    // Método que guarda la configuración.
    private void OnSave(object? sender, EventArgs e)
    {
        // Obtiene la URL y la base de datos escritas por el usuario.
        string url = UrlEntry.Text?.Trim() ?? "";
        string db = DbEntry.Text?.Trim() ?? "";

        // Comprueba que ambos campos estén completos.
        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(db))
        {
            SaveResultLabel.Text = "Rellena todos los campos";
            SaveResultLabel.TextColor = Colors.Red;
            return;
        }

        // Guarda la configuración globalmente.
        App.OdooUrl = url;
        App.OdooDb = db;

        // Muestra mensaje de éxito.
        SaveResultLabel.Text = "Configuracion guardada";
        SaveResultLabel.TextColor = Colors.Green;
    }

    // Método que vuelve a la pantalla anterior.
    private async void OnBack(object? sender, EventArgs e)
    {
        // Regresa a la página anterior.
        await Navigation.PopAsync();
    }
}

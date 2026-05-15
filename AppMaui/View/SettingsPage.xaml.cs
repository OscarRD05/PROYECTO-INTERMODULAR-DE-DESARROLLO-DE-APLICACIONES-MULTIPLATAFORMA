using App.Services;

namespace App.View;

public partial class SettingsPage : ContentPage
{
    public SettingsPage()
    {
        InitializeComponent();

        UrlEntry.Text = App.OdooUrl;
        DbEntry.Text = App.OdooDb;
    }

    private async void OnTestConnection(object sender, EventArgs e)
    {
        string url = UrlEntry.Text?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(url))
        {
            TestResultLabel.Text = "Introduce una URL";
            TestResultLabel.TextColor = Colors.Red;
            return;
        }

        TestButton.IsEnabled = false;
        TestResultLabel.Text = "Probando...";
        TestResultLabel.TextColor = Colors.Gray;

        try
        {
            var service = new OdooService();
            bool ok = await service.TestConnectionAsync(url);

            TestResultLabel.Text = ok ? "Conexion exitosa" : "No se pudo conectar";
            TestResultLabel.TextColor = ok ? Colors.Green : Colors.Red;
        }
        catch (Exception ex)
        {
            TestResultLabel.Text = $"Error: {ex.Message}";
            TestResultLabel.TextColor = Colors.Red;
        }
        finally
        {
            TestButton.IsEnabled = true;
        }
    }

    private void OnSave(object sender, EventArgs e)
    {
        string url = UrlEntry.Text?.Trim() ?? "";
        string db = DbEntry.Text?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(db))
        {
            SaveResultLabel.Text = "Rellena todos los campos";
            SaveResultLabel.TextColor = Colors.Red;
            return;
        }

        App.OdooUrl = url;
        App.OdooDb = db;

        SaveResultLabel.Text = "Configuracion guardada";
        SaveResultLabel.TextColor = Colors.Green;
    }

    private async void OnBack(object sender, EventArgs e)
    {
        await Navigation.PopAsync();
    }
}
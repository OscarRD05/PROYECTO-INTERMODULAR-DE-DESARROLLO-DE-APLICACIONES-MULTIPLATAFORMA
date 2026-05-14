using System.Text;
using System.Text.Json;
using App.View;

namespace App;

public partial class MainPage : ContentPage
{
    private const string ODOO_URL = "http://10.102.7.216:8069";
    private const string DATABASE = "prueba";

    public MainPage()
    {
        InitializeComponent();
    }

    private async void OnLoginClicked(object sender, EventArgs e)
    {
        ErrorLabel.Text = "";

        string usuario = UserEntry.Text?.Trim() ?? "";
        string password = PasswordEntry.Text ?? "";

        if (string.IsNullOrWhiteSpace(usuario) ||
            string.IsNullOrWhiteSpace(password))
        {
            ErrorLabel.Text = "Introduce usuario y contraseña";
            return;
        }

        try
        {
            LoadingIndicator.IsVisible = true;
            LoadingIndicator.IsRunning = true;

            LoginButton.IsEnabled = false;

            using HttpClient client = new();

            var body = new
            {
                jsonrpc = "2.0",
                method = "call",
                @params = new
                {
                    db = DATABASE,
                    login = usuario,
                    password = password
                }
            };

            string json = JsonSerializer.Serialize(body);

            StringContent content = new(
                json,
                Encoding.UTF8,
                "application/json"
            );

            HttpResponseMessage response = await client.PostAsync(
                $"{ODOO_URL}/nfc/api/login",
                content
            );

            string responseText = await response.Content.ReadAsStringAsync();

            using JsonDocument doc = JsonDocument.Parse(responseText);

            if (doc.RootElement.TryGetProperty("result", out JsonElement result))
            {
                string status = result.GetProperty("status").GetString() ?? "";

                if (status == "ok")
                {
                    await Navigation.PushAsync(new ScannerPage());

                    return;
                }
            }

            ErrorLabel.Text = "Usuario o contraseña incorrectos";
        }
        catch (Exception ex)
        {
            ErrorLabel.Text = ex.Message;
        }
        finally
        {
            LoadingIndicator.IsRunning = false;
            LoadingIndicator.IsVisible = false;

            LoginButton.IsEnabled = true;
        }
    }
}
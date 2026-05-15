using App.Services;
using App.View;

namespace App;

public partial class MainPage : ContentPage
{
    private readonly OdooService _odoo = new();

    public MainPage()
    {
        InitializeComponent();
    }

    private async void OnLoginClicked(object sender, EventArgs e)
    {
        ErrorLabel.Text = "";

        string usuario = UserEntry.Text?.Trim() ?? "";
        string password = PasswordEntry.Text ?? "";

        if (string.IsNullOrWhiteSpace(usuario) || string.IsNullOrWhiteSpace(password))
        {
            ErrorLabel.Text = "Introduce usuario y contrasena";
            return;
        }

        string url = App.OdooUrl;
        string db = App.OdooDb;

        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(db))
        {
            ErrorLabel.Text = "Configura el servidor en Config";
            return;
        }

        try
        {
            LoadingIndicator.IsVisible = true;
            LoadingIndicator.IsRunning = true;
            LoginButton.IsEnabled = false;

            var (ok, uid, error) = await _odoo.LoginAsync(db, usuario, password);

            if (ok)
            {
                App.LoggedInUid = uid;
                await Navigation.PushAsync(new ScannerPage());
                return;
            }

            ErrorLabel.Text = string.IsNullOrWhiteSpace(error) ? "Usuario o contrasena incorrectos" : error;
        }
        catch (Exception ex)
        {
            ErrorLabel.Text = $"Error: {ex.Message}";
        }
        finally
        {
            LoadingIndicator.IsRunning = false;
            LoadingIndicator.IsVisible = false;
            LoginButton.IsEnabled = true;
        }
    }

    private async void OnSettingsClicked(object sender, EventArgs e)
    {
        await Navigation.PushAsync(new SettingsPage());
    }
}
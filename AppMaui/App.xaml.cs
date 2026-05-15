using System.Net;

namespace App;

public partial class App : Application
{
    public static CookieContainer Cookies { get; } = new();

    public static string OdooUrl
    {
        get => Preferences.Default.Get("odoo_url", "http://10.102.7.216:8069");
        set => Preferences.Default.Set("odoo_url", value);
    }

    public static string OdooDb
    {
        get => Preferences.Default.Get("odoo_db", "prueba");
        set => Preferences.Default.Set("odoo_db", value);
    }

    public static int LoggedInUid
    {
        get => Preferences.Default.Get("logged_in_uid", -1);
        set => Preferences.Default.Set("logged_in_uid", value);
    }

    public static bool IsLoggedIn => LoggedInUid > 0;

    public App()
    {
        InitializeComponent();
    }

    protected override Window CreateWindow(IActivationState? activationState)
    {
        return new Window(new AppShell());
    }
}
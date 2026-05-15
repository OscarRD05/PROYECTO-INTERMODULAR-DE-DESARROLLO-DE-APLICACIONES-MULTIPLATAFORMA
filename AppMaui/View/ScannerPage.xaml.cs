using System.Text;
using System.Text.Json;
using Plugin.NFC;

namespace App.View;

public partial class ScannerPage : ContentPage
{
    private const string ODOO_URL = "http://10.102.6.178:8069";

    public ScannerPage()
    {
        InitializeComponent();

        StartNfc();
    }

    private async void StartNfc()
    {
        try
        {
            if (!CrossNFC.IsSupported)
            {
                StatusLabel.Text = "NFC no soportado";
                return;
            }

            if (!CrossNFC.Current.IsAvailable)
            {
                StatusLabel.Text = "NFC desactivado";
                return;
            }

            CrossNFC.Current.OnTagDiscovered += Current_OnTagDiscovered;

            CrossNFC.Current.StartListening();

            StatusLabel.Text = "Esperando tarjeta NFC...";
        }
        catch (Exception ex)
        {
            await DisplayAlert(
                "Error NFC",
                ex.Message,
                "OK"
            );
        }
    }

    private async void Current_OnTagDiscovered(
        ITagInfo tagInfo,
        bool format)
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
                await DisplayAlert(
                    "Error NFC",
                    ex.Message,
                    "OK"
                );
            });
        }
    }

    private async void OnBuscarClicked(
        object sender,
        EventArgs e)
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

            HttpClientHandler handler = new HttpClientHandler();

            handler.UseCookies = true;

            handler.CookieContainer = App.Cookies;

            using HttpClient client = new(handler);

            var body = new
            {
                jsonrpc = "2.0",
                method = "call",
                @params = new
                {
                    model = "nfc.alumno",
                    method = "search_read",
                    args = new object[]
                    {
                        new object[]
                        {
                            "|",
                            new object[]
                            {
                                "nombre_completo",
                                "ilike",
                                texto
                            },
                            new object[]
                            {
                                "uid_tarjeta_rfid",
                                "=",
                                texto
                            }
                        }
                    },
                    kwargs = new
                    {
                        fields = new string[]
                        {
                            "nombre_completo",
                            "curso_id",
                            "permiso_salida"
                        }
                    }
                }
            };

            string json = JsonSerializer.Serialize(body);

            StringContent content = new(
                json,
                Encoding.UTF8,
                "application/json"
            );

            HttpResponseMessage response = await client.PostAsync(
                $"{ODOO_URL}/web/dataset/call_kw/nfc.alumno/search_read",
                content
            );

            string responseText = await response.Content.ReadAsStringAsync();

            JsonDocument doc = JsonDocument.Parse(responseText);

            JsonElement result = doc
                .RootElement
                .GetProperty("result");

            if (result.GetArrayLength() == 0)
            {
                AlumnoCard.IsVisible = false;

                StatusLabel.Text = "Alumno no encontrado";

                return;
            }

            JsonElement alumno = result[0];

            string nombre = alumno
                .GetProperty("nombre_completo")
                .GetString() ?? "";

            bool autorizado = alumno
                .GetProperty("permiso_salida")
                .GetBoolean();

            string curso = "Sin curso";

            if (
                alumno.TryGetProperty(
                    "curso_id",
                    out JsonElement cursoElement)
                &&
                cursoElement.ValueKind == JsonValueKind.Array
                &&
                cursoElement.GetArrayLength() > 1
            )
            {
                curso = cursoElement[1].GetString() ?? "Sin curso";
            }

            MostrarAlumno(
                nombre,
                curso,
                autorizado
            );

            StatusLabel.Text = "Alumno encontrado";
        }
        catch (Exception ex)
        {
            await DisplayAlert(
                "Error",
                ex.Message,
                "OK"
            );
        }
    }

    private void MostrarAlumno(
        string nombre,
        string curso,
        bool autorizado)
    {
        AlumnoCard.IsVisible = true;

        NombreAlumnoLabel.Text = nombre;

        CursoAlumnoLabel.Text = curso;

        if (autorizado)
        {
            EstadoFrame.BackgroundColor =
                Color.FromArgb("#28a745");

            EstadoLabel.Text = "AUTORIZADO";
        }
        else
        {
            EstadoFrame.BackgroundColor =
                Color.FromArgb("#dc3545");

            EstadoLabel.Text = "DENEGADO";
        }
    }

    private async void OnLogoutClicked(
        object sender,
        EventArgs e)
    {
        bool salir = await DisplayAlert(
            "Salir",
            "¿Cerrar sesión?",
            "Sí",
            "No"
        );

        if (salir)
        {
            try
            {
                CrossNFC.Current.StopListening();
            }
            catch
            {
            }

            await Navigation.PopAsync();
        }
    }
}
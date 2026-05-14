using System.Text;
using System.Text.Json;

namespace App.View;

public partial class ScannerPage : ContentPage
{
    private const string ODOO_URL = "http://10.102.7.216:8069";

    public ScannerPage()
    {
        InitializeComponent();
    }

    private async void OnScanClicked(object sender, EventArgs e)
    {
        StatusLabel.Text = "Esperando tarjeta NFC...";

        await Task.Delay(2000);

        await BuscarAlumnoPorNfc("123456");
    }

    private async void OnSearchClicked(object sender, EventArgs e)
    {
        string busqueda = BusquedaEntry.Text?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(busqueda))
        {
            await DisplayAlert(
                "Error",
                "Escribe un nombre",
                "OK"
            );

            return;
        }

        await BuscarAlumnoManual(busqueda);
    }

    private async Task BuscarAlumnoManual(string busqueda)
    {
        try
        {
            StatusLabel.Text = "Buscando alumno...";

            using HttpClient client = new();

            var body = new
            {
                jsonrpc = "2.0",
                method = "call",
                @params = new
                {
                    model = "nfc.alumno",
                    domain = new object[]
                    {
                        new object[]
                        {
                            "nombre_completo",
                            "ilike",
                            busqueda
                        }
                    },
                    fields = new string[]
                    {
                        "nombre_completo",
                        "curso_id",
                        "permiso_salida"
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
                $"{ODOO_URL}/nfc/api/search",
                content
            );

            string responseText = await response.Content.ReadAsStringAsync();

            using JsonDocument doc = JsonDocument.Parse(responseText);

            JsonElement result = doc.RootElement.GetProperty("result");

            string status = result
                .GetProperty("status")
                .GetString() ?? "";

            if (status != "ok")
            {
                await DisplayAlert(
                    "Error",
                    "Error buscando alumno",
                    "OK"
                );

                return;
            }

            JsonElement records = result.GetProperty("records");

            if (records.GetArrayLength() == 0)
            {
                await DisplayAlert(
                    "Sin resultados",
                    "Alumno no encontrado",
                    "OK"
                );

                return;
            }

            JsonElement alumno = records[0];

            string nombre = alumno
                .GetProperty("nombre_completo")
                .GetString() ?? "";

            bool autorizado = alumno
                .GetProperty("permiso_salida")
                .GetBoolean();

            string curso = "Sin curso";

            if (alumno.TryGetProperty("curso_id", out JsonElement cursoElement))
            {
                if (cursoElement.ValueKind == JsonValueKind.Array &&
                    cursoElement.GetArrayLength() > 1)
                {
                    curso = cursoElement[1].GetString() ?? "Sin curso";
                }
            }

            MostrarAlumno(
                nombre,
                curso,
                autorizado
            );
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

    // ═══════════════════════════════════════
    // BUSCAR ALUMNO NFC
    // ═══════════════════════════════════════

    private async Task BuscarAlumnoPorNfc(string uid)
    {
        try
        {
            StatusLabel.Text = "Buscando NFC...";

            using HttpClient client = new();

            var body = new
            {
                jsonrpc = "2.0",
                method = "call",
                @params = new
                {
                    model = "nfc.alumno",
                    domain = new object[]
                    {
                        new object[]
                        {
                            "uid_tarjeta_rfid",
                            "=",
                            uid
                        }
                    },
                    fields = new string[]
                    {
                        "nombre_completo",
                        "curso_id",
                        "permiso_salida"
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
                $"{ODOO_URL}/nfc/api/search",
                content
            );

            string responseText = await response.Content.ReadAsStringAsync();

            using JsonDocument doc = JsonDocument.Parse(responseText);

            JsonElement result = doc.RootElement.GetProperty("result");

            JsonElement records = result.GetProperty("records");

            if (records.GetArrayLength() == 0)
            {
                await DisplayAlert(
                    "No encontrado",
                    "No existe alumno con ese NFC",
                    "OK"
                );

                return;
            }

            JsonElement alumno = records[0];

            string nombre = alumno
                .GetProperty("nombre_completo")
                .GetString() ?? "";

            bool autorizado = alumno
                .GetProperty("permiso_salida")
                .GetBoolean();

            string curso = "Sin curso";

            if (alumno.TryGetProperty("curso_id", out JsonElement cursoElement))
            {
                if (cursoElement.ValueKind == JsonValueKind.Array &&
                    cursoElement.GetArrayLength() > 1)
                {
                    curso = cursoElement[1].GetString() ?? "";
                }
            }

            MostrarAlumno(
                nombre,
                curso,
                autorizado
            );
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

    // ═══════════════════════════════════════
    // MOSTRAR ALUMNO
    // ═══════════════════════════════════════

    private void MostrarAlumno(
        string nombre,
        string curso,
        bool autorizado
    )
    {
        AlumnoCard.IsVisible = true;

        NombreAlumnoLabel.Text = nombre;

        CursoAlumnoLabel.Text = curso;

        string[] partes = nombre.Split(' ');

        string iniciales = partes[0][0].ToString();

        if (partes.Length > 1)
        {
            iniciales += partes[^1][0];
        }

        InicialesLabel.Text = iniciales.ToUpper();

        if (autorizado)
        {
            EstadoFrame.BackgroundColor = Color.FromArgb("#28a745");

            EstadoLabel.Text = "AUTORIZADO";
        }
        else
        {
            EstadoFrame.BackgroundColor = Color.FromArgb("#dc3545");

            EstadoLabel.Text = "DENEGADO";
        }

        StatusLabel.Text = "Alumno encontrado";
    }

    // ═══════════════════════════════════════
    // LOGOUT
    // ═══════════════════════════════════════

    private async void OnLogoutClicked(object sender, EventArgs e)
    {
        bool salir = await DisplayAlert(
            "Salir",
            "¿Cerrar sesión?",
            "Sí",
            "No"
        );

        if (salir)
        {
            await Navigation.PopAsync();
        }
    }
}
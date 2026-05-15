using System.Text;
using System.Text.Json;

namespace App.Services;

public class AlumnoResult
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Curso { get; set; } = "";
    public bool PermisoSalida { get; set; }
    public string UidTarjeta { get; set; } = "";
}

public class OdooService
{
    private HttpClient GetClient()
    {
        var handler = new HttpClientHandler
        {
            UseCookies = true,
            CookieContainer = App.Cookies,
        };
        return new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(15) };
    }

    private async Task<JsonElement> CallApiAsync(string endpoint, object parameters)
    {
        var body = new
        {
            jsonrpc = "2.0",
            method = "call",
            @params = parameters,
            id = Random.Shared.Next(1, 999999),
        };

        string json = JsonSerializer.Serialize(body);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        using var client = GetClient();

        HttpResponseMessage response = await client.PostAsync(
            $"{App.OdooUrl}{endpoint}",
            content
        );

        string responseText = await response.Content.ReadAsStringAsync();
        using JsonDocument doc = JsonDocument.Parse(responseText);

        JsonElement root = doc.RootElement;

        if (root.TryGetProperty("error", out JsonElement error))
        {
            string message = "Error de Odoo";
            if (error.TryGetProperty("data", out JsonElement errorData)
                && errorData.TryGetProperty("message", out JsonElement errorMsg))
            {
                message = errorMsg.GetString() ?? message;
            }
            throw new Exception(message);
        }

        if (root.TryGetProperty("result", out JsonElement result))
        {
            if (result.TryGetProperty("status", out JsonElement status)
                && status.GetString() == "error")
            {
                string msg = result.TryGetProperty("message", out JsonElement msgEl)
                    ? msgEl.GetString() ?? "Error desconocido"
                    : "Error desconocido";
                throw new Exception(msg);
            }

            return result;
        }

        throw new Exception("Respuesta inesperada del servidor");
    }

    public async Task<(bool ok, int uid, string error)> LoginAsync(string db, string login, string password)
    {
        try
        {
            JsonElement result = await CallApiAsync("/nfc/api/login", new
            {
                db,
                login,
                password,
            });

            string status = result.GetProperty("status").GetString() ?? "";
            if (status == "ok")
            {
                int uid = result.GetProperty("uid").GetInt32();
                return (true, uid, "");
            }

            string message = result.TryGetProperty("message", out JsonElement msg)
                ? msg.GetString() ?? "Autenticación fallida"
                : "Autenticación fallida";
            return (false, 0, message);
        }
        catch (Exception ex)
        {
            return (false, 0, ex.Message);
        }
    }

    public async Task<AlumnoResult?> BuscarAlumnoAsync(string texto)
    {
        JsonElement result = await CallApiAsync("/nfc/api/search", new
        {
            model = "nfc.alumno",
            domain = new object[]
            {
                "|",
                new object[] { "nombre_completo", "ilike", texto },
                new object[] { "uid_tarjeta_rfid", "=", texto },
            },
            fields = new string[] { "nombre_completo", "curso_id", "permiso_salida", "uid_tarjeta_rfid" },
        });

        if (!result.TryGetProperty("records", out JsonElement records)
            || records.GetArrayLength() == 0)
        {
            return null;
        }

        JsonElement alumno = records[0];

        var alumnoResult = new AlumnoResult
        {
            Id = alumno.TryGetProperty("id", out JsonElement idEl) ? idEl.GetInt32() : 0,
            Nombre = alumno.TryGetProperty("nombre_completo", out JsonElement nameEl)
                ? nameEl.GetString() ?? "" : "",
            PermisoSalida = alumno.TryGetProperty("permiso_salida", out JsonElement permisoEl)
                && permisoEl.ValueKind == System.Text.Json.JsonValueKind.True,
            UidTarjeta = alumno.TryGetProperty("uid_tarjeta_rfid", out JsonElement uidEl)
                ? uidEl.GetString() ?? "" : "",
        };

        if (alumno.TryGetProperty("curso_id", out JsonElement cursoEl)
            && cursoEl.ValueKind == System.Text.Json.JsonValueKind.Array
            && cursoEl.GetArrayLength() > 1)
        {
            alumnoResult.Curso = cursoEl[1].GetString() ?? "Sin curso";
        }
        else
        {
            alumnoResult.Curso = "Sin curso";
        }

        return alumnoResult;
    }

    public async Task<bool> RegistrarAsistenciaAsync(int alumnoId, string tipo)
    {
        JsonElement result = await CallApiAsync("/nfc/api/log", new
        {
            alumno_id = alumnoId,
            tipo,
        });

        return result.GetProperty("status").GetString() == "ok";
    }

    public async Task<bool> RegistrarSalidaAnticipadaAsync(int alumnoId, string motivo = "")
    {
        var parameters = new Dictionary<string, object>
        {
            ["alumno_id"] = alumnoId,
        };

        if (!string.IsNullOrWhiteSpace(motivo))
        {
            parameters["motivo"] = motivo;
        }

        JsonElement result = await CallApiAsync("/nfc/api/registrar_salida_anticipada", parameters);

        return result.GetProperty("status").GetString() == "ok";
    }

    public async Task<bool> TogglePermisoSalidaAsync(int alumnoId)
    {
        JsonElement result = await CallApiAsync("/nfc/api/toggle_permiso", new
        {
            alumno_id = alumnoId,
        });

        return result.GetProperty("status").GetString() == "ok";
    }

    public async Task<bool> TestConnectionAsync(string url)
    {
        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
            HttpResponseMessage response = await client.GetAsync($"{url}/nfc/test");
            string text = await response.Content.ReadAsStringAsync();
            return text.Contains("OK");
        }
        catch
        {
            return false;
        }
    }
}
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

    private async Task<string> CallApiRawAsync(string endpoint, object parameters)
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

        return await response.Content.ReadAsStringAsync();
    }

    private static JsonElement ParseResult(string responseText)
    {
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

        if (!root.TryGetProperty("result", out JsonElement result))
        {
            throw new Exception("Respuesta inesperada del servidor");
        }

        if (result.TryGetProperty("status", out JsonElement status)
            && status.ValueKind == JsonValueKind.String
            && status.GetString() == "error")
        {
            string msg = result.TryGetProperty("message", out JsonElement msgEl)
                ? msgEl.GetString() ?? "Error desconocido"
                : "Error desconocido";
            throw new Exception(msg);
        }

        string resultJson = result.GetRawText();
        using JsonDocument resultDoc = JsonDocument.Parse(resultJson);
        return resultDoc.RootElement.Clone();
    }

    private static int ExtractInt(JsonElement element, string property)
    {
        JsonElement prop = element.GetProperty(property);

        if (prop.ValueKind == JsonValueKind.Number)
        {
            return prop.GetInt32();
        }

        if (prop.ValueKind == JsonValueKind.Object)
        {
            if (prop.TryGetProperty("uid", out JsonElement uidProp)
                && uidProp.ValueKind == JsonValueKind.Number)
            {
                return uidProp.GetInt32();
            }

            if (prop.TryGetProperty("id", out JsonElement idProp)
                && idProp.ValueKind == JsonValueKind.Number)
            {
                return idProp.GetInt32();
            }
        }

        if (prop.ValueKind == JsonValueKind.String)
        {
            if (int.TryParse(prop.GetString(), out int val))
            {
                return val;
            }
        }

        throw new Exception($"No se pudo leer el campo '{property}' como número");
    }

    public async Task<(bool ok, int uid, string error)> LoginAsync(string db, string login, string password)
    {
        try
        {
            string responseText = await CallApiRawAsync("/nfc/api/login", new
            {
                db,
                login,
                password,
            });

            JsonElement result = ParseResult(responseText);

            string status = result.GetProperty("status").GetString() ?? "";
            if (status == "ok")
            {
                int uid = ExtractInt(result, "uid");
                return (true, uid, "");
            }

            string message = result.TryGetProperty("message", out JsonElement msg)
                ? msg.GetString() ?? "Autenticacion fallida"
                : "Autenticacion fallida";
            return (false, 0, message);
        }
        catch (Exception ex)
        {
            return (false, 0, ex.Message);
        }
    }

    public async Task<AlumnoResult?> BuscarAlumnoPorUidAsync(string uidHex)
    {
        try
        {
            string responseText = await CallApiRawAsync("/nfc/api/scan_uid", new
            {
                uid = uidHex,
            });

            JsonElement result = ParseResult(responseText);

            if (!result.TryGetProperty("alumno", out JsonElement alumnoEl)
                || alumnoEl.ValueKind == JsonValueKind.Null
                || alumnoEl.ValueKind == JsonValueKind.Undefined)
            {
                return null;
            }

            var alumnoResult = new AlumnoResult
            {
                Id = alumnoEl.TryGetProperty("id", out JsonElement idEl) ? ExtractInt(alumnoEl, "id") : 0,
                Nombre = alumnoEl.TryGetProperty("nombre_completo", out JsonElement nameEl)
                    ? nameEl.GetString() ?? "" : "",
                PermisoSalida = alumnoEl.TryGetProperty("permiso_salida", out JsonElement permisoEl)
                    && permisoEl.ValueKind == JsonValueKind.True,
                UidTarjeta = alumnoEl.TryGetProperty("uid_tarjeta_rfid", out JsonElement uidEl)
                    ? uidEl.GetString() ?? "" : "",
            };

            if (alumnoEl.TryGetProperty("curso_id", out JsonElement cursoEl)
                && cursoEl.ValueKind == JsonValueKind.Array
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
        catch
        {
            return null;
        }
    }

    public async Task<AlumnoResult?> BuscarAlumnoAsync(string texto)
    {
        string responseText = await CallApiRawAsync("/nfc/api/search", new
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

        JsonElement result = ParseResult(responseText);

        if (!result.TryGetProperty("records", out JsonElement records)
            || records.GetArrayLength() == 0)
        {
            return null;
        }

        JsonElement alumno = records[0];

        var alumnoResult = new AlumnoResult
        {
            Id = alumno.TryGetProperty("id", out JsonElement idEl) ? ExtractInt(alumno, "id") : 0,
            Nombre = alumno.TryGetProperty("nombre_completo", out JsonElement nameEl)
                ? nameEl.GetString() ?? "" : "",
            PermisoSalida = alumno.TryGetProperty("permiso_salida", out JsonElement permisoEl)
                && permisoEl.ValueKind == JsonValueKind.True,
            UidTarjeta = alumno.TryGetProperty("uid_tarjeta_rfid", out JsonElement uidEl)
                ? uidEl.GetString() ?? "" : "",
        };

        if (alumno.TryGetProperty("curso_id", out JsonElement cursoEl)
            && cursoEl.ValueKind == JsonValueKind.Array
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

    public async Task<int> BuscarProfesorAsync(int uid)
    {
        try
        {
            string responseText = await CallApiRawAsync("/nfc/api/search", new
            {
                model = "nfc.profesor",
                domain = new object[] { new object[] { "usuario_id", "=", uid } },
                fields = new string[] { "id", "nombre_completo" },
            });

            JsonElement result = ParseResult(responseText);

            if (result.TryGetProperty("records", out JsonElement records)
                && records.GetArrayLength() > 0)
            {
                JsonElement profesor = records[0];
                return profesor.TryGetProperty("id", out JsonElement idEl)
                    ? idEl.GetInt32() : -1;
            }

            return -1;
        }
        catch
        {
            return -1;
        }
    }

    public async Task<bool> RegistrarAsistenciaAsync(int alumnoId, string tipo, int profesorId = -1, bool justificado = false)
    {
        string responseText;
        if (profesorId > 0)
        {
            responseText = await CallApiRawAsync("/nfc/api/log", new
            {
                alumno_id = alumnoId,
                tipo,
                profesor_id = profesorId,
                justificado,
            });
        }
        else
        {
            responseText = await CallApiRawAsync("/nfc/api/log", new
            {
                alumno_id = alumnoId,
                tipo,
                justificado,
            });
        }

        JsonElement result = ParseResult(responseText);
        return result.GetProperty("status").GetString() == "ok";
    }

    public async Task<bool> RegistrarSalidaAnticipadaAsync(int alumnoId, string motivo = "", int profesorId = -1)
    {
        var parameters = new Dictionary<string, object>
        {
            ["alumno_id"] = alumnoId,
            ["justificado"] = false,
        };

        if (profesorId > 0)
        {
            parameters["profesor_id"] = profesorId;
        }

        if (!string.IsNullOrWhiteSpace(motivo))
        {
            parameters["motivo"] = motivo;
        }

        string responseText = await CallApiRawAsync("/nfc/api/registrar_salida_anticipada", parameters);
        JsonElement result = ParseResult(responseText);
        return result.GetProperty("status").GetString() == "ok";
    }

    public async Task<bool> TogglePermisoSalidaAsync(int alumnoId)
    {
        string responseText = await CallApiRawAsync("/nfc/api/toggle_permiso", new
        {
            alumno_id = alumnoId,
        });

        JsonElement result = ParseResult(responseText);
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
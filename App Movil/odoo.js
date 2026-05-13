/**
 * OdooService - Helper to communicate with Odoo CUSTOM CORS API Bridge
 */
class OdooService {
    constructor(baseUrl, db) {
        console.log("OdooService inicializado con DB:", db);
        this.baseUrl = baseUrl;
        this.db = db;
        this.uid = null;
    }

    async callApi(endpoint, params) {
        const url = `${this.baseUrl}${endpoint}`;
        
        console.log(`Llamando a API: ${endpoint}`, params); // DEBUG

        const body = {
            jsonrpc: "2.0",
            params: params,
            id: Math.floor(Math.random() * 1000000)
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.data.message || data.error.message);
            }
            
            if (data.result.status === "error") {
                throw new Error(data.result.message);
            }

            return data.result;
        } catch (error) {
            console.error("Odoo API Bridge error:", error);
            if (error.message === "Failed to fetch") {
                throw new Error("No se pudo conectar con Odoo. Verifica la IP/URL y que el servidor responda.");
            }
            throw error;
        }
    }

    async login(username, password) {
        console.log("Intentando login para usuario:", username, "en DB:", this.db);
        
        const result = await this.callApi('/nfc/api/login', {
            db: this.db,
            login: username,
            password: password
        });
        this.uid = result.uid;
        return result.uid;
    }

    async searchRead(model, domain = [], fields = []) {
        const result = await this.callApi('/nfc/api/search', {
            model: model,
            domain: domain,
            fields: fields
        });
        return result.records;
    }

    async createLog(alumnoId, tipo = 'entrada') {
        return await this.callApi('/nfc/api/log', {
            alumno_id: alumnoId,
            tipo: tipo
        });
    }
}

import keyboard
import requests

print("Pasa la tarjeta NFC...\n")

buffer = ""

ODOO_URL = "http://localhost:8069/nfc/read"


def enviar_uid(uid):
    try:
        response = requests.post(
            ODOO_URL,
            json={
                "jsonrpc": "2.0",
                "method": "call",
                "params": {"uid": uid},
                "id": 1,
            },
            timeout=5,
        )

        data = response.json()
        print("Respuesta de Odoo:", data)

    except Exception as e:
        print("Error enviando a Odoo:", e)


while True:
    event = keyboard.read_event()

    if event.event_type == keyboard.KEY_DOWN:

        if event.name == "enter":
            if buffer:
                print("UID leído:", buffer)
                enviar_uid(buffer)
                buffer = ""

        elif len(event.name) == 1:
            buffer += event.name

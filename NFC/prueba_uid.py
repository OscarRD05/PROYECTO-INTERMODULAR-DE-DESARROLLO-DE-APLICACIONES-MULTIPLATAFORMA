import keyboard
import requests

print("Pasa la tarjeta NFC...\n")

buffer = ""

ODOO_URL = "http://localhost:8069/nfc/read"

while True:
    event = keyboard.read_event()

    if event.event_type == keyboard.KEY_DOWN:
        if event.name == "enter":
            if buffer:
                print("UID leído:", buffer)

                try:
                    r = requests.post(ODOO_URL, json={"uid": buffer})
                    print("Respuesta de Odoo:", r.text)
                except Exception as e:
                    print("Error enviando a Odoo:", e)

                buffer = ""

        elif len(event.name) == 1:
            buffer += event.name

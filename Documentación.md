# PROYECTO-INTERMODULAR-DE-DESARROLLO-DE-APLICACIONES-MULTIPLATAFORMA
Proyecto 

Óscar, Ayoze, Joel, Manuel -> Hicieron La ruta de trabajo y la asigancion de Roles
Manuel -> Hizo el acta de Constitución del Proyecto
Joel -> Hizo los diagramas de Despliegue (UML)
Óscar -> Hizo el PoC (Subido al Github)
Manuel -> Hizo el Prototipo de APK (Subido a Github)
Óscar -> Hizo el DashBoard de prueba (Subido a Github)

Ayoze y Joel -> Se encargaron de Instalar y programar las Raspberry

Ayoze y Joel  -> Base de datos en odoo
POSTGRES_DB: postgres
POSTGRES_USER: odoo
POSTGRES_PASSWORD: odoo

Usuarios de Odoo
master password: ia98-9q9w-uq7y
admin@test.com
contraseña: 1234

Para conectarse a la base de datos de odoo, hay que hacer un ping a la raspberry
(ping raspberry.local)
Una vez haya hecho ping, en el navegador pones (raspberry.local:8069) y ya te lleva a odoo


En odoo como ya dijimos hay un modulo lector_nfc de prueba que lee el keyboard(Porque la tarjeta nfc escribe directamente el id y pone enter) y una vez 
leido se va el script de python comprueba si http://raspberry.local:8069/nfc/read el status esta ok




# Instalación local
## Requisitos
PHP 8.3 o posterior compatible con Composer lock, extensiones pdo_pgsql/pgsql, intl, mbstring, gd, zip, xml, dom, fileinfo, curl y openssl; Composer 2; Node 22 LTS o Node 24 LTS; PostgreSQL 16 o posterior; Chromium/Chrome/Edge instalado. Esta laptop usa PHP 8.3.28 de Laragon y PostgreSQL 18.

No usar el PHP de WinGet si devuelve Acceso denegado. La ruta comprobada es `C:\laragon\bin\php\php-8.3.28-Win32-vs16-x64\php.exe`. En los ejemplos siguientes, `php` representa ese ejecutable.

## PostgreSQL aislado en esta laptop
Se creó un clúster exclusivo en `.runtime/postgres`, escuchando solo en 127.0.0.1:55432, sin modificar el servicio PostgreSQL preexistente. No se usaron sus credenciales ni se tocaron sus bases.
```powershell
& 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D '.runtime\postgres' -l '.runtime\postgres.log' -o '-p 55432 -h 127.0.0.1' start
```
Ejecutar desde la raíz del repositorio. Para detenerlo:
```powershell
& 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D '.runtime\postgres' stop -m fast
```
Este clúster es de desarrollo local y usa autenticación trust en loopback. Nunca copiar esta configuración a un servidor. En otra máquina, crear bases PostgreSQL propias y credenciales por entorno, con autenticación SCRAM.

## Instalación nueva, sin datos ficticios
1. Desde `app/`, ejecutar `composer install` y `npm ci`. Para usar Chromium existente sin descargar otro: establecer `PUPPETEER_SKIP_DOWNLOAD=true` antes de npm ci.
2. Copiar `.env.example` a `.env`; definir credenciales PostgreSQL y URL. En local configurar APP_ENV=local, APP_DEBUG=true y SESSION_SECURE_COOKIE=false si se usa HTTP. Configurar PDF_CHROME_BINARY con la ruta absoluta del navegador.
3. Ejecutar `php artisan key:generate`, `php artisan migrate --no-interaction` y `npm run build`.
4. Ejecutar `php artisan certificates:admin`: solicita nombre, correo y contraseña oculta de al menos 12 caracteres. No hay credenciales de producción predeterminadas. Para un aprovisionamiento no interactivo, proveer ADMIN_INITIAL_PASSWORD mediante el entorno del proceso y usar --name y --email; eliminar la variable al terminar. No poner la contraseña en argumentos ni archivos versionados.
5. Ingresar y configurar los nombres oficiales de las nueve carreras y el catálogo de certificados. No se presupone una clasificación institucional oficial.
6. Crear las cuentas personales y asignar una carrera a cada jefe.

## Arranque
Terminal backend: `php artisan serve --host=127.0.0.1 --port=8000`.
Terminal frontend de desarrollo: `npm run dev`. Alternativa: `npm run build` y usar el backend sin Vite.
Terminal cola: `php artisan queue:work --sleep=2 --timeout=120 --tries=3`.

Después de cambios en el código del trabajador: `php artisan queue:restart`. DB_QUEUE_RETRY_AFTER debe superar el timeout: se fija en 180 segundos. La generación individual tiene límite de 90 segundos. En Windows puede ser necesario autorizar el inicio de Chromium fuera del entorno restringido del agente.

## Entorno separado de QA
Copiar `.env.qa.example` a `.env.qa`, configurar una base terminada en _qa y generar una clave propia con `php artisan key:generate --env=qa`.
```text
php artisan migrate --env=qa --no-interaction
php artisan certificates:demo --env=qa --no-interaction
php artisan serve --env=qa --host=127.0.0.1 --port=8000
php artisan queue:work --env=qa --sleep=2 --timeout=120 --tries=3
```
El cargador exige simultáneamente APP_ENV=qa, DEMO_ALLOWED=true y nombre de base terminado en _qa. Reanuda una carga interrumpida con las mismas claves de operación y no duplica certificados completados. Los archivos QA usan storage/app/qa-private; desarrollo usa storage/app/private.

Las pruebas usan certificados_test, distinta de QA; phpunit.xml configura PostgreSQL y la suite verifica el sufijo antes de reinicializar tablas. Nunca apuntar las pruebas a producción.

## QR desde un celular
127.0.0.1 se refiere al equipo que abre el enlace; un teléfono no llega así a la laptop. Antes de emitir documentos de prueba para celular, definir APP_URL y CERTIFICATES_PUBLIC_URL con la URL alcanzable de la laptop en la misma red, iniciar el backend con --host=0.0.0.0 y autorizar únicamente esa red en el firewall. Para usar la cámara dentro de la página se requiere HTTPS o localhost: usar un HTTPS de pruebas gestionado por ITIC; no eludir advertencias de certificados. La cámara nativa del celular puede abrir el QR sin usar el lector web.

Las URL ya impresas se conservan en los documentos. Cambiar la variable no cambia PDF previos. Configurar y verificar la URL pública definitiva ANTES de emitir en producción.

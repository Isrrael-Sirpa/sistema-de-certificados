# Entrega para ITIC
## Arquitectura de despliegue
Un único Laravel sirve rutas, sesión, autorización y páginas Inertia/React; PostgreSQL conserva registros y cola persistente; un trabajador procesa PDF con Node/Chromium sin servidor Node HTTP independiente. El editor Fabric serializa JSON versionado y el renderizador usa el mismo motor para generar SVG vectorial y PDF.

Requisitos: PHP-FPM 8.3+, Nginx/Apache, PostgreSQL 16+, Node 22/24, Chromium, fuentes/dependencias de sistema del navegador. En Debian, instalar las dependencias oficiales de Puppeteer/Chromium o el paquete del sistema. Ejecutar el navegador como usuario sin privilegios con su sandbox habilitado. El código no incluye --no-sandbox.

## Aprovisionamiento
1. Crear usuarios PostgreSQL exclusivos de la aplicación y de migraciones; no usar superusuario para el proceso web. Aplicar permisos mínimos a tablas, secuencias y funciones. Mantener las restricciones y triggers inmutables; nunca conceder al rol web permisos para desactivarlos.
2. Definir document root exclusivamente en app/public. Denegar .env, vendor, scripts, storage, directorios ocultos y respaldos. Configurar try_files hacia index.php y PHP-FPM.
3. Ejecutar composer install --no-dev --prefer-dist --optimize-autoloader y npm ci. Construir con npm run build; incluir public/build, public/pdf-renderer.js y los archivos de fuentes bajo node_modules/@fontsource/noto-sans/files para el motor PDF. El trabajador necesita puppeteer y pdf-lib en node_modules; no borrar dependencias Node después de compilar.
4. Copiar .env.example, fijar APP_ENV=production, APP_DEBUG=false, clave propia, credenciales, APP_URL y CERTIFICATES_PUBLIC_URL HTTPS definitivas, SESSION_SECURE_COOKIE=true, SESSION_ENCRYPT=true, PDF_NODE_BINARY y PDF_CHROME_BINARY con rutas reales. DEMO_ALLOWED=false. Usar un almacenamiento privado persistente fuera del document root.
5. Ejecutar php artisan key:generate en la primera instalación, php artisan migrate --force y php artisan certificates:admin. No rotar APP_KEY después de emitir sin un plan para sesiones/cifrados. Configurar nombres oficiales de carreras y autoridades. No ejecutar certificates:demo en producción.
6. Ejecutar php artisan config:cache y php artisan route:cache. Reiniciar PHP-FPM y trabajadores después de actualizar.
7. Verificar URL pública desde un dispositivo externo antes de la primera emisión productiva, enlaces HTTPS, alcance de cookies, permisos y PDF de prueba.

## Servidor web y límites
Ejemplo conceptual Nginx: root /srv/certificados/app/public; index index.php; location / { try_files $uri $uri/ /index.php?$query_string; }. Configurar PHP-FPM con SCRIPT_FILENAME correcto y fastcgi_read_timeout al menos 100s para revisión individual. Limitar client_max_body_size a 12m; PHP upload_max_filesize 10M y post_max_size 12M o superior. Revisar XLSX 5 MB e imágenes 10 MB/40 MP. Recursos y certificados se sirven únicamente mediante controladores autorizados; no crear enlace público hacia el disco privado.

Activar TLS válido, HSTS según política institucional, X-Content-Type-Options nosniff, protección contra marcos y políticas de referencia. Configurar proxies confiables solo si se conocen sus IP, para que el esquema HTTPS y la limitación por IP sean correctos. La consulta pública limita 60 consultas/minuto por IP; entrega 30/min; login 5 intentos por combinación de correo/IP y límite adicional de ruta.

## Trabajadores y recuperación
Supervisor o systemd debe mantener:
```text
php /srv/certificados/app/artisan queue:work database --sleep=2 --timeout=120 --tries=3 --max-time=3600
```
DB_QUEUE_RETRY_AFTER=180, stopwaitsecs superior a 180, autorestart=true, usuario sin privilegios y directorio de trabajo app. Dos trabajadores pueden atender elementos distintos; los bloqueos de fila y UNIQUE(batch_item_id) impiden duplicación de un mismo elemento.

El renderizador impone límite de 90s y bloquea peticiones externas. Revisar la concurrencia según RAM de Chromium; empezar con uno o dos trabajadores en una laptop. Errores operativos se guardan por destinatario; el operador reintenta solo pendientes/fallidos. Los fallos inesperados del trabajador también aparecen en failed_jobs: revisar php artisan queue:failed.

Tras una interrupción: php artisan certificates:reconcile recalcula estados; añadir --dispatch reenvía pendientes/fallidos de operaciones confirmadas. php artisan queue:restart tras desplegar código. Los elementos completados no se reemiten. La transacción inserta el registro público solo después de guardar el archivo; un fallo elimina archivos huérfanos de esa operación. Una terminación forzada entre archivo y commit puede dejar un archivo sin registro: conservarlo para investigación y limpiarlo mediante un procedimiento técnico que compare rutas, nunca publicarlo automáticamente.

## Persistencia, copia y restauración
Respaldar PostgreSQL con pg_dump -Fc, el disco privado completo (PDF, recursos), .env/APP_KEY mediante almacén de secretos y el código/locks correspondiente. Respaldar versiones y auditorías conjuntamente; no reconstruir PDF desde plantillas actuales. Los PDF llevan SHA-256 guardado y las descargas lo verifican.

Hacer copia coherente: detener admisión de nuevas emisiones y esperar/vaciar trabajadores, tomar snapshot de archivos y pg_dump, luego reactivar. Alternativa avanzada: snapshots y PITR/WAL coordinados. Cifrar respaldos, restringir lectores, retener copias y probar restauración regularmente.

Restaurar en un entorno aislado con pg_restore a una base vacía y copiar almacenamiento/secretos de la misma copia. Verificar migraciones, conteos, hashes y que no existan rutas faltantes. Iniciar web y cola solo después de comprobar la consistencia. No ejecutar migrate:fresh, db:wipe o un seeder de QA sobre datos institucionales.

## Control previo al lanzamiento
Revisión formal del supervisor y ITIC; nombres oficiales/catálogo, diseño autorizado, acceso a imágenes de firmas y sellos, prueba de impresora y QR desde celular, HTTPS/URL definitiva, backup/restore probado, monitoreo de cola/espacio/errores, cuentas personales y rotación de contraseñas demo excluidas. No se ha solicitado ni realizado publicación institucional.

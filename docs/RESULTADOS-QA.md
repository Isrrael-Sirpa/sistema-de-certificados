# Resultados técnicos finales
Fecha: 18 de octubre de 2026, America/La_Paz. Entrega local de desarrollo y demostración; no despliegue institucional.

## Resultado final comprobado
- Suite completa: **19 pruebas aprobadas, 122 comprobaciones, 10,882 segundos** en la última ejecución.
- Resultado original del ejecutor: `.runtime/phpunit-final.json`.
- TypeScript: `npm run typecheck`, código de salida 0.
- Compilación final: `npm run build`, código de salida 0; cliente Inertia y renderizador Fabric compilados.
- Sintaxis PHP: comprobada con php -l en todos los archivos de app, routes, database, config y bootstrap, sin errores.
- Composer: `composer validate --no-check-publish`, manifiesto y lock válidos.
- Formato PHP: `php vendor/bin/pint --format agent`, aplicado. La variante --dirty se intentó y no se puede usar sin repositorio Git; se aplicó el formateador completo.
- Formato frontend: Prettier 3.9.10 aplicado a TS, TSX, CSS, configuración y scripts; lock actualizado.
- **6 PDF reales inspeccionados:** una página por certificado, texto del destinatario recuperable y QR decodificado desde la imagen del PDF coincidente con verification_url de PostgreSQL. Incluye nombre largo con tildes/ñ, orientación vertical y fondo de imagen.
- Resultado de PDF/QR: `.runtime/qa-pdf-result.json`; PNG de inspección junto a los PDF QA.
- Revisión visual técnica: certificado largo horizontal, vertical y con imagen de fondo; sin texto recortado ni QR tapado.
- Recorrido técnico en navegador: ingreso QA, dashboard, editor, insertar texto, deshacer, guardar/reabrir, selección de un destinatario, revisión previa, confirmación y seguimiento.
- Cola real: `queue:work --env=qa --stop-when-empty --timeout=120 --tries=3 --sleep=1` procesó seis trabajos: cinco se resolvieron de forma idempotente porque sus documentos ya estaban emitidos; uno generó un PDF nuevo desde el lote confirmado en la interfaz. El lote #15 terminó **1 de 1 completados**, cola vacía y seis certificados en PostgreSQL.
- Verificación pública del documento emitido por cola comprobada en navegador estrecho: entidad emisora, destinatario, actividad, tipo, carrera, identificador, fechas y estado. Sin CI, cuentas ni historial.

## Cobertura de las 19 pruebas
1. Redirección de acceso sin sesión y bloqueo de cuentas desactivadas.
2. Separación de actividades, estudiantes, plantillas, PDF, exportaciones y administración entre carreras.
3. Normalización NFKC/ceros/complementos, reutilización global, ausencia de sobrescritura y restricción UNIQUE de PostgreSQL.
4. Discrepancia de CI ajeno sin revelar los nombres.
5. Excel real, detección de duplicados, vista previa, doble confirmación idempotente, resultado y ausencia de emisiones.
6. Treinta inscritos, veinte seleccionados y exactamente veinte trabajos encolados.
7. Operación global de Vicedecanato con dos carreras y un estudiante reutilizado.
8. Idempotencia de clave de operación/confirmación, revisión obligatoria y fechas manuales rechazadas.
9. Revalidación de cuenta desactivada dentro del trabajador; fallo sin documento público.
10. Anulación exclusiva de Vicedecanato, prioridad sobre vencimiento e indicadores coherentes.
11. 29/02/2020 + tres años = 28/02/2023 al mismo instante local.
12. Inmutabilidad por trigger de datos/fechas de certificados y versiones; ediciones posteriores no alteran instantáneas.
13. Descarga autorizada de la versión original.
14. Verificación pública mínima y entrega digital separada del historial.
15. Persistencia real de plantilla y asociaciones de campos; conflicto entre versiones; rechazo de imágenes remotas.
16. Previsualización y PDF real con Chromium, hash persistido, reintento sin duplicación, ZIP y PDF combinado.
17. Bloqueos por QR ausente, elemento fuera de página y texto desbordado.
18. Cargador ficticio bloqueado fuera de una base/entorno QA.
19. Carrera y tipo desactivados impiden nuevas emisiones.

La prueba de infraestructura de unicidad observa la restricción de PostgreSQL; no se ejecutó una prueba de carga concurrente a gran escala. Los bloqueos/índices y la clave por elemento hacen que las peticiones repetidas no dupliquen operaciones.

## Comandos ejecutados
La creación inicial se ejecutó desde la raíz del repositorio; los demás comandos de aplicación, desde `app/`, usando el PHP 8.3.28 de Laragon cuando php del PATH estaba restringido:
```text
composer create-project laravel/laravel app --no-interaction --prefer-dist
composer require laravel/boost --dev --no-interaction
php artisan boost:install --guidelines --no-interaction
composer require inertiajs/inertia-laravel:^3.0 phpoffice/phpspreadsheet:^5.0 endroid/qr-code:^6.0 --no-interaction
npm install --no-audit --no-fund
npm install --save-dev prettier --no-audit --no-fund
php artisan migrate --no-interaction
php artisan migrate --env=qa --no-interaction
php artisan certificates:demo --env=qa --no-interaction
npm run typecheck
npm run build
php artisan route:list --except-vendor
composer validate --no-check-publish
php vendor/bin/pint --dirty --format agent
php vendor/bin/pint --format agent
php artisan test --compact
php artisan test --compact --filter='test_inactive_worker_actor_cannot_issue_even_after_confirmation|test_template_save_preserves_bindings_and_rejects_remote_images'
node scripts/qa-pdf.mjs ../.runtime/qa-pdf-inventory.json
php artisan serve --env=qa --host=127.0.0.1 --port=8000 --no-reload
php artisan queue:work --env=qa --stop-when-empty --timeout=120 --tries=3 --sleep=1
php artisan queue:work --env=qa --timeout=120 --tries=3 --sleep=2
```
También se ejecutaron initdb, pg_ctl y createdb de PostgreSQL 18 para el clúster propio en .runtime, puerto 55432. Las pruebas nunca usan certificados_qa ni certificados_dev.

El inspector PDF usa Python con pypdf, pypdfium2 y Pillow, disponibles en el entorno auxiliar. QA_PYTHON_BINARY indica su ruta; no es dependencia del funcionamiento normal de la aplicación. El archivo de inventario contiene para cada PDF path, recipient y verification_url tomados de PostgreSQL; @zxing/library decodifica el QR desde el render en escala de grises.

## Incidencias encontradas y resueltas
- PHP del PATH/Composer y el empaquetador tuvieron restricciones de acceso; se usó el PHP de Laragon y las autorizaciones de ejecución pertinentes.
- El navegador de PDF no arrancó dentro del entorno restringido; funcionó al ejecutarlo con los permisos necesarios.
- Fabric 7 usa centro como origen predeterminado. Se fijó izquierda/arriba explícitamente en editor, normalizador y renderizador; se repitieron las pruebas.
- migrate:fresh conserva funciones PostgreSQL. Se usó CREATE OR REPLACE para la función inmutable, permitiendo reiniciar la base de pruebas sin funciones duplicadas.
- PostgreSQL JSONB reordena claves. Se corrigió la comparación del test para comprobar igualdad de datos, no el orden de las claves.
- El cargador demo ahora puede reanudarse sin duplicar certificados ya completados.
- Chromium redondeaba medidas de página alrededor de 0,11 mm. La generación final fija MediaBox exacto con pdf-lib. Los primeros tres documentos ficticios anteriores a ese ajuste conservan el original por inmutabilidad; los siguientes verificaron 210 × 297 y 297 × 210 mm.
- El generador inicial de Laravel creó una base SQLite durante su propia instalación. Se retiró ese archivo y el script de creación; la aplicación y toda la validación funcional usan PostgreSQL y la migración rechaza otro motor.

## Datos actuales de demostración
9 carreras ficticias, 10 cuentas personales, 54 identidades reutilizables, 9 actividades, diseños horizontales/verticales y un fondo, seis PDF emitidos (4 vigentes, 1 vencido, 1 anulado). Existe un borrador de veinte entre treinta y un caso de error de revisión controlado. Desarrollo conserva cero cuentas y cero datos ficticios.

## Pendiente de revisión humana / entorno institucional
No se hizo la revisión formal del solicitante en su nombre. Pendientes: impresión física, escaneo con su celular/cámara real, validación de nombres oficiales, catálogo, diseños y autoridades, URL/HTTPS institucionales, prueba de respaldo/restauración en infraestructura ITIC y revisión operativa de capacidad/seguridad del servidor. No se afirma haber ejecutado esas comprobaciones. No hay un bloqueo técnico abierto en el entorno local.

Nota de herramientas: route:list no admite --compact en esta versión; se comprobó correctamente con --except-vendor --json (45 rutas).

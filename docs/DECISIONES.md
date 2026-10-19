# Decisiones, versiones y límites
## Dependencias comprobadas
PHP 8.3.28; Node 24.13.0; PostgreSQL 18 local. Composer lock: Laravel 13.37.0, inertiajs/inertia-laravel 3.5.1, PhpSpreadsheet 5.10.0, endroid/qr-code 6.0.9. npm lock: React/React DOM 19.3.1, Inertia React 3.9.1, TypeScript 5.9.3, Fabric 7.4.0, Tailwind 4.3.3, Vite 7.3.7, Puppeteer 24.43.1, pdf-lib 1.17.1, @zxing/browser 0.1.5 y Noto Sans 5.3.0. Usar composer install y npm ci para reproducir; revisar actualizaciones de seguridad antes de desplegar.

Se contrastaron las generaciones principales con documentación oficial: [Laravel 13](https://laravel.com/docs/13.x/releases), [Inertia 3](https://inertiajs.com/) y [Fabric 7](https://www.fabricjs.com/docs/upgrading/upgrading-to-fabric-70/). Las versiones exactas anteriores proceden de los archivos instalados, no de inferencias sobre la fecha.

## Diseño técnico
- Aplicación integrada dentro de app/, sin API/backend Node adicional. Inertia sirve páginas React y Laravel aplica todas las reglas.
- Modelo relacional con identidad global de estudiante y vínculos carrera/actividad. Los índices únicos y restricciones viven en PostgreSQL.
- Los certificados solo existen después de completar su PDF. Lotes y elementos pueden existir antes y conservar errores. La clave de operación está asociada al actor y al contenido; reutilizarla con otro contenido se rechaza.
- Instantáneas de datos y referencia a una versión inmutable de diseño. Las versiones se agregan; no se reescriben.
- Fechas locales con tres años calendario, instante exacto y tratamiento explícito de 29/02. No hay campos manuales de emisión/vencimiento.
- Origen explícito izquierda/arriba: Fabric 7 cambió el origen predeterminado a centro. Se aplica el mismo criterio en editor, normalizador y renderizador.
- PDF: Fabric en Chromium genera SVG vectorial; Chromium imprime sin márgenes adicionales. pdf-lib fija el tamaño físico exacto en puntos y permite combinar páginas. El documento mantiene texto incrustado, no una captura del lienzo. Las imágenes conservan sus píxeles.
- Noto Sans se distribuye desde dependencias locales, incrustada por el motor. Serif/sans genéricas usan las fuentes instaladas en cliente/servidor; para coincidencia entre equipos usar Noto Sans. No se aceptan fuentes remotas o CSS libre.
- Recursos PNG/JPG/WebP privados, tamaño/dimensiones limitados; SVG subido, filtros, código y URL arbitrarias se excluyen. El diseño usa una lista permitida de propiedades y el motor bloquea toda red externa.
- Enlace de verificación y enlace de entrega son independientes y aleatorios. El token de entrega es una capacidad de descarga del PDF específico; tratarlo como un enlace privado.
- Auto guardado crea versiones y aplica concurrencia optimista. La recuperación local está guardada en el navegador de quien edita, identificada por plantilla; no contiene estudiantes de un lote.

## Límites explícitos
Esta fase usa imágenes de firmas/sellos; no implementa firma digital criptográfica, validación de cadena de certificados ni sellado de tiempo. El QR acredita la consulta del registro, no integridad criptográfica de una copia alterada. La separación PdfRenderer/Issuance permite incorporar un firmador de PDF antes de calcular hash e insertar el registro, conservando el modelo de documentos inmutables.

Cada operación admite hasta 500 destinatarios, exportaciones hasta 200 documentos y diseños hasta 250 objetos. Se pueden preparar varias operaciones para un volumen mayor. Los lotes de más de 200 documentos se descargan por grupos seleccionables en el panel del lote. La revisión de un lote recorre los destinatarios y muestra su progreso; una pestaña debe permanecer abierta durante esa revisión. La cola persiste independientemente de la pestaña una vez confirmada.

El editor muestra guías/márgenes de ayuda y centrado; no constituye un sistema CAD. Un QR agrupado se rechaza para evitar transformaciones que afecten su lectura. No se reconocen automáticamente textos ni logos dentro de una imagen de fondo. Cambiar orientación conserva coordenadas y exige reorganizar.

Se verifican campos requeridos, área de texto, límites, resolución y QR; la evaluación estética, la idoneidad académica de la condición y la legibilidad en cada impresora requieren revisión humana. La aplicación no es un sistema académico completo. No se afirma haber comprobado una impresora física ni la cámara de un celular.

No se configuró un dominio institucional, no se instalaron servicios institucionales y no se publicó el sistema. El clúster local trust es exclusivo de esta demostración; producción requiere credenciales SCRAM y permisos restringidos.


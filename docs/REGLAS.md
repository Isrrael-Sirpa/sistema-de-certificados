# Roles y reglas
## Ámbitos
Vicedecanato administra carreras, cuentas personales y catálogo; consulta todo, emite para una o varias carreras en una operación y anula con motivo. Un jefe consulta y opera su carrera, puede usar recursos y plantillas globales, pero no editar los globales, administrar cuentas ni anular. Una plantilla global puede duplicarse hacia su propia carrera. Las cuentas no están limitadas a diez.

La autorización se aplica en controladores, consultas, asociaciones, recursos privados, descargas, exportaciones y trabajadores. Una cuenta desactivada pierde su sesión en la siguiente petición; el trabajador vuelve a verificar su estado y carrera. Cambiar la asignación de carrera no convierte en accesibles lotes anteriores de otro ámbito.

## Identidad del estudiante y CI
La identidad es global y las asociaciones con carreras y actividades son independientes. CI es texto, normalizado con Unicode NFKC, mayúsculas, espacios externos eliminados y espacios consecutivos reducidos a uno. Se conservan ceros iniciales, letras, guiones, complementos y separadores significativos; no se adivina equivalencia entre un CI con guion y otro sin guion. La columna normalized_ci tiene UNIQUE en PostgreSQL. INSERT ON CONFLICT y bloqueo de fila resuelven reutilización concurrente.

Un CI existente solo se vincula automáticamente cuando nombres y apellidos coinciden tras la misma normalización de texto. No se sobrescribe. Si hay discrepancia se omite y se pide revisión; cuando el estudiante es ajeno al ámbito no se muestran sus nombres. Vicedecanato revisa la identidad y las asociaciones. Un jefe solo puede editar la identidad si pertenece exclusivamente a su carrera; la edición de identidades compartidas corresponde a Vicedecanato.

## Importación
XLSX, máximo 5 MB, 5000 filas y 50 MB descomprimidos. Encabezados: CI, nombres, apellidos. No se aceptan fórmulas. Se valida en servidor. Filas vacías se ignoran; CI repetidos dentro del archivo se marcan y omiten; discrepancias y errores no se importan. La confirmación vuelve a comprobar contra la base dentro de transacciones, es idempotente y presenta nuevos/reutilizados/omitidos/errores. Importar no emite.

## Actividad y selección
La actividad fija carrera responsable y tipo configurable, fechas reales y carga horaria opcional. El participante registra condición y grupo, sin deducir aprobación/asistencia de la inscripción. Una actividad con treinta inscritos puede tener solo veinte destinatarios: únicamente los marcados entran al lote. La selección puede acumular actividades de distintas carreras si opera Vicedecanato; cada elemento conserva su propia carrera y versión de diseño.

## Borrador, revisión y emisión
Un borrador no se verifica públicamente ni inicia vigencia. Todos los elementos requieren revisión con datos reales en el motor del servidor. La revisión guarda una huella de datos; si cambian, no se puede confirmar hasta revisar otra vez. Las advertencias de resolución 72–149 ppp no impiden; resolución inferior a 72, campos obligatorios ausentes, desbordamientos, elementos fuera de página, ausencia/ocultación del QR o QR menor a 25 mm impiden emitir.

Campos automáticos mínimos: entidad emisora, destinatario, actividad, carrera, tipo, identificador, emisión, vencimiento y exactamente un QR. La condición debe estar registrada en el participante. El QR debe estar fuera de grupos, arriba de cualquier elemento que lo cubra, sin giro, reflejo ni transparencia. Su imagen blanca y negra con zona libre se genera desde el servidor.

Se revisa cada destinatario. El ajuste automático reduce el tamaño en pasos de 0,5 px hasta el mínimo definido; si no cabe se bloquea. Puede desactivarse y usar saltos de línea/área explícita. Los elementos fuera de página deben reorganizarse tras cambiar orientación o dimensiones.

Al confirmar se congela una copia de datos y se encolan únicamente los seleccionados. Cada trabajador vuelve a validar al operador, genera identificador aleatorio y URL de alta entropía, calcula las fechas en servidor, genera el PDF, calcula SHA-256 e inserta el certificado dentro de la transacción. Si falla, no existe registro público válido. Cada batch_item_id solo admite un certificado en PostgreSQL.

## Fechas y estados
La zona local es America/La_Paz. Emisión = instante de inicio de la emisión individual en el servidor. Vencimiento = ese mismo instante local tres años calendario después, usando addYearsNoOverflow: 29/02 pasa a 28/02 en un año no bisiesto. Al alcanzar expires_at el certificado está vencido.

Prioridad única: si hay anulación, Anulado; si no y ahora >= expires_at, Vencido; en otro caso, Vigente. Dashboard, filtros y verificación comparten esta regla. Borradores y fallos no se cuentan.

Los endpoints rechazan fechas manuales. El PDF, datos y fechas emitidos, las versiones, las anulaciones y auditorías tienen protección de inmutabilidad en PostgreSQL. Descargar o imprimir nunca recalcula la vigencia. Corregir exige anular y emitir otro certificado con otra clave y QR. El reemplazo guarda replacement_for y debe corresponder al mismo estudiante y carrera de un documento anulado.

## Privacidad y entrega
El QR solo abre datos mínimos del certificado. No incluye CI, cuentas operadoras, auditoría ni historial. No permite descargar el PDF. La entrega usa un token independiente de 256 bits que concede acceso únicamente a ese documento: compartirlo implica permitir esa descarga. Las rutas administrativas requieren sesión y ámbito. ZIP y PDF combinado incluyen solo IDs autorizados.

La entidad emisora siempre es Universidad Mayor de San Andrés — Facultad de Tecnología; el operador aparece únicamente en auditoría. No existe flujo interno de solicitudes de anulación.

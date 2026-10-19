# Revisión manual completa pendiente
La validación técnica automatizada no sustituye la revisión formal del supervisor ni se presenta como realizada en su nombre.

## Entorno y cuentas de demostración
Usar exclusivamente la base certificados_qa y .env.qa. Cuenta de Vicedecanato: supervision.demo@example.test. Cuentas personales de jefes: jefatura01@example.test a jefatura09@example.test. Contraseña ficticia común: Demo-UMSA-2026!. Nunca migrar usuarios ni claves de demostración a producción.

Las nueve carreras se llaman Carrera ficticia 01–09. Los tipos del catálogo llevan la indicación ejemplo configurable. No son nombres ni clasificaciones oficiales.

Excel de casos: app/storage/app/qa-private/fixtures/importacion-demo.xlsx. Contiene reutilización, duplicado interno, discrepancia, nuevo CI con ceros y error por CI vacío. La carga demo no forma parte de la instalación productiva.

## Recorrido de revisión
1. Ingresar como Vicedecanato. Comparar totales de emitidos/vigentes/vencidos/anulados; pulsar cada indicador y comprobar el filtro. Filtrar carrera, actividad y fechas.
2. Administrar una carrera de prueba, cuentas personales y tipos. Editar/desactivar cuenta; confirmar que el historial permanece y la cuenta desactivada no entra. El último administrador activo no se puede retirar.
3. Registrar un estudiante con CI que comience con ceros y complemento. Repetir CI/nombres y confirmar reutilización. Introducir otro nombre y comprobar error sin sobrescritura. Revisar ficha e historial.
4. Descargar plantilla Excel, completar/importar y revisar TODAS las filas antes de confirmar. Confirmar dos veces desde distintas ventanas: no deben aparecer personas duplicadas. Comprobar resultado y ausencia de certificados nuevos.
5. Crear actividad, escoger tipo y carrera, fechas y carga horaria. Asociar estudiantes existentes, registrar condición y grupos. La inscripción por sí sola no debe habilitar la emisión de un participante sin condición.
6. Abrir una plantilla horizontal y una vertical. Crear hoja en blanco y añadir campos obligatorios, QR, texto libre, formas, imágenes, firma y sello. Probar edición de texto, estilos, posición/tamaño, rotación, transparencia, orden, selección con Shift, agrupar/desagrupar, bloqueo, duplicado, márgenes, centrado, zoom, ajuste, deshacer/rehacer. Guardar y volver a abrir.
7. Comprobar guardado automático y recuperación local tras un fallo de conexión. Abrir versiones y recuperar una anterior; debe crearse otra versión. Dos ventanas editando no deben sobrescribir cambios silenciosamente (conflicto de versión).
8. Usar el fondo ficticio de biblioteca. Confirmar que sigue siendo una imagen única, con textos internos sin objetos editables. Cambiar formato/orientación y reorganizar elementos fuera de página.
9. Provocar nombre largo con área insuficiente; revisar ajuste hasta mínimo y bloqueo cuando no cabe. Retirar QR, reducirlo a menos de 25 mm, taparlo o girarlo: debe impedir emitir. Probar un recurso de baja resolución. Corregir y revisar nuevamente.
10. En la actividad ficticia 1 hay treinta participantes. Usar el borrador de veinte, o preparar otro y marcar SOLO veinte. Revisar el lote entero, previsualizar varios destinatarios, confirmar. Con el trabajador en marcha deben generarse exactamente veinte certificados. Diez excluidos no deben recibirlos.
11. Repetir confirmación, doble clic y reintento de lote: los certificados completados conservan ID, PDF y vigencia. Ante una caída real del trabajador, reiniciarlo y reencolar pendientes; comprobar que no duplica. El lote ficticio con condición ausente muestra un error de revisión controlado.
12. Emitir una operación de Vicedecanato que incluya dos carreras con sus diseños apropiados. Cada certificado debe mantener la carrera de su actividad.
13. Descargar PDF original, ZIP y PDF combinado para imprimir. Verificar escala 100 %, orientación, medidas, fuentes, tildes, ñ, nombres largos, transparencias y capas. Probar lectura de QR en pantalla y una impresión física.
14. Abrir la verificación sin sesión, en celular y escritorio. Comparar nombre, actividad, tipo, carrera e identificador con el papel. Un QR pegado sobre otro documento exige comparar datos. Intentar ver un token inexistente y verificar ausencia de historial y CI.
15. Abrir el enlace de entrega individual sin sesión: descarga solo ese PDF, sin acceso al panel ni ficha. El enlace de verificación no descarga el PDF.
16. Anular como Vicedecanato con un motivo suficiente. Comprobar auditoría y estado público; el QR debe seguir funcionando. Intentar anular como jefe por petición directa: debe responder 403. Emitir reemplazo y revisar su relación con el original.
17. Editar estudiante, actividad y plantilla después de emitir; descargar otra vez y comprobar SHA-256 y datos anteriores. Verificar que las fechas no se pueden enviar manualmente.
18. Entrar como jefe 01 e intentar URLs/descargas/recursos de jefe 02, exportaciones con ID ajeno, cuentas y auditoría. Todo debe bloquearse en servidor, también si se ocultan o manipulan los botones.
19. Revisar el certificado histórico ficticio emitido con reloj de prueba 29/02/2020: vence el 28/02/2023. Confirmar que el anulado siempre se muestra anulado. No hay selector de fechas protegidas en la aplicación.

## Registro de observaciones
Anotar cuenta/rol, ruta, pasos, resultado esperado, resultado observado y evidencia. No usar nombres o documentos reales durante QA. Las pruebas de cámara y papel se deben realizar en la red/dispositivo del supervisor; no se han realizado en su nombre.

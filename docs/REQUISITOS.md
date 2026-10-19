Actúa como desarrollador senior full stack y construye una aplicación web completa para la gestión, diseño, emisión y verificación de certificados de posgrado de la Universidad Mayor de San Andrés (UMSA), Facultad de Tecnología, Bolivia.

Necesito que implementes el proyecto en este entorno de trabajo. No te limites a explicar una arquitectura, entregar un plan o construir pantallas estáticas. El resultado debe incluir frontend, backend, base de datos, editor visual, generación de PDF y todos los flujos funcionales descritos a continuación.

## 1. Objetivo y contexto institucional

La Facultad de Tecnología necesita digitalizar la emisión de certificados para actividades de posgrado, cursos, seminarios y otras actividades de formación.

Debe admitir diferentes tipos de certificados, por ejemplo aprobación, asistencia, participación y conocimientos, mediante un catálogo configurable. Estos ejemplos no representan una clasificación oficial confirmada.

La entidad emisora que aparecerá en los certificados y en su verificación será:

Universidad Mayor de San Andrés — Facultad de Tecnología.

La carrera y la actividad se identificarán como información adicional. El usuario que opera el sistema no debe aparecer como entidad emisora; su identidad se registra internamente para auditoría.

Según el contexto proporcionado, la facultad tiene nueve carreras. No inventes sus nombres oficiales: permite configurarlos. Si hacen falta ejemplos para la demostración final, utiliza nombres claramente identificados como ficticios.

El sistema se presentará primero al supervisor para recibir observaciones. Posteriormente, ITIC recibirá el proyecto y realizará el despliegue en un servidor institucional. Desarrolla un sistema funcional con una entrega preparada para ese despliegue posterior.

## 2. Tecnologías

Utiliza esta pila:

- Backend: PHP con Laravel.
- Frontend: React con TypeScript.
- Integración entre Laravel y React: Inertia.
- Base de datos: PostgreSQL.
- Editor visual: Fabric.js.
- Estilos y componentes: Tailwind CSS y componentes accesibles coherentes con la integración elegida.
- Procesamiento de emisiones masivas: colas de Laravel.
- Generación y lectura de QR mediante bibliotecas mantenidas y compatibles.
- Importación de archivos Excel y generación de una plantilla Excel descargable.
- Generación de PDF en el servidor mediante una solución que conserve fielmente el diseño.

Selecciona versiones estables, mantenidas y compatibles entre sí. Documenta las versiones y dependencias utilizadas y conserva los archivos de bloqueo de dependencias.

Mantén una aplicación Laravel integrada con React e Inertia. No añadas un segundo backend independiente sin una necesidad técnica justificada. Node.js puede utilizarse para las herramientas del frontend o para dependencias del motor de PDF si la solución elegida lo requiere.

Utiliza PostgreSQL realmente; no lo sustituyas silenciosamente por SQLite o almacenamiento en memoria.

## 3. Forma de trabajo y alcance

Primero inspecciona el directorio y las instrucciones del repositorio. Si existe trabajo previo, consérvalo y adapta la implementación sin sobrescribir cambios ajenos.

Organiza el desarrollo por módulos y continúa hasta completar los requisitos. Mantén una lista de avance que permita distinguir lo implementado, lo pendiente y los bloqueos reales.

Resuelve decisiones técnicas rutinarias con criterio y documenta los supuestos. Consulta únicamente cuando una respuesta sea indispensable para continuar y no pueda deducirse de estos requisitos.

No reduzcas el alcance a una maqueta navegable. Los formularios deben guardar información, los permisos deben aplicarse en el servidor, los archivos deben generarse realmente y el QR debe consultar registros reales del sistema.

Mi revisión formal de QA y la carga de datos de demostración serán al final de toda la implementación. No me solicites una revisión manual al terminar cada módulo. Durante el desarrollo puedes realizar comprobaciones técnicas de compilación, tipos, migraciones y arranque.

No declares una función terminada si solo está simulada o tiene controles sin implementar.

## 4. Usuarios, roles y separación por carrera

Implementa dos roles principales.

### Superadministrador de Vicedecanato

Puede:

- Consultar y gestionar todas las carreras.
- Crear, editar y desactivar cuentas personales.
- Asignar a cada jefe su carrera.
- Gestionar estudiantes, actividades, recursos y plantillas en el ámbito global.
- Emitir certificados individuales y masivos para cualquier carrera.
- Realizar una operación masiva que incluya destinatarios de varias carreras, conservando la asociación correcta de cada certificado.
- Consultar todos los historiales, indicadores y registros de auditoría.
- Anular certificados de cualquier carrera.

### Jefe de carrera

Puede:

- Acceder únicamente a la información y operaciones correspondientes a su carrera.
- Registrar e importar estudiantes y asociarlos a sus actividades.
- Gestionar las actividades y plantillas de su carrera.
- Emitir certificados individuales y masivos para su carrera.
- Consultar y descargar los certificados correspondientes a su ámbito.

No puede:

- Gestionar usuarios o asignarse otros permisos.
- Emitir certificados para otras carreras.
- Consultar o modificar registros ajenos a su ámbito.
- Anular certificados.

La configuración inicial prevista es una cuenta de Vicedecanato y una cuenta por cada una de las nueve carreras, pero el sistema no debe quedar limitado a diez cuentas.

Las cuentas son personales. Si una carrera tiene varios responsables, cada persona debe tener una cuenta independiente para conservar la trazabilidad.

Aplica estas restricciones en consultas, controladores, acciones, archivos y trabajos en segundo plano, no solamente ocultando botones.

No habrá solicitudes internas de aprobación o anulación. El jefe consulta a Vicedecanato personalmente o por llamada, y Vicedecanato realiza la anulación en el sistema.

## 5. Modelo de datos

Diseña un modelo relacional con migraciones, relaciones, índices y restricciones apropiadas para:

- Usuarios y roles.
- Carreras.
- Estudiantes.
- Actividades y sus participantes.
- Tipos de certificado.
- Plantillas y sus versiones.
- Recursos gráficos.
- Certificados y sus datos definitivos.
- Lotes de emisión y sus elementos.
- Anulaciones.
- Eventos de auditoría.

Evita duplicar al estudiante cuando participa en varias actividades o carreras. Separa su identidad personal de las asociaciones con actividades y carreras.

Conserva en cada certificado emitido una copia de los datos utilizados en su emisión. Cambiar posteriormente el nombre del estudiante, la actividad o la plantilla no debe modificar los certificados ya emitidos.

## 6. Estudiantes y CI

Incluye una sección de estudiantes con:

- Listado paginado.
- Búsqueda por CI y nombre.
- Registro individual.
- Edición autorizada de datos.
- Importación desde Excel.
- Selección de estudiantes existentes para nuevas actividades.
- Acceso a su ficha e historial.

El CI será el criterio principal para detectar duplicados.

Trátalo como texto y define una normalización consistente para detectar coincidencias sin eliminar información significativa, como complementos o ceros iniciales. Documenta esa regla.

Impide duplicados tanto en la lógica del servidor como mediante una restricción en PostgreSQL, incluyendo operaciones concurrentes.

Si un CI ya existe:

- Reutiliza el estudiante existente.
- No crees otro registro.
- No sobrescribas sus datos automáticamente.
- Si los nombres difieren, señala la discrepancia para revisión.

El control global de duplicados no debe revelar datos de otras carreras a usuarios sin autorización. Resuelve la reutilización de registros respetando los permisos.

## 7. Importación desde Excel

Proporciona una plantilla Excel descargable con columnas documentadas, inicialmente CI, nombres y apellidos.

El flujo debe permitir:

1. Descargar la plantilla.
2. Completar una fila por estudiante.
3. Subir el archivo.
4. Revisar una vista previa.
5. Identificar filas válidas, errores, discrepancias y duplicados.
6. Confirmar la importación.
7. Consultar el resultado: nuevos, existentes reutilizados, omitidos y filas con errores.

Detecta duplicados dentro del propio archivo y contra la base de datos. Conserva los CI como texto y valida el contenido en el backend.

Importar estudiantes no emite certificados. La selección de destinatarios y la emisión son pasos posteriores y explícitos.

## 8. Actividades y destinatarios

Permite crear y gestionar cursos, seminarios y otras actividades con datos como:

- Nombre.
- Carrera responsable.
- Descripción.
- Tipo de actividad.
- Fechas de realización.
- Carga horaria, cuando corresponda.
- Participantes.
- Tipo de certificado y condición que acredita.

Permite seleccionar y excluir destinatarios individualmente o por grupos.

Ejemplo obligatorio: una actividad tiene treinta participantes, pero solo veinte deben recibir certificado. El sistema debe emitir únicamente para los veinte seleccionados.

No presupongas que estar registrado o inscrito significa haber aprobado o asistido. Permite registrar la condición correspondiente sin construir un sistema académico completo innecesario.

Las fechas de realización de la actividad son distintas de las fechas automáticas de emisión y vencimiento.

## 9. Dashboard e interfaz

Diseña una interfaz profesional en español, consistente y adecuada para uso institucional.

Incluye un menú lateral con acceso a los módulos autorizados:

- Dashboard.
- Estudiantes.
- Actividades.
- Plantillas y editor.
- Certificados.
- Lotes de emisión.
- Recursos gráficos.
- Administración y auditoría para Vicedecanato.

El dashboard mostrará:

- Total de certificados emitidos.
- Vigentes.
- Vencidos.
- Anulados.
- Accesos a los listados filtrados al pulsar cada indicador.

Incluye filtros útiles por carrera, actividad y fecha de emisión según el rol.

Vicedecanato verá cifras globales; cada jefe, únicamente las de su carrera. No cuentes borradores o emisiones fallidas como certificados emitidos.

Los indicadores y la página de verificación deben usar la misma regla de estado. Un certificado anulado no debe contarse simultáneamente como vigente o vencido.

Añade estados de carga, listas vacías, mensajes comprensibles de error y confirmaciones para acciones importantes. La página pública debe funcionar especialmente bien en celulares.

## 10. Editor visual de certificados

Este es uno de los módulos más importantes. Implementa un editor real basado en Fabric.js.

### Creación de diseños

Debe admitir:

- Hoja en blanco.
- Imagen de fondo de un diseño existente.
- Orientación vertical y horizontal.
- Tamaños de página habituales y dimensiones personalizadas.
- Guardar, abrir y duplicar plantillas.

Las dos orientaciones tendrán las mismas herramientas.

Si se cambia la orientación o el tamaño, permite reorganizar los elementos y advierte cuando queden fuera de la página.

Aclara en la interfaz que una imagen de fondo es un elemento único: sus textos y logos internos no se convierten automáticamente en objetos editables.

### Herramientas

Incluye:

- Insertar, seleccionar, editar y eliminar textos.
- Tipografía, tamaño, color, estilos, alineación y espaciados.
- Insertar imágenes, logos, imágenes de firmas, sellos y marcas de agua.
- Formas y bordes básicos.
- Mover, redimensionar y girar elementos.
- Posición y dimensiones mediante controles numéricos.
- Capas con orden hacia delante y atrás.
- Agrupar y desagrupar.
- Bloquear y desbloquear.
- Duplicar elementos.
- Guías, márgenes y herramientas de alineación.
- Zoom y ajuste de la página al área de trabajo.
- Deshacer y rehacer.
- Transparencia cuando corresponda.
- Biblioteca de recursos reutilizables con permisos adecuados.
- Guardado automático y recuperación de versiones de plantillas.

La interfaz debe organizar estas funciones con claridad: barra de herramientas, panel de propiedades, capas y área de diseño.

### Campos automáticos

Permite insertar campos vinculados a registros, como:

- Nombre completo.
- Nombre de la actividad.
- Tipo o texto del certificado.
- Carrera.
- Carga horaria, cuando corresponda.
- Fechas de la actividad.
- Identificador del certificado.
- Fecha de emisión.
- Fecha de vencimiento.
- QR.

Permite modificar su apariencia y posición. Los valores definitivos deben proceder de los registros y de las reglas del servidor.

Los valores de emisión, vencimiento, identificador y contenido del QR nunca se introducirán manualmente como si fueran datos libres.

### Textos largos y revisión previa

Incluye:

- Áreas de texto configurables.
- Saltos de línea y ajuste de tamaño según reglas explícitas.
- Avisos por desbordamiento.
- Previsualización con los datos reales de cada destinatario antes de emitir.
- Revisión de todo el lote para detectar problemas individuales.

Antes de emitir, detecta:

- Campos obligatorios sin datos.
- Textos fuera de sus áreas.
- Elementos fuera de la página.
- Imágenes con resolución insuficiente para su tamaño de impresión.
- QR ausente, demasiado pequeño o con condiciones que dificulten su lectura.

Distingue advertencias de errores que impiden emitir.

### Persistencia

Guarda las plantillas en una representación editable y versionada. Al volver a abrirlas deben conservarse los elementos, las propiedades y las asociaciones de campos.

Editar una plantilla no debe alterar documentos ya emitidos.

## 11. Emisión, fechas y vigencia

Distingue entre preparar un borrador y emitir definitivamente.

En un borrador todavía no existe un certificado público válido ni empiezan los tres años. Las fechas automáticas se mostrarán como campos pendientes de emisión.

Al confirmar la emisión:

- Valida permisos, destinatarios, datos y plantilla.
- Genera un identificador único.
- Registra automáticamente la fecha y hora de emisión en el servidor.
- Calcula el vencimiento tres años calendario después.
- Guarda los datos y la versión del diseño utilizados.
- Genera y almacena el PDF definitivo y su QR.
- Publica el registro de verificación cuando la emisión haya finalizado correctamente.

Utiliza la zona horaria America/La_Paz para la presentación y el cálculo de las reglas locales. Define de manera consistente el instante de vencimiento y el tratamiento de fechas como el 29 de febrero.

Ningún usuario de la aplicación, incluido Vicedecanato, podrá cambiar manualmente la fecha de emisión o vencimiento.

Esta restricción debe aplicarse en el backend; no basta con deshabilitar campos.

Descargar, imprimir o compartir el documento no reinicia la vigencia.

Después de emitirse, conserva el PDF y sus datos. Para corregir un error, se anula el certificado anterior y se emite otro; no se modifica silenciosamente el documento original.

## 12. Estados y anulaciones

Los estados públicos serán:

- Vigente.
- Vencido.
- Anulado.

Calcula el vencimiento usando las fechas registradas. La anulación tiene prioridad: un certificado anulado debe seguir mostrándose como anulado aunque posteriormente alcance su fecha de vencimiento.

Solo Vicedecanato puede anular.

Exige registrar un motivo y conserva:

- Usuario que anuló.
- Fecha y hora.
- Motivo.
- Certificado afectado.
- Relación con el reemplazo, cuando exista.

No borres el certificado anulado ni su historial. Su QR debe seguir funcionando y mostrar su estado.

El jefe podrá emitir el certificado corregido de su carrera cuando corresponda. El nuevo documento tendrá otro identificador y QR.

No implementes un circuito de solicitudes de autorización dentro del sistema.

## 13. Emisión masiva

Implementa colas de Laravel y seguimiento persistente de lotes.

Debe permitir:

- Elegir actividad y plantilla.
- Seleccionar destinatarios.
- Previsualizar y revisar.
- Confirmar la emisión.
- Mostrar progreso y resultados.
- Identificar errores por destinatario.
- Reintentar únicamente los elementos fallidos o pendientes.

Implementa idempotencia para impedir que dobles clics, reenvíos de solicitudes o reintentos de trabajos creen emisiones adicionales de la misma operación.

No prohíbas que una persona obtenga certificados legítimos para otras actividades, tipos o reemplazos. Distingue esos casos de una repetición accidental.

Coordina transacciones, archivos y trabajos para que una emisión fallida no aparezca públicamente como válida y los certificados completados no se dupliquen al reintentar.

Documenta cómo ejecutar y supervisar los trabajadores de cola.

## 14. PDF, descarga, impresión y entrega digital

El PDF final debe respetar:

- Tamaño físico y orientación.
- Posiciones, márgenes y capas.
- Fuentes, caracteres en español y saltos de línea.
- Colores, imágenes y transparencias compatibles.
- Calidad suficiente para impresión.
- Lectura del QR desde el PDF y desde una impresión.

No consideres suficiente una captura de pantalla de baja resolución. Elige e implementa una solución que reproduzca fielmente la plantilla y documenta cualquier dependencia adicional.

Incluye:

- Descarga del certificado individual.
- Descarga de varios PDF en un ZIP.
- Documento combinado o mecanismo equivalente para impresión conjunta.
- Enlace individual para entrega digital con acceso apropiado.
- Descarga posterior de la misma versión emitida.

Distingue el acceso al documento de la página pública de verificación. Compartir un certificado no debe dar acceso a la aplicación administrativa ni al historial completo del estudiante.

## 15. QR y verificación pública

Cada certificado tendrá su propio QR con una URL de verificación y un identificador público no fácilmente enumerable.

El editor permitirá colocarlo en diferentes posiciones, manteniendo proporciones, contraste, margen y tamaño adecuados.

Su contenido se genera desde el sistema y debe corresponder al registro correcto.

La página pública funcionará sin iniciar sesión y mostrará:

- Universidad Mayor de San Andrés — Facultad de Tecnología.
- Destinatario.
- Actividad y tipo de certificado.
- Carrera o unidad correspondiente.
- Identificador.
- Fecha de emisión.
- Fecha de vencimiento.
- Estado actual.

No expongas datos personales innecesarios, cuentas internas, auditoría o el historial completo.

Permite comparar la información de la página con el certificado presentado. Un QR copiado a otro documento no debe sustituir esa comparación.

Los QR de certificados vencidos o anulados deben seguir abriendo el registro.

Configura la dirección base mediante variables de entorno. No codifiques localhost ni un dominio institucional inventado. Documenta cómo probar el QR desde un celular y cómo configurar la URL pública definitiva antes de emitir documentos de producción.

## 16. Ficha e historial del estudiante

Cada estudiante tendrá una ficha interna, sin que eso implique una cuenta para iniciar sesión.

Mostrará:

- Datos personales autorizados.
- Total de certificados dentro del ámbito del usuario.
- Lista de certificados con actividad, tipo, carrera, fechas y estado.
- Filtros.
- Acceso al detalle y descarga autorizada.
- Certificados vigentes, vencidos y anulados.

Vicedecanato podrá consultar el historial global. Cada jefe verá únicamente los registros correspondientes a su carrera.

## 17. Firmas y sellos

En esta versión se incluirá la inserción de imágenes de firmas y sellos en el editor, con controles de diseño y permisos de acceso a los recursos.

La firma digital criptográfica verificable del PDF queda fuera de esta fase y debe documentarse como mejora futura.

El QR no equivale a una firma digital. No muestres indicadores que afirmen que un PDF está firmado digitalmente si esa función no está implementada.

Deja una arquitectura que permita incorporar la firma digital posteriormente sin sustituir el sistema completo.

## 18. Seguridad y auditoría

Implementa:

- Autenticación y cierre de sesión.
- Gestión de cuentas por Vicedecanato.
- Autorización en el servidor y separación por carrera.
- Protección CSRF y manejo seguro de sesiones.
- Validación de datos y archivos.
- Restricciones de formatos, tamaños y acceso a recursos subidos.
- Tratamiento seguro de contenido utilizado en el editor y el motor de PDF.
- Protección de descargas y endpoints administrativos.
- Límites razonables contra abuso de la consulta pública.
- Secretos mediante variables de entorno.
- Auditoría de emisiones, anulaciones, cambios relevantes y gestión de usuarios.

Desactivar una cuenta no debe eliminar los certificados ni la trazabilidad de sus operaciones.

## 19. QA y datos de demostración al final

El orden acordado es:

1. Implementar todos los módulos.
2. Completar la integración funcional.
3. Preparar un entorno de demostración y QA separado de producción.
4. Cargar los datos ficticios de demostración.
5. Ejecutar la validación automatizada final.
6. Preparar mi revisión manual completa.
7. Corregir fallos y volver a comprobar lo afectado.

No cargues datos de demostración como parte automática de una instalación productiva. Proporciona un comando explícito para cargarlos únicamente en el entorno adecuado.

La creación inicial segura del administrador y de la configuración necesaria no cuenta como carga de datos ficticios.

Los datos de demostración deben cubrir:

- Vicedecanato y nueve carreras ficticias o configurables.
- Cuentas personales de jefes.
- Estudiantes reutilizados en varias actividades.
- CI repetidos y discrepancias para probar importaciones.
- Plantillas verticales y horizontales.
- Diseños desde cero y con imagen de fondo.
- Nombres largos y caracteres especiales.
- Certificados vigentes, vencidos y anulados.
- Lotes con resultados completos y fallos controlados.

Para probar vencimientos utiliza mecanismos exclusivos de prueba, como un reloj controlado y fixtures. No añadas un control normal de la aplicación para modificar las fechas protegidas.

En la fase final verifica automáticamente:

- Restricciones de acceso entre carreras.
- Emisión global de Vicedecanato.
- Anulación exclusiva de Vicedecanato.
- Unicidad de CI e importación sin sobrescrituras.
- Idempotencia de emisiones y reintentos.
- Cálculo de vigencia.
- Inmutabilidad de fechas y documentos emitidos.
- Estados y prioridad de la anulación.
- Separación entre consulta pública e historial interno.
- Generación de PDF, ZIP y persistencia de plantillas.

Prepara una guía manual de QA para comprobar el flujo completo, el editor, las importaciones, la impresión, los QR, los permisos y los historiales.

Mi QA manual se realizará cuando toda la implementación esté terminada. No afirmes haberlo realizado en mi nombre.

Reporta los comandos ejecutados, resultados y cualquier comprobación que no hayas podido completar.

## 20. Entrega y preparación para ITIC

Entrega:

- Código completo y organizado.
- Migraciones y restricciones de PostgreSQL.
- Archivos de dependencias y versiones.
- Archivo de ejemplo de variables de entorno sin secretos.
- Instrucciones de instalación local, teniendo en cuenta que trabajo desde una laptop.
- Procedimiento para crear el administrador inicial.
- Comandos de arranque del backend, frontend y colas.
- Comando de carga de demostración y precauciones de entorno.
- Instrucciones y resultados del QA automatizado final.
- Guía de revisión manual.
- Documentación de roles y reglas de negocio.
- Registro de decisiones técnicas, supuestos y limitaciones.
- Preparación de despliegue para ITIC: servidor web, HTTPS, URL pública, PostgreSQL, archivos persistentes, fuentes, dependencias del PDF, colas, respaldos y restauración.

No publiques el sistema ni asumas acceso al servidor institucional. La entrega debe permitir que ITIC lo despliegue posteriormente.

## 21. Criterio de finalización

El proyecto estará implementado cuando los módulos estén conectados y operativos, los datos persistan en PostgreSQL, los PDF y QR funcionen realmente y los permisos se apliquen en el servidor.

No sustituyas funcionalidades por botones decorativos, respuestas simuladas o comentarios pendientes.

Si existe un bloqueo real, informa qué falta, qué has intentado y qué necesitas para resolverlo. No ocultes limitaciones ni declares pruebas aprobadas sin ejecutarlas.

Comienza inspeccionando el entorno, organiza el trabajo y desarrolla el proyecto completo conforme a estos requisitos. Conserva el avance para poder continuar desde el siguiente punto pendiente si la sesión se interrumpe.
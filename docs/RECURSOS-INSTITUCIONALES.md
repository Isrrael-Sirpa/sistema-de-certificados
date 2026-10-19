# Recursos institucionales verificados

Revisión: **18 de octubre de 2026**, zona `America/La_Paz`. Se consultaron directamente los portales oficiales y se inspeccionaron los archivos descargados con Pillow y visualmente. La procedencia institucional de un archivo no constituye una afirmación de adopción oficial del software ni un manual de identidad normativa.

## Selección recomendada

Los originales están en `app/public/institutional/`. Se conservan íntegros: no se recortaron cabeceras, no se generaron emblemas, no se eliminaron fondos y no se alteraron colores ni proporciones. El renderizado debe usar escala uniforme y `object-fit: contain`; nunca forzar las imágenes a una relación cuadrada.

| Archivo | Procedencia comprobada | Características | Uso recomendado y límite |
|---|---|---|---|
| `umsa.png` / `umsa-emblem.png` | [Página oficial de logos de Ingeniería Industrial UMSA](https://industrial.umsa.bo/es/logos-carrera), enlace «Logo Universidad Mayor de San Andrés» | PNG RGBA, 600 × 675 px, transparencia real (alfa 0–255). Ambos archivos son copias idénticas del original oficial; se cotejó nuevamente su SHA-256 con una descarga actual. | Escudo común de la Universidad en login, aplicación, verificación y certificados. A 32 mm de alto: aproximadamente 536 ppp. Los márgenes transparentes pertenecen al original. No se utiliza el emblema de Ingeniería ni de esa carrera. |
| `facultad-official-original.png` | [Convocatoria oficial UMSA de la Facultad de Tecnología](https://www.umsa.bo/umsa-noticias/-/asset_publisher/sIpuYXdbB9M8/content/03-07/20142), imagen «Logo Procedencia» | PNG indexado, 257 × 231 px, tabla de transparencia real (alfa 0–255 al decodificar). Incluye el emblema multicolor y la banda curva roja/azul a la derecha. | Recurso independiente auténtico de Facultad, íntegro. Adecuado para interfaz y tamaño pequeño en certificados. A 19,5 mm de alto: aproximadamente 301 ppp; a 20 mm: 293 ppp; a 24 mm: 244 ppp. Preferir 19,5–20 mm y conservar toda la composición. No es un maestro vectorial de alta resolución. |

Descargas originales:

- [Escudo UMSA PNG](https://industrial.umsa.bo/documents/3265709/4976452/logo+umsa.png/7f406af9-7d79-79d0-627c-3ef80c007219?t=1647546665547).
- [Gráfico independiente de Facultad PNG](https://www.umsa.bo/documents/20142/189706/logo-ft.png/6c720c61-5ddf-f338-96ce-d71db37c33a1?t=1549983540487).

Huella SHA-256 del escudo UMSA: `907697959dde0cd8c762c9e13baaaac6d745b4a63b958938e9d9daacb2b272da`.

Huella SHA-256 del gráfico independiente de Facultad: `0944e31c0aaca3453902f6e088a98d5e227c5331d78066bb0c863e3c107955c6`.

La búsqueda en los portales oficiales no localizó un archivo vectorial o un original independiente de Facultad con resolución superior y procedencia verificable. Esto es una limitación de esta búsqueda, no una afirmación de que no exista.

## Tres referencias del encargo

| Recurso | Inspección realizada | Decisión |
|---|---|---|
| [Cabecera institucional](https://ft.umsa.bo/documents/339504/342307/Banner-rhFT.jpg/870e0245-82a1-1055-f88c-22faa299725b) | JPEG RGB 1600 × 238 px, opaco. Contiene ambos emblemas, texto institucional y engranajes en una composición horizontal. Conservada como `reference-banner-rh-ft.jpg`. | Referencia visual auténtica. No se recortó ni se usa como archivo maestro de los emblemas. |
| [Logo configurado por el portal](https://ft.umsa.bo/image/layout_set_logo?img_id=4069573) | PNG RGBA 95 × 95 px, transparencia real; visualmente es un icono de perfil muy claro. El CSS del portal aplica `.logo img { opacity: 0 !important }`. Conservado como `reference-layout-logo.png`. | Descartado para identidad institucional y para impresión. El nombre del endpoint no demuestra que sea un escudo. |
| [Gráfico blanco del pie](https://ft.umsa.bo/documents/20142/33077/blancopeq.png/36f4df4d-7c80-5bed-9451-b09907d7a286) | PNG RGBA 120 × 216 px, escudo UMSA blanco con alfa 0–255. Conservado como `reference-footer-white.png`; coincide con el preexistente `umsa-white-small.png`. | Auténtico y útil para interfaz pequeña sobre fondo oscuro. No seleccionado como maestro de impresión por resolución. |

Las tres referencias se descargaron directamente y se inspeccionaron, aun cuando el lector web no pudo mostrar sus URLs binarias.

## Archivos preexistentes conservados

- `facultad-user-original.jpg` (425 × 425, RGB) y `facultad.png` (425 × 425, RGB) ya estaban en el proyecto. Sus nombres y metadatos previos los atribuían al usuario, pero esa atribución no está acreditada por sí sola. Se describen como **recursos preexistentes del proyecto**. La apariencia general corresponde al emblema de Facultad, pero no se localizó una publicación oficial del archivo exacto. No se sobrescribieron. Para la nueva identidad se recomienda el archivo oficial independiente anterior.
- `umsa-user-original.png` (1080 × 1920, RGBA) también es preexistente y se conserva sin cambios. Para la nueva identidad se recomienda la copia cotejada con la fuente oficial.
- No se extrajeron firmas ni sellos de documentos públicos. Los PDF institucionales encontrados en búsquedas se trataron como referencias documentales, no como autorización de esos recursos.
- No se incorporan logos propios de carreras sin archivos verificables. Las nueve plantillas deben usar los emblemas comunes y el nombre de la carrera.

## Colores observados y contraste

Se consultó el HTML/CSS servido por [el portal de la Facultad](https://ft.umsa.bo/) y [su oferta académica](https://ft.umsa.bo/oferta-academica). Los siguientes valores sí aparecen en los estilos examinados:

| Color observado | Uso observado en el portal | Contraste con blanco puro |
|---|---|---|
| `#024966` | Fondo de cabecera y navegación | 9,78:1 |
| `#BB2026` | Bordes, líneas y acentos | 6,27:1 |
| `#FFFFFF` | Texto sobre fondos oscuros | — |
| `#F5F7F8` | Fondo del contenido | — |
| `#0051A0` | Menú desplegable activo | 7,82:1 |
| `#32639E` | Títulos de portlets y secciones | 6,15:1 |
| `#01364D` | Fondo al pasar sobre `.accordion .tab` | 12,84:1 |

Los contrastes anteriores se calcularon con la luminancia relativa sRGB y la fórmula `(Lmayor + 0,05)/(Lmenor + 0,05)`. Los cinco tonos oscuros superan 4,5:1 con blanco; esto comprueba esas parejas, no certifica por sí solo toda la interfaz.

Estos son colores **observados**, no una paleta normativa confirmada. Neutros de texto y bordes, colores de éxito/advertencia/error, radios, espaciados y sombras son propuestas de la aplicación y deben identificarse como tales en los tokens. La adaptación usa superficies limpias; las texturas de engranajes del portal no son necesarias detrás de tablas o campos.

## Oferta académica cotejada

La [oferta académica oficial de la Facultad](https://ft.umsa.bo/oferta-academica) enumera: Aeronáutica; Construcciones Civiles; Electricidad Industrial; Electromecánica; Electrónica y Telecomunicaciones; Geodesia, Topografía y Geomática; Mecánica Automotriz; Mecánica Industrial; Química Industrial. No se infieren autoridades, condiciones académicas ni paletas particulares de cada carrera.

## Pendientes reales

1. Maestro independiente de Facultad de mayor resolución, idealmente vectorial, si la institución lo proporciona. La versión oficial localizada permite uso pequeño conservando su composición íntegra.
2. Firmas y sellos autorizados por la administración. Deben mantenerse como áreas configurables y bloquear la emisión cuando el recurso esté marcado obligatorio y falte. Una imagen de firma no es una firma digital criptográfica.
3. Validación institucional de uso y calidad de impresión física. La consulta de páginas públicas y la inspección digital no sustituyen esa revisión.

El inventario estructurado está en `app/public/institutional/sources.json`. Los recursos seleccionados se sirven localmente para que aplicación y PDF no dependan de descargas externas durante su uso.

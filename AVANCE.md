# Avance y continuidad
Solicitud íntegra conservada en [docs/REQUISITOS.md](docs/REQUISITOS.md). Entrega local para supervisión, sin publicación.

## Implementación
- [x] Inspección del directorio vacío e instrucciones; no había cambios previos que preservar.
- [x] Laravel 13, React/TypeScript, Inertia 3, Tailwind y autenticación.
- [x] PostgreSQL real, relaciones, índices únicos, restricciones, ámbitos y auditoría.
- [x] Administración, cuentas personales, carreras y catálogo configurable.
- [x] Estudiantes, reutilización global sin sobrescritura, ficha e historial por ámbito.
- [x] XLSX descargable, importación con vista previa/confirmación/resultados.
- [x] Actividades, participantes, condición/grupos y selección explícita.
- [x] Recursos privados y editor Fabric con propiedades, capas, grupos, bloqueo, guías, zoom y deshacer.
- [x] Versiones inmutables, guardado automático, recuperación y control de concurrencia.
- [x] Previsualización individual y revisión completa de lotes con datos reales.
- [x] PDF vectorial y QR generados en servidor; vigencia automática e inmutabilidad.
- [x] Colas, progreso persistente, idempotencia y reintentos.
- [x] Verificación pública, entrega individual, ZIP y PDF combinado.
- [x] Dashboard y estados coherentes; anulación exclusiva de Vicedecanato y reemplazos.
- [x] Entornos separados, carga ficticia explícita y datos finales de QA.
- [x] Suite: 19/19 pruebas y 122 comprobaciones; 6 PDF/QR inspeccionados.
- [x] Compilación, tipos, sintaxis, formato y recorrido técnico en navegador.
- [x] Documentación local, reglas, resultados, QA manual, despliegue y respaldos ITIC.

## Estado al entregar
Aplicación local en http://127.0.0.1:8000, entorno QA. PostgreSQL propio en 127.0.0.1:55432; datos dentro de .runtime/postgres. Bases certificados_dev, certificados_qa y certificados_test independientes. El servicio PostgreSQL preexistente no fue modificado.

Cuenta ficticia: supervision.demo@example.test, contraseña QA Demo-UMSA-2026!. Jefes de ejemplo jefatura01@example.test a jefatura09@example.test. No usar estas cuentas en producción.

Guías y comandos en README.md y docs/. La instalación de producción no carga demostración y crea el administrador mediante certificates:admin. Dependencias exactas en app/composer.lock y app/package-lock.json.

## Siguiente paso
- [ ] Revisión manual completa del supervisor siguiendo docs/QA.md; todavía no realizada por el solicitante.
- [ ] Corregir las observaciones reales que se reciban y volver a comprobar lo afectado.
- [ ] Configurar nombres/diseños oficiales y preparar entorno institucional con ITIC.
- [ ] Publicación institucional solo cuando sea solicitada y autorizada.

Sin bloqueos técnicos locales abiertos. Firma digital criptográfica fuera de esta fase, documentada como mejora. No se ejecutó QA de impresora física, cámara del usuario ni restauración institucional; ver docs/RESULTADOS-QA.md.

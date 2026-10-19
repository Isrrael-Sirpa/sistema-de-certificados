# Sistema institucional de certificados · UMSA
Aplicación Laravel integrada con React, TypeScript e Inertia para Universidad Mayor de San Andrés — Facultad de Tecnología. Entrega local para supervisión; no se ha publicado ni desplegado en un servidor institucional.

El código está en `app/`. Los archivos Composer y npm están bloqueados. PostgreSQL es obligatorio.

## Entrada rápida en esta laptop
La instancia PostgreSQL aislada del proyecto usa 127.0.0.1:55432. Desarrollo usa `certificados_dev`; demostración usa `certificados_qa`; pruebas destructivas usan exclusivamente `certificados_test`.

Desde `app/`:
```powershell
& 'C:\laragon\bin\php\php-8.3.28-Win32-vs16-x64\php.exe' artisan serve --env=qa --host=127.0.0.1 --port=8000
```
En otra terminal:
```powershell
& 'C:\laragon\bin\php\php-8.3.28-Win32-vs16-x64\php.exe' artisan queue:work --env=qa --timeout=120 --tries=3 --sleep=2
```
Abrir http://127.0.0.1:8000. La compilación ya genera los recursos; no se necesita un servidor frontend para usarla. Para desarrollar: `npm run dev`.

Cuenta ficticia de Vicedecanato: `supervision.demo@example.test`. Contraseña exclusiva de QA: `Demo-UMSA-2026!`. Las nueve cuentas personales de ejemplo usan `jefatura01@example.test` hasta `jefatura09@example.test`, con la misma contraseña de demostración. Nunca trasladar estas cuentas a producción.

## Documentación
- [Instalación local y arranque](docs/INSTALACION.md)
- [Roles, datos y reglas del negocio](docs/REGLAS.md)
- [Guía completa de revisión manual](docs/QA.md)
- [Resultados técnicos y comandos](docs/RESULTADOS-QA.md)
- [Despliegue, respaldo y restauración para ITIC](docs/ITIC.md)
- [Decisiones, versiones y límites](docs/DECISIONES.md)
- [Avance y continuidad](AVANCE.md)

Los datos de demostración se cargan explícitamente con `php artisan certificates:demo --env=qa`, nunca con la instalación ni con el seeder normal. La revisión manual formal del solicitante está pendiente.

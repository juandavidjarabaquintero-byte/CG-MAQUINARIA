# CG Maquinaria · Tablero de Maquinaria

App web instalable (PWA) para administrar una flota de maquinaria en alquiler: jornadas con foto del horómetro, novedades, repuestos, combustible, clientes y cobros, gastos de la flota, fondos y anticipos, validación de registros e informes (PDF, Excel, Word, CSV, web). Funciona sin internet y sincroniza al volver la señal.

- `index.html` · la app completa (un solo archivo).
- `sw.js`, `manifest.webmanifest`, `icons/` · instalación y uso sin conexión.
- Guardado: solo en el equipo, **Google Drive directo** (entrar con Google, un usuario en varios equipos) o **Apps Script** (`apps-script/Code.gs`, trabajo en equipo con Sheet).
- `apps-script/INSTALAR.md` · instalación por rol.

Roles: Administrador de la app (todo y valida), Auxiliar de mina (registra con botones grandes, no borra), Dueño (solo ve).

Pruebas: `tools/` (simulador de Apps Script, Drive simulado y Playwright).

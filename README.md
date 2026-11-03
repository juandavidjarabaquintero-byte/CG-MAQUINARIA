# CG Maquinaria · Tablero de Maquinaria

App web instalable (PWA) para administrar una flota de maquinaria en alquiler: jornadas con foto del horómetro, novedades, repuestos, combustible, clientes y cobros, gastos de la flota, fondos y anticipos, validación de registros e informes (PDF, Excel, Word, CSV, web). Funciona sin internet y sincroniza al volver la señal.

- `index.html` · la app completa (un solo archivo).
- `sw.js`, `manifest.webmanifest`, `icons/` · instalación y uso sin conexión.
- `apps-script/Code.gs` · servicio opcional para guardar en Google Drive y Sheets.
- `apps-script/INSTALAR.md` · instalación por rol.

Roles: Administrador de la app (todo y valida), Auxiliar de mina (registra con botones grandes, no borra), Dueño (solo ve).

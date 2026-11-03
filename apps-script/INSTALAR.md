# Tablero de Maquinaria · Instalación por rol

App: https://juandavidjarabaquintero-byte.github.io/CG-MAQUINARIA/

## Opción A · Solo en un equipo (sin Drive)
Abrir la app → Ajustes → **Solo en este equipo**. Todo queda guardado en ese equipo; respaldo con **Copia de seguridad**.

## Opción B · Con Google Drive (varios equipos)
### 1. Administrador de la app (una sola vez, con la cuenta de Google del dueño)
1. https://script.google.com → **Nuevo proyecto** → pegar `Code.gs` → Guardar.
   - Opcional: en `DRIVE_FOLDER` pegar el ID de la carpeta elegida. Vacío = crea "Tablero de Maquinaria" en Mi unidad.
2. Ejecutar **configurar** → autorizar.
3. **Implementar → Nueva implementación → Aplicación web** · Ejecutar como: Yo · Acceso: Cualquier usuario → copiar la URL `/exec`.
4. En la app: Ajustes → **Google Drive** → pegar la URL y la clave ADM del registro de ejecución → **Guardar y conectar**.

### 2. Invitar a los demás (desde la app del administrador)
Ajustes → **Invitar personas**:
- **Auxiliar de mina**: elegir su máquina → WhatsApp, copiar enlace o QR.
- **Dueño**: WhatsApp, enlace o QR.

Cada persona abre su enlace en el celular: la app queda conectada con su perfil. Después la instala:
- iPhone: Safari → Compartir → Agregar a pantalla de inicio.
- Android: Chrome → ⋮ → Instalar aplicación.

## Qué ve cada rol
| Rol | Ve | Puede |
|---|---|---|
| Administrador de la app | Todo | Registrar, corregir, borrar y **validar** lo que envían los auxiliares |
| Auxiliar de mina | Pantalla con botones grandes | Iniciar/terminar jornada con foto del horómetro, novedades, repuestos y combustible con foto de la factura. No borra |
| Dueño | Panel, máquinas, clientes, informes | Solo ver |

Sin señal en la mina: todo se guarda en el celular y se envía cuando hay internet.

## En el Drive
- Sheet `Tablero de Maquinaria · Datos` con la pestaña **INFORME DUEÑO** (se actualiza sola).
- `Soportes/` fotos y facturas · `Informes/AAAA-MM/` PDF guardados desde la app.

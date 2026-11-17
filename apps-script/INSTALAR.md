# Tablero de Maquinaria · Instalación por rol

App: https://juandavidjarabaquintero-byte.github.io/CG-MAQUINARIA/

## Opción A · Solo en un equipo (sin Drive)
Abrir la app → Ajustes → **Solo en este equipo**. Todo queda guardado en ese equipo; respaldo con **Copia de seguridad**.

## Opción B · Google Drive directo (sin Apps Script)
Para un solo usuario (el administrador) en todos sus equipos. No permite invitar auxiliares ni dueños.

Abrir la app → Ajustes → **Google Drive directo** → **Entrar con Google** → elegir la cuenta y permitir el acceso. La app crea en Mi unidad la carpeta `Tablero de Maquinaria` con `Tablero de Maquinaria · datos.json`, `Soportes/` e `Informes/AAAA-MM/`. En otro equipo se repite lo mismo con la misma cuenta y se reciben los datos.

- La sesión de Google dura alrededor de una hora; después la app pide tocar **Sincronizar** para volver a entrar (no hace falta escribir la clave otra vez).
- La app solo puede ver y modificar los archivos que ella misma creó en el Drive (permiso `drive.file`).

### Configuración única del ID de cliente (quien publica la app)
1. https://console.cloud.google.com → crear un proyecto (p. ej. "CG Maquinaria").
2. **APIs y servicios → Biblioteca → Google Drive API → Habilitar**.
3. **Google Auth platform → Branding → Get started**: nombre de la app, correo de soporte, público **Externo**, correo de contacto → **Create**.
4. **Data Access → Add or Remove Scopes**: agregar `.../auth/drive.file` → **Save**.
5. **Clients → Create Client** → tipo **Web application** → en **Authorized JavaScript origins** agregar `https://juandavidjarabaquintero-byte.github.io` → **Create** → copiar el ID (termina en `.apps.googleusercontent.com`).
6. **Audience**: mientras la app esté en *Testing* solo entran los correos agregados en **Test users**. Para que entre cualquier cuenta: **Publish app** (`drive.file` es un permiso no sensible; Google puede pedir la verificación básica de la marca).
7. Pegar el ID en `index.html` (`const GOOGLE_CLIENT_ID='…'`) y publicar, o pegarlo en Ajustes → Google Drive directo en cada equipo.

## Opción C · Con Google Drive y Apps Script (trabajo en equipo)
### 1. Administrador de la app (una sola vez, con la cuenta de Google del dueño)
1. https://script.google.com → **Nuevo proyecto** → pegar `Code.gs` → Guardar.
   - Opcional: en `DRIVE_FOLDER` pegar el ID de la carpeta elegida. Vacío = crea "Tablero de Maquinaria" en Mi unidad.
2. Ejecutar **configurar** → autorizar.
3. **Implementar → Nueva implementación → Aplicación web** · Ejecutar como: Yo · Acceso: Cualquier usuario → copiar la URL `/exec`.
4. En la app: Ajustes → **Google Drive con Apps Script** → pegar la URL y la clave ADM del registro de ejecución → **Guardar y conectar**.

### 2. Cargar máquinas y auxiliares (Administrador)
- Maquinaria → **Nueva máquina** (cliente, tarifa, foto).
- Ajustes → **Auxiliares de mina** → **Nuevo auxiliar**: nombre, celular y sus máquinas.

### 3. Invitar a los demás (desde la app del administrador)
- **Auxiliar de mina**: Ajustes → Auxiliares de mina → **Invitar** junto a su nombre → WhatsApp, copiar o QR. El enlace es personal: solo verá y registrará en sus máquinas y sus registros quedan con su nombre.
- **Dueño**: Ajustes → **Invitar personas** → Dueño → WhatsApp, enlace o QR.
- Si un auxiliar pierde el celular o deja de trabajar: **Generar clave nueva** o editarlo y marcar **Desactivado**.

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

## En el Drive (opción C)
- Sheet `Tablero de Maquinaria · Datos` con la pestaña **INFORME DUEÑO** (se actualiza sola).
- `Soportes/` fotos y facturas · `Informes/AAAA-MM/` PDF guardados desde la app.

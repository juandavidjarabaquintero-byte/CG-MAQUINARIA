/**
 * Tablero de Maquinaria · Servicio de sincronización y Drive
 * Guarda los datos en un Google Sheet y los soportes e informes en una carpeta del Drive del dueño.
 *
 * Instalación (una sola vez, con la cuenta de Google del dueño):
 *  1. script.google.com → Nuevo proyecto → pega este archivo completo → Guardar.
 *  2. (Opcional) En DRIVE_FOLDER pega el ID de la carpeta del Drive donde quieres todo.
 *     Si lo dejas vacío se crea la carpeta "Tablero de Maquinaria" en Mi unidad.
 *  3. Elige la función "configurar" → Ejecutar → autoriza los permisos.
 *  4. Implementar → Nueva implementación → Aplicación web · Ejecutar como: Yo · Acceso: Cualquier usuario.
 *  5. Copia la URL de la aplicación web y las claves que muestra el registro de ejecución.
 */

const VERSION = 20261027;
const DRIVE_FOLDER = '';
const CFG = {
  get SHEET_ID() { return PropertiesService.getScriptProperties().getProperty('SHEET_ID'); },
  get FOLDER_ID() { return PropertiesService.getScriptProperties().getProperty('FOLDER_ID'); },
  APP_FOLDER: 'Tablero de Maquinaria',
  REPORT_TAB: 'INFORME DUEÑO'
};

const MODS = {"flota":{"name":"Gastos de la flota","subs":{"operadores":"Operadores y nómina","transporte":"Transporte de máquinas","legal":"Seguros, impuestos y trámites","taller":"Taller y herramientas","admin":"Administración"}}};
const NATL = {gasto: 'Gasto', costo: 'Costo', inversion: 'Inversión', anticipo: 'Anticipo'};
const OBL_ASSET = {veh: 'Vehículo', cab: 'Caballo', inm: 'Inmueble', eq: 'Equipo de la mina'};

// [encabezado, campo, tipo, editable]   tipos: d fecha · n número · t texto · m mes · proj · sub · nat · ref · calc · link · bool · sc
const SCHEMA = {
  rh: {tab: 'APP Jornadas', req: ['fecha', 'hi'], cols: [
    ['Fecha', 'fecha', 'd', 1], ['Máquina', 'mq', 'mq', 1], ['Cliente u obra', '_cli', 'calc', 0], ['Tarifa por hora', 'tar', 'n', 1],
    ['Horómetro inicio', 'hi', 'n', 1], ['Horómetro final', 'hf', 'n', 1], ['Horas', 'horas', 'n', 0], ['Valor', '_val', 'calc', 0],
    ['Operador', 'operador', 't', 1], ['Novedad', 'obs', 't', 1], ['Foto', 'fotoUrl', 'link', 0], ['Foto final', 'fotoUrl2', 'link', 0], ['Soporte novedad', 'fotoUrl3', 'link', 0]]},
  rs: {tab: 'APP Repuestos y reparaciones', req: ['fecha', 'concepto', 'valor'], cols: [
    ['Fecha', 'fecha', 'd', 1], ['Máquina', 'mq', 'mq', 1], ['Tipo', 'tipo', 't', 1], ['Concepto', 'concepto', 't', 1], ['Valor', 'valor', 'n', 1],
    ['Lo paga', 'asume', 't', 1], ['Pagado con', '_fnd', 'calc', 0], ['Soporte', 'fotoUrl', 'link', 0]]},
  rc: {tab: 'APP Combustible', req: ['fecha', 'valor'], cols: [
    ['Fecha', 'fecha', 'd', 1], ['Máquina', 'mq', 'mq', 1], ['Tipo', 'tipo', 't', 1], ['Cantidad', 'cant', 'n', 1], ['Unidad', 'und', 't', 1],
    ['Valor', 'valor', 'n', 1], ['Lo paga', 'asume', 't', 1], ['Horómetro', 'horo', 'n', 1], ['Pagado con', '_fnd', 'calc', 0], ['Soporte', 'fotoUrl', 'link', 0]]},
  rcort: {tab: 'APP Cortes', req: null, cols: [['Fecha de corte', 'fecha', 'd', 1], ['Máquina', 'mq', 'mq', 0], ['Observaciones', 'obs', 't', 1]]},
  maq: {tab: 'APP Máquinas', req: ['maq'], cols: [
    ['Máquina', 'maq', 't', 1], ['Tipo', 'tipo', 't', 1], ['Placa o serie', 'serie', 't', 1], ['Cliente actual', '_cli', 'calc', 0],
    ['Tarifa por hora', 'precio', 'n', 1], ['Mínimo horas por día', 'min', 'n', 1], ['Alerta %', 'alerta', 'n', 1],
    ['Combustible lo paga', 'combA', 't', 1], ['Repuestos los paga', 'repA', 't', 1], ['Operador', 'operador', 't', 1], ['Inactiva', 'inactivo', 'bool', 1], ['Foto', 'fotoUrl', 'link', 0]]},
  cli: {tab: 'APP Clientes', req: ['nombre'], cols: [
    ['Nombre', 'nombre', 't', 1], ['NIT o cédula', 'nit', 't', 1], ['Celular', 'tel', 't', 1], ['Contacto', 'contacto', 't', 1],
    ['Facturado', '_fac', 'calc', 0], ['Cobrado', '_cob', 'calc', 0], ['Saldo', '_saldo', 'calc', 0], ['Nota', 'nota', 't', 1]]},
  cob: {tab: 'APP Pagos de clientes', req: null, cols: [
    ['Fecha', 'fecha', 'd', 1], ['Cliente', '_cli', 'calc', 0], ['Valor', 'valor', 'n', 1], ['Forma de pago', 'pago', 't', 1], ['Nota', 'nota', 't', 1], ['Soporte', 'fotoUrl', 'link', 0]]},
  mov: {tab: 'APP Gastos de la flota', req: ['fecha', 'valor', 'p', 's'], cols: [
    ['Fecha', 'fecha', 'd', 1], ['Proyecto', 'p', 'proj', 1], ['Rubro', 's', 'sub', 1], ['Clasificación', 'nat', 'nat', 1],
    ['Categoría', 'cat', 't', 1], ['Concepto', 'concepto', 't', 1], ['Proveedor / beneficiario', 'tercero', 't', 1],
    ['Cédula / NIT', 'cedula', 't', 1], ['Valor', 'valor', 'n', 1], ['Forma de pago', 'pago', 't', 1], ['Responsable', 'resp', 't', 1],
    ['Máquina', '_mqm', 'calc', 0], ['Observaciones', 'nota', 't', 1], ['Soporte', 'fotoUrl', 'link', 0], ['Pagado con', '_fnd', 'calc', 0]]},
  fnd: {tab: 'APP Fondos', req: null, cols: [
    ['Tipo', '_tipo', 'calc', 0], ['Nombre', 'nombre', 't', 1], ['Proyecto', '_proj', 'calc', 0], ['Celular', 'tel', 't', 1],
    ['Entregado', '_ent', 'calc', 0], ['Legalizado', '_comp', 'calc', 0], ['Devuelto', '_dev', 'calc', 0], ['Saldo', '_saldo', 'calc', 0],
    ['Avisar si el saldo baja de', 'min', 'n', 1], ['Días para legalizar', 'dias', 'n', 1], ['Inactivo', 'inactivo', 'bool', 1], ['Nota', 'nota', 't', 1]]},
  fmov: {tab: 'APP Fondos movimientos', req: null, cols: [
    ['Fecha', 'fecha', 'd', 1], ['Fondo', '_fnd', 'calc', 0], ['Movimiento', '_tipo', 'calc', 0], ['Valor', 'valor', 'n', 1],
    ['Forma de pago', 'pago', 't', 1], ['Nota', 'nota', 't', 1], ['Soporte', 'fotoUrl', 'link', 0]]},
  cats: {tab: 'APP Categorías', req: null, cols: [['Rubro', '_rub', 'calc', 0], ['Categoría', 'name', 't', 0], ['Clasificación', 'nat', 'nat', 0]]},
  cfgx: {tab: 'APP Configuración', req: null, cols: [['Parámetro', 'id', 't', 0], ['Resumen', '_res', 'calc', 0]]}
};
const COLLS = Object.keys(SCHEMA);
const TECH = ['Borrado', 'ID', 'Actualizado', 'Servidor', 'Datos'];
const RETRO_COLLS = ['rh', 'rs', 'rc', 'rcort', 'maq', 'own', 'cfgx'];
const MQ0 = 'm1';
const mqOf_ = function (r) { return r.mq || MQ0; };
const ROLES = {
  admin: {scope: 'full', write: true, read: function () { return true; }},
  aux: {scope: 'full', write: true, read: function () { return true; }},
  conta: {scope: 'read', write: false, read: function () { return true; }}
};
const ROLE_NAMES = {admin: 'ADMINISTRADOR DE LA APP', aux: 'AUXILIAR DE MINA', conta: 'DUEÑO (SOLO VE)'};
const STUB = ['abonos', 'per', 'prest', 'inm', 'veh', 'cab', 'eq', 'own', 'cortes', 'obl'];

/* ===================== Instalación ===================== */
function configurar() {
  const P0 = PropertiesService.getScriptProperties();
  if (!CFG.FOLDER_ID) {
    const f = DRIVE_FOLDER ? DriveApp.getFolderById(DRIVE_FOLDER) : DriveApp.createFolder(CFG.APP_FOLDER);
    P0.setProperty('FOLDER_ID', f.getId());
  }
  if (!CFG.SHEET_ID) {
    const nss = SpreadsheetApp.create('Tablero de Maquinaria · Datos');
    try { DriveApp.getFileById(nss.getId()).moveTo(DriveApp.getFolderById(CFG.FOLDER_ID)); } catch (e) {}
    P0.setProperty('SHEET_ID', nss.getId());
  }
  const ss = SpreadsheetApp.openById(CFG.SHEET_ID);
  COLLS.forEach(function (c) { tab_(ss, c); });
  const props = PropertiesService.getScriptProperties();
  Object.keys(ROLES).forEach(function (r) {
    if (!props.getProperty('TOKEN_' + r)) props.setProperty('TOKEN_' + r, r.slice(0, 3).toUpperCase() + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12));
  });
  const has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'alEditar'; });
  if (!has) ScriptApp.newTrigger('alEditar').forSpreadsheet(ss).onEdit().create();
  appFolder_();
  if (!ss.getSheetByName(CFG.REPORT_TAB)) {
    const sh = ss.insertSheet(CFG.REPORT_TAB, 0);
    sh.getRange('B2').setValue('El informe aparece aquí después de la primera sincronización desde la app.');
  }
  Logger.log('Carpeta del Drive: https://drive.google.com/drive/folders/' + CFG.FOLDER_ID);
  Logger.log('Sheet de datos: ' + ss.getUrl());
  Logger.log('Listo. Claves de acceso para la app (Ajustes → Sincronización):');
  Object.keys(ROLES).forEach(function (r) { Logger.log(ROLE_NAMES[r] + ': ' + props.getProperty('TOKEN_' + r)); });
  Logger.log('Ahora: Implementar → Nueva implementación → Aplicación web → Ejecutar como: Yo · Acceso: Cualquier usuario.');
}

function verClaves() {
  const props = PropertiesService.getScriptProperties();
  Object.keys(ROLES).forEach(function (r) { Logger.log(ROLE_NAMES[r] + ': ' + props.getProperty('TOKEN_' + r)); });
  const all = props.getProperties();
  Object.keys(all).filter(function (k) { return k.indexOf('OWNKEY_') === 0; }).forEach(function (k) { Logger.log('DUEÑO ' + k.slice(7) + ': ' + all[k]); });
}

function cambiarClaves() {
  const props = PropertiesService.getScriptProperties();
  Object.keys(ROLES).forEach(function (r) { props.deleteProperty('TOKEN_' + r); });
  configurar();
}

function tab_(ss, c) {
  const sc = SCHEMA[c];
  let sh = ss.getSheetByName(sc.tab);
  const headers = sc.cols.map(function (x) { return x[0]; }).concat(TECH);
  if (!sh) {
    sh = ss.insertSheet(sc.tab);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#131b4d').setFontColor('#ffffff');
    sh.setTabColor(c === 'mov' ? '#2ee6f0' : RETRO_COLLS.indexOf(c) >= 0 && c !== 'cfgx' ? '#f2c75c' : '#7b6dff');
    const maxR = sh.getMaxRows();
    sc.cols.forEach(function (col, i) {
      const r = sh.getRange(2, i + 1, Math.max(1, maxR - 1), 1);
      if (col[2] === 'd') r.setNumberFormat('dd/mm/yyyy');
      if (col[2] === 'n' && /valor|saldo|abono|precio|presupuesto|pago mensual|acordado|dueño de la mina/i.test(col[0])) r.setNumberFormat('$#,##0');
      if (col[2] === 'calc' && /abonos|saldo|entregado|legalizado|devuelto|facturado|cobrado|^valor$/i.test(col[0])) r.setNumberFormat('$#,##0');
      if (col[2] === 'n' && /tarifa/i.test(col[0])) r.setNumberFormat('$#,##0');
      if (col[2] === 'n' && /avisar/i.test(col[0])) r.setNumberFormat('$#,##0');
      sh.setColumnWidth(i + 1, /concepto|observ|nota|reparto|detalle|resumen|proveedor/i.test(col[0]) ? 240 : 130);
    });
    const t0 = sc.cols.length + 1;
    sh.setColumnWidth(t0, 80);
    sh.setColumnWidth(t0 + 1, 110);
    sh.hideColumns(t0 + 2, 3);
    sh.getRange(1, t0).setNote('Escribe "Sí" para eliminar el registro en todos los equipos.');
    if (c === 'mov') {
      const n = Math.max(1, maxR - 1);
      sh.getRange(2, 2, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(MODS).map(function (k) { return MODS[k].name; }), true).setAllowInvalid(false).build());
      const subs = [];
      Object.keys(MODS).forEach(function (k) { Object.keys(MODS[k].subs).forEach(function (s) { if (subs.indexOf(MODS[k].subs[s]) < 0) subs.push(MODS[k].subs[s]); }); });
      sh.getRange(2, 3, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(subs, true).setAllowInvalid(false).build());
      sh.getRange(2, 4, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Gasto', 'Costo', 'Inversión', 'Anticipo'], true).build());
    }
    const delCol = colLetter_(sc.cols.length + 1);
    const rule = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$' + delCol + '2="Sí"')
      .setFontColor('#9aa3c7').setStrikethrough(true).setRanges([sh.getRange(2, 1, Math.max(1, maxR - 1), headers.length)]).build();
    sh.setConditionalFormatRules([rule]);
  }
  return sh;
}

function colLetter_(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

function appFolder_(sub, sub2) {
  let f = DriveApp.getFolderById(CFG.FOLDER_ID);
  [sub, sub2].forEach(function (n) { if (!n) return; const it = f.getFoldersByName(n); f = it.hasNext() ? it.next() : f.createFolder(n); });
  return f;
}

/* ===================== Disparador de edición en el Sheet ===================== */
function alEditar(e) {
  try {
    const sh = e.range.getSheet();
    const c = COLLS.filter(function (k) { return SCHEMA[k].tab === sh.getName(); })[0];
    if (!c) return;
    const r0 = Math.max(2, e.range.getRow());
    const r1 = e.range.getLastRow();
    if (r1 < 2) return;
    const hm = headerMap_(sh);
    if (hm['Actualizado'] == null || hm['Servidor'] == null) return;
    const firstCol = e.range.getColumn() - 1;
    if (firstCol >= hm['ID']) return;
    const now = Date.now();
    const n = r1 - r0 + 1;
    const vals = [];
    for (let i = 0; i < n; i++) vals.push([now, now]);
    const a = Math.min(hm['Actualizado'], hm['Servidor']);
    sh.getRange(r0, a + 1, n, 2).setValues(vals);
  } catch (err) { console.error(err); }
}

/* ===================== API web ===================== */
function doGet() { return json_({ok: true, app: 'Tablero de Maquinaria', msg: 'Servicio activo'}); }

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const who = auth_(body.token);
    if (!who) return json_({ok: false, error: 'Clave de acceso no válida'});
    const role = who.role;
    const R = ROLES[role];
    if (body.op === 'ping') return json_({ok: true, role: role, scope: R.scope, own: who.own || '', serverTime: Date.now(), ver: VERSION});
    if (body.op === 'keys') { if (role !== 'admin') return json_({ok: false, error: 'Solo el administrador puede invitar'}); const pp = PropertiesService.getScriptProperties(); return json_({ok: true, keys: {admin: pp.getProperty('TOKEN_admin'), aux: pp.getProperty('TOKEN_aux'), conta: pp.getProperty('TOKEN_conta')}}); }
    if (body.op === 'sync') return json_(sync_(body, role, who.own));
    if (body.op === 'file') { if (!R.write) return json_({ok: false, error: 'Sin permiso de escritura'}); return json_(saveFile_(body)); }
    if (body.op === 'getFile') return json_(getFile_(body));
    if (body.op === 'report') { if (!R.write) return json_({ok: false, error: 'Sin permiso'}); renderReport_(SpreadsheetApp.openById(CFG.SHEET_ID), body.data || {}); return json_({ok: true}); }
    return json_({ok: false, error: 'Operación desconocida'});
  } catch (err) {
    return json_({ok: false, error: String(err && err.message || err)});
  }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function auth_(tok) {
  if (!tok) return null;
  const t = String(tok).trim();
  const props = PropertiesService.getScriptProperties();
  const roles = Object.keys(ROLES);
  for (let i = 0; i < roles.length; i++) if (props.getProperty('TOKEN_' + roles[i]) === t) return {role: roles[i], own: roles[i] === 'dueno' ? 'o1' : ''};
  return null;
}

// Clave de acceso de cada dueño de maquinaria. El dueño "o1" usa la clave original del dueño de la máquina.
function ownerKey_(b) {
  const own = String(b.own || '').trim();
  if (!/^[\w.:-]{1,80}$/.test(own)) return {ok: false, error: 'Propietario inválido'};
  const props = PropertiesService.getScriptProperties();
  const name = own === 'o1' ? 'TOKEN_dueno' : 'OWNKEY_' + own;
  let key = props.getProperty(name);
  if (!key || b.reset) { key = 'DUE-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12); props.setProperty(name, key); }
  return {ok: true, own: own, key: key};
}

/* ===================== Lectura y escritura de pestañas ===================== */
function headerMap_(sh) {
  const lc = sh.getLastColumn();
  const h = lc ? sh.getRange(1, 1, 1, lc).getValues()[0] : [];
  const m = {};
  h.forEach(function (x, i) { if (x !== '' && m[x] == null) m[x] = i; });
  return m;
}

function loadTab_(ss, c) {
  const sh = tab_(ss, c);
  let hm = headerMap_(sh);
  const want = SCHEMA[c].cols.map(function (x) { return x[0]; }).concat(TECH);
  const miss = want.filter(function (h) { return hm[h] == null; });
  if (miss.length) { const lc = sh.getLastColumn(); sh.getRange(1, lc + 1, 1, miss.length).setValues([miss]).setFontWeight('bold').setBackground('#131b4d').setFontColor('#ffffff'); hm = headerMap_(sh); }
  const width = sh.getLastColumn();
  const n = sh.getLastRow();
  const rows = n > 1 ? sh.getRange(2, 1, n - 1, width).getValues() : [];
  return {c: c, sh: sh, hm: hm, width: width, rows: rows, dirty: false, tz: ss.getSpreadsheetTimeZone()};
}

function isEmptyRow_(row) { for (let i = 0; i < row.length; i++) if (row[i] !== '' && row[i] !== null) return false; return true; }
function isYes_(v) { return v === true || /^(s[ií]|true|x|1)$/i.test(String(v || '').trim()); }
function norm_(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }

function num_(s) {
  const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
  let x;
  if (c >= 0 && d >= 0) x = c > d ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (c >= 0) x = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  else if (d >= 0) x = /^-?\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s;
  else x = s;
  return parseFloat(x) || 0;
}

function fromCell_(v, t, T, rec) {
  if (t === 'd') {
    if (v instanceof Date) return Utilities.formatDate(v, T.tz, 'yyyy-MM-dd');
    const s = String(v || '').trim(); if (!s) return '';
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0];
    return undefined;
  }
  if (t === 'n') { if (typeof v === 'number') return v; const s = String(v || '').replace(/[^\d,.\-]/g, ''); if (!s) return 0; return num_(s); }
  if (t === 'bool') return isYes_(v);
  if (t === 'proj') { const k = Object.keys(MODS).filter(function (k) { return norm_(MODS[k].name) === norm_(v); })[0]; return k || rec.p; }
  if (t === 'sub') { const p = rec.p; if (!p || !MODS[p]) return rec.s; const k = Object.keys(MODS[p].subs).filter(function (s) { return norm_(MODS[p].subs[s]) === norm_(v); })[0]; return k || rec.s; }
  if (t === 'nat') { const k = Object.keys(NATL).filter(function (n) { return norm_(NATL[n]) === norm_(v); })[0]; return k || rec.nat; }
  if (t === 'ref' || t === 'sc') { rec['__' + t] = String(v || '').trim(); return undefined; }
  if (t === 'mq') { rec.__mq = String(v || '').trim(); return undefined; }
  if (t === 'link' || t === 'calc') return undefined;
  return v === null || v === undefined ? '' : String(v);
}

function toCell_(rec, k, t, ctx, c) {
  if (t === 'd') { const s = rec[k]; if (!s) return ''; const p = String(s).split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2], 12) : s; }
  if (t === 'n') return rec[k] == null || rec[k] === '' ? '' : Number(rec[k]) || 0;
  if (t === 'bool') return rec[k] ? 'Sí' : '';
  if (t === 'proj') return MODS[rec.p] ? MODS[rec.p].name : (rec.p || '');
  if (t === 'sub') return MODS[rec.p] && MODS[rec.p].subs[rec.s] ? MODS[rec.p].subs[rec.s] : (rec.s || '');
  if (t === 'nat') return NATL[rec.nat] || rec.nat || '';
  if (t === 'link') return rec[k] || rec['fotoN' + k.slice(7)] || '';
  if (t === 'ref') return refText_(c, rec, ctx);
  if (t === 'mq') { const m = ctx.maq[mqOf_(rec)]; return m ? m.maq : ''; }
  if (t === 'sc') return scText_(rec.sc, ctx);
  if (t === 'calc') return calc_(c, k, rec, ctx);
  const v = rec[k] == null ? '' : rec[k];
  return typeof v === 'string' && /^[=+@]/.test(v) ? "'" + v : v;
}

function scText_(sc, ctx) {
  if (sc === 'mina') return 'Mina La Fe';
  if (sc === 'parcela') return 'Parcela Las Colinas';
  if (sc && sc.indexOf('inm:') === 0) { const i = ctx.inm[sc.slice(4)]; return 'Obra: ' + (i ? i.nombre : sc.slice(4)); }
  return sc || '';
}

function refText_(c, r, ctx) {
  if (c === 'abonos') { const p = ctx.prest[r.prest]; return p ? p.nombre + ' · ' + fdate_(p.fecha) : ''; }
  if (c !== 'mov') return '';
  if (r.per && ctx.per[r.per]) return ctx.per[r.per].nombre;
  if (r.veh && ctx.veh[r.veh]) return ctx.veh[r.veh].placa;
  if (r.cab && ctx.cab[r.cab]) return ctx.cab[r.cab].nombre;
  if (r.eq && ctx.eq[r.eq]) return ctx.eq[r.eq].nombre;
  if (r.p === 'inm' && r.inm && ctx.inm[r.inm]) return ctx.inm[r.inm].nombre;
  return '';
}

function fdate_(s) { return s ? String(s).slice(8, 10) + '/' + String(s).slice(5, 7) + '/' + String(s).slice(0, 4) : ''; }
function money_(n) { return '$' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

function calc_(c, k, r, ctx) {
  if (c === 'mov' && k === '_det') return r.arrTipo ? 'Arriendo: ' + r.arrTipo + (r.arrDesc ? ' · ' + r.arrDesc : '') + (r.arrMes ? ' · ' + r.arrMes : '') : '';
  if (c === 'rh' && k === '_cli') { const x = ctx.cli[r.cli]; return x ? x.nombre : ''; }
  if (c === 'rh' && k === '_val') return r.hf === '' || r.hf == null ? '' : (Number(r.horas) || 0) * tarOf_(r, ctx);
  if ((c === 'maq' || c === 'cob') && k === '_cli') { const x = ctx.cli[r.cli]; return x ? x.nombre : ''; }
  if (c === 'mov' && k === '_mqm') { const m = ctx.maq[r.mq]; return m ? m.maq : (r.p === 'flota' ? 'General' : ''); }
  if (c === 'cli') { const st = ctx.cs[r.id] || {fac: 0, cob: 0}; if (k === '_fac') return st.fac; if (k === '_cob') return st.cob; if (k === '_saldo') return st.fac - st.cob; }
  if (c === 'prest' && k === '_ab') return ctx.ab[r.id] || 0;
  if ((c === 'mov' || c === 'rs' || c === 'rc') && k === '_fnd') { const f = ctx.fnd[r.fnd]; return f ? (f.tipo === 'proveedor' ? 'Anticipo en ' : 'Fondo de ') + f.nombre : ''; }
  if (c === 'fnd') {
    const st = ctx.fs[r.id] || {ent: 0, dev: 0, comp: 0};
    if (k === '_tipo') return r.tipo === 'proveedor' ? 'Proveedor con anticipo' : 'Comprador';
    if (k === '_proj') {
      const ks = Array.isArray(r.ps) && r.ps.length ? r.ps : [r.p === 'inm' ? 'inm:' + (r.inm || '') : r.p];
      return ks.map(function (x) { if (String(x).indexOf('inm:') === 0) { const i = ctx.inm[x.slice(4)]; return i ? i.nombre : 'Inmuebles'; } return x === 'retro' ? 'Maquinaria' : MODS[x] ? MODS[x].name : x; }).join(', ');
    }
    if (k === '_ent') return st.ent; if (k === '_comp') return st.comp; if (k === '_dev') return st.dev; if (k === '_saldo') return st.ent - st.dev - st.comp;
  }
  if (c === 'fmov' && k === '_fnd') { const f = ctx.fnd[r.fnd]; return f ? f.nombre : ''; }
  if (c === 'fmov' && k === '_tipo') return {entrega: 'Entrega para compras', reemb: 'Reembolso de compras', recarga: 'Recarga del anticipo', devol: 'Devolución'}[r.tipo] || r.tipo || '';
  if (c === 'own' && k === '_maqs') return Object.keys(ctx.maq).filter(function (id) { return ctx.maq[id].own === r.id; }).map(function (id) { return ctx.maq[id].maq; }).join(', ');
  if (c === 'prest' && k === '_saldo') return (Number(r.valor) || 0) - (ctx.ab[r.id] || 0);
  if (c === 'cortes' && k === '_rep') return (r.liq || []).map(function (l) { return l.label + (l.nombre ? ' (' + l.nombre + ')' : '') + ': ' + money_(l.cop); }).join('; ');
  if (c === 'obl' && k === '_act') { const a = (ctx[r.ac] || {})[r.aid]; return OBL_ASSET[r.ac] + ': ' + (a ? (a.placa || a.nombre) : '—'); }
  if (c === 'obl' && k === '_obl') return r.tipo === 'Otro' ? (r.nombre || 'Otro') : r.tipo;
  if (c === 'obl' && k === '_est') return r.done ? 'Cumplida' : (r.fecha < today_() ? 'Vencida' : 'Vigente');
  if (c === 'cats' && k === '_rub') { const p = String(r.key || '').split('.'); return MODS[p[0]] ? MODS[p[0]].name + ' › ' + (MODS[p[0]].subs[p[1]] || p[1]) : r.key; }
  if (c === 'cfgx' && k === '_res') {
    if (r.id === 'retroP') return (r.maq || '') + ' · dueño ' + (r.dueno || '') + ' · ' + money_(r.precio) + ' por hora · mínimo ' + (r.min || 0) + ' h/día · combustible dueño ' + (r.pctComb || 0) + '%';
    if (r.id === 'conf' && r.pct) return 'Reparto del corte: terreno ' + r.pct.ter + '% · empleados ' + r.pct.emp + '% · comisionista ' + r.pct.com + '% · administrador ' + r.pct.adm + '% · dueño de la mina ' + (100 - r.pct.ter - r.pct.emp - r.pct.com - r.pct.adm) + '%';
    return '';
  }
  return '';
}

function today_() { return Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd'); }

function rowToRec_(T, row) {
  const sc = SCHEMA[T.c];
  const g = function (h) { return T.hm[h] == null ? '' : row[T.hm[h]]; };
  let rec = {};
  try { rec = JSON.parse(g('Datos') || '{}') || {}; } catch (e) { rec = {}; }
  sc.cols.forEach(function (col) {
    if (!col[3] || T.hm[col[0]] == null) return;
    const raw = g(col[0]);
    const v = T.c === 'rh' && col[1] === 'hf' && (raw === '' || raw == null) ? '' : fromCell_(raw, col[2], T, rec);
    if (v !== undefined) rec[col[1]] = v;
  });
  const id = String(g('ID') || '').trim();
  if (id) rec.id = id;
  rec.upd = Number(g('Actualizado')) || rec.upd || 0;
  rec.srv = Number(g('Servidor')) || 0;
  rec.del = isYes_(g('Borrado'));
  if (T.c === 'rh' && rec.hf !== '' && rec.hi !== '' && rec.hf != null && rec.hi != null) rec.horas = Math.round(((Number(rec.hf) || 0) - (Number(rec.hi) || 0)) * 100) / 100;
  if (T.c === 'rh' && (rec.hf === '' || rec.hf == null)) rec.horas = 0;
  return rec;
}

function recToRow_(T, rec, ctx) {
  const sc = SCHEMA[T.c];
  const row = [];
  for (let i = 0; i < T.width; i++) row.push('');
  const put = function (h, v) { if (T.hm[h] != null) row[T.hm[h]] = v; };
  sc.cols.forEach(function (col) { put(col[0], toCell_(rec, col[1], col[2], ctx, T.c)); });
  const clean = clean_(rec);
  put('ID', rec.id); put('Actualizado', rec.upd || 0); put('Servidor', rec.srv || 0); put('Borrado', rec.del ? 'Sí' : ''); put('Datos', JSON.stringify(clean));
  return row;
}

function clean_(rec) {
  const o = {};
  Object.keys(rec).forEach(function (k) { if (k.indexOf('__') !== 0 && k !== 'srv') o[k] = rec[k]; });
  return o;
}

function ctx_(R) {
  const ctx = {ab: {}};
  ['inm', 'veh', 'cab', 'per', 'eq', 'prest', 'maq', 'own', 'fnd', 'cli'].forEach(function (c) { ctx[c] = {}; (R[c] || []).forEach(function (r) { if (r.id && !r.del) ctx[c][r.id] = r; }); });
  ctx.cs = {};
  const cs = function (id) { return ctx.cs[id] = ctx.cs[id] || {fac: 0, cob: 0}; };
  R.rh.forEach(function (r) { if (r.del || !r.cli || r.hf === '' || r.hf == null) return; cs(r.cli).fac += (Number(r.horas) || 0) * tarOf_(r, ctx); });
  R.cob.forEach(function (x) { if (!x.del && x.cli) cs(x.cli).cob += Number(x.valor) || 0; });
  ctx.fs = {};
  const fs = function (id) { return ctx.fs[id] = ctx.fs[id] || {ent: 0, dev: 0, comp: 0}; };
  R.fmov.forEach(function (x) { if (!x.del && x.fnd) { if (x.tipo === 'devol') fs(x.fnd).dev += Number(x.valor) || 0; else fs(x.fnd).ent += Number(x.valor) || 0; } });
  ['mov', 'rs', 'rc'].forEach(function (c) { R[c].forEach(function (x) { if (!x.del && x.fnd) fs(x.fnd).comp += Number(x.valor) || 0; }); });
  (R.abonos || []).forEach(function (a) { if (!a.del && a.prest) ctx.ab[a.prest] = (ctx.ab[a.prest] || 0) + (Number(a.valor) || 0); });
  return ctx;
}

function tarOf_(r, ctx) { if (r.tar !== '' && r.tar != null) return Number(r.tar) || 0; const m = ctx.maq[mqOf_(r)]; return m ? Number(m.precio) || 0 : 0; }

function findBy_(map, field, text) {
  const n = norm_(text); if (!n) return null;
  const ids = Object.keys(map).filter(function (id) { return norm_(map[id][field]) === n; });
  return ids.length ? ids[ids.length - 1] : null;
}

function resolveRefs_(R, ctx) {
  ['rh', 'rs', 'rc', 'rcort'].forEach(function (c) {
    R[c].forEach(function (r) {
      const cell = r.__mq; delete r.__mq;
      if (!cell) return;
      const cur = ctx.maq[mqOf_(r)];
      if (cur && norm_(cur.maq) === norm_(cell)) return;
      const id = findBy_(ctx.maq, 'maq', cell);
      if (id) { r.mq = id; r.__mqch = 1; }
    });
  });
  R.mov.forEach(function (r) {
    const cell = r.__ref; delete r.__ref;
    if (cell === undefined || cell === refText_('mov', r, ctx)) return;
    if (!cell) return;
    if (r.s === 'nomina') { const id = findBy_(ctx.per, 'nombre', cell); if (id) { r.per = id; r.tercero = ctx.per[id].nombre; if (r.p === 'inm' && String(ctx.per[id].sc).indexOf('inm:') === 0) r.inm = ctx.per[id].sc.slice(4); } return; }
    if (r.s === 'vehiculos') { const id = findBy_(ctx.veh, 'placa', cell); if (id) r.veh = id; return; }
    if (r.s === 'caballos') { const id = findBy_(ctx.cab, 'nombre', cell); if (id) r.cab = id; return; }
    if (r.p === 'mina') { const id = findBy_(ctx.eq, 'nombre', cell); if (id) r.eq = id; return; }
    if (r.p === 'inm') { const id = findBy_(ctx.inm, 'nombre', cell); if (id) r.inm = id; }
  });
  R.abonos.forEach(function (a) {
    const cell = a.__ref; delete a.__ref;
    if (cell === undefined || !cell || cell === refText_('abonos', a, ctx)) return;
    let id = Object.keys(ctx.prest).filter(function (k) { return norm_(ctx.prest[k].nombre + ' · ' + fdate_(ctx.prest[k].fecha)) === norm_(cell); })[0];
    if (!id) {
      const cands = Object.keys(ctx.prest).filter(function (k) { return norm_(ctx.prest[k].nombre) === norm_(cell.split('·')[0]); })
        .sort(function (x, y) { return String(ctx.prest[x].fecha).localeCompare(String(ctx.prest[y].fecha)); });
      const open = cands.filter(function (k) { return (Number(ctx.prest[k].valor) || 0) > (ctx.ab[k] || 0); });
      id = open[0] || cands[cands.length - 1];
    }
    if (id) a.prest = id;
  });
  R.per.forEach(function (p) {
    const cell = p.__sc; delete p.__sc;
    if (cell === undefined || !cell || cell === scText_(p.sc, ctx)) return;
    const n = norm_(cell);
    if (n.indexOf('mina') >= 0) p.sc = 'mina';
    else if (n.indexOf('parcela') >= 0) p.sc = 'parcela';
    else { const id = findBy_(ctx.inm, 'nombre', cell.replace(/^obra:\s*/i, '')); if (id) p.sc = 'inm:' + id; }
  });
}

function fixNew_(c, r) {
  if (c === 'mov') { if (!r.nat) r.nat = r.p === 'mina' ? 'costo' : r.s === 'materiales' ? 'inversion' : 'gasto'; if (!r.pago) r.pago = 'Efectivo'; if (!r.cat) r.cat = 'Otro'; if (!r.concepto) r.concepto = r.cat; r.resp = r.resp || 'Sheet'; }
  if (c === 'rs' && !r.asume) r.asume = 'Dueño';
  if (c === 'rs' && !r.tipo) r.tipo = 'Repuesto';
  if (c === 'rc' && !r.tipo) r.tipo = 'ACPM';
  if (c === 'prest' && !r.pago) r.pago = 'Efectivo';
  if (c === 'abonos' && !r.pago) r.pago = 'Efectivo';
  r.by = 'sheet';
}

function validNew_(c, r) {
  const req = SCHEMA[c].req;
  if (!req) return false;
  return req.every(function (k) { if (r[k] === undefined || r[k] === '' || r[k] === null) return false; if (k === 'valor') return Number(r[k]) > 0; return true; });
}

function writeTab_(T, recs, ctx) {
  const ok = recs.filter(function (r) { return !r.__skip; });
  const skipped = recs.filter(function (r) { return r.__skip; }).map(function (r) { return T.rows[r.__i]; });
  const hasF = SCHEMA[T.c].cols.some(function (x) { return x[1] === 'fecha'; });
  if (hasF) ok.sort(function (a, b) { return String(a.fecha || '').localeCompare(String(b.fecha || '')) || (a.cre || 0) - (b.cre || 0); });
  const out = ok.map(function (r) { return recToRow_(T, r, ctx); }).concat(skipped);
  const prev = T.rows.length;
  if (out.length) T.sh.getRange(2, 1, out.length, T.width).setValues(out);
  if (prev > out.length) T.sh.getRange(2 + out.length, 1, prev - out.length, T.width).clearContent();
}

/* ===================== Sincronización ===================== */
function sync_(body, role, own) {
  const R0 = ROLES[role];
  const lock = LockService.getScriptLock();
  lock.waitLock(28000);
  try {
    const ss = SpreadsheetApp.openById(CFG.SHEET_ID);
    const now = Date.now();
    const T = {}, R = {}, IDX = {};
    COLLS.forEach(function (c) {
      T[c] = loadTab_(ss, c); R[c] = []; IDX[c] = {};
      T[c].rows.forEach(function (row, i) {
        if (isEmptyRow_(row)) return;
        const rec = rowToRec_(T[c], row); rec.__i = i; R[c].push(rec);
      });
    });
    STUB.forEach(function (c) { if (!R[c]) R[c] = []; if (!T[c]) T[c] = {dirty: false}; });
    let ctx = ctx_(R);
    resolveRefs_(R, ctx);
    ['rh', 'rs', 'rc', 'rcort'].forEach(function (c) { R[c].forEach(function (r) { if (r.__mqch) { T[c].dirty = true; delete r.__mqch; } }); });
    COLLS.forEach(function (c) {
      R[c].forEach(function (rec) {
        if (rec.id) return;
        if (validNew_(c, rec)) { rec.id = Utilities.getUuid(); rec.upd = now; rec.srv = now; rec.cre = now; fixNew_(c, rec); T[c].dirty = true; }
        else rec.__skip = 1;
      });
      R[c].forEach(function (rec) { if (rec.id) IDX[c][rec.id] = rec; });
    });
    ctx = ctx_(R);
    const seen = {}, force = {};
    let acc = 0, rej = 0;
    if (R0.write) (body.changes || []).forEach(function (ch) {
      const c = ch.c, rec = ch.rec;
      if (COLLS.indexOf(c) < 0 || !rec || !rec.id) return;
      seen[c + ':' + rec.id] = 1;
      const cur = IDX[c][rec.id];
      if (cur && (Number(cur.upd) || 0) > (Number(rec.upd) || 0)) { rej++; delete seen[c + ':' + rec.id]; force[c + ':' + rec.id] = 1; return; }
      const nr = clean_(rec); nr.srv = now;
      if (cur && cur.lk && !nr.lk) nr.lk = cur.lk;
      if (cur) { const i = cur.__i; Object.keys(cur).forEach(function (k) { delete cur[k]; }); Object.assign(cur, nr); cur.__i = i; }
      else { nr.__i = -1; R[c].push(nr); IDX[c][nr.id] = nr; }
      T[c].dirty = true; acc++;
    });
    const need = [];
    if (R0.write && body.manifest && typeof body.manifest === 'object') {
      Object.keys(body.manifest).forEach(function (c) {
        if (COLLS.indexOf(c) < 0 || c === 'cfgx') return;
        const m = body.manifest[c] || {};
        Object.keys(m).forEach(function (id) { const v = Number(m[id]) || 0, del = v < 0, u = Math.abs(v); const cur = IDX[c][id]; if (!cur ? !del : (Number(cur.upd) || 0) < u) need.push({c: c, id: id}); });
      });
    }
    if (acc) { ctx = ctx_(R); if (T.abonos.dirty) T.prest.dirty = true; ['inm', 'veh', 'cab', 'per', 'eq', 'prest'].forEach(function (c) { if (T[c].dirty) { T.mov.dirty = true; T.obl.dirty = true; T.abonos.dirty = true; } }); if (T.fmov.dirty || T.mov.dirty || T.rs.dirty || T.rc.dirty) T.fnd.dirty = true; if (T.fnd.dirty) { T.fmov.dirty = true; T.mov.dirty = true; T.rs.dirty = true; T.rc.dirty = true; } if (T.rh.dirty || T.cob.dirty || T.maq.dirty) T.cli.dirty = true; if (T.cli.dirty || T.maq.dirty) { T.rh.dirty = true; T.cob.dirty = true; T.maq.dirty = true; T.mov.dirty = true; } }
    COLLS.forEach(function (c) { if (T[c].dirty) writeTab_(T[c], R[c], ctx); });
    const since = Number(body.since) || 0;
    const out = [];
    let mine = null;
    const since0 = Number(body.since) || 0;
    if (role === 'dueno') {
      mine = {};
      R.maq.forEach(function (m) { if (m.id && !m.del && m.own === own) mine[m.id] = (Number(m.srv) || 0) > since0 ? 2 : 1; });
      if (own === 'o1' && !R.maq.some(function (m) { return m.id === MQ0; })) mine[MQ0] = 1;
    }
    const visible = function (c, rec) {
      if (!mine) return true;
      if (c === 'maq') return !!mine[rec.id];
      if (c === 'own') return rec.id === own;
      if (c === 'cfgx') return rec.id === 'retroP' && own === 'o1';
      return !!mine[mqOf_(rec)];
    };
    COLLS.forEach(function (c) {
      if (!R0.read(c)) return;
      R[c].forEach(function (rec) {
        if (rec.__skip || !rec.id || seen[c + ':' + rec.id] || !visible(c, rec)) return;
        const fresh = mine && RETRO_COLLS.indexOf(c) >= 0 && ['rh', 'rs', 'rc', 'rcort'].indexOf(c) >= 0 && mine[mqOf_(rec)] === 2;
        if (since === 0 || (Number(rec.srv) || 0) > since || force[c + ':' + rec.id] || fresh) out.push({c: c, rec: clean_(rec)});
      });
    });
    const res = {ok: true, serverTime: now, changes: out, accepted: acc, rejected: rej, role: role, scope: R0.scope, own: own || '', colls: COLLS, ver: VERSION};
    if (body.manifest) res.need = need.slice(0, 3000);
    if (mine) res.mqs = Object.keys(mine);
    return res;
  } finally { lock.releaseLock(); }
}

/* ===================== Puente con la pestaña RETROEXCAVADORA anterior ===================== */
// Importa lo que se siga anotando en la pestaña vieja: jornadas (A:J), salidas (K:P) y combustible (R:X).
function legacy_(ss, R, T, now) {
  const sh = ss.getSheetByName('RETROEXCAVADORA');
  if (!sh) return false;
  const last = sh.getLastRow();
  if (last < 12) return false;
  const v = sh.getRange(12, 1, last - 11, 24).getValues();
  const tz = ss.getSpreadsheetTimeZone();
  const T0 = {tz: tz};
  const d = function (x) { return fromCell_(x, 'd', T0, {}) || ''; };
  const n = function (x) { return x === '' || x === null ? '' : fromCell_(x, 'n', T0, {}); };
  const s = function (x) { return String(x == null ? '' : x).trim(); };
  let changed = false;
  const index = function (c) { const m = {}; R[c].forEach(function (r) { if (r.lk) m[r.lk] = r; }); return m; };
  const m1 = function (x) { return mqOf_(x) === MQ0; };
  const claim = function (c, lk, keyOf, key) {
    const byLk = index(c);
    if (byLk[lk]) return byLk[lk];
    const r = R[c].filter(function (x) { return !x.lk && m1(x) && keyOf(x) === key; })[0];
    if (r) { r.lk = lk; T[c].dirty = true; }
    return r || null;
  };
  const add = function (c, rec) { rec.id = Utilities.getUuid(); rec.cre = now; rec.upd = now; rec.srv = now; rec.by = 'tablero anterior'; rec.mq = MQ0; rec.__i = -1; R[c].push(rec); T[c].dirty = true; changed = true; };
  const seen = {rh: {}, rs: {}, rc: {}};
  const occ = function (c, key) { seen[c][key] = (seen[c][key] || 0) + 1; return seen[c][key] - 1; };
  v.forEach(function (row) {
    const fh = d(row[0]);
    if (fh && row[1] !== '') {
      const hi = n(row[1]), hf = n(row[2]);
      const key = fh + '|' + hi;
      const lk = 'rh|' + key + '|' + occ('rh', key);
      const r = claim('rh', lk, function (x) { return x.fecha + '|' + Number(x.hi); }, fh + '|' + Number(hi));
      const obs = s(row[8]);
      if (!r) add('rh', {fecha: fh, hi: hi, hf: hf === '' ? '' : hf, horas: hf === '' ? 0 : Math.round((hf - hi) * 100) / 100, operador: s(row[5]), obs: obs, fotoN: s(row[6]), fotoN2: s(row[7]), fotoN3: s(row[9]), lk: lk});
      else {
        let up = false;
        if ((r.hf === '' || r.hf == null) && hf !== '') { r.hf = hf; r.horas = Math.round((hf - Number(r.hi)) * 100) / 100; up = true; }
        if (!r.obs && obs) { r.obs = obs; up = true; }
        if (!r.fotoN2 && s(row[7]) && !r.foto2) { r.fotoN2 = s(row[7]); up = true; }
        if (!r.fotoN3 && s(row[9]) && !r.foto3) { r.fotoN3 = s(row[9]); up = true; }
        if (up) { r.upd = now; r.srv = now; T.rh.dirty = true; changed = true; }
      }
    }
    const fs = d(row[10]);
    if (fs && row[13] !== '') {
      const val = n(row[13]), tipo = s(row[11]) || 'Repuesto';
      const key = fs + '|' + tipo + '|' + val;
      const lk = 'rs|' + key + '|' + occ('rs', key);
      const r = claim('rs', lk, function (x) { return x.fecha + '|' + x.tipo + '|' + Number(x.valor); }, key);
      if (!r) add('rs', {fecha: fs, tipo: tipo, concepto: s(row[12]), valor: val, asume: s(row[14]) || 'Dueño', fotoN: s(row[15]), lk: lk});
    }
    const fc = d(row[17]);
    if (fc && row[21] !== '') {
      const val = n(row[21]), tipo = s(row[18]) || 'ACPM';
      const key = fc + '|' + tipo + '|' + val;
      const lk = 'rc|' + key + '|' + occ('rc', key);
      const r = claim('rc', lk, function (x) { return x.fecha + '|' + x.tipo + '|' + Number(x.valor); }, key);
      if (!r) add('rc', {fecha: fc, tipo: tipo, cant: n(row[19]) || '', und: s(row[20]) || 'gal', valor: val, horo: n(row[22]), fotoN: s(row[23]), lk: lk});
    }
  });
  return changed;
}

/* ===================== Soportes y fotos en Drive ===================== */
function saveFile_(b) {
  const m = String(b.data || '').match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return {ok: false, error: 'Archivo inválido'};
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], (b.prefix ? b.prefix + ' ' : '') + (b.name || 'soporte'));
  const fo = String(b.folder || 'Otros');
  const f = (fo === 'Informes' ? appFolder_('Informes', Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM')) : appFolder_('Soportes', fo)).createFile(blob);
  return {ok: true, fileId: f.getId(), url: f.getUrl()};
}

function getFile_(b) {
  const f = DriveApp.getFileById(b.fileId);
  const app = appFolder_().getId();
  let ok = false;
  const walk = function (it, d) { while (it.hasNext() && !ok && d < 5) { const p = it.next(); if (p.getId() === app) ok = true; else walk(p.getParents(), d + 1); } };
  walk(f.getParents(), 0);
  if (!ok) return {ok: false, error: 'Archivo fuera de la carpeta de la app'};
  const blob = f.getBlob();
  return {ok: true, name: f.getName(), data: 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes())};
}

/* ===================== Informe para el contador ===================== */
const C = {ink: '#0e1540', band: '#131b4d', cyan: '#12b3c2', violet: '#5c4dd6', gold: '#b8860b', ok: '#13875f', bad: '#c62f4f', warn: '#b86a00', mut: '#5b6694', light: '#eef1fb', line: '#d5dbf0'};

function renderReport_(ss, d) {
  let sh = ss.getSheetByName(CFG.REPORT_TAB);
  if (!sh) sh = ss.insertSheet(CFG.REPORT_TAB, 0);
  sh.clear();
  sh.setHiddenGridlines(true);
  const W = Math.max(4, Math.max.apply(null, (d.secs || []).map(function (x) { return x.cols.length; }).concat([2])));
  let r = 2;
  sh.getRange(r, 2, 1, W).merge().setValue(d.title || 'Informe').setFontSize(18).setFontWeight('bold').setFontColor('#ffffff').setBackground(C.ink); r++;
  (d.sub || []).forEach(function (x) { sh.getRange(r, 2, 1, W).merge().setValue(x + ' · Actualizado ' + Utilities.formatDate(new Date(), 'America/Bogota', 'dd/MM/yyyy HH:mm')).setFontColor(C.mut); r++; });
  r++;
  r = section_(sh, r, W, 'Resumen');
  (d.kpis || []).forEach(function (k) { sh.getRange(r, 2, 1, 2).setValues([[k[0], k[1]]]); sh.getRange(r, 2).setFontColor(C.mut); sh.getRange(r, 3).setFontWeight('bold'); r++; });
  (d.secs || []).forEach(function (sec) {
    r++; r = section_(sh, r, W, sec.h);
    sh.getRange(r, 2, 1, sec.cols.length).setValues([sec.cols]).setFontWeight('bold').setFontColor(C.mut).setBackground(C.light); r++;
    if (sec.rows.length) {
      const data = sec.rows.map(function (x) { const a = x.slice(0, sec.cols.length); while (a.length < sec.cols.length) a.push(''); return a.map(function (v) { return v == null ? '' : v; }); });
      sh.getRange(r, 2, data.length, sec.cols.length).setValues(data);
      (sec.money || []).forEach(function (m, j) { if (m) sh.getRange(r, 2 + j, data.length, 1).setNumberFormat('$#,##0'); });
      r += data.length;
    }
  });
  for (let c = 2; c < 2 + W; c++) sh.setColumnWidth(c, c === 2 ? 220 : 130);
}

function section_(sh, r, W, title) {
  sh.getRange(r, 2, 1, W).merge().setValue(title.toUpperCase()).setFontWeight('bold').setFontColor('#ffffff').setBackground(C.band).setFontSize(10);
  sh.setRowHeight(r, 26);
  return r + 1;
}

function table_(sh, r, head, rows, kindOf, fmtCols, rowFmt) {
  const w = head.length;
  sh.getRange(r, 2, 1, w).setValues([head]).setFontWeight('bold').setFontColor(C.mut).setBackground(C.light).setFontSize(9);
  if (rows.length) {
    const data = rows.map(function (x) {
      const a = x.slice(0, w); while (a.length < w) a.push('');
      return a.map(function (v) { if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); } return v; });
    });
    const rg = sh.getRange(r + 1, 2, data.length, w);
    rg.setValues(data);
    for (let j = 0; j < w; j++) {
      const sample = data.map(function (x) { return x[j]; }).filter(function (v) { return v !== '' && v !== null; })[0];
      const colR = sh.getRange(r + 1, 2 + j, data.length, 1);
      if (fmtCols && fmtCols[j]) colR.setNumberFormat(fmtCols[j]);
      else if (sample instanceof Date) colR.setNumberFormat('dd/mm/yyyy');
      else if (typeof sample === 'number') colR.setNumberFormat('$#,##0;[Red]-$#,##0');
    }
    if (rowFmt) rowFmt.forEach(function (f, i) { if (f) sh.getRange(r + 1 + i, 3).setNumberFormat(f); });
    rg.setBorder(null, null, true, null, null, true, C.line, SpreadsheetApp.BorderStyle.SOLID);
    if (kindOf) data.forEach(function (x, i) {
      const kd = kindOf(i);
      const row = sh.getRange(r + 1 + i, 2, 1, w);
      if (kd === 'total') row.setFontWeight('bold').setBackground('#e3f7f9');
      if (kd === 'sub') row.setFontWeight('bold');
      if (kd === 'nota') row.setFontColor(C.mut).setFontStyle('italic');
    });
  }
  return r + 1 + rows.length;
}

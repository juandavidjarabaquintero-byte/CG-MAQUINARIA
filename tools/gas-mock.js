// Simulador mínimo de Apps Script para probar Code.gs
const fs=require('fs'),vm=require('vm'),http=require('http'),crypto=require('crypto');
process.env.TZ='America/Bogota';
const chain=()=>{const p=new Proxy(function(){},{get:(t,k)=>k==='build'?()=>({}):()=>p,apply:()=>p});return p};
class Range{constructor(sh,r,c,nr,nc){Object.assign(this,{sh,r,c,nr,nc})}
 getValues(){const out=[];for(let i=0;i<this.nr;i++){const row=[];for(let j=0;j<this.nc;j++){const v=(this.sh.g[this.r-1+i]||[])[this.c-1+j];row.push(v===undefined?'':v)}out.push(row)}return out}
 setValues(v){v.forEach((row,i)=>row.forEach((x,j)=>{const R=this.r-1+i;this.sh.g[R]=this.sh.g[R]||[];this.sh.g[R][this.c-1+j]=x}));return this}
 setValue(x){return this.setValues([[x]])}
 clearContent(){for(let i=0;i<this.nr;i++)for(let j=0;j<this.nc;j++){const R=this.r-1+i;if(this.sh.g[R])this.sh.g[R][this.c-1+j]=''}return this}
}
const rangeProxy=r=>new Proxy(r,{get:(t,k)=>k in t?(typeof t[k]==='function'?(...a)=>{const o=t[k](...a);return o===t?rangeProxy(t):o}:t[k]):(()=>rangeProxy(t))});
class Sheet{constructor(n){this.n=n;this.g=[];this.charts=[]}
 getName(){return this.n}
 getLastRow(){let l=0;this.g.forEach((row,i)=>{if(row&&row.some(v=>v!==''&&v!==undefined&&v!==null))l=i+1});return l}
 getLastColumn(){let l=0;this.g.forEach(row=>row&&row.forEach((v,j)=>{if(v!==''&&v!==undefined&&v!==null)l=Math.max(l,j+1)}));return l}
 getMaxRows(){return 1000}getMaxColumns(){return 26}
 getRange(a,b,c,d){if(typeof a==='string'){const m=a.match(/([A-Z]+)(\d+)/);let col=0;for(const ch of m[1])col=col*26+ch.charCodeAt(0)-64;return rangeProxy(new Range(this,+m[2],col,1,1))}return rangeProxy(new Range(this,a,b,c||1,d||1))}
 getCharts(){return this.charts}removeChart(){this.charts=[]}insertChart(c){this.charts.push(c)}newChart(){return chain()}
 clear(){this.g=[];return this}
}
['setFrozenRows','setTabColor','setColumnWidth','hideColumns','setConditionalFormatRules','setHiddenGridlines','insertColumnsAfter','setRowHeight'].forEach(k=>Sheet.prototype[k]=function(){return this});
class SS{constructor(){this.sheets=[]}getSheetByName(n){return this.sheets.find(s=>s.n===n)||null}insertSheet(n){const s=new Sheet(n);this.sheets.push(s);return s}getSpreadsheetTimeZone(){return 'America/Bogota'}getSheets(){return this.sheets}}
const ss=new SS();const props={};const files={};
const FOLD={};const mkF=(name,parent)=>{const id='F'+Object.keys(FOLD).length;const o={id,name,parent,getId:()=>id,getName:()=>name,getParents:()=>{let d=!parent;return {hasNext:()=>!d,next:()=>{d=true;return FOLD[parent]}}},getFoldersByName:n=>{const k=Object.values(FOLD).filter(f=>f.parent===id&&f.name===n);let i=0;return {hasNext:()=>i<k.length,next:()=>k[i++]}},createFolder:n=>mkF(n,id),createFile:b=>{const fid='file'+Object.keys(files).length;files[fid]={b,parent:id};return {getId:()=>fid,getUrl:()=>'https://drive.google.com/file/d/'+fid}}};FOLD[id]=o;return o};
const folder=(name)=>({getId:()=>'F_'+name,getFoldersByName:n=>{let done=false;return {hasNext:()=>!done,next:()=>{done=true;return folder(n)}}},createFolder:n=>folder(n),createFile:b=>{const id='file'+Object.keys(files).length;files[id]={b,parent:'F_'+name};return {getId:()=>id,getUrl:()=>'https://drive.google.com/file/d/'+id}}});
const mk=()=>({
 SpreadsheetApp:{openById:()=>ss,create:()=>Object.assign(ss,{getId:()=>'SS1',getUrl:()=>'https://docs.google.com/spreadsheets/d/SS1'}),newDataValidation:chain,newConditionalFormatRule:chain,BorderStyle:{SOLID:1}},
 Charts:{ChartType:{COLUMN:1,PIE:2}},
 Utilities:{getUuid:()=>crypto.randomUUID(),formatDate:(d,tz,f)=>{const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`},newBlob:(bytes,type,name)=>({bytes,type,name}),base64Decode:s=>Buffer.from(s,'base64'),base64Encode:b=>Buffer.from(b).toString('base64')},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,getProperties:()=>Object.assign({},props),setProperty:(k,v)=>props[k]=v,deleteProperty:k=>delete props[k]})},
 LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
 ContentService:{createTextOutput:s=>({s,setMimeType(){return this}}),MimeType:{JSON:1}},
 ScriptApp:{getProjectTriggers:()=>[],newTrigger:chain},
 DriveApp:{createFolder:n=>mkF(n,null),getFolderById:id=>FOLD[id]||folder('root'),getFileById:id=>id==='SS1'?{moveTo(){}}:({getName:()=>files[id].b.name,getParents:()=>{if(FOLD[files[id].parent]){let d=false;return {hasNext:()=>!d,next:()=>{d=true;return FOLD[files[id].parent]}}}let d=false;return {hasNext:()=>!d,next:()=>{d=true;return {getId:()=>'F_x',getParents:()=>{let e=false;return {hasNext:()=>!e,next:()=>{e=true;return {getId:()=>'F_APP Tablero Financiero'}}}}}}}},getBlob:()=>({getContentType:()=>files[id].b.type,getBytes:()=>files[id].b.bytes})})},
 Logger:{log:(...a)=>console.log('[log]',...a)},console
});
let ctx=mk();
vm.createContext(ctx);vm.runInContext(fs.readFileSync(process.argv[2],'utf8'),ctx);
ctx.configurar();
const tok=r=>props['TOKEN_'+r];
module.exports={ctx,ss,props,tok};
if(require.main===module){
 const port=+process.argv[3]||8790;
 http.createServer((req,res)=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.url.startsWith('/__reload')){ctx=mk();vm.createContext(ctx);vm.runInContext(fs.readFileSync(b.trim(),'utf8'),ctx);res.end('reloaded');return}
  if(req.url==='/__drive'){res.end(JSON.stringify({folders:Object.values(FOLD).map(f=>({id:f.id,name:f.name,parent:f.parent})),files:Object.entries(files).map(([k,v])=>({id:k,name:v.b.name,parent:v.parent}))}));return}
  if(req.url==='/__tokens'){res.end(JSON.stringify(props));return}
  if(req.url==='/__dump'){res.end(JSON.stringify(ss.sheets.map(s=>({n:s.n,rows:s.g.length,g:s.g.slice(0,400)}))));return}
  if(req.url.startsWith('/__edit')){const q=JSON.parse(b);const sh=ss.getSheetByName(q.tab);const r=sh.getRange(q.row,q.col,1,1);r.setValue(q.value);ctx.alEditar({range:{getSheet:()=>sh,getRow:()=>q.row,getLastRow:()=>q.row,getColumn:()=>q.col,getLastColumn:()=>q.col}});res.end('ok');return}
  if(req.url.startsWith('/__sheet')){const q=JSON.parse(b);const sh=ss.getSheetByName(q.name)||ss.insertSheet(q.name);q.rows.forEach((row,i)=>{sh.g[q.start-1+i]=row});res.end('ok');return}
  if(req.url.startsWith('/__append')){const q=JSON.parse(b);const sh=ss.getSheetByName(q.tab);const r=sh.getLastRow()+1;sh.getRange(r,1,1,q.row.length).setValues([q.row]);res.end(String(r));return}
  if(req.method==='GET'){res.end(ctx.doGet().s);return}
  try{const out=ctx.doPost({postData:{contents:b}});res.setHeader('Content-Type','application/json');res.end(out.s)}catch(e){res.statusCode=500;res.end(String(e.stack))}
 })}).listen(port,()=>console.log('mock on',port,JSON.stringify(props)));
}

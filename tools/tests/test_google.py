import asyncio,json,os,re,urllib.parse,itertools,base64
from playwright.async_api import async_playwright
D=os.path.dirname(os.path.abspath(__file__));os.makedirs(D+'/out',exist_ok=True)
PWA='file://'+os.path.abspath(os.path.join(D,'../../index.html'))
SCOPE='https://www.googleapis.com/auth/drive.file'
GSI="""window.__gsi={asks:0,revoked:0};window.google={accounts:{oauth2:{initTokenClient:c=>({requestAccessToken:o=>{__gsi.asks++;__gsi.last=o;setTimeout(()=>__gsi.fail?c.error_callback({type:'popup_closed'}):c.callback({access_token:'tok'+__gsi.asks,expires_in:3599,scope:'%s'}),30)}}),hasGrantedAllScopes:()=>true,revoke:(t,cb)=>{__gsi.revoked++;cb&&cb()}}}};"""%SCOPE
class Drive:
    def __init__(s):s.f={};s.n=itertools.count(1);s.bump=0;s.log=[]
    def new(s,name,parent,mime,data=b''):
        i='f%08d'%next(s.n);s.f[i]=dict(id=i,name=name,parents=[parent],mimeType=mime,data=data,version=1,trashed=False);return s.f[i]
    def meta(s,x,fields):
        ks=re.findall(r'\w+',fields or 'id');o={k:x[k] for k in ks if k in x}
        if 'webViewLink' in ks:o['webViewLink']='https://drive.google.com/file/d/%s/view'%x['id']
        if 'version' in o:o['version']=str(o['version'])
        return o
    async def handle(s,route):
        r=route.request;u=urllib.parse.urlparse(r.url);q=dict(urllib.parse.parse_qsl(u.query));m=r.method
        if r.headers.get('authorization','')[:10]!='Bearer tok':return await route.fulfill(status=401,json={'error':{'message':'Invalid Credentials'}})
        s.log.append((m,u.path,q.get('uploadType',''),q.get('alt','')))
        p=u.path
        if p=='/drive/v3/files' and m=='GET':
            qq=q['q'];name=re.search(r"name='((?:\\\\.|[^'])*)'",qq).group(1).replace("\\'","'");par=re.search(r"'([^']+)' in parents",qq).group(1)
            dirq="mimeType='application/vnd.google-apps.folder'" in qq
            fs=[x for x in s.f.values() if x['name']==name and par in x['parents'] and not x['trashed'] and ((x['mimeType']=='application/vnd.google-apps.folder')==dirq)]
            return await route.fulfill(json={'files':[{'id':x['id'],'name':x['name']} for x in fs]})
        if p=='/drive/v3/files' and m=='POST':
            b=json.loads(r.post_data);x=s.new(b['name'],b['parents'][0],b['mimeType']);return await route.fulfill(json=s.meta(x,q.get('fields')))
        if p=='/upload/drive/v3/files' and m=='POST':
            assert q['uploadType']=='multipart';ct=r.headers['content-type'];bd=ct.split('boundary=')[1].encode();body=r.post_data_buffer
            parts=[x for x in body.split(b'--'+bd) if x.strip() not in (b'',b'--')]
            h1,j=parts[0].split(b'\r\n\r\n',1);h2,data=parts[1].split(b'\r\n\r\n',1);data=data[:-2] if data.endswith(b'\r\n') else data
            md=json.loads(j);mime=h2.decode().split('Content-Type: ')[1].strip()
            x=s.new(md['name'],md['parents'][0],mime,data);return await route.fulfill(json=s.meta(x,q.get('fields')))
        mm=re.match(r'/(upload/)?drive/v3/files/([\w-]+)$',p)
        if mm:
            x=s.f.get(mm.group(2))
            if not x:return await route.fulfill(status=404,json={'error':{'message':'File not found'}})
            if m=='PATCH':assert q['uploadType']=='media';x['data']=r.post_data_buffer;x['version']+=1;return await route.fulfill(json=s.meta(x,q.get('fields')))
            if q.get('alt')=='media':return await route.fulfill(body=x['data'],content_type=x['mimeType'])
            if s.bump and 'version' in q.get('fields',''):
                s.bump-=1;r0=s.meta(x,q.get('fields'));x['version']+=1;return await route.fulfill(json=r0)
            return await route.fulfill(json=s.meta(x,q.get('fields')))
        await route.fulfill(status=400,json={'error':{'message':'no simulado '+m+' '+p}})
DR=Drive()
def tree():
    def path(x):
        n=[x['name']];p=x['parents'][0]
        while p in DR.f:n.insert(0,DR.f[p]['name']);p=DR.f[p]['parents'][0]
        return '/'.join(n)
    return sorted(path(x) for x in DR.f.values())
def dbjson():
    x=[v for v in DR.f.values() if v['name'].endswith('datos.json')];assert len(x)==1,len(x);return json.loads(x[0]['data'])
async def dev(b,vw=None):
    ctx=await b.new_context(viewport=vw or {'width':1366,'height':900},accept_downloads=True)
    await ctx.route('https://accounts.google.com/gsi/client',lambda r:r.fulfill(body=GSI,content_type='application/javascript'))
    await ctx.route('https://www.googleapis.com/**',DR.handle)
    await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/**',lambda r:r.fulfill(path=D+'/fixtures/node_modules/'+{'xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js','jspdf.umd.min.js':'jspdf/dist/jspdf.umd.min.js','jspdf.plugin.autotable.min.js':'jspdf-autotable/dist/jspdf.plugin.autotable.min.js'}[r.request.url.split('/')[-1]],content_type='application/javascript'))
    pg=await ctx.new_page();pg.errs=[];pg.on('pageerror',lambda e:pg.errs.append(str(e)))
    await pg.goto(PWA);await pg.wait_for_function("typeof S!=='undefined'&&S&&S.cfg");await pg.wait_for_timeout(300);return pg
async def connect(pg,cid=True):
    await pg.evaluate("go('ajustes')");await pg.wait_for_timeout(150)
    await pg.click('button[data-act=modoGoogle]');await pg.wait_for_timeout(200)
    if cid:await pg.fill('#gcid','123-abc.apps.googleusercontent.com')
    await pg.click('button[data-act=gdIn]');await pg.wait_for_timeout(2500)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        A=await dev(b)
        await A.evaluate("go('ajustes')");await A.wait_for_timeout(150);print('opciones',await A.locator('.stc').count())
        await A.click('button[data-act=modoGoogle]');await A.wait_for_timeout(200);await A.fill('#gcid','malo');await A.click('button[data-act=gdIn]');await A.wait_for_timeout(200);print('id malo',await A.inner_text('#toast'))
        await A.fill('#gcid','123-abc.apps.googleusercontent.com');await A.click('button[data-act=gdIn]');await A.wait_for_timeout(2500)
        print('A',await A.evaluate("[S.cfg.url,S.cfg.tokRole,S.cfg.syncErr,S.outbox.length,__gsi.asks,JSON.stringify(__gsi.last)]"))
        print('arbol',tree())
        await A.screenshot(path=D+'/out/g-ajustes.png',full_page=True)
        n0=sum(len(v) for v in dbjson()['recs'].values());print('registros en Drive',n0)
        await A.evaluate("""()=>{const c=upsert('cli',{nombre:'Mina Norte'});const m=upsert('maq',{maq:'CAT 336',tipo:'Excavadora',cli:c.id,precio:200000,min:8,alerta:80,combA:'Dueño',repA:'Dueño'});upsert('rh',{mq:m.id,fecha:today(),hi:100,hf:109,tar:200000})}""")
        await A.set_input_files('#heroPh',[]) if False else None
        await A.evaluate("""async()=>{const r=await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');const data='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';const fid=uid();await DB.put('files',fid,{name:'h.png',data});IMG[fid]={name:'h.png',data};const m=L('maq').find(x=>x.maq==='CAT 336');upsert('maq',{id:m.id,foto:fid})}""")
        await A.click('#syncPill');await A.wait_for_timeout(2500)
        print('A tras enviar',await A.evaluate("[S.cfg.syncErr,S.outbox.length,pendingPhotos().length,!!L('maq').find(x=>x.maq==='CAT 336').fotoDrive]"))
        d=dbjson();print('Drive tiene',sorted((c,len(v)) for c,v in d['recs'].items() if v)[:20],'t',d['t']>0)
        print('arbol',[x for x in tree() if 'Soportes' in x])
        # B
        B=await dev(b,{'width':390,'height':844});await connect(B)
        print('B',await B.evaluate("[S.cfg.syncErr,L('maq').map(m=>m.maq).includes('CAT 336'),L('rh').length,L('cli').map(c=>c.nombre).includes('Mina Norte')]"))
        mid=await B.evaluate("L('maq').find(x=>x.maq==='CAT 336').id");fd=await B.evaluate(f"byId('maq','{mid}').fotoDrive");got=await B.evaluate(f"api('getFile',{{fileId:'{fd}'}}).then(r=>[r.name,r.data.slice(0,30)])");print('B foto',got,await B.evaluate(f"(IMG[byId('maq','{mid}').foto]||{{}}).data?.slice(0,22)||'no en caché'"))
        await B.evaluate(f"upsert('maq',{{id:'{mid}',precio:210000}})");await B.click('#syncPill');await B.wait_for_timeout(2000)
        await A.click('#syncPill');await A.wait_for_timeout(2000);print('A ve cambio de B',await A.evaluate(f"byId('maq','{mid}').precio"))
        # conflicto: A y B editan; versión cambia entre lectura y escritura
        await A.evaluate(f"upsert('maq',{{id:'{mid}',operador:'Luis'}})");DR.bump=1;await A.click('#syncPill');await A.wait_for_timeout(2500)
        print('reintento',await A.evaluate("[S.cfg.syncErr,S.outbox.length]"),dbjson()['recs']['maq'][mid].get('operador'))
        # token vencido
        await A.evaluate("()=>{GD.tok='';GD.exp=0;localStorage.removeItem('cgm-gtok')}");asks=await A.evaluate("__gsi.asks")
        await A.evaluate("sync(false)");await A.wait_for_timeout(500);print('sin gesto',await A.evaluate("[S.cfg.syncErr,__gsi.asks]"),asks)
        await A.evaluate("upsert('cli',{nombre:'Mina Sur'})");await A.evaluate("()=>{GD.g=0}");
        await A.click('#syncPill');await A.wait_for_timeout(2000);print('con gesto',await A.evaluate("[S.cfg.syncErr,__gsi.asks,JSON.stringify(__gsi.last),S.outbox.length]"))
        # token rechazado (401)
        await A.evaluate("()=>{GD.tok='malo';GD.exp=Date.now()+3e6}");await A.evaluate("upsert('cli',{nombre:'Mina Este'})");await A.evaluate("sync(true)");await A.wait_for_timeout(800);print('401',await A.evaluate("[S.cfg.syncErr,GD.tok,S.outbox.length]"))
        await A.click('#syncPill');await A.wait_for_timeout(2000);print('tras 401 y toque',await A.evaluate("[S.cfg.syncErr,S.outbox.length]"))
        # ventana cerrada
        await A.evaluate("()=>{GD.drop();__gsi.fail=1}");await A.click('#syncPill');await A.wait_for_timeout(800);print('popup cerrado',await A.evaluate("S.cfg.syncErr"));await A.evaluate("__gsi.fail=0")
        await A.click('#syncPill');await A.wait_for_timeout(1500)
        # informe al Drive
        r=await A.evaluate("api('file',{data:'data:application/pdf;base64,'+btoa('%PDF-1.4 x'),name:'Informe.pdf',folder:'Informes'})");print('informe',r['url'][:40],[x for x in tree() if 'Informes' in x])
        # invitar
        await A.evaluate("go('ajustes')");await A.wait_for_timeout(150);await A.click('button[data-act=invitar]');await A.wait_for_timeout(300);print('invitar',(await A.inner_text('#sheet'))[:80].replace('\n',' '));await A.evaluate("closeModal()")
        await A.screenshot(path=D+'/out/g-conectado.png',full_page=True)
        # recarga: token guardado en este navegador, no en el respaldo
        print('token en estado',await A.evaluate("JSON.stringify(S).includes(GD.tok)"))
        await A.reload();await A.wait_for_function("typeof S!=='undefined'&&S&&S.cfg");await A.wait_for_timeout(2500);print('recarga',await A.evaluate("[S.cfg.url,S.cfg.syncErr,!!GD.tok]"))
        # salir
        await A.evaluate("go('ajustes')");await A.wait_for_timeout(150);await A.click('button[data-act=gdOut]');await A.wait_for_timeout(200);await A.click('#modal button.pri, #modal .btn.dan');await A.wait_for_timeout(300)
        print('salir',await A.evaluate("[S.cfg.url,S.cfg.modo,!!localStorage.getItem('cgm-gtok'),__gsi.revoked,L('maq').length>0]"))
        print('datos.json',len([x for x in DR.f.values() if x['name'].endswith('datos.json')]),'carpetas raíz',len([x for x in DR.f.values() if x['name']=='Tablero de Maquinaria']))
        print('errores',[A.errs,B.errs])
        await b.close()
asyncio.run(main())

import asyncio,json,urllib.request
from playwright.async_api import async_playwright
U='http://localhost:8790';T=json.loads(urllib.request.urlopen(U+'/__tokens').read())
import os
D=os.path.dirname(os.path.abspath(__file__));os.makedirs(D+'/out/dl',exist_ok=True)
PWA='file://'+os.path.abspath(os.path.join(D,'../../index.html'))
def post(d):return json.loads(urllib.request.urlopen(urllib.request.Request(U+'/exec',data=json.dumps(d).encode(),method='POST')).read())
def dump():return {s['n']:s['g'] for s in json.loads(urllib.request.urlopen(U+'/__dump').read())}
async def newpg(b,vw=None):
    pg=await (await b.new_context(viewport=vw or {'width':1366,'height':900},device_scale_factor=2 if vw else 1)).new_page();pg.errs=[];pg.on('pageerror',lambda e:pg.errs.append(str(e)));return pg
async def nxt(pg,a='wzNext'):await pg.click(f'button[data-act={a}]');await pg.wait_for_timeout(250)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        A=await newpg(b);await A.goto(PWA);await A.wait_for_timeout(600)
        await A.evaluate(f"()=>{{S.cfg.url='{U}/exec';S.cfg.token='{T['TOKEN_admin']}';save()}}");await A.evaluate("sync(false)");await A.wait_for_timeout(1300)
        await A.evaluate("()=>{const c=upsert('cli',{nombre:'Mina El Oro'});const d=upsert('cli',{nombre:'Mina San Juan'});upsert('maq',{maq:'CAT 320',tipo:'Excavadora',cli:c.id,precio:180000,min:8,alerta:80});upsert('maq',{maq:'JD 310',tipo:'Retroexcavadora',cli:d.id,precio:150000,min:8,alerta:80})}")
        await A.evaluate("go('ajustes')");await A.wait_for_timeout(200)
        for nm,i in [('Ana',0),('Beto',1)]:
            await A.click('button[data-act=newAux]');await A.wait_for_timeout(300);await A.fill('#f_nombre',nm);await A.check(f'#f_mqs input >> nth={i}');await A.click('#frm button[type=submit]');await A.wait_for_timeout(300)
        await A.screenshot(path=D+'/out/x-aux.png',full_page=True)
        await A.evaluate("sync(true)");await A.wait_for_timeout(1500)
        links={}
        for nm in ['Ana','Beto']:
            aid=await A.evaluate(f"L('aux').find(a=>a.nombre==='{nm}').id");await A.evaluate(f"auxInv('{aid}')");await A.wait_for_timeout(1500);links[nm]=await A.evaluate("window.__AUXURL");await A.click('button[data-act=close]')
        await A.screenshot(path=D+'/out/x-inv.png')
        print('links',{k:v.split('&k=')[1][:16] for k,v in links.items()})
        X={}
        for nm in ['Ana','Beto']:
            pg=await newpg(b,{'width':390,'height':844});await pg.goto(PWA+'#'+links[nm].split('#',1)[1]);await pg.wait_for_timeout(3000);X[nm]=pg
            print(nm,await pg.evaluate("[S.cfg.role,S.cfg.auxId?'id':'-',L('maq').map(m=>m.maq),L('cli').length,L('aux').map(a=>a.nombre)]"))
        Ana=X['Ana'];await Ana.screenshot(path=D+'/out/x-ana.png')
        await Ana.click('button[data-act=wz]');await Ana.wait_for_timeout(200);await Ana.set_input_files('#wzFile',D+'/fixtures/maq.jpg');await Ana.wait_for_timeout(500);await nxt(Ana);await Ana.fill('#wzN','500');await nxt(Ana);await nxt(Ana,'wzSave');await Ana.wait_for_timeout(2500)
        jd=await A.evaluate("L('maq').find(m=>m.maq==='JD 310').id")
        await Ana.evaluate(f"()=>{{S.maq.push({{id:'{jd}',maq:'JD 310',upd:1}});upsert('rh',{{fecha:today(),mq:'{jd}',hi:1,hf:2,horas:1}})}}");await Ana.evaluate("sync(true)");await Ana.wait_for_timeout(1500)
        d=dump();h=d['APP Jornadas'][0];ia=h.index('Registró');im=h.index('Máquina')
        print('sheet jornadas',[(r[im],r[ia]) for r in d['APP Jornadas'][1:]])
        Beto=X['Beto'];await Beto.evaluate("sync(true)");await Beto.wait_for_timeout(1500);print('Beto ve rh',await Beto.evaluate("L('rh').length"))
        print('report por aux',post({'op':'report','token':links['Ana'].split('&k=')[1].split('&')[0],'data':{}}))
        await A.evaluate("sync(true)");await A.wait_for_timeout(1500);await A.evaluate("go('validar')");await A.wait_for_timeout(300);print('validar',await A.inner_text('.vrow'));await A.screenshot(path=D+'/out/x-val.png')
        # desactivar a Beto
        await A.evaluate("()=>{const a=L('aux').find(a=>a.nombre==='Beto');upsert('aux',{id:a.id,inactivo:true})}");await A.evaluate("sync(true)");await A.wait_for_timeout(1500)
        await Beto.evaluate("sync(true)");await Beto.wait_for_timeout(1200);print('Beto desactivado',await Beto.evaluate("S.cfg.syncErr"))
        # nueva clave para Ana
        anaKey=links['Ana'].split('&k=')[1].split('&')[0];aid=await A.evaluate("L('aux').find(a=>a.nombre==='Ana').id")
        r=post({'op':'auxKey','token':T['TOKEN_admin'],'id':aid,'reset':True});print('clave vieja',post({'op':'ping','token':anaKey}).get('error'),'| nueva',post({'op':'ping','token':r['key']}).get('role'))
        print('sheet auxiliares',[x[:4] for x in d['APP Auxiliares']])
        print('errores',[pg.errs for pg in [A,Ana,Beto]])
        await b.close()
asyncio.run(main())

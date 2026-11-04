import asyncio,json,urllib.request,re
from playwright.async_api import async_playwright
U='http://localhost:8790';T=json.loads(urllib.request.urlopen(U+'/__tokens').read())
import os
D=os.path.dirname(os.path.abspath(__file__));os.makedirs(D+'/out/dl',exist_ok=True)
PWA='file://'+os.path.abspath(os.path.join(D,'../../index.html'))
async def newpg(b,vw=None,offline=False):
    ctx=await b.new_context(viewport=vw or {'width':1366,'height':900},device_scale_factor=2 if vw else 1,accept_downloads=True)
    pg=await ctx.new_page();pg.ctx=ctx;pg.errs=[];pg.on('pageerror',lambda e:pg.errs.append(str(e)))
    await pg.route('https://cdnjs.cloudflare.com/ajax/libs/**',lambda r:r.fulfill(path={'qrcode.min.js':D+'/fixtures/qr.js'}.get(r.request.url.split('/')[-1],D+'/fixtures/node_modules/'+{'xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js','jspdf.umd.min.js':'jspdf/dist/jspdf.umd.min.js','jspdf.plugin.autotable.min.js':'jspdf-autotable/dist/jspdf.plugin.autotable.min.js'}.get(r.request.url.split('/')[-1],'')),content_type='application/javascript'))
    return pg
async def nxt(pg,act='wzNext'):await pg.click(f'button[data-act={act}]');await pg.wait_for_timeout(250)
async def photo(pg):await pg.set_input_files('#wzFile',D+'/fixtures/maq.jpg');await pg.wait_for_timeout(500)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        A=await newpg(b);await A.goto(PWA);await A.wait_for_timeout(600)
        await A.evaluate(f"()=>{{S.cfg.url='{U}/exec';S.cfg.token='{T['TOKEN_admin']}';save()}}");await A.evaluate("sync(false)");await A.wait_for_timeout(1300)
        await A.evaluate("""()=>{const c=upsert('cli',{nombre:'Mina La Esperanza'});upsert('maq',{maq:'CAT 320 · R-01',tipo:'Excavadora',cli:c.id,precio:180000,min:8,alerta:80,combA:'Dueño',repA:'Dueño'});upsert('maq',{maq:'JD 310 · R-02',tipo:'Retroexcavadora',cli:c.id,precio:150000,min:8,alerta:80,combA:'Cliente',repA:'Dueño'});upsert('fnd',{tipo:'comprador',nombre:'Pedro',ps:['retro'],p:'retro',inm:''})}""")
        await A.evaluate("sync(true)");await A.wait_for_timeout(1500)
        await A.evaluate("go('ajustes')");await A.wait_for_timeout(200)
        print('store card',await A.locator('.stc').count(),'invitar btn',await A.locator('button[data-act=invitar]').count())
        await A.click('button[data-act=invitar]');await A.wait_for_timeout(900)
        m1=await A.evaluate("L('maq')[0].id")
        auxUrl=await A.evaluate("invUrl('aux')");ownUrl=await A.evaluate("invUrl('conta')");print('aux link',auxUrl[:90]+'…')
        await A.click('button[data-act=invQr][data-r=conta]');await A.wait_for_timeout(500);print('qr svg',await A.locator('#qr_conta svg').count())
        await A.screenshot(path=D+'/out/c-invitar.png')
        # auxiliar abre su enlace
        X=await newpg(b,{'width':390,'height':844});link=PWA+'#'+auxUrl.split('#',1)[1]
        await X.goto(link);await X.wait_for_timeout(3000)
        print('aux',await X.evaluate("[S.cfg.role,S.cfg.tokRole,V.m,S.cfg.mqDef===L('maq')[0]?.id,location.hash]"),'nav',await X.evaluate("navItems().map(m=>m.id)"))
        await X.screenshot(path=D+'/out/c-home.png',full_page=True)
        # iniciar jornada
        await X.click('button[data-act=wz]');await X.wait_for_timeout(200);await X.screenshot(path=D+'/out/c-wz1.png')
        await nxt(X);print('sin foto bloquea',await X.inner_text('#toast'))
        await photo(X);await nxt(X);await X.fill('#wzN','1000');await nxt(X);await X.screenshot(path=D+'/out/c-wzok.png');await nxt(X,'wzSave')
        print('rh abierta',await X.evaluate("LM('rh',cmq().id).filter(enCurso).map(r=>[r.hi,!!r.foto,r.tar,r.src])"))
        # terminar con novedad
        await X.click('button[data-act=wz]');await X.wait_for_timeout(200);await photo(X);await nxt(X);await X.fill('#wzN','1008,5');await nxt(X)
        await X.click('button[data-act=wzSet][data-k=hasNov][data-v="1"]');await X.wait_for_timeout(200);await X.click('button[data-act=wzAdd][data-v=Lluvia]');await X.wait_for_timeout(100);await nxt(X);await nxt(X,'wzSave')
        print('rh cerrada',await X.evaluate("LM('rh',cmq().id).map(r=>[r.hi,r.hf,r.horas,r.obs,!!r.foto2])"))
        # novedad sola
        await X.click('button[data-act=wzNov]');await X.wait_for_timeout(200);await X.click('button[data-act=wzAdd][data-v="Daño de la máquina"]');await nxt(X);await photo(X);await nxt(X);await nxt(X,'wzSave')
        print('novedad',await X.evaluate("LM('rh',cmq().id).map(r=>[r.obs,!!r.foto3])"))
        # repuesto con fondo
        await X.click('button[data-act=wzRs]');await X.wait_for_timeout(200);await photo(X);await nxt(X)
        await X.click('button[data-act=wzSet][data-k=tipo][data-v=Repuesto]');await X.wait_for_timeout(150);await X.fill('#wzT','Manguera hidráulica');await nxt(X);await X.fill('#wzM','250000');await nxt(X)
        await X.screenshot(path=D+'/out/c-pago.png');await X.click('button[data-act=wzSet][data-k=fnd]:not([data-v=""])');await X.wait_for_timeout(150);await nxt(X,'wzSave')
        # combustible sin señal
        await X.ctx.set_offline(True)
        await X.click('button[data-act=wzRc]');await X.wait_for_timeout(200);await nxt(X);await X.click('button[data-act=wzSet][data-k=tipo][data-v=ACPM]');await X.wait_for_timeout(150);await X.fill('#wzN','40');await nxt(X);await X.fill('#wzM','500000');await nxt(X);await X.click('button[data-act=wzSet][data-k=fnd][data-v=""]');await X.wait_for_timeout(150);await nxt(X,'wzSave')
        print('offline toast',await X.inner_text('#toast'),'outbox',await X.evaluate("S.outbox.length"))
        await X.evaluate("render()");await X.wait_for_timeout(100);print('estado',await X.inner_text('.cstat'))
        await X.ctx.set_offline(False);await X.evaluate("sync(true)");await X.wait_for_timeout(2500);print('tras señal outbox',await X.evaluate("S.outbox.length"),await X.inner_text('.cstat') if await X.locator('.cstat').count() else '')
        print('rs/rc',await X.evaluate("[L('rs').map(r=>[r.concepto,r.valor,!!r.fnd,r.src]),L('rc').map(r=>[r.tipo,r.cant,r.valor,r.asume])]"))
        await X.click('button[data-act=cMis]');await X.wait_for_timeout(300);await X.screenshot(path=D+'/out/c-mis.png');await X.click('button[data-act=close]')
        # admin valida
        await A.click('button[data-act=close]');await A.evaluate("sync(true)");await A.wait_for_timeout(2000)
        await A.evaluate("go('validar')");await A.wait_for_timeout(300);print('por validar',await A.evaluate("pendVal().length"),'alerta',await A.evaluate("alerts()[0]"))
        await A.screenshot(path=D+'/out/c-validar.png',full_page=True)
        await A.click('button[data-act=valOne] >> nth=0');await A.wait_for_timeout(200);print('tras validar 1',await A.evaluate("pendVal().length"))
        await A.click('button[data-act=valAll]');await A.click('#okc');await A.wait_for_timeout(200);print('tras validar todo',await A.evaluate("pendVal().length"))
        print('fondo saldo',await A.evaluate("fStats(L('fnd')[0]).comp"))
        # dueño
        O=await newpg(b,{'width':390,'height':844});await O.goto(PWA+'#'+ownUrl.split('#',1)[1]);await O.wait_for_timeout(3000)
        print('dueño',await O.evaluate("[S.cfg.role,V.m,navItems().map(m=>m.id).join(','),canEdit()]"))
        # local
        Lp=await newpg(b);await Lp.goto(PWA);await Lp.wait_for_timeout(600);await Lp.evaluate("go('ajustes')");await Lp.wait_for_timeout(200)
        print('local status',await Lp.inner_text('#syncTxt'),'store',await Lp.locator('.stc.on').inner_text())
        await Lp.click('button[data-act=modoDrive]');await Lp.wait_for_timeout(200);print('modo drive nota',await Lp.locator('text=Pega abajo').count())
        await Lp.screenshot(path=D+'/out/c-store.png')
        # enlace manipulado
        Z=await newpg(b);await Z.goto(PWA+'#conectar&u=https%3A%2F%2Fevil.com%2Fx&k=ADM-1');await Z.wait_for_timeout(800);print('enlace malo',await Z.inner_text('#toast'),await Z.evaluate("S.cfg.url"))
        print('errores',[pg.errs for pg in [A,X,O,Lp,Z]])
        await b.close()
asyncio.run(main())

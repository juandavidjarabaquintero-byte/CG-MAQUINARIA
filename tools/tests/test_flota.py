import asyncio,json,urllib.request
from playwright.async_api import async_playwright
U='http://localhost:8790';T=json.loads(urllib.request.urlopen(U+'/__tokens').read())
import os
D=os.path.dirname(os.path.abspath(__file__));os.makedirs(D+'/out/dl',exist_ok=True)
PWA='file://'+os.path.abspath(os.path.join(D,'../../index.html'))
def dump():return {s['n']:s['g'] for s in json.loads(urllib.request.urlopen(U+'/__dump').read())}
async def dev(b,tok,vw=None):
    pg=await (await b.new_context(viewport=vw or {'width':1366,'height':900},device_scale_factor=1 if not vw else 2,accept_downloads=True)).new_page();pg.errs=[];pg.on('pageerror',lambda e:pg.errs.append(str(e)))
    await pg.route('https://cdnjs.cloudflare.com/ajax/libs/**',lambda r:r.fulfill(path=D+'/fixtures/node_modules/'+{'xlsx.full.min.js':'xlsx/dist/xlsx.full.min.js','jspdf.umd.min.js':'jspdf/dist/jspdf.umd.min.js','jspdf.plugin.autotable.min.js':'jspdf-autotable/dist/jspdf.plugin.autotable.min.js'}[r.request.url.split('/')[-1]],content_type='application/javascript'))
    await pg.goto(PWA);await pg.wait_for_function("typeof S!=='undefined'&&S&&S.cfg");await pg.wait_for_timeout(300)
    if tok:await pg.evaluate(f"()=>{{S.cfg.url='{U}/exec';S.cfg.token='{tok}';save()}}");await pg.evaluate("sync(false)");await pg.wait_for_timeout(1300)
    return pg
async def sub(pg):
    await pg.click('#frm button[type=submit]')
    try:await pg.wait_for_function("$('#modal').hidden||!$('#frm')",timeout=6000)
    except Exception:print('FORM OPEN',await pg.inner_text('#toast'),await pg.inner_text('.sheet h2'))
    await pg.wait_for_timeout(100)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        A=await dev(b,T['TOKEN_admin'])
        await A.screenshot(path=D+'/out/m-welcome.png')
        await A.evaluate("go('clientes')");await A.wait_for_timeout(100)
        for n in ['Constructora Andes','Alcaldía de Caucasia']:
            await A.click('button[data-act=newCli]');await A.fill('#f_nombre',n);await sub(A)
        await A.evaluate("go('retro','resumen')");await A.wait_for_timeout(100)
        mqs=[('CAT 320 · R-01','Excavadora','Constructora Andes','180000','Dueño'),('JD 310 · R-02','Retroexcavadora','Alcaldía de Caucasia','150000','Cliente'),('Volqueta 05','Volqueta','','120000','Dueño')]
        for nm,tp,cl,tar,comb in mqs:
            await A.click('button[data-act=newMaq]');await A.wait_for_timeout(400);await A.fill('#f_maq',nm);await A.select_option('#f_tipo',tp)
            if cl:await A.select_option('#f_cli',label=cl)
            await A.fill('#f_precio',tar);print('after fill',await A.eval_on_selector('#f_precio','e=>e.value'));await A.select_option('#f_combA',comb);print('after comb',await A.eval_on_selector('#f_precio','e=>e.value'))
            if nm.startswith('CAT'):await A.set_input_files('#f_foto',D+'/fixtures/maq.jpg')
            print(nm,'precio',await A.eval_on_selector('#f_precio','e=>e.value'),await A.eval_on_selector('#f_cli','e=>e.value'))
            await sub(A)
        print('maq',await A.evaluate("L('maq').map(m=>[m.maq,cliName(m.cli),m.precio,m.combA])"))
        # jornadas por formulario
        await A.evaluate("()=>{V.mq=L('maq').find(m=>m.maq.startsWith('CAT')).id}")
        await A.evaluate("formRh()");print('rh tar default',await A.eval_on_selector('#f_tar','e=>e.value'),await A.eval_on_selector('#f_cli','e=>e.selectedOptions[0].text'))
        await A.fill('#f_hi','1000');await A.fill('#f_hf','1009');await sub(A)
        # carga rápida de 20 días para las 3 máquinas
        await A.evaluate("""()=>{const ms=L('maq');let d=new Date();for(let i=20;i>=1;i--){const x=new Date(d);x.setDate(d.getDate()-i);const f=x.toISOString().slice(0,10);ms.forEach((m,j)=>{if(j===2&&i%3)return;const h=[9,7,5,8,10,0,6][ (i+j)%7];const last=LM('rh',m.id).filter(r=>!enCurso(r)).map(r=>r.hf).sort((a,b)=>b-a)[0]||(1000+j*500);upsert('rh',{fecha:f,mq:m.id,cli:m.cli||'',tar:m.precio,hi:last,hf:last+h,horas:h,operador:'Op '+(j+1),obs:h===0?'Lluvia':''})})}}""")
        A.on('dialog',lambda d:d.accept())
        await A.evaluate("()=>{const m=L('maq')[1];V.mq=m.id}");await A.evaluate("formRs()");await A.fill('#f_concepto','Manguera hidráulica');await A.fill('#f_valor','450000');await A.select_option('#f_asume','Cliente');await sub(A)
        await A.evaluate("()=>{V.mq=L('maq')[0].id}");await A.evaluate("formRs()");await A.fill('#f_concepto','Dientes balde');await A.fill('#f_valor','900000');await sub(A)
        await A.evaluate("formRc()");print('rc asume default',await A.eval_on_selector('#f_asume','e=>e.value'));await A.fill('#f_valor','1200000');await A.fill('#f_cant','100');await sub(A)
        await A.evaluate("()=>{V.mq=L('maq')[1].id}");await A.evaluate("formRc()");print('rc asume default JD',await A.eval_on_selector('#f_asume','e=>e.value'));await A.fill('#f_valor','800000');await sub(A)
        await A.evaluate("formMov('flota','operadores')");print('flota mq field',await A.locator('#f_mq').count());await A.select_option('#f_mq',index=1);await A.fill('#f_valor','2500000');await A.fill('#f_concepto','Salario operador');await sub(A)
        await A.evaluate("go('fondos')");await A.click('button[data-act=newFnd][data-v=comprador]');print('fnd proj opts',await A.locator('#f_ps label').all_inner_texts());await A.fill('#f_nombre','Carlos Compras');await A.check('#f_ps input[value=flota]');await sub(A)
        fid=await A.evaluate("L('fnd')[0].id");await A.click(f'button[data-act=fndEnt][data-id="{fid}"]');await A.fill('#f_valor','3000000');await sub(A)
        await A.click(f'button[data-act=fndComp][data-id="{fid}"]');await A.wait_for_timeout(250);print('compra opts',await A.locator('#f_r option').all_inner_texts())
        await A.select_option('#f_r','retro|rs');await A.select_option('#f_mq',index=0);await A.click('#frm button[type=submit]');await A.wait_for_timeout(500)
        await A.fill('#f_concepto','Filtros');await A.fill('#f_valor','350000');await A.set_input_files('#f_foto',D+'/fixtures/maq.jpg');await sub(A)
        await A.evaluate("go('clientes')");await A.wait_for_timeout(100);cid=await A.evaluate("L('cli').find(c=>c.nombre==='Constructora Andes').id")
        await A.click(f'button[data-act=newCob][data-id="{cid}"]');await A.fill('#f_valor','10000000');await sub(A)
        print('cliente',await A.evaluate(f"(()=>{{const s=cliStats('{cid}');return [s.horas,s.fac,s.cob,s.saldo]}})()"))
        print('calc flota',await A.evaluate("(()=>{const R=retroCalc('','');return {h:R.horas,ing:R.ing,repD:R.repD,repC:R.repC,combD:R.combD,combC:R.combC,gas:R.gas,util:R.util}})()"))
        await A.evaluate("go('clientes')");await A.wait_for_timeout(200);await A.screenshot(path=D+'/out/m-clientes.png',full_page=True)
        await A.evaluate("go('inicio')");await A.wait_for_timeout(300);await A.screenshot(path=D+'/out/m-panel.png',full_page=True)
        await A.evaluate("()=>{V.mq=L('maq')[0].id;go('retro','resumen')}");await A.wait_for_timeout(300);await A.screenshot(path=D+'/out/m-liq.png',full_page=True)
        await A.evaluate("go('informes')");await A.wait_for_timeout(300);await A.screenshot(path=D+'/out/m-inf.png',full_page=True)
        await A.evaluate("sync(true)");await A.wait_for_timeout(2500);await A.evaluate("sync(true)");await A.wait_for_timeout(1500)
        print('outbox',len(await A.evaluate("S.outbox")),'err',await A.evaluate("S.cfg.syncErr||''"),'srvOld',await A.evaluate("srvOld()"))
        # informe al drive
        await A.click('button[data-act=dlRep][data-k=gen]');await A.click('button[data-act=dlGo][data-k=drive]');await A.wait_for_timeout(2500);print('drive toast',await A.inner_text('#toast'))
        async with A.expect_download() as d:await A.click('button[data-act=dlGo][data-k=xlsx]')
        x=await d.value;await x.save_as(D+'/out/dl/flota.xlsx')
        dr=json.loads(urllib.request.urlopen(U+'/__drive').read());names={f['id']:f['name'] for f in dr['folders']}
        def path(fid):
            o=[];f=next(x for x in dr['folders'] if x['id']==fid)
            while f:o.insert(0,f['name']);f=next((x for x in dr['folders'] if x['id']==f['parent']),None)
            return '/'.join(o)
        print('drive files',[path(f['parent'])+'/'+f['name'] for f in dr['files']])
        d=dump();print('tabs',[k for k in d]);print('jornadas cols',d['APP Jornadas'][0][:8]);print('jornada row',d['APP Jornadas'][1][:8])
        print('clientes',[r[:7] for r in d['APP Clientes']]);print('informe',[r[1:3] for r in d['INFORME DUEÑO'][1:14] if r and any(r)])
        B=await dev(b,T['TOKEN_aux']);C=await dev(b,T['TOKEN_conta'],{'width':390,'height':844})
        cmp="(()=>{const o={};COLLS.forEach(c=>o[c]=L(c).length);return o})()";a=await A.evaluate(cmp)
        for n,pg in [('aux',B),('dueño',C)]:x=await pg.evaluate(cmp);print(n,'diff',{k:(a[k],x[k]) for k in a if a[k]!=x[k]} or 'ninguna')
        await C.evaluate("()=>{renderStatus=()=>{};render()}");await C.wait_for_timeout(1500)
        print('dueño role',await C.evaluate("[S.cfg.role,ROLES[S.cfg.role],canEdit()]"),'edit visibles',await C.locator('.edit-only:visible').count(),'scrollW',await C.evaluate("document.documentElement.scrollWidth"))
        await C.screenshot(path=D+'/out/m-panel-m.png',full_page=True)
        await C.evaluate("()=>{V.mq=L('maq')[0].id;go('retro','dueno')}");await C.wait_for_timeout(1500);await C.screenshot(path=D+'/out/m-due-m.png',full_page=True)
        print('dueño foto',await C.evaluate("!!document.querySelector('.mqh img[src]')"))
        print('errores',[pg.errs for pg in [A,B,C]])
        await b.close()
asyncio.run(main())

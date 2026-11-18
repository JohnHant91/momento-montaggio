import asyncio, sys
from playwright.async_api import async_playwright
SCENE = [("1_grandangolo", 1400, 900, ""), ("2_ufficio_video", 1400, 900, "entraUfficio('video')"), ("3_ufficio_social", 1400, 900, "entraUfficio('social')"),
         ("4_agente", 1400, 900, "vaiAgente('copywriter')"), ("5_telefono", 390, 844, ""), ("6_telefono_agente", 390, 844, "vaiAgente('regista')"),
         ("9_direzione", 1400, 900, "entraUfficio('direzione')"),
         ("10_meeting", 1400, 900, "import('/sala3d.js').then(m=>{m.prova('salta');entraUfficio('meeting')})"),
         ("7_persona_lato", 1000, 800, "import('/sala3d.js').then(m=>{const [x,z]=m.prova('dove','copywriter');m.prova('vista',[x+1.6,1.3,z-0.2,x,0.8,z-0.2])})"),
         ("8_camminano", 1400, 900, "import('/sala3d.js').then(m=>{['trend','fotografo','web'].forEach(a=>m.prova('cammina',a));setTimeout(()=>m.prova('vista',[11.5,9,17,11.5,0,6.6]),3500)})")]
async def main(out):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for nome, w, h, az in SCENE:
            pg = await b.new_page(viewport={'width': w, 'height': h})
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
            await pg.goto('http://localhost:8765/index.html')
            await pg.wait_for_timeout(40000)
            if az:
                await pg.evaluate(az)
                await pg.wait_for_timeout(6500 if nome.startswith('8') else 2500)
            await pg.screenshot(path=f"{out}/{nome}.png")
            n = await pg.evaluate("import('/sala3d.js').then(m=>m.prova('persone'))")
            print(nome, 'persone3d', n, errs[:4])
            await pg.close()
        await b.close()
asyncio.run(main(sys.argv[1]))

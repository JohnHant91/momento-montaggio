import asyncio, sys
from playwright.async_api import async_playwright
SCENE = [("1_grandangolo", 1400, 900, ""), ("2_ufficio_video", 1400, 900, "entraUfficio('video')"), ("3_ufficio_social", 1400, 900, "entraUfficio('social')"),
         ("4_agente", 1400, 900, "vaiAgente('copywriter')"), ("5_telefono", 390, 844, ""), ("6_telefono_agente", 390, 844, "vaiAgente('regista')")]
async def main(out):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for nome, w, h, az in SCENE:
            pg = await b.new_page(viewport={'width': w, 'height': h})
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
            await pg.goto('http://localhost:8765/index.html')
            await pg.wait_for_timeout(7000)
            if az:
                await pg.evaluate(az)
                await pg.wait_for_timeout(2500)
            await pg.screenshot(path=f"{out}/{nome}.png")
            print(nome, errs[:4])
            await pg.close()
        await b.close()
asyncio.run(main(sys.argv[1]))

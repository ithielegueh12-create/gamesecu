import asyncio, json, sys
from playwright.async_api import async_playwright
OUT='/home/claude/shots/j-'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
HIDE="for (const s of ['.top','.progress','.bottom','#card','#phone','#labels','#flash','.skip']) document.querySelectorAll(s).forEach(e=>e.style.visibility='hidden')"
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=ARGS)
    c=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2)
    pg=await c.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    await pg.goto('http://localhost:4173/index.html'); await pg.wait_for_timeout(1500)
    for k in ['n','n']: await pg.keyboard.press(k)
    await pg.wait_for_timeout(300)
    await pg.evaluate('window.__marina.seek(6.2)'); await pg.wait_for_timeout(600)
    await pg.screenshot(path=OUT+'jeu-mobile.png')
    print(json.dumps(await pg.evaluate('window.__marina.josephCheck()'), ensure_ascii=False, indent=1))
    await pg.evaluate(HIDE)
    views = {'trois-quarts': ([-1.6,1.45,-1.9],[0,0.95,-0.05],40), 'dos': ([0.0,1.35,2.4],[0,1.0,-0.1],38), 'profil': ([2.3,1.0,0.0],[0,0.85,-0.1],40), 'trois-quarts-arriere':([1.5,1.5,1.8],[0,1.0,-0.1],40)}
    for n,(pp,l,f) in views.items():
        await pg.evaluate(f'window.__marina.freeCam({pp},{l},{f})'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=OUT+n+'.png')
    await pg.evaluate('window.__marina.freeCam(null)')
    print('erreurs', errs)
    await b.close()
asyncio.run(main())

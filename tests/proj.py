import asyncio, json
from playwright.async_api import async_playwright
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
PTS={'stop':(1.6,0.2,10.8),'joseph':(2.0,2.2,15.8),'minibus':(6.35,3.05,17.5),'zone':(26,0.2,-5),'car':(36-4.2*10.9,2.4,-3.2)}
async def run(p,vp,mobile):
    b=await p.chromium.launch(args=ARGS); c=await b.new_context(viewport=vp,is_mobile=mobile,has_touch=mobile)
    pg=await c.new_page(); await pg.goto('http://localhost:4173/index.html'); await pg.wait_for_timeout(1200)
    k=lambda x: pg.keyboard.press(x)
    await k('n'); await k('n'); await pg.wait_for_timeout(300); await pg.evaluate('window.__marina.skip()'); await pg.wait_for_timeout(1500)
    await k('1'); await pg.wait_for_timeout(200); await pg.evaluate('window.__marina.skip()'); await pg.wait_for_timeout(800)
    await k('n'); await k('n'); await pg.wait_for_timeout(300); await k('n'); await k('n'); await pg.wait_for_timeout(300)
    await pg.evaluate('window.__marina.seek(10.9)'); await pg.wait_for_timeout(500)
    out={n: await pg.evaluate(f'window.__marina.project({x},{y},{z})') for n,(x,y,z) in PTS.items()}
    print(vp['width'], json.dumps({k:(round(v['x']),round(v['y'])) for k,v in out.items()}))
    await b.close()
async def main():
    async with async_playwright() as p:
        await run(p,{'width':1280,'height':800},False); await run(p,{'width':390,'height':844},True)
asyncio.run(main())

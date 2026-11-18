import asyncio, sys
from playwright.async_api import async_playwright
URL='http://localhost:4173/index.html'; OUT='/home/claude/figma-assets/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
HIDE="for (const s of ['.top','.progress','.bottom','#card','#phone','#labels','#flash','.skip']) document.querySelectorAll(s).forEach(e=>e.style.visibility='hidden')"
async def run(p, tag, vp, mobile):
    b=await p.chromium.launch(args=ARGS)
    c=await b.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1.5)
    pg=await c.new_page(); await pg.goto(URL); await pg.wait_for_timeout(1500)
    await pg.evaluate(HIDE)
    k=lambda key: pg.keyboard.press(key)
    async def snap(name, t=None):
        if t is not None: await pg.evaluate(f'window.__marina.seek({t})')
        await pg.wait_for_timeout(500); await pg.evaluate(HIDE)
        await pg.screenshot(path=f'{OUT}{tag}-{name}.jpg', type='jpeg', quality=82)
    async def resume(): await pg.evaluate('window.__marina.resume()')
    async def skip(): await resume(); await pg.evaluate('window.__marina.skip()'); await pg.wait_for_timeout(900)
    await pg.evaluate('window.__marina.seek(2)'); await snap('01')
    await resume(); await k('n'); await k('n'); await pg.wait_for_timeout(300)
    await snap('02', 4.6)
    await skip(); await pg.wait_for_timeout(1200); await snap('03', 1)
    await resume(); await k('1'); await pg.wait_for_timeout(200)
    await snap('04A-arret', 0.9); await snap('04A-rue', 2.4); await snap('04A-vert', 10.4)
    await skip(); await k('n'); await k('n'); await pg.wait_for_timeout(300)
    await snap('05A', 1)
    await resume(); await k('n'); await k('n'); await pg.wait_for_timeout(300)
    await snap('replay', 10.9)
    await resume(); await k('Backspace'); await pg.wait_for_timeout(300); await k('Backspace'); await pg.wait_for_timeout(300)
    assert await pg.evaluate('window.__marina.step')=='03', await pg.evaluate('window.__marina.step')
    await k('2'); await pg.wait_for_timeout(200)
    await snap('04B-rue', 1.5); await snap('04B-geste', 5.0); await snap('04B-fin', 9.9)
    await skip(); await k('n'); await k('n'); await pg.wait_for_timeout(300)
    await snap('05B', 1)
    await resume(); await k('n'); await k('n'); await pg.wait_for_timeout(300); await skip()
    await k('n'); await pg.wait_for_timeout(500); await snap('explain', 2)
    for _ in range(5): await resume(); await k('n'); await pg.wait_for_timeout(250)
    st = await pg.evaluate('window.__marina.step'); print(tag, 'quiz step', st)
    await snap('quiz', 3)
    await b.close()
async def main():
    async with async_playwright() as p:
        await run(p,'d',{'width':1280,'height':800},False)
        await run(p,'m',{'width':390,'height':844},True)
asyncio.run(main())

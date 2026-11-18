import asyncio, json, sys
from playwright.async_api import async_playwright
URL='http://localhost:4173/index.html'; OUT='/home/claude/shots/env-'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
async def run(p, name, vp, mobile):
    b=await p.chromium.launch(args=ARGS)
    c=await b.new_context(viewport=vp, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1)
    pg=await c.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(URL); await pg.wait_for_timeout(1500)
    k=lambda key: pg.keyboard.press(key)
    async def at(t, tag):
        await pg.evaluate(f'window.__marina.seek({t})'); await pg.wait_for_timeout(450)
        await pg.screenshot(path=f'{OUT}{name}-{tag}.png')
    async def resume_skip():
        await pg.evaluate('window.__marina.resume()'); await pg.evaluate('window.__marina.skip()'); await pg.wait_for_timeout(900)
    await pg.screenshot(path=f'{OUT}{name}-01.png')
    await k('n'); await k('n'); await pg.wait_for_timeout(300)
    await at(4.6, '02-moto'); await at(8.95, '02-end')
    vis_end = await pg.evaluate('window.__marina.carVisibility()')
    await resume_skip(); await pg.wait_for_timeout(1300)
    assert await pg.evaluate('window.__marina.step')=='03'
    await pg.wait_for_timeout(400); await pg.screenshot(path=f'{OUT}{name}-03.png')
    m = {}
    m['car_visible_at_decision'] = await pg.evaluate('window.__marina.carVisibility()')
    m['car_visible_end_approach'] = vis_end
    m['gantry'] = await pg.evaluate('window.__marina.project(3.0,5.0,-9.4)')
    m['stop_line'] = [await pg.evaluate(f'window.__marina.project({x},0.02,11.2)') for x in (1.6,4.1,6.6)]
    m['top_bar_bottom'] = await pg.evaluate("document.querySelector('.top').getBoundingClientRect().bottom")
    m['ui_bottom_top'] = await pg.evaluate("Math.min(document.getElementById('subtitle').getBoundingClientRect().top, document.getElementById('actions').getBoundingClientRect().top)")
    m['viewport'] = vp
    await k('1'); await pg.wait_for_timeout(200)
    await at(0.6, 'A-chase'); await at(2.4, 'A-cross'); 
    m['A_cross_car_vis_t2.4'] = await pg.evaluate('window.__marina.carVisibility()')
    await at(3.6, 'A-cross2'); await at(10.0, 'A-green')
    await pg.evaluate('window.__marina.resume()'); await k('Backspace'); await pg.wait_for_timeout(300); await k('2'); await pg.wait_for_timeout(200)
    await at(0.4, 'B-engage'); await at(1.5, 'B-reveal')
    m['B_cross_car_vis_t1.5'] = await pg.evaluate('window.__marina.carVisibility()')
    await at(2.5, 'B-brake'); await at(5.0, 'B-raise'); await at(7.2, 'B-point'); await at(9.9, 'B-end')
    await resume_skip(); await k('n'); await k('n'); await pg.wait_for_timeout(300)
    await pg.screenshot(path=f'{OUT}{name}-05.png')
    await k('n'); await k('n'); await pg.wait_for_timeout(300)
    await at(1.5,'replay-a'); await at(6.0,'replay-b'); await at(10.9,'replay-c')
    print(name, json.dumps(m, indent=1), errs)
    await b.close()
async def main():
    async with async_playwright() as p:
        if 'd' in sys.argv[1]: await run(p,'d',{'width':1280,'height':800},False)
        if 'm' in sys.argv[1]: await run(p,'m',{'width':390,'height':844},True)
asyncio.run(main())

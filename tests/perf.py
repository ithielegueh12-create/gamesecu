import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']); pg=await b.new_page(viewport={'width':390,'height':844})
    await pg.goto('http://localhost:4173/index.html'); await pg.wait_for_timeout(1500)
    for k in ['n','n']: await pg.keyboard.press(k)
    await pg.wait_for_timeout(300); await pg.evaluate('window.__marina.skip()'); await pg.wait_for_timeout(1800)
    print(await pg.evaluate('({step: window.__marina.step, calls: window.__marina.calls, tris: window.__marina.tris})'))
    await b.close()
asyncio.run(main())

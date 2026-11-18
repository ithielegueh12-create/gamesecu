import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    c=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2)
    pg=await c.new_page(); await pg.goto('http://localhost:4173/index.html'); await pg.wait_for_timeout(1500)
    await pg.evaluate('window.__marina.seek(2)'); await pg.wait_for_timeout(500)
    await pg.screenshot(path='/home/claude/shots/j-01-telephone.png')
    print(await pg.evaluate('window.__marina.calls'))
    await b.close()
asyncio.run(main())

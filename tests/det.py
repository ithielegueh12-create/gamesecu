import asyncio, json
from playwright.async_api import async_playwright
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
async def main():
  async with async_playwright() as p:
    res=[]
    for run in range(2):
      b=await p.chromium.launch(args=ARGS); pg=await b.new_page(); await pg.goto('http://localhost:4173/index.html'); await pg.wait_for_timeout(800)
      r=await pg.evaluate('''()=>{const o={};for(const [id,br] of [["waitA","A"],["passB","B"]]){o[id]=[];for(let t=0;t<=13;t+=0.5)o[id].push(window.__marina.probe(id,t,br));}return o;}''')
      res.append(json.dumps(r)); await b.close()
    print('déterminisme identique sur 2 sessions :', res[0]==res[1])
    r=json.loads(res[0])
    # B : distance minimale moto / voiture (centres), et position d'arrêt
    import math
    dmin=min(math.dist(x['joseph'],x['car']) for x in r['passB'])
    print('B: écart min moto-voiture (m):', round(dmin,2), '| arrêt Joseph z =', r['passB'][6]['joseph'][1])
    print('A: Joseph immobile avant la ligne (z) :', [x['joseph'][1] for x in r['waitA'][3:16:4]], 'feu à t=4:', r['waitA'][8]['main'], 't=9:', r['waitA'][18]['main'])
asyncio.run(main())

"""Voix fon : association des fichiers fournis, repli français, boutons d'écoute ≠ validation, téléphone."""
import asyncio, sys
from playwright.async_api import async_playwright
URL = 'http://localhost:4173/index.html'
OUT = '/home/claude/shots/fon-'
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
log = []
def ok(c, msg): log.append(('PASS' if c else 'FAIL') + ' ' + msg); print(log[-1], flush=True)

async def session(p, name, vp, mobile=False):
    b = await p.chromium.launch(args=ARGS)
    kw = dict(viewport=vp)
    if mobile: kw.update(is_mobile=True, has_touch=True, device_scale_factor=2)
    c = await b.new_context(**kw); pg = await c.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.add_init_script("try{localStorage.clear();localStorage.setItem('marina.tutoSeen','1')}catch(e){}")
    await pg.goto(URL); await pg.wait_for_timeout(1500)
    M = lambda k: pg.evaluate(f'window.__marina.{k}')
    A = lambda: pg.evaluate('window.__marina.audio')
    async def press(sel):
        loc = pg.locator(sel).first
        await (loc.tap() if mobile else loc.click()); await pg.wait_for_timeout(250)
    async def act(t): await press(f'#actions button:has-text("{t}")')
    async def plays(id_, lang, label):
        a = None
        for _ in range(25):
            await pg.wait_for_timeout(150); a = await A()
            if a['id'] == id_ and not a['paused'] and a['t'] > 0.15: break
        good = a['id'] == id_ and not a['paused'] and a['t'] > 0.15 and f'/{lang}/' in (a['src'] or '')
        ok(good, f'{name}: {label} → {id_} en {lang} ({a["src"]}, {a["t"]:.2f} s)')
    async def silence(maxs=30):
        for _ in range(maxs * 5):
            a = await A()
            if not a['speaking'] and not a['queued']: return
            await pg.wait_for_timeout(200)

    # Menu : choix du fon + accueil
    await press('.lang-card[data-lang="fon"] .lang-pick')
    msg = await pg.locator('#lang-msg').inner_text(); ok('10 passages' in msg, f'{name}: message de langue « {msg[:70]}… »')
    lb = pg.locator('.lang-card[data-lang="fon"] .lang-listen')
    ok(not await lb.is_disabled(), f'{name}: « Écouter l’accueil » fon actif')
    await press('.lang-card[data-lang="fon"] .lang-listen')
    await plays('menu-accueil', 'fon', 'accueil')
    ok(await pg.locator('#m-start').is_enabled() and await pg.locator('#m-start').is_visible(), f'{name}: « Commencer » reste accessible pendant l’accueil')
    await silence(); lg = (await A())['log']; ok(lg[-2:] == ['menu-accueil', 'menu-securite'], f'{name}: accueil puis consignes de sécurité ({lg[-2:]})')
    await pg.screenshot(path=f'{OUT}{name}-menu.png')
    # 01 : message du responsable — pas de fichier fon fourni → français
    await press('#m-start'); ok(await M('step') == '01', f'{name}: 01')
    await plays('01-responsable-01', 'fr', 'message vocal (01_retard absent → repli français)')
    note = await pg.locator('#fon-note').inner_text(); ok('voix française' in note, f'{name}: mention du repli « {note} »')
    ok(await pg.locator('#phone').is_visible(), f'{name}: téléphone affiché avec le message')
    ok(await pg.locator('#phone.playing').count() == 1, f'{name}: ondes du téléphone animées pendant le message')
    await silence(); await press('#phone-replay'); await plays('01-responsable-01', 'fr', 'bouton « Réécouter le message »')
    bb = await pg.locator('#phone-replay').bounding_box(); ok(bb['height'] >= 44, f'{name}: bouton du téléphone ≥ 44 px')
    await pg.screenshot(path=f'{OUT}{name}-01.png')
    await pg.evaluate('window.__marina.skip()'); await act('Suivant'); await act('Ranger')
    await pg.evaluate('window.__marina.skip()'); await pg.wait_for_timeout(1500)
    # 03 : question + options en fon
    ok(await M('step') == '03', f'{name}: 03')
    await plays('03-narratrice-01', 'fon', 'question du choix')
    await silence(); lg = (await A())['log']; ok(lg[-3:] == ['03-narratrice-01', '03-choix-01', '03-choix-02'], f'{name}: question puis options A et B en fon')
    await press('.choice-wrap:nth-child(2) .choice-listen'); await plays('03-choix-02', 'fon', 'écouter l’option B seule')
    ok(await M('step') == '03', f'{name}: écouter une option ne valide pas le choix')
    await press('.choice-wrap:nth-child(1) .choice-listen'); await plays('03-choix-01', 'fon', 'écouter l’option A seule')
    ok(await M('step') == '03', f'{name}: toujours à 03')
    for s in ['.choice.wait', '.choice-wrap:nth-child(1) .choice-listen']:
        bb = await pg.locator(s).bounding_box(); ok(bb['height'] >= 44, f'{name}: {s} ≥ 44 px ({bb["height"]:.0f})')
    await pg.screenshot(path=f'{OUT}{name}-03.png')
    await press('.choice.wait')
    ok(await M('step') == '04A', f'{name}: appui sur « J’attends le vert » → 04A')
    await plays('04a-narratrice-01', 'fon', '04A attente')
    await silence()
    for _ in range(20):
        h = (await A())['hist']; nxt = [x['id'] for x in h if x['id'].startswith('04a')]
        if len(nxt) >= 2: break
        await pg.wait_for_timeout(250)
    ok(len(nxt) >= 2 and nxt[1] == '04a-narratrice-02', f'{name}: suite de 04A en français (repli) {nxt[:3]}')
    # repli désactivé
    await press('#btn-settings'); await press('label:has(#opt-frfallback)'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    n0 = len((await A())['log']); await pg.evaluate('window.__marina.skip()'); await pg.wait_for_timeout(1200)
    lg = (await A())['log'][n0:]; ok(not any(i.startswith('04a') and i != '04a-narratrice-01' for i in lg), f'{name}: repli désactivé → passages sans voix fon restent muets {lg}')
    await press('#btn-settings'); await press('label:has(#opt-frfallback)'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    # aller au quiz
    for _ in range(40):
        st = await M('step')
        if st == '09': break
        await pg.evaluate('window.__marina.skip()'); await pg.wait_for_timeout(300)
        btns = await pg.locator('#actions button.btn.primary').all()
        if btns: await (btns[0].tap() if mobile else btns[0].click()); await pg.wait_for_timeout(300)
    ok(await M('step') == '09', f'{name}: quiz 09')
    await plays('09-question-01', 'fon', 'question du quiz')
    await silence(); lg = (await A())['log']; ok(lg[-2:] == ['09-option-01', '09-option-02'], f'{name}: réponses proposées en fon')
    await press('.opt-row:nth-child(2) .opt-listen'); await plays('09-option-02', 'fon', 'écouter une réponse du quiz')
    ok(await pg.locator('.opt[aria-pressed="true"]').count() == 0, f'{name}: écouter une réponse ne la sélectionne pas')
    await pg.screenshot(path=f'{OUT}{name}-09.png')
    await press('.opt >> nth=1'); await plays('09-mauvaise-reponse-01', 'fr', 'mauvaise réponse (pas de fichier fon → français)')
    await act('Réessayer'); await press('.opt >> nth=0'); await plays('09-bonne-reponse-01', 'fon', 'bonne réponse')
    # retour au français : les voix françaises reviennent, progression intacte
    await press('#btn-settings'); await press('[data-set-lang="fr"]'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    ok(await M('step') == '09', f'{name}: retour au français sans perdre la progression')
    await press('#btn-voice'); await plays('09-bonne-reponse-01', 'fr', 'en français, Réécouter rejoue la voix française')
    h = (await A())['hist']; over = [(h[i - 1]['id'], h[i]['id']) for i in range(1, len(h)) if h[i - 1]['end'] is None or h[i]['start'] < h[i - 1]['end'] - 1]
    ok(not over, f'{name}: {len(h)} voix, aucun chevauchement')
    ok(not [x for x in h if x['how'] == 'erreur'], f'{name}: aucun fichier en erreur')
    ok(not errs, f'{name}: aucune erreur JS {errs}')
    await b.close()

async def main():
    async with async_playwright() as p:
        w = sys.argv[1] if len(sys.argv) > 1 else 'all'
        if w in ('all', 'd'): await session(p, 'd', {'width': 1280, 'height': 800})
        if w in ('all', 'm'): await session(p, 'm', {'width': 390, 'height': 844}, mobile=True)
    print('FAILS:', sum(1 for l in log if l.startswith('FAIL')))
asyncio.run(main())

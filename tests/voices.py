"""Voix françaises : lecture réelle dans Chromium (sortie audio factice), branches A et B,
quiz, réécoute, volume, voix coupées, langue fon, absence de chevauchement."""
import asyncio, sys, json
from playwright.async_api import async_playwright
URL = 'http://localhost:4173/index.html'
OUT = '/home/claude/shots/v-'
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
log = []
def ok(c, msg):
    log.append(('PASS' if c else 'FAIL') + ' ' + msg); print(log[-1], flush=True)

async def session(p, name, vp, branch, mobile=False):
    b = await p.chromium.launch(args=ARGS)
    kw = dict(viewport=vp)
    if mobile: kw.update(is_mobile=True, has_touch=True, device_scale_factor=2)
    c = await b.new_context(**kw); pg = await c.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.add_init_script("try{localStorage.clear();localStorage.setItem('marina.lang','fr')}catch(e){}")
    await pg.goto(URL); await pg.wait_for_timeout(1500)
    M = lambda k: pg.evaluate(f'window.__marina.{k}')
    A = lambda: pg.evaluate('window.__marina.audio')
    async def press(sel):
        loc = pg.locator(sel).first
        await (loc.tap() if mobile else loc.click()); await pg.wait_for_timeout(250)
    async def act(t): await press(f'#actions button:has-text("{t}")')
    async def wait_silence(maxs=40):
        for _ in range(int(maxs * 5)):
            a = await A()
            if not a['speaking'] and not a['queued']: return True
            await pg.wait_for_timeout(200)
        return False
    async def wait_step(s, maxs=60):
        for _ in range(int(maxs * 5)):
            if await M('step') == s: return True
            await pg.wait_for_timeout(200)
        return False
    async def playing(id_, label):
        a2 = None
        for _ in range(20):
            await pg.wait_for_timeout(150); a2 = await A()
            if a2['id'] == id_ and not a2['paused'] and a2['t'] > 0.15: break
        ok(a2['id'] == id_ and not a2['paused'] and a2['t'] > 0.15, f'{name}: {label} — « {id_} » joue réellement (position {a2["t"]:.2f} s, {a2["id"]})')

    ok((await A())['log'] == [], f'{name}: menu silencieux à l’ouverture')
    await press('#m-start')
    ok(await M('mode') == 'tuto', f'{name}: tutoriel')
    await playing('tutoriel-tuto-01', 'consigne vocale du tutoriel')
    await press('#tuto-next'); await press('#tuto-next'); await press('#tuto-next')
    # 01
    ok(await M('step') == '01', f'{name}: scène 01')
    await playing('01-responsable-01', 'introduction (message du responsable)')
    await wait_silence(); await act('Suivant')
    await playing('01-narratrice-01', 'narratrice')
    # réécoute
    await wait_silence(); n0 = len((await A())['log'])
    await press('#btn-listen'); await pg.wait_for_timeout(500)
    a = await A(); ok(len(a['log']) == n0 + 1 and a['id'] == '01-narratrice-01', f'{name}: bouton Réécouter relance la dernière intervention')
    bb = await pg.locator('#btn-listen').bounding_box(); ok(bb['height'] >= 44, f'{name}: bouton haut-parleur ≥ 44 px ({bb["height"]:.0f})')
    await wait_silence()
    # volume
    await press('#btn-settings'); await pg.locator('#opt-volume').fill('30'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    await act('Ranger')
    # 02 : séquence rythmée par les voix
    ok(await M('step') == '02', f'{name}: 02')
    await pg.wait_for_timeout(600); ok(abs((await A())['volume'] - 0.3) < 0.01, f'{name}: volume appliqué à la voix (30 %)')
    ok(await wait_step('03', 40), f'{name}: 02 → 03 après les voix')
    await pg.wait_for_timeout(300)
    await playing('03-narratrice-01', 'question du choix')
    await wait_silence()
    lg = (await A())['log']; ok(lg[-2:] == ['03-choix-01', '03-choix-02'], f'{name}: propositions A et B dites ({lg[-3:]})')
    # choix
    await press('.choice.wait' if branch == 'A' else '.choice.go')
    br = '04a' if branch == 'A' else '04b'
    await pg.wait_for_timeout(500)
    for _ in range(300):
        if await pg.locator('#actions button:has-text("Continuer")').count(): break
        if await pg.locator('#actions button:has-text("Suivant")').count(): await wait_silence(); await act('Suivant')
        await pg.wait_for_timeout(200)
    await wait_silence(); await act('Continuer')
    h = (await A())['hist']
    seq = [x for x in h if x['id'].startswith(br)]
    want = {'A': ['04a-narratrice-01', '04a-narratrice-02', '04a-narratrice-03', '04a-narratrice-04', '04a-narratrice-05', '04a-narratrice-06'],
            'B': ['04b-narratrice-01', '04b-narratrice-02', '04b-narratrice-03', '04b-narratrice-04', '04b-policier-01', '04b-narratrice-05']}[branch]
    ok([x['id'] for x in seq] == want, f'{name}: branche {branch} — voix de la branche dans l’ordre {[x["id"] for x in seq]}')
    other = '04b' if branch == 'A' else '04a'
    ok(not any(x['id'].startswith(other) for x in h), f'{name}: aucune voix de l’autre branche')
    cut = [x['id'] for x in seq if x['how'] != 'fin']
    ok(not cut, f'{name}: aucune phrase de la séquence coupée {cut}')
    # 05
    ok(await M('step') == '05', f'{name}: 05')
    await playing(f'05{branch.lower()}-policier-01', 'le policier (première phrase adaptée au choix)')
    await wait_silence(); await act('Suivant'); await wait_silence(); await act('Revoir le carrefour')
    for _ in range(300):
        if await pg.locator('#actions button:has-text("Continuer")').count(): break
        await pg.wait_for_timeout(200)
    await wait_silence()
    rep = [x for x in (await A())['hist'] if x['id'] in ('05-policier-02', '05-policier-03', '05-policier-04', '05-policier-05')]
    ok([x['id'] for x in rep] == ['05-policier-02', '05-policier-03', '05-policier-04', '05-policier-05'] and all(x['how'] == 'fin' for x in rep),
       f'{name}: ralenti — 3 explications + conclusion, entières {[(x["id"], x["how"]) for x in rep]}')
    await act('Continuer')
    # 06 → 08
    ok(await M('step') == '06', f'{name}: 06'); await playing('06-policier-01', 'texte voté (policier)')
    await wait_silence(); lg = (await A())['log']; ok(lg[-5:] == ['06-fiche-01', '06-fiche-02', '06-fiche-03', '06-fiche-04', '06-fiche-05'], f'{name}: fiche 06 lue en entier')
    await act('Suivant'); await playing('07-joseph-01', 'Joseph (question)')
    await wait_silence(); await act('Suivant'); await playing('07-policier-01', 'réponse du policier')
    await act('Suivant'); ok(await M('step') == '08', f'{name}: Suivant pendant une voix → 08')
    await pg.wait_for_timeout(400); h = (await A())['hist']
    ok(any(x['id'] == '07-policier-01' and x['how'] == 'coupé' for x in h) and (await A())['id'] == '08-joseph-01', f'{name}: la voix précédente s’arrête avant la suivante')
    await wait_silence(); await act('Suivant'); await wait_silence(); await act('quiz')
    # quiz
    ok(await M('step') == '09', f'{name}: quiz 09'); await playing('09-question-01', 'consigne vocale du quiz')
    await wait_silence(); lg = (await A())['log']; ok(lg[-2:] == ['09-option-01', '09-option-02'], f'{name}: réponses proposées dites')
    await press('.opt >> nth=1'); await playing('09-mauvaise-reponse-01', 'retour après mauvaise réponse')
    await act('Réessayer'); await pg.wait_for_timeout(300); ok((await A())['id'] == '09-question-01', f'{name}: Réessayer relit la question')
    await press('.opt >> nth=0'); await playing('09-bonne-reponse-01', 'retour après bonne réponse')
    # voix coupées
    await press('#btn-settings'); await press('label:has(#opt-voices)'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    n0 = len((await A())['log'])
    await act('Question suivante'); await pg.wait_for_timeout(800)
    a = await A(); ok(await M('step') == '10' and len(a['log']) == n0 and not a['speaking'], f'{name}: voix coupées → aucune voix, le jeu continue (10)')
    bb = await pg.locator('#btn-voice').bounding_box(); ok(bb and bb['height'] >= 44, f'{name}: bouton Réécouter de la barre ≥ 44 px pendant le quiz')
    await press('#btn-voice'); await pg.wait_for_timeout(500); ok((await A())['id'] == '10-question-01', f'{name}: voix coupées, Réécouter reste possible (bouton de la barre)')
    await press('#btn-settings'); await press('label:has(#opt-voices)')
    # fon : la voix française reste, rien n'est cassé
    await press('[data-set-lang="fon"]'); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    ok(await M('step') == '10', f'{name}: passage en fon sans perte de progression')
    await press('.opt >> nth=0'); await pg.wait_for_timeout(500)
    a = await A(); ok(a['id'] == '10-bonne-reponse-01' and '/fr/' in a['src'], f'{name}: en fon, voix française utilisée ({a["src"]})')
    note = await pg.locator('#fon-note').inner_text(); ok('fon à enregistrer' in note, f'{name}: mention « {note} »')
    await press('[data-set-lang="fr"]') if await pg.locator('#dlg-settings').is_visible() else None
    await act('Question suivante'); await wait_silence(); await press('.opt >> nth=1'); await wait_silence(); await act('Terminer')
    ok(await M('step') == 'fin', f'{name}: fin')
    await playing('fin-a-retenir-01', 'message de fin')
    await pg.screenshot(path=f'{OUT}{name}-fin.png')
    # pause : la voix s'interrompt puis reprend
    await press('#btn-pause'); await pg.wait_for_timeout(300); a1 = await A(); await pg.wait_for_timeout(600); a2 = await A()
    ok(a1['paused'] and abs(a2['t'] - a1['t']) < 0.01, f'{name}: pause → voix en pause')
    await press('#p-resume'); await pg.wait_for_timeout(600); a3 = await A()
    ok(not a3['paused'] and (a3['t'] > a2['t'] or a3['id'] != a1['id']), f'{name}: reprise → la voix repart ({a1["id"]} {a2["t"]:.2f} s → {a3["id"]} {a3["t"]:.2f} s)')
    await act('Retour au menu'); await pg.wait_for_timeout(300); ok(not (await A())['speaking'], f'{name}: retour au menu → silence')
    # chevauchement : jamais deux voix en même temps
    h = (await A())['hist']
    over = [(h[i - 1]['id'], h[i]['id']) for i in range(1, len(h)) if h[i - 1]['end'] is None or h[i]['start'] < h[i - 1]['end'] - 1]
    ok(not over, f'{name}: {len(h)} voix lues, aucun chevauchement {over[:3]}')
    errs_audio = [x['id'] for x in h if x['how'] == 'erreur']; ok(not errs_audio, f'{name}: aucun fichier audio en erreur {errs_audio}')
    ok(not errs, f'{name}: aucune erreur JS {errs}')
    json.dump(h, open(f'{OUT}{name}-hist.json', 'w'), indent=1)
    await b.close()

async def main():
    async with async_playwright() as p:
        w = sys.argv[1] if len(sys.argv) > 1 else 'all'
        if w in ('all', 'dA'): await session(p, 'dA', {'width': 1280, 'height': 800}, 'A')
        if w in ('all', 'mB'): await session(p, 'mB', {'width': 390, 'height': 844}, 'B', mobile=True)
    print('FAILS:', sum(1 for l in log if l.startswith('FAIL')))
asyncio.run(main())

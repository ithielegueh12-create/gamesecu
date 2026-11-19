"""Parcours complet v4 : Ouverture → Menu → Langue → Commencer → Tutoriel → 01 → A → Quiz → Fin → Menu,
plus pause / reprise, paramètres (langue en cours de partie, volume, sous-titres, réécoute),
persistance (rechargement → langue mémorisée, Continuer) et confirmation avant d'écraser une partie."""
import asyncio, sys
from playwright.async_api import async_playwright
URL = 'http://localhost:4173/index.html'
OUT = '/home/claude/shots/j-'
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
log = []
def ok(c, msg):
    log.append(('PASS' if c else 'FAIL') + ' ' + msg); print(log[-1], flush=True)

async def journey(p, name, vp, mobile=False):
    b = await p.chromium.launch(args=ARGS)
    kw = dict(viewport=vp)
    if mobile: kw.update(is_mobile=True, has_touch=True, device_scale_factor=2)
    c = await b.new_context(**kw); pg = await c.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    M = lambda k: pg.evaluate(f'window.__marina.{k}')
    async def press(sel):
        loc = pg.locator(sel).first
        await (loc.tap() if mobile else loc.click()); await pg.wait_for_timeout(300)
    async def act(text):
        await press(f'#actions button:has-text("{text}")')
    async def skip(): await pg.evaluate('window.__marina.skip()'); await pg.wait_for_timeout(500)
    async def shot(tag): await pg.screenshot(path=f'{OUT}{name}-{tag}.png')

    # 1. Ouverture : stockage vierge
    await pg.goto(URL); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.wait_for_timeout(1800)
    ok(await M('mode') == 'menu', f'{name}: ouverture sur le menu')
    t0 = await M('t'); await pg.wait_for_timeout(1500)
    ok(await M('step') == '01' and await M('shot') == 'menu', f'{name}: le jeu ne démarre pas seul')
    ok(await pg.locator('#m-continue').is_hidden(), f'{name}: pas de « Continuer » sans sauvegarde')
    ok(await pg.locator('.lang-pick[aria-checked="true"]').count() == 0, f'{name}: aucune langue présélectionnée')
    for sel in ['#m-start', '#m-howto', '#m-settings', '#m-sources', '.lang-pick >> nth=0', '.lang-pick >> nth=1']:
        bb = await pg.locator(sel).bounding_box(); ok(bb and bb['height'] >= 44, f'{name}: cible tactile {sel} ≥ 44 px ({bb["height"]:.0f})')
    await shot('1-menu')

    # 2. Commencer sans langue → attention
    await press('#m-start')
    ok(await M('mode') == 'menu', f'{name}: Commencer bloqué sans langue')
    msg = await pg.locator('#lang-msg').inner_text(); ok('Choisis' in msg, f'{name}: message « {msg} »')
    ok(await pg.locator('#lang-group.attention').count() == 1, f'{name}: le choix de langue est mis en évidence')
    await shot('2-sans-langue')

    # 3. Fon : écoute indisponible et dite comme telle
    await press('.lang-card[data-lang="fon"] .lang-pick')
    ok(await pg.evaluate("localStorage.getItem('marina.lang')") == 'fon', f'{name}: Fon mémorisé')
    li = pg.locator('.lang-card[data-lang="fon"] .lang-listen')
    ok(await li.is_disabled() and 'à enregistrer' in (await li.inner_text()), f'{name}: exemple fon marqué « à enregistrer » ({(await li.inner_text()).strip()})')
    await shot('3-fon')
    await press('.lang-card[data-lang="fr"] .lang-pick')
    ok(await pg.evaluate("localStorage.getItem('marina.lang')") == 'fr', f'{name}: Français mémorisé')

    # 4. Commencer → tutoriel (première fois)
    await press('#m-start')
    ok(await M('mode') == 'tuto', f'{name}: tutoriel à la première partie')
    heads = []
    for i in range(3):
        heads.append(await pg.locator('#tuto-h').inner_text())
        if i == 0: await shot('4-tuto')
        await press('#tuto-next')
    ok([h.upper() for h in heads] == ['ÉCOUTER', 'CHOISIR', 'CONTINUER'], f'{name}: 3 écrans {heads}')
    ok(await M('mode') == 'jeu' and await M('step') == '01', f'{name}: tutoriel → scène 01')
    ok(await pg.evaluate("localStorage.getItem('marina.tutoSeen')") == '1', f'{name}: tutoriel marqué vu')

    # 5. Pause / reprise
    await act('Suivant'); await act('Ranger'); ok(await M('step') == '02', f'{name}: 02')
    await press('#btn-pause'); ok(await M('mode') == 'pause', f'{name}: pause ouverte')
    ta = await M('t'); await pg.wait_for_timeout(1200); tb = await M('t')
    ok(abs(tb - ta) < 0.05, f'{name}: le temps est figé en pause ({ta:.2f} → {tb:.2f})')
    await shot('5-pause')
    await press('#p-resume'); ok(await M('mode') == 'jeu', f'{name}: reprise')
    await pg.wait_for_timeout(800); ok(await M('t') > tb, f'{name}: le temps repart')

    # 6. Paramètres en cours de partie
    await press('#btn-settings'); ok(await pg.locator('#dlg-settings').is_visible(), f'{name}: paramètres en jeu')
    await press('[data-set-lang="fon"]')
    ok(await M('step') == '02' and await pg.evaluate("localStorage.getItem('marina.lang')") == 'fon', f'{name}: langue changée sans redémarrer')
    note = await pg.locator('#fon-note').inner_text()
    ok('Voix fon à enregistrer et à valider' in note, f'{name}: mention fon affichée ({note.strip()})')
    await pg.locator('#opt-volume').fill('40')
    ok(await pg.evaluate("localStorage.getItem('marina.volume')") == '40', f'{name}: volume mémorisé')
    await press('label:has(#opt-subs)')
    ok(await pg.evaluate("document.body.classList.contains('no-subs')"), f'{name}: sous-titres désactivés')
    await press('#opt-replay')
    rm = await pg.locator('#replay-msg').inner_text()
    ok('Lecture' in rm and (await M('audio'))['speaking'], f'{name}: réécoute des instructions → voix relancée ({rm})')
    await shot('6-parametres')
    await press('[data-set-lang="fr"]')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    ok(await M('mode') == 'jeu', f'{name}: retour au jeu après paramètres')

    # 7. Choix A → quiz → fin
    await skip(); await pg.wait_for_timeout(900); ok(await M('step') == '03', f'{name}: 03')
    await press('.choice.wait'); ok(await M('step') == '04A', f'{name}: branche A')
    await skip(); await act('Suivant'); await act('Continuer'); ok(await M('step') == '05', f'{name}: 05')
    await act('Suivant'); await act('Revoir le carrefour'); await skip(); await act('Continuer')
    await act('Suivant'); await act('Suivant'); await act('Suivant'); ok(await M('step') == '08', f'{name}: 08')
    await act('Suivant'); await act('quiz')
    for qs, right in [('09', 0), ('10', 0), ('11', 1)]:
        ok(await M('step') == qs, f'{name}: quiz {qs}')
        await press(f'.opt >> nth={right}')
        await act('Question suivante' if qs != '11' else 'Terminer')
    ok(await M('step') == 'fin' and await M('mode') == 'fin', f'{name}: écran de fin')
    btns = [t.strip() for t in await pg.locator('#actions button').all_inner_texts()]
    ok(len(btns) == 4 and 'autre choix' in btns[0] and 'Rejouer' in btns[1] and 'menu' in btns[2] and 'Sources' in btns[3], f'{name}: actions de fin {btns}')
    await pg.wait_for_timeout(2500); ok(await M('step') == 'fin', f'{name}: pas de redémarrage automatique')
    await shot('7-fin')

    # 8. Retour au menu → Continuer
    await act('Retour au menu'); ok(await M('mode') == 'menu', f'{name}: retour au menu')
    ok(await pg.locator('#m-continue').is_visible(), f'{name}: « Continuer » proposé')
    sub = await pg.locator('#m-continue-sub').inner_text(); ok('Fin' in sub, f'{name}: sous-titre Continuer « {sub} »')
    await shot('8-menu-continuer')

    # 9. Rechargement : langue + sauvegarde conservées
    await pg.reload(); await pg.wait_for_timeout(1800)
    ok(await pg.locator('.lang-card[data-lang="fr"] .lang-pick[aria-checked="true"]').count() == 1, f'{name}: langue retrouvée après rechargement')
    ok(await pg.locator('#m-continue').is_visible(), f'{name}: sauvegarde retrouvée après rechargement')
    await press('#m-continue'); ok(await M('step') == 'fin' and await M('branch') == 'A', f'{name}: Continuer reprend la fin (branche A)')
    await act('Retour au menu')

    # 10. Nouvelle partie avec sauvegarde → confirmation
    await press('#m-start'); ok(await pg.locator('#dlg-confirm').is_visible(), f'{name}: confirmation avant d’écraser la partie')
    await shot('10-confirm')
    await press('#c-no'); ok(await M('mode') == 'menu' and await pg.locator('#m-continue').is_visible(), f'{name}: « Non » garde la sauvegarde')
    await press('#m-start'); await press('#c-yes')
    ok(await M('mode') == 'jeu' and await M('step') == '01', f'{name}: nouvelle partie → 01 sans tutoriel (déjà vu)')

    # 11. Pause → Retour au menu en cours de partie, puis Comment jouer ?
    await act('Suivant'); await act('Ranger')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    ok(await M('mode') == 'pause', f'{name}: Échap ouvre la pause')
    await press('#p-menu'); ok(await M('mode') == 'menu', f'{name}: pause → menu')
    sub = await pg.locator('#m-continue-sub').inner_text(); ok('02' in sub, f'{name}: progression conservée ({sub})')
    await press('#m-howto'); ok(await M('mode') == 'tuto', f'{name}: « Comment jouer ? » rouvre le tutoriel')
    await press('#tuto-skip'); ok(await M('mode') == 'menu', f'{name}: Passer → retour au menu')
    await press('#m-continue'); ok(await M('step') == '02', f'{name}: Continuer → 02')

    ok(len((await M('audio'))['log']) > 0, f'{name}: voix françaises lancées pendant le parcours')
    ok(not errs, f'{name}: aucune erreur JS {errs}')
    await b.close()

async def main():
    async with async_playwright() as p:
        w = sys.argv[1] if len(sys.argv) > 1 else 'all'
        if w in ('all', 'd'): await journey(p, 'd', {'width': 1280, 'height': 800})
        if w in ('all', 't'): await journey(p, 't', {'width': 820, 'height': 1180}, mobile=True)
        if w in ('all', 'm'): await journey(p, 'm', {'width': 390, 'height': 844}, mobile=True)
    print('FAILS:', sum(1 for l in log if l.startswith('FAIL')))
asyncio.run(main())

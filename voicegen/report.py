"""Rapport des passages vocalisés, généré depuis public/audio/audio_manifest.json."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
m = json.load(open(os.path.join(ROOT, 'public/audio/audio_manifest.json')))
SCENES = {'01': '01 Le retard', '02': '02 L’approche du feu', '03': '03 Ton choix', '04a': '04A Il attend', '04b': '04B Il passe',
          '05a': '05 Le policier (après A)', '05b': '05 Le policier (après B)', '05': '05 Le policier — ralenti', '06': '06 Le texte voté',
          '07': '07 L’assurance moto', '08': '08 La CNSS', '09': '09 Quiz', '10': '10 Quiz', '11': '11 Quiz', 'fin': 'Fin du parcours',
          'tutoriel': 'Tutoriel', 'menu': 'Menu (exemple de langue)'}
out = ['# Rapport — narration vocale française', '',
       f"{m['count']} interventions vocalisées · durée totale {sum(i['duration'] for i in m['items'])/60:.1f} min · moteur : {m['generator']}.", '',
       '| Voix | Rôle |', '|---|---|'] + [f'| {k} | {v} |' for k, v in m['voices'].items()] + ['']
cur = None
for it in m['items']:
    sc = SCENES.get(it['scene'], it['scene'])
    if sc != cur:
        out += ['', f'## {sc}', '', '| Fichier | Personnage | Durée | Texte |', '|---|---|---|---|']; cur = sc
    t = it['text'].replace('|', '\\|')
    if it.get('spoken'): t += f" <br>*dit : {it['spoken']}*"
    out.append(f"| `{it['path'].split('/', 2)[2]}` | {it['character']} | {it['duration']:.1f} s | {t} |")
out += ['', '## Passages sans voix (volontairement)', '',
 '- **Libellés d’interface** : boutons (Commencer, Suivant, Continuer, Rejouer…), titres d’étape de la barre haute, heure, fenêtres Pause / Paramètres / Confirmation. Ce sont des commandes, pas des interventions ; le tutoriel vocal explique comment s’en servir.',
 '- **Titre et accroche du menu** (« CARREFOUR 2026 », « Chaque décision compte. ») : le menu reste silencieux tant que le joueur n’a rien touché (les navigateurs bloquent de toute façon le son avant le premier appui). Un exemple de voix est proposé à côté de « Français ».',
 '- **Étiquettes du ralenti** (Ligne d’arrêt, Minibus, Zone invisible, Voiture) : le policier les nomme déjà dans ses trois phrases au même moment ; les dire en plus créerait une superposition.',
 '- **Petits intertitres des fiches** (« Le policier explique · 1/3 », « Question 1 sur 3 ») : repères visuels de progression.',
 '- **Fenêtre Sources et crédits** : références et adresses web, à lire ou à ouvrir.',
 '- **Fon** : aucune voix ni traduction fabriquée ; la voix française est utilisée en attendant des enregistrements validés par des personnes locutrices natives.']
open(os.path.join(ROOT, 'VOIX-RAPPORT.md'), 'w').write('\n'.join(out) + '\n')
print('VOIX-RAPPORT.md', len(out), 'lignes')

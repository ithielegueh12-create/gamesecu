# 8 h 00 — Le piège de la Marina

Jeu web 3D de prévention routière. Joseph, motocycliste en retard, arrive à un feu rouge sur un carrefour fictif inspiré du boulevard de la Marina, à Cotonou. La voie semble libre, mais un minibus arrêté à l’angle cache une voiture qui arrive de la rue de droite.

**Critère de réussite :** après avoir joué, une personne peut montrer où Joseph devait s’arrêter (avant la ligne d’arrêt), expliquer pourquoi il ne voyait pas la voiture (le minibus masquait la rue) et distinguer l’assurance moto (dommages causés aux autres) de la protection CNSS (certains accidents de trajet, sous conditions).

## Lancer le jeu

Prérequis : Node.js 18 ou plus récent.

```bash
npm install
npm run dev        # serveur de développement : http://localhost:5173 (accessible sur le réseau local pour tester sur téléphone)
npm run build      # vérification TypeScript + build dans dist/index.html (un seul fichier autonome)
npm run preview    # sert le build : http://localhost:4173
```

`dist/index.html` contient tout le jeu (JS + CSS inline). On peut l’ouvrir via n’importe quel serveur statique.

## Menu principal et états du jeu (v4)

Le jeu s’ouvre sur un **menu principal** et ne démarre jamais seul. Fond : le carrefour 3D existant, Joseph sur sa moto avant la ligne, caméra de trois-quarts face avec un très léger balancement (supprimé si « Réduire les animations » est actif).

| État | Contenu |
|---|---|
| **Menu** | CARREFOUR 2026 · 8 H 00 — LE PIÈGE DE LA MARINA · « Chaque décision compte. » · choix de langue (Français / Fon, chacun avec un bouton d’écoute d’exemple) · Continuer (seulement si une partie est sauvegardée) · Commencer · Comment jouer ? · Paramètres · Sources et crédits |
| **Tutoriel** | 3 écrans illustrés ÉCOUTER / CHOISIR / CONTINUER, emplacement de voix FR/fon, bouton « Passer ». Affiché à la première partie, puis rouvrable via « Comment jouer ? » ou « Réécouter les instructions » depuis le menu |
| **Jeu** | Scènes 01 → fin inchangées ; barre haute : Retour, étape, heure, Paramètres, Pause |
| **Pause** | Reprendre · Recommencer la scène · Paramètres · Sources et crédits · Retour au menu principal. Le temps est figé (touche `Échap` ou bouton Pause) |
| **Fin** | Découvrir l’autre choix · Rejouer · Retour au menu principal · Sources. Pas de redémarrage automatique |

- **Langue obligatoire** : « Commencer » sans langue met le choix en évidence et affiche « Choisis d’abord ta langue : Français ou Fon. ». La langue est mémorisée et se change dans Paramètres sans relancer la partie.
- **Progression** : enregistrée à chaque étape (`localStorage`, clé `marina.save` : étape, branche, historique). « Retour au menu » ne l’efface pas ; « Commencer » demande confirmation avant de l’écraser.
- **Paramètres** (menu et jeu) : Langue · Volume · Réécouter les instructions · Sous-titres activés/désactivés · Réduire les animations.
- **Voix** : voir la section « Narration vocale française (v5) ».
- Aucune connexion, aucun compte.

## Déroulement

| Étape | Contenu | Action principale |
|---|---|---|
| 01 Le retard | Joseph stationné, message vocal du responsable affiché à l’écran | Ranger le téléphone et démarrer |
| 02 L’approche du feu | Trajet guidé, caméra derrière la moto, une autre moto passe au rouge | — (séquence guidée) |
| 03 Ton choix | Action figée avant la ligne, sans limite de temps | J’attends le vert / Je passe au rouge |
| 04A Il attend | La voiture traverse, Joseph repart au vert, arrive à 8 h 04, briefing de prévention | Continuer |
| 04B Il passe | Changement de caméra : la voiture surgit, freinage de justesse, contrôle ; la réunion commence | Continuer |
| 05 Le policier | Première phrase adaptée au choix, ralenti en vue surélevée (ligne d’arrêt, minibus, zone invisible, trajectoire) puis la règle | Revoir le carrefour |
| 06 Le texte voté | Pictogrammes permis + bouclier moto, statut vérifié, rôle du CNSR | Suivant |
| 07 L’assurance moto | Question de Joseph, réponse du policier, pictogramme moto/voiture/bouclier | Suivant |
| 08 La CNSS | Parcours maison → travail, détour personnel, situation de Joseph inconnue, source | Passer au quiz |
| 09–11 Quiz | Une question à la fois, aucune réponse présélectionnée, correction, « Réessayer » | — |
| Fin | À retenir · Rejouer · Essayer l’autre choix · Sources | — |

## Commandes

- Souris / toucher : grands boutons (≥ 52 px, choix de l’étape 03 : 84 px sur ordinateur, 68 px sur téléphone).
- Clavier : `Tab` pour naviguer, `Entrée`/`Espace` pour activer, flèches dans le choix de langue et le tutoriel, `1`/`2` pour les choix et le quiz, `N` pour l’action principale, `Retour arrière` pour l’étape précédente, `M` pour réduire les mouvements, `Échap` pour la pause (ou fermer une fenêtre). Focus visible (contour jaune + marine).
- Réglages : « Réduire les mouvements de caméra » (activé d’office si le système le demande) — plans fixes et coupes franches au lieu des travellings.
- Voix : les personnages et la narratrice parlent automatiquement (après le premier appui sur « Commencer »). Bouton « Réécouter » dans la barre haute et dans le sous-titre, touche `R`. Volume et « Voix des personnages » (on/off) dans Paramètres. Tout reste sous-titré : le jeu se parcourt aussi sans le son.

## Décor 3D (version 2 — d'après les 7 références)

Un seul carrefour fictif, inspiré du secteur de la Marina, un matin. Les photos ont servi de **références de conception uniquement** : aucune photo, aucun filigrane, nom, insigne ou médaille n'est intégré. Modèles, textures, fresque et personnages sont créés dans `src/world.ts`.

| Référence | Ce qui en est tiré dans le jeu |
|---|---|
| 01 Caméra derrière Joseph | Caméra à hauteur de rue derrière Joseph : épaules, moto, chaussée. Casque jaune et chemise wax sarcelle (motif original) identiques dans toutes les scènes. |
| 02 Boulevard vu du ciel | Boulevard 2 × 2 voies, terre-plein central gazonné à massifs verts et rouges, palmiers, lampadaires doubles, larges trottoirs. |
| 03 Uniforme | Policier fictif : camouflage bleu (motif inventé), béret, ceinturon, visage propre. Sans nom, insigne ni médaille. |
| 04 Architecture et esplanade | En arrière-plan à gauche : bâtiment aux coques courbes évasées, esplanade plantée, muret. |
| 05 Zémidjans et carrefour | Zémidjans en chemise jaune arrêtés au feu en face, bordures rouge et blanc, commerces à enseignes, véhicules qui arrivent et rejoignent la file. |
| 06 Fresque | Fresque originale (lagune au lever du soleil, pirogues, bandes wax) en retrait à droite, plus basse que le feu. |
| 07 Geste de contrôle | Branche B : l'agent lève la main paume vers Joseph, puis tend le bras vers le bord de la route (plan moyen dédié). |

**Trois angles, une même géométrie** (ligne d'arrêt, minibus, voie de la voiture définis une seule fois) :
1. **Derrière Joseph** : feu rouge sur potence (se détache sur le ciel, liseré jaune), ligne d'arrêt de 0,6 m, minibus à l'angle.
2. **Depuis la rue transversale**, dans le dos de la voiture : on voit d'où elle arrive, l'angle de l'immeuble et le minibus qui la cachaient, Joseph derrière eux. Utilisé dans 04A (elle traverse, Joseph reste derrière la ligne) et 04B (révélation).
3. **En hauteur** dans « Revoir le carrefour » : minibus, voiture, ligne d'arrêt et zone invisible ensemble.

Allègement téléphone : le décor fixe est fusionné par matériau et les véhicules d'arrière-plan sont « cuits » en un seul bloc. Résultat mesuré : 263 appels de dessin par image (ombres comprises), contre 735 avant fusion.

## Personnage de Joseph (v3 · modèle humain articulé)

Aucun modèle GLB n'a été fourni, et les modèles humains accessibles sous licence compatible ne convenaient pas (trop rudimentaires, ou non redistribuables). Joseph est donc un **modèle humain articulé original**, dans `src/joseph.ts`, sans fichier externe :
- un squelette bassin → colonne → épaules → coudes → poignets, et hanches → genoux → chevilles, proportionné pour un adulte d'environ 1,72 m ;
- des bras et des jambes posés par **cinématique inverse à deux segments** : les mains se referment sur les poignées, les pieds se posent sur les repose-pieds ; le guidon, les poignées et les repose-pieds de la moto partagent les mêmes cotes (`MOTO_FIT`) ;
- des épaules arrondies (deltoïdes), des membres effilés, un bassin posé sur la selle, le casque jaune conservé ;
- une chemise wax en matériau mat (rugosité 0,93), avec une carte de normales procédurale : grain fin, armure sergé et quelques plis souples à la taille et au dos.

Contrôles mesurés (`window.__marina.josephCheck()`), dans le repère de la moto :

| Contrôle | Résultat |
|---|---|
| Mains | à 2,2 cm de l'axe des poignées, sur la longueur de la poignée |
| Bassin | posé sur la selle (écart 0 cm) |
| Semelles | 2 mm au-dessus des repose-pieds |
| Intersections | aucune entre chaussures ou genoux et le cadre, le réservoir ou les roues |

**Pour aller plus loin avec un vrai modèle 3D**, fournir un fichier `joseph.glb` qui respecte ces critères :
- glTF 2.0 binaire, humanoïde riggé, squelette au nommage Mixamo (`mixamorig:Hips`, `Spine`…, `LeftHand`, `RightFoot`) ou au standard VRM ;
- 8 000 à 20 000 triangles, textures PBR 1024 px (couleur, normales, rugosité), poids inférieur à 3 Mo ;
- échelle 1 unité = 1 m, debout en pose A ou T, regard vers +Z ;
- licence CC0 ou CC-BY (par exemple les « Universal Base Characters » de Quaternius, en CC0) ;
- chemise et casque séparés en matériaux distincts, pour garder la chemise wax et le casque jaune.

La pose par cinématique inverse de `joseph.ts` peut alors piloter les os du GLB.

## Architecture

```
src/story.ts   Données du récit : étapes, répliques (avec emplacement `fon`), repères temporels, quiz, sources, crédits
src/shots.ts   Plans de caméra et poses : fonctions pures du temps → les deux branches sont identiques à chaque répétition
src/world.ts   Décor 3D procédural (carrefour, bâtiments, palmiers, minibus, voiture, motos, personnages, feux, aides du ralenti)
src/joseph.ts  Joseph, personnage humain articulé (IK bras/jambes, points de contact moto)
src/audio.ts   Langues, lecteur de voix unique (file d’attente, une voix à la fois), repli fon → français
src/voice-script.ts  Script vocal : chaque texte dit, son personnage, sa scène, son identifiant audio
src/pictos.ts  Pictogrammes, icônes et illustrations du tutoriel (SVG originaux)
src/main.ts    États Menu / Tutoriel / Jeu / Pause / Fin, étapes, sauvegarde, paramètres, clavier, rendu
public/audio/  Voix françaises (fr/…) + audio_manifest.json ; dossier fon/ prêt
voicegen/      Génération des voix (generate.py), contrôle qualité (qc.py)
scripts/       Export du script vocal pour la génération
src/style.css  Interface (jetons de couleur, échelle d’espacement 4 px, mobile)
```

Le récit est séparé de l’affichage : pour modifier un texte, on ne touche que `story.ts`. Les poses sont calculées à partir du temps de la séquence, sans aléatoire ni physique : 04A et 04B produisent les mêmes images au même instant, d’une partie à l’autre (vérifié par test).

## Narration vocale française (v5)

68 interventions vocalisées : 53 par la narratrice (narration, fiches, consignes, quiz, fin), 11 par le policier, 3 par Joseph, 1 par le responsable (message vocal filtré « téléphone »). Durée totale ≈ 6 min, 3,5 Mo. Liste complète avec texte exact : `public/audio/audio_manifest.json`.

- **Voix de synthèse**, pas des comédiens : moteur Piper (neuronal, hors ligne). Narratrice « siwis » (féminine, posée), Joseph « tom » (masculine, jeune adulte), policier « pierre » (upmc, abaissée d’environ 1,5 demi-ton), responsable « pierre » relevé d’environ 1,5 demi-ton et filtré « téléphone ». Débit mesuré : 144 à 162 mots/min ; volume normalisé −18 LUFS.
- **Synchronisation** : dans les séquences animées (02, 04A, 04B, ralenti 05), si une phrase n’est pas finie quand la suivante arrive, le temps de la scène ralentit puis attend : aucune phrase coupée, aucune superposition.
- **Une seule voix à la fois** : chaque nouvelle intervention arrête la précédente (ex. « Suivant » pendant une réplique). La pause met la voix en pause ; le retour au menu la coupe.
- **Textes inchangés** : la voix lit le texte affiché ; seule la prononciation est aidée (« 8 h » → « 8 heures », « n° » → « numéro », symboles), consignée dans le champ `spoken` du manifeste.
- **Remplacer par des voix humaines** : déposer un MP3 au même chemin. Régénérer après modification d’un texte : `npm run voice:build` (voir `public/audio/LISEZ-MOI.md`).
- **Licences** : le modèle « upmc » (policier, responsable) est sous licence CC BY-NC-SA 4.0 (usage non commercial) ; vérifier les fiches des modèles avant une diffusion publique.

## Narration en fon (v6)

10 enregistrements fon de l'équipe intégrés (accueil, consignes, scène 03 question + 2 options, 04A attente, quiz 09 question + 2 options + bonne réponse). Liste, contrôles et avertissements : `public/audio/fon_manifest.json` ; import : `voicegen/import_fon.py` + `voicegen/fon_map.json`.

- Voix fon jouée partout où un fichier existe ; ailleurs, voix française en attendant (désactivable dans Paramètres). Le sous-titre indique la langue réellement entendue.
- Menu : « Écouter l'accueil » (fon) lit l'accueil puis les consignes ; « Commencer » reste disponible.
- Scène 03 et quiz : chaque option a son propre bouton « Écouter », séparé du bouton qui valide ; écouter ne choisit rien.
- Scène 01 : téléphone avec ondes animées pendant le message et bouton « Réécouter le message ».
- Aucun texte fon n'est fabriqué : interface et sous-titres restent en français.

## Statut juridique affiché (vérifié le 18 novembre 2026)

- **Adopté** par l’Assemblée nationale le 26 octobre 2026 : loi n° 2026-18 portant Code de la route (permis et assurance pour les motocyclistes, entre autres).
- **Promulgation, publication au Journal officiel et modalités d’application : à confirmer.** Aucune des sources consultées ne les mentionne ; selon La Nouvelle Tribune (8 nov. 2026), les contrôles du permis ne commenceront qu’après la promulgation. Africa24 indique que l’application dépend encore de plusieurs étapes institutionnelles.
- Le CNSR est présenté dans son rôle d’information et de prévention.
- CNSS : la loi n° 98-019 portant Code de sécurité sociale (art. 55) couvre l’accident de trajet domicile ↔ travail si le parcours n’a pas été interrompu ou détourné pour des motifs d’ordre personnel ou indépendants de l’emploi.

**À revérifier avant toute diffusion :** promulgation, numéro et date du Journal officiel, décrets d’application, calendrier des contrôles. Mettre à jour `STATUS_06`, la question 10 et `SOURCES` dans `src/story.ts`.

### Sources consultées

1. SRTB — Bénin : le nouveau Code de la route renforce les sanctions et la protection des usagers — https://srtb.bj/benin-le-nouveau-code-de-la-route-renforce-les-sanctions-et-la-protection-des-usagers/
2. Bénin Web TV — Permis moto au Bénin, le permis B ne suffira pas pour tous les deux-roues — https://beninwebtv.bj/permis-moto-au-benin-le-permis-b-ne-suffira-pas-pour-tous-les-deux-roues/
3. La Nouvelle Tribune (via Shango Media) — Le permis de conduire sera bientôt contrôlé… — https://www.shango.media/la-nouvelle-tribune-benin-le-permis-de-conduire-sera-bientot-controle-pour-les-conducteurs-de-deux-et-trois-roues-12034303
4. Africa24 — Bénin : l’Assemblée nationale adopte un nouveau Code de la route — https://africa24tv.com/benin-lassemblee-nationale-adopte-un-nouveau-code-de-la-route/
5. Les 4 Vérités — Le permis de conduire bientôt obligatoire pour les motos et tricycles — https://www.les4verites.bj/le-permis-de-conduire-bientot-obligatoire-pour-les-motos-et-tricycles/
6. SGG Bénin — Loi n° 98-019 portant Code de sécurité sociale — https://sgg.gouv.bj/doc/loi-1998-019/download
7. Africarrières — Sécurité sociale au Bénin — https://africarrieres.com/benin/fr/guide/droit-du-travail/social-security

## Crédits

- Décor, personnages, véhicules, pictogrammes, interface : créations originales (géométrie procédurale Three.js, SVG).
- Three.js (MIT), Vite (MIT), TypeScript (Apache-2.0), vite-plugin-singlefile (MIT).
- Polices système, aucune police téléchargée. Voix de synthèse Piper (voir « Narration vocale française »).
- Référence d’ambiance (non reproduite) : Kutɔnu Vibes — caméra au niveau de la rue, commandes intégrées à la scène.
- Photos de référence fournies par l'équipe (non intégrées) ; crédits visibles sur les originaux : AFP (réf. 01), Présidence du Bénin (réf. 07). Les autres images ne portaient pas de crédit visible.

## Tests réalisés (Chromium sans tête, rendu WebGL logiciel)

Scripts dans `tests/` (Python + Playwright) : `python3 tests/journey.py [d|t|m]`, `python3 tests/full.py [dA|dB|mA|mB|kb]`, `tests/det.py`.

- **Parcours menu (journey.py)** sur ordinateur 1280 × 800 et téléphone 390 × 844 (tactile) : ouverture sur le menu sans démarrage automatique → Commencer refusé sans langue → Fon (exemple marqué « à enregistrer ») → Français → tutoriel 3 écrans → 01 → pause (temps figé) / reprise → paramètres en jeu (langue changée sans redémarrer, volume, sous-titres, réécoute) → choix A → quiz → fin (4 actions, pas de redémarrage) → retour au menu → rechargement (langue + Continuer conservés) → confirmation avant nouvelle partie → Échap → pause → menu → Comment jouer ? → Continuer : 0 échec, aucune erreur JS.

- Parcours complet branche A et branche B sur ordinateur (1280 × 800) et téléphone (390 × 844, tactile) : 0 échec.
- Ralenti du carrefour : étiquettes ligne d’arrêt, minibus, zone invisible, voiture ; conclusion du policier ; « Revoir le carrefour » rejouable.
- Quiz : chaque question sans présélection, mauvaise réponse → correction + « Réessayer » (remise à zéro), bonne réponse → correction ; rappel du statut à la question 10.
- Retour : bouton et touche Retour arrière (06 → 05, 04 → 03, depuis « Essayer l’autre choix »).
- Clavier seul : focus initial, focus visible, `Entrée`, `1`/`2`, `N`, `M`, `Retour arrière`.
- Réduction des mouvements : activée d’office avec `prefers-reduced-motion`, parcours complet sur téléphone dans ce mode.
- Tout est sous-titré : le jeu se parcourt aussi voix coupées.
- Déterminisme : poses de 04A et 04B identiques sur deux sessions (27 instants chacune).

- Décor v2 (lancer de rayons vers 18 points de la voiture) : voiture visible à **0 %** à la fin de l'approche et à l'instant du choix, sur ordinateur et téléphone ; **100 %** visible dans l'angle « rue transversale » de 04A (t = 2,4 s) et de 04B (t = 1,5 s).
- Feu et ligne d'arrêt hors de l'interface au choix (étape 03) : ordinateur, feu à y = 235 px et ligne à y ≈ 611 px pour une interface basse qui commence à 697 px ; téléphone 390 × 844, feu à y = 246 px et ligne à y ≈ 523 px pour une interface qui commence à 585 px.

**Non testé ici :** appareils physiques (GPU réel, Safari iOS, Android bas de gamme), lecteurs d’écran (VoiceOver, TalkBack). À faire avant diffusion.

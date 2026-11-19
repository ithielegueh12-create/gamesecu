# Voix du jeu

## Français — produites

68 fichiers MP3 (mono, 44,1 kHz, 80 kb/s, volume normalisé à −18 LUFS), un par intervention :

```
audio/fr/narrator/      narration, explications des fiches (06, 07, 08)
audio/fr/joseph/        répliques de Joseph
audio/fr/characters/    le policier, le message vocal du responsable
audio/fr/instructions/  propositions du choix 03, tutoriel, exemple de langue
audio/fr/quiz/          questions, réponses proposées, retours (bonne / mauvaise réponse)
audio/fr/endings/       « À retenir » de fin de parcours
audio_manifest.json     liste complète : id, personnage, voix, scène, texte exact, chemin, durée
```

Le champ `text` du manifeste est le texte exact affiché à l'écran. Quand la prononciation a dû être aidée
(« 8 h » → « 8 heures », « n° » → « numéro », « → », « ≠ »), la phrase réellement dite figure dans `spoken`.

**Ce sont des voix de synthèse** (Piper, synthèse neuronale hors ligne), pas des comédiens.
Distribution : narratrice « siwis », Joseph « tom », policier « pierre » (upmc, abaissé d'environ 1,5 demi-ton),
responsable « pierre » relevé d’environ 1,5 demi-ton et filtré « téléphone ».

### Remplacer une voix par un enregistrement humain

Déposer le nouveau fichier au même chemin, avec le même nom (MP3 de préférence). Rien d'autre à changer.

### Régénérer les voix (après modification d'un texte)

```bash
npm run voice:build      # exporte src/voice-script.ts, synthétise ce qui a changé, contrôle qualité
```

Prérequis : Python 3, `pip install piper-tts`, ffmpeg, et les modèles Piper `fr_FR-siwis-medium`,
`fr_FR-tom-medium`, `fr_FR-upmc-medium` (.onnx + .onnx.json) dans un dossier indiqué par la variable
`PIPER_VOICES`.

## Fon — à enregistrer et à valider

Aucune voix fon n'existe et aucune traduction n'a été fabriquée. En mode fon, la voix française est
utilisée et l'écran affiche « Voix fon à enregistrer et à valider · voix française en attendant ».

Pour ajouter les voix fon :

1. faire traduire et enregistrer chaque entrée de `audio_manifest.json` par une personne locutrice native ;
2. faire valider chaque enregistrement par une seconde personne locutrice native ;
3. déposer les fichiers dans `audio/fon/<même dossier>/<même id>.mp3` ;
4. déclarer chaque fichier dans `FON_FILES` (src/audio.ts) :
   `'01-narratrice-01': 'audio/fon/narrator/01-narratrice-01.mp3'`.

Une entrée fon absente retombe automatiquement sur la voix française : on peut livrer le fon progressivement.

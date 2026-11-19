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

## Fon — enregistrements de l'équipe

Les fichiers fon fournis sont importés par `python3 voicegen/import_fon.py <dossier>` :
noms reconnus `NN_fonction_fon[_prise].wav|m4a|mp3|ogg` (préfixe ignoré, la prise la plus récente l'emporte),
correspondance dans `voicegen/fon_map.json`, traitement (mono, réparation d'écrêtage, silences réduits,
volume −18 LUFS comme le français), sortie dans `audio/fon/<dossier>/` et `audio/fon_manifest.json`
(source, durée, contrôles qualité, avertissements, fichiers attendus absents).

En mode fon, le jeu ne joue que ces enregistrements. Un passage sans fichier fon n'a aucune voix
(pas de voix française de remplacement) : il reste écrit à l'écran. Dès qu'un fichier fon est ajouté,
le passage correspondant devient parlé, sans autre modification.

Pour ajouter une voix fon : déposer le fichier avec le bon nom dans le dossier source, ajouter sa ligne
dans `fon_map.json` si elle n'y est pas (identifiant = colonne `id` de `audio_manifest.json`), relancer l'import puis `npm run build`.
Aucun texte fon n'est écrit dans le jeu : seules des voix enregistrées par l'équipe sont diffusées.

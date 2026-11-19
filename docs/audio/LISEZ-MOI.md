# Enregistrements audio

Aucun enregistrement n'est encore fourni. Le jeu affiche « Audio … à enregistrer » tant qu'un emplacement est vide.

## Ajouter un enregistrement

1. Déposer le fichier (MP3 mono, 64–96 kb/s, normalisé à −16 LUFS, sans musique) dans `public/audio/fr/` ou `public/audio/fon/`.
2. Renseigner son nom dans `src/audio.ts` (`AUDIO_FILES`) pour l'interface, ou dans le champ `fr` / `fon` de la réplique concernée dans `src/story.ts`.
3. Relancer `npm run build`.

**Fon :** aucune traduction n'a été rédigée par l'IA. Les textes fon doivent être traduits puis enregistrés **et validés par une personne locutrice native** avant d'être ajoutés.

## Fichiers attendus pour l'interface

| Emplacement | Fichier proposé | Texte de référence (français) |
|---|---|---|
| Exemple de langue | `fr/exemple.mp3`, `fon/exemple.mp3` | Bonjour. Tu vas suivre Joseph, un matin, au carrefour de la Marina. |
| Tutoriel · Écouter | `fr/tuto-ecouter.mp3`, `fon/tuto-ecouter.mp3` | Appuie sur le haut-parleur pour écouter la consigne. |
| Tutoriel · Choisir | `fr/tuto-choisir.mp3`, `fon/tuto-choisir.mp3` | Touche une des deux réponses pour choisir. |
| Tutoriel · Continuer | `fr/tuto-continuer.mp3`, `fon/tuto-continuer.mp3` | Appuie sur la flèche pour continuer. |

Les répliques du récit (étapes 01 à 11) se branchent de la même façon, réplique par réplique, dans `src/story.ts`.

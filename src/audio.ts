// ─────────────────────────────────────────────────────────────
// Langue et audio.
// Deux langues prévues : français et fon. Aucun enregistrement n'est encore
// fourni : chaque emplacement vaut `null` tant qu'un fichier réel n'a pas été
// déposé dans public/audio/<langue>/ et, pour le fon, validé par une personne
// locutrice native. Aucune traduction fon n'est fabriquée : l'interface et les
// sous-titres restent en français.
// Le jeu ne lance jamais de son tout seul : un son ne part qu'après un appui.
// ─────────────────────────────────────────────────────────────

export type Lang = 'fr' | 'fon';

export const LANG_LABEL: Record<Lang, string> = { fr: 'Français', fon: 'Fon' };
/** Code de langue pour l'attribut lang du document (ISO 639-3 pour le fon). */
export const LANG_CODE: Record<Lang, string> = { fr: 'fr', fon: 'fon' };

/** Emplacements audio de l'interface (chemins relatifs à public/audio/). */
export type AudioKey = 'exemple' | 'tuto-ecouter' | 'tuto-choisir' | 'tuto-continuer';

export const AUDIO_FILES: Record<Lang, Record<AudioKey, string | null>> = {
  // Remplacer null par le nom du fichier une fois l'enregistrement déposé, ex. 'fr/exemple.mp3'.
  fr: { exemple: null, 'tuto-ecouter': null, 'tuto-choisir': null, 'tuto-continuer': null },
  fon: { exemple: null, 'tuto-ecouter': null, 'tuto-choisir': null, 'tuto-continuer': null },
};

/** Transcriptions de référence en français (textes à enregistrer). */
export const AUDIO_SCRIPT: Record<AudioKey, string> = {
  exemple: 'Bonjour. Tu vas suivre Joseph, un matin, au carrefour de la Marina.',
  'tuto-ecouter': 'Appuie sur le haut-parleur pour écouter la consigne.',
  'tuto-choisir': 'Touche une des deux réponses pour choisir.',
  'tuto-continuer': 'Appuie sur la flèche pour continuer.',
};

/** Texte affiché quand un enregistrement n'est pas encore disponible. */
export const MISSING_AUDIO: Record<Lang, string> = {
  fr: 'Audio français à enregistrer',
  fon: 'Audio fon à enregistrer et à valider',
};

const BASE = './audio/';

/** Lecteur unique : un seul son à la fois, volume réglable, jamais automatique. */
export class Voice {
  private el = new Audio();
  volume = 0.8;
  constructor() { this.el.preload = 'none'; }
  /** Renvoie false si aucun enregistrement n'existe pour cet emplacement. */
  play(file: string | null | undefined): boolean {
    if (!file) return false;
    this.el.pause();
    this.el.src = BASE + file;
    this.el.volume = this.volume;
    this.el.play().catch(() => { /* fichier manquant ou lecture refusée */ });
    return true;
  }
  setVolume(v: number) { this.volume = Math.min(1, Math.max(0, v)); this.el.volume = this.volume; }
  stop() { this.el.pause(); }
}

export function uiAudio(lang: Lang, key: AudioKey) { return AUDIO_FILES[lang][key]; }

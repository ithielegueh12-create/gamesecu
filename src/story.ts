// ─────────────────────────────────────────────────────────────
// Données du récit — séparées de l'affichage.
// Chaque réplique a un emplacement `fon` réservé : il reste `null`
// tant qu'aucune piste n'a été enregistrée ET validée par une
// personne locutrice native.
// ─────────────────────────────────────────────────────────────

export type Speaker = 'joseph' | 'policier' | 'responsable' | 'narration';
export type Branch = 'A' | 'B';

export interface Line {
  who: Speaker;
  text: string;
  fon: string | null; // fichier fon validé (public/audio/fon/…) — aucun pour l'instant
  fr: string | null;  // fichier français enregistré (public/audio/fr/…) — aucun pour l'instant
}

export const SPEAKER_LABEL: Record<Speaker, string> = {
  joseph: 'Joseph',
  policier: 'Le policier',
  responsable: 'Son responsable · message vocal',
  narration: '',
};

const L = (who: Speaker, text: string): Line => ({ who, text, fon: null, fr: null });

export type StepId =
  | '01' | '02' | '03' | '04A' | '04B' | '05'
  | '06' | '07' | '08' | '09' | '10' | '11' | 'fin';

export interface Cue { t: number; line: Line }

export interface StepDef {
  id: StepId;
  num: string;
  title: string;
  clock: string;
}

export const STEPS: Record<StepId, StepDef> = {
  '01': { id: '01', num: '01', title: 'Le retard', clock: '7 h 52' },
  '02': { id: '02', num: '02', title: 'L’approche du feu', clock: '7 h 53' },
  '03': { id: '03', num: '03', title: 'Ton choix', clock: '7 h 54' },
  '04A': { id: '04A', num: '04A', title: 'Il attend', clock: '7 h 54' },
  '04B': { id: '04B', num: '04B', title: 'Il passe', clock: '7 h 54' },
  '05': { id: '05', num: '05', title: 'Le policier reprend la scène', clock: '' },
  '06': { id: '06', num: '06', title: 'Le texte voté', clock: '' },
  '07': { id: '07', num: '07', title: 'L’assurance moto', clock: '' },
  '08': { id: '08', num: '08', title: 'La CNSS', clock: '' },
  '09': { id: '09', num: '09', title: 'Quiz · le feu', clock: '' },
  '10': { id: '10', num: '10', title: 'Quiz · le texte voté', clock: '' },
  '11': { id: '11', num: '11', title: 'Quiz · la CNSS', clock: '' },
  fin: { id: 'fin', num: '—', title: 'Fin du parcours', clock: '' },
};

/** Ordre des étapes selon la branche choisie. */
export function nextStep(id: StepId, branch: Branch | null): StepId {
  switch (id) {
    case '01': return '02';
    case '02': return '03';
    case '03': return branch === 'B' ? '04B' : '04A';
    case '04A': case '04B': return '05';
    case '05': return '06';
    case '06': return '07';
    case '07': return '08';
    case '08': return '09';
    case '09': return '10';
    case '10': return '11';
    default: return 'fin';
  }
}

// ── 01 ───────────────────────────────────────────────────────
export const MSG_RESPONSABLE = L('responsable', 'Joseph, tu es où ? La réunion commence à 8 h.');
export const LINES_01: Line[] = [
  MSG_RESPONSABLE,
  L('narration', 'Joseph est stationné au bord du boulevard. Il range son téléphone avant de démarrer.'),
];

// ── 02 (repères temporels de la séquence « approach », en secondes) ──
export const CUES_02: Cue[] = [
  { t: 0.1, line: L('narration', 'Téléphone rangé. Joseph démarre.') },
  { t: 2.6, line: L('narration', 'Devant lui, une autre moto passe au rouge.') },
  { t: 6.0, line: L('joseph', 'La voie semble libre…') },
];

// ── 03 ───────────────────────────────────────────────────────
export const LINE_03 = L('narration', 'Joseph arrive à la ligne d’arrêt. Son feu est rouge. Que fait-il ?');
export const CHOICE_WAIT = 'J’attends le vert';
export const CHOICE_GO = 'Je passe au rouge';

// ── 04A ──────────────────────────────────────────────────────
export const CUES_04A: Cue[] = [
  { t: 0.1, line: L('narration', 'Joseph s’arrête avant la ligne.') },
  { t: 1.2, line: L('narration', 'Vue depuis la rue transversale : la voiture arrive de la droite de Joseph, cachée par le minibus. Joseph reste derrière la ligne : son feu est rouge.') },
  { t: 6.2, line: L('narration', 'La voiture est passée. Le feu change.') },
  { t: 8.2, line: L('narration', 'Vert. La voie est dégagée : Joseph repart.') },
];
export const END_04A: Line[] = [
  L('narration', '8 h 04. Joseph arrive légèrement en retard.'),
  L('narration', 'Au carrefour, un policier anime un briefing de prévention. Pas de contrôle : il partage la scène avec les motocyclistes.'),
];

// ── 04B ──────────────────────────────────────────────────────
export const CUES_04B: Cue[] = [
  { t: 0.1, line: L('narration', 'Joseph s’engage au rouge.') },
  { t: 0.8, line: L('narration', 'Vue depuis la rue transversale : la voiture arrive de la droite de Joseph, cachée par le minibus !') },
  { t: 2.5, line: L('narration', 'Joseph freine de justesse. Pas de choc.') },
  { t: 4.2, line: L('narration', 'Plus loin, un policier lève la main puis lui fait signe de se ranger.') },
];
export const END_04B: Line[] = [
  L('policier', 'Contrôle. Vous êtes passé au rouge : c’est une infraction qui peut être sanctionnée.'),
  L('narration', '8 h 00. Pendant le contrôle, la réunion de Joseph commence sans lui.'),
];

// ── 05 ───────────────────────────────────────────────────────
export const OPEN_05: Record<Branch, Line> = {
  A: L('policier', 'Bonjour Joseph. Tu t’es arrêté au rouge alors que tu étais pressé : c’était le bon réflexe. Regardons pourquoi.'),
  B: L('policier', 'Vous avez failli heurter cette voiture. Vous ne pouviez pas la voir. Regardons pourquoi.'),
};
export const BEFORE_REPLAY_05 = L('policier', 'Revoyons le carrefour d’en haut, au ralenti.');
export const CUES_REPLAY: Cue[] = [
  { t: 0.2, line: L('policier', 'Ici, la ligne d’arrêt : c’est avant elle que Joseph devait s’arrêter.') },
  { t: 3.6, line: L('policier', 'Le minibus arrêté à l’angle cachait toute la rue de droite.') },
  { t: 7.2, line: L('policier', 'La voiture arrivait de là. Depuis la moto, elle restait invisible jusqu’au dernier moment.') },
];
export const CONCLUSION_05 = L('policier', 'Au rouge, on s’arrête avant la ligne, même si la voie semble libre.');

// ── 06 ───────────────────────────────────────────────────────
export const LINE_06 = L('policier', 'Le texte voté le 26 octobre 2026 prévoit des dispositions sur le permis et l’assurance pour les motocyclistes.');
export const STATUS_06 = {
  date: '18 novembre 2026',
  facts: [
    'Adopté par l’Assemblée nationale le 26 octobre 2026 : loi n° 2026-18 portant Code de la route.',
    'Promulgation, publication au Journal officiel et modalités d’application : à confirmer. Les sources consultées n’en font pas état ; selon la presse, les contrôles du permis ne commenceront qu’après la promulgation.',
  ],
  cnsr: 'Le CNSR (Centre national de sécurité routière) informe le public sur ces règles et mène des actions de prévention.',
};

// ── 07 ───────────────────────────────────────────────────────
export const LINES_07: Line[] = [
  L('joseph', 'Et si j’avais touché la voiture ?'),
  L('policier', 'L’assurance de responsabilité civile de la moto sert notamment à couvrir les dommages que tu causes à d’autres personnes.'),
];
export const NOTE_07 = 'Elle protège les autres : la voiture, ses passagers, les piétons. Tes propres blessures relèvent d’une autre question.';

// ── 08 ───────────────────────────────────────────────────────
export const LINES_08: Line[] = [
  L('joseph', 'Et si je m’étais blessé en allant au travail ?'),
  L('policier', 'La CNSS peut reconnaître certains accidents entre le domicile et le travail. Cela dépend de ta situation et des conditions du trajet.'),
];
export const NOTE_08 = [
  'Un détour pour un motif personnel peut empêcher la reconnaissance de l’accident de trajet.',
  'On ne connaît pas la situation de Joseph : on ne peut donc pas dire s’il serait couvert.',
];
export const SOURCE_08 = 'Code de sécurité sociale du Bénin (loi n° 98-019), article 55 — régime géré par la CNSS.';

// ── 09–11 Quiz ───────────────────────────────────────────────
export interface QuizQ {
  step: StepId;
  question: string;
  options: string[];
  correct: number;
  ok: string;
  ko: string;
  pict: 'feu' | 'moto' | 'trajet';
}
export const QUIZ: QuizQ[] = [
  {
    step: '09', pict: 'feu',
    question: 'Le feu est rouge. La voie semble libre. Que fais-tu ?',
    options: ['J’attends le vert', 'Je passe'],
    correct: 0,
    ok: 'Oui. On s’arrête avant la ligne : un minibus, un camion ou un mur peut cacher un véhicule qui arrive.',
    ko: 'Non. « Libre » ne veut pas dire « sûr » : le minibus cachait la voiture qui arrivait de droite. Au rouge, on s’arrête avant la ligne.',
  },
  {
    step: '10', pict: 'moto',
    question: 'Que prévoit le texte voté pour les motocyclistes ?',
    options: ['Permis et assurance moto', 'Rien de nouveau'],
    correct: 0,
    ok: 'Oui. Le texte voté le 26 octobre 2026 prévoit des dispositions sur le permis et l’assurance moto. Au 18 novembre 2026, sa promulgation et ses modalités d’application restent à confirmer.',
    ko: 'Non. Le texte voté le 26 octobre 2026 prévoit des dispositions sur le permis et l’assurance moto. Au 18 novembre 2026, sa promulgation et ses modalités d’application restent à confirmer.',
  },
  {
    step: '11', pict: 'trajet',
    question: 'Tous les accidents de trajet sont-ils couverts par la CNSS ?',
    options: ['Oui, toujours', 'Non, selon les conditions'],
    correct: 1,
    ok: 'Oui. La reconnaissance dépend de la situation de la personne et des conditions du trajet — par exemple, l’absence de détour pour un motif personnel.',
    ko: 'Non, pas toujours. La reconnaissance dépend de la situation de la personne et des conditions du trajet — un détour personnel peut l’empêcher.',
  },
];

// ── Sources (consultées le 18 novembre 2026) ─────────────────
export interface Source { label: string; url: string; note: string }
export const SOURCES: Source[] = [
  { label: 'SRTB — « Bénin : le nouveau Code de la route renforce les sanctions et la protection des usagers »', url: 'https://srtb.bj/benin-le-nouveau-code-de-la-route-renforce-les-sanctions-et-la-protection-des-usagers/', note: 'Adoption de la loi n° 2026-18 le 26 octobre 2026.' },
  { label: 'Bénin Web TV — « Permis moto au Bénin, le permis B ne suffira pas pour tous les deux-roues »', url: 'https://beninwebtv.bj/permis-moto-au-benin-le-permis-b-ne-suffira-pas-pour-tous-les-deux-roues/', note: 'Permis et assurance pour les motocyclistes ; application progressive annoncée par le CNSR.' },
  { label: 'La Nouvelle Tribune (via Shango Media) — « Le permis de conduire sera bientôt contrôlé… »', url: 'https://www.shango.media/la-nouvelle-tribune-benin-le-permis-de-conduire-sera-bientot-controle-pour-les-conducteurs-de-deux-et-trois-roues-12034303', note: 'Contrôle pas encore effectif ; il le sera une fois la loi promulguée (8 nov. 2026).' },
  { label: 'Africa24 — « Bénin : l’Assemblée nationale adopte un nouveau Code de la route »', url: 'https://africa24tv.com/benin-lassemblee-nationale-adopte-un-nouveau-code-de-la-route/', note: 'L’application dépend encore de plusieurs étapes institutionnelles.' },
  { label: 'Les 4 Vérités — « Le permis de conduire bientôt obligatoire pour les motos et tricycles »', url: 'https://www.les4verites.bj/le-permis-de-conduire-bientot-obligatoire-pour-les-motos-et-tricycles/', note: 'Explications du directeur général du CNSR.' },
  { label: 'SGG Bénin — Loi n° 98-019 portant Code de sécurité sociale (article 55)', url: 'https://sgg.gouv.bj/doc/loi-1998-019/download', note: 'Accident de trajet : parcours non interrompu ni détourné pour des motifs d’ordre personnel.' },
  { label: 'Africarrières — Sécurité sociale au Bénin', url: 'https://africarrieres.com/benin/fr/guide/droit-du-travail/social-security', note: 'La CNSS gère le régime créé par la loi n° 98-019.' },
];

export const CREDITS = [
  'Décor, personnages, véhicules, pictogrammes et interface : créations originales pour ce projet (géométrie procédurale Three.js et SVG).',
  'Moteur 3D : Three.js — licence MIT.',
  'Outillage : Vite, TypeScript — licences MIT / Apache-2.0.',
  'Polices : polices système de l’appareil (aucune police téléchargée).',
  'Références de conception (photos fournies, non intégrées au jeu) : caméra derrière le motocycliste (crédit visible : AFP), boulevard en vue aérienne, tenue de policier, architecture et esplanade, zémidjans au carrefour, fresque urbaine, geste de contrôle (crédit visible : Présidence du Bénin). Aucune photo, aucun filigrane, aucun nom ni insigne n’est repris : modèles, textures, fresque et personnages sont des créations originales.',
  'Audio : aucun. Narration en fon : à enregistrer et à valider par une personne locutrice native.',
];

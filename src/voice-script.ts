// ─────────────────────────────────────────────────────────────
// Script vocal français : la liste de TOUT ce qui est dit dans le jeu.
// Chaque entrée reprend le texte exact affiché à l'écran (`text`).
// `tts` est la même phrase adaptée uniquement pour la prononciation
// (« 8 h » → « 8 heures », « n° » → « numéro », flèches et symboles),
// jamais pour en changer le sens.
// Ce fichier sert deux fois :
//   1. scripts/export-voice-script.ts l'exporte pour produire les MP3 ;
//   2. le jeu l'utilise pour retrouver l'audio de chaque réplique.
// ─────────────────────────────────────────────────────────────
import {
  type Line, type Speaker,
  LINES_01, CUES_02, LINE_03, CHOICE_WAIT, CHOICE_GO,
  CUES_04A, END_04A, CUES_04B, END_04B,
  OPEN_05, BEFORE_REPLAY_05, CUES_REPLAY, CONCLUSION_05,
  LINE_06, STATUS_06, CARD_06, LINES_07, NOTE_07, CARD_07, LINES_08, NOTE_08, SOURCE_08, CARD_08,
  QUIZ, QUIZ_FB, FIN_TITLE, RECAP_FIN, TUTO_TEXT, LANG_EXAMPLE,
} from './story';

/** Voix attribuées : une par personnage, la narratrice pour tout le reste. */
export type VoiceRole = 'narratrice' | 'joseph' | 'policier' | 'responsable';
export type Folder = 'narrator' | 'joseph' | 'characters' | 'instructions' | 'quiz' | 'endings';

export interface VoiceItem {
  id: string;
  role: VoiceRole;
  character: string;
  folder: Folder;
  scene: string;
  text: string;
  tts: string;
}

const ROLE_OF: Record<Speaker, VoiceRole> = { narration: 'narratrice', joseph: 'joseph', policier: 'policier', responsable: 'responsable' };
const CHARACTER: Record<VoiceRole, string> = { narratrice: 'Narratrice', joseph: 'Joseph', policier: 'Le policier', responsable: 'Le responsable de Joseph (message vocal)' };
const FOLDER_OF: Record<VoiceRole, Folder> = { narratrice: 'narrator', joseph: 'joseph', policier: 'characters', responsable: 'characters' };

/** Adaptation orale (prononciation seulement). */
export function toSpeech(text: string): string {
  return text
    .replace(/(\d+) h 00\b/g, '$1 heures')
    .replace(/(\d+) h 0?(\d+)/g, '$1 heures $2')
    .replace(/(\d+) h\b/g, '$1 heures')
    .replace(/n°\s?/g, 'numéro ')
    .replace(/(\d{4})-(\d{2})\b/g, '$1 tiret $2')
    .replace(/\s*→\s*/g, ' vers le ')
    .replace(/\s*≠\s*/g, ' n’est pas la ')
    .replace(/\s*—\s*/g, ', ')
    .replace(/[«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const items: VoiceItem[] = [];
const lineIds = new Map<Line, string>();
const counters = new Map<string, number>();

function add(scene: string, role: VoiceRole, text: string, folder?: Folder, tag?: string): string {
  const f = folder ?? FOLDER_OF[role];
  const key = `${scene}-${tag ?? role}`;
  const n = (counters.get(key) ?? 0) + 1; counters.set(key, n);
  const id = `${key}-${String(n).padStart(2, '0')}`.toLowerCase();
  items.push({ id, role, character: CHARACTER[role], folder: f, scene, text, tts: toSpeech(text) });
  return id;
}
function line(scene: string, l: Line) {
  if (lineIds.has(l)) return;
  lineIds.set(l, add(scene, ROLE_OF[l.who], l.text));
}

// ── Récit, dans l'ordre du jeu ──
LINES_01.forEach((l) => line('01', l));
CUES_02.forEach((c) => line('02', c.line));
line('03', LINE_03);
export const V_CHOICES = [add('03', 'narratrice', CHOICE_WAIT, 'instructions', 'choix'), add('03', 'narratrice', CHOICE_GO, 'instructions', 'choix')];
CUES_04A.forEach((c) => line('04a', c.line)); END_04A.forEach((l) => line('04a', l));
CUES_04B.forEach((c) => line('04b', c.line)); END_04B.forEach((l) => line('04b', l));
line('05a', OPEN_05.A); line('05b', OPEN_05.B); line('05', BEFORE_REPLAY_05);
CUES_REPLAY.forEach((c) => line('05', c.line)); line('05', CONCLUSION_05);

line('06', LINE_06);
export const V_CARD_06 = [
  add('06', 'narratrice', CARD_06.title, 'narrator', 'fiche'),
  add('06', 'narratrice', `${CARD_06.statusTitle} au ${STATUS_06.date}.`, 'narrator', 'fiche'),
  ...STATUS_06.facts.map((f) => add('06', 'narratrice', f, 'narrator', 'fiche')),
  add('06', 'narratrice', STATUS_06.cnsr, 'narrator', 'fiche'),
];
LINES_07.forEach((l) => line('07', l));
export const V_CARD_07 = {
  intro: [add('07', 'narratrice', CARD_07.title, 'narrator', 'fiche'), add('07', 'narratrice', `${CARD_07.lead} ${CARD_07.body}`, 'narrator', 'fiche')],
  note: [add('07', 'narratrice', NOTE_07, 'narrator', 'fiche')],
};
LINES_08.forEach((l) => line('08', l));
export const V_CARD_08 = {
  intro: [add('08', 'narratrice', CARD_08.title, 'narrator', 'fiche'), add('08', 'narratrice', `${CARD_08.lead} ${CARD_08.body}`, 'narrator', 'fiche')],
  note: [...NOTE_08.map((n) => add('08', 'narratrice', n, 'narrator', 'fiche')), add('08', 'narratrice', `Source : ${SOURCE_08}`, 'narrator', 'fiche')],
};

export const V_QUIZ = QUIZ.map((q) => ({
  question: add(q.step, 'narratrice', q.question, 'quiz', 'question'),
  options: q.options.map((o) => add(q.step, 'narratrice', o, 'quiz', 'option')),
  ok: add(q.step, 'narratrice', `${QUIZ_FB.ok}. ${q.ok}`, 'quiz', 'bonne-reponse'),
  ko: add(q.step, 'narratrice', `${QUIZ_FB.ko}. ${q.ko} ${QUIZ_FB.expected(q.options[q.correct])}`, 'quiz', 'mauvaise-reponse'),
}));

export const V_FIN = [
  add('fin', 'narratrice', `${FIN_TITLE}.`, 'endings', 'a-retenir'),
  ...RECAP_FIN.map((r) => add('fin', 'narratrice', `${r.lead} ${r.body}`, 'endings', 'a-retenir')),
];

// ── Interface : tutoriel et exemple de langue ──
export const V_TUTO = TUTO_TEXT.map((t) => add('tutoriel', 'narratrice', `${t.h}. ${t.p}`, 'instructions', 'tuto'));
export const V_EXAMPLE = add('menu', 'narratrice', LANG_EXAMPLE, 'instructions', 'exemple');

export const VOICE_ITEMS: readonly VoiceItem[] = items;
/** Identifiant audio d'une réplique du récit (null si elle n'est pas vocalisée). */
export function lineVoiceId(l: Line | null): string | null { return l ? lineIds.get(l) ?? null : null; }

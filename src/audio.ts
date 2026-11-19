// ─────────────────────────────────────────────────────────────
// Langues et voix.
// Français : voix produites (public/audio/fr/…, listées dans
// public/audio/audio_manifest.json, générées par voicegen/generate.py).
// Fon : aucun enregistrement. Rien n'est traduit ni fabriqué. Quand des voix
// fon validées par une personne locutrice native existeront, il suffira de
// remplir FON_FILES (même identifiant → fichier dans public/audio/fon/).
// En attendant, en mode fon, la voix française est utilisée et l'écran le dit.
// ─────────────────────────────────────────────────────────────
import manifest from '../public/audio/audio_manifest.json';
import fonManifest from '../public/audio/fon_manifest.json';

export type Lang = 'fr' | 'fon';

export const LANG_LABEL: Record<Lang, string> = { fr: 'Français', fon: 'Fon' };
/** Code de langue pour l'attribut lang du document (ISO 639-3 pour le fon). */
export const LANG_CODE: Record<Lang, string> = { fr: 'fr', fon: 'fon' };

interface ManifestItem { id: string; character: string; voice: string; scene: string; text: string; path: string; duration: number }
const FR = new Map<string, ManifestItem>((manifest.items as ManifestItem[]).map((i) => [i.id, i]));

/**
 * Voix fon enregistrées par l'équipe : identifiant du script → fichier.
 * Rempli automatiquement depuis public/audio/fon_manifest.json (voicegen/import_fon.py).
 */
interface FonItem { id: string; path: string; duration: number; status: string; warnings: string[] }
const FON = new Map<string, FonItem>((fonManifest.items as FonItem[]).map((i) => [i.id, i]));
export const FON_FILES: Record<string, string> = Object.fromEntries([...FON].map(([k, v]) => [k, v.path]));
export const hasFon = (id: string | null | undefined) => !!id && FON.has(id);
export const FON_COUNT = FON.size;

/** Mention affichée quand une langue n'a pas sa propre voix. */
export const MISSING_AUDIO: Record<Lang, string> = {
  fr: 'Audio français indisponible',
  fon: 'Voix fon pas encore enregistrée · voix française en attendant',
};

export interface Resolved { id: string; src: string; duration: number; lang: Lang }
/** Fichier à lire pour un identifiant, dans la langue demandée (repli sur le français). */
export function resolveVoice(id: string, lang: Lang, frFallback = true): Resolved | null {
  const fr = FR.get(id);
  const fon = FON.get(id);
  if (lang === 'fon' && fon) return { id, src: './' + fon.path, duration: fon.duration, lang: 'fon' };
  if (lang === 'fon' && !frFallback) return null;
  return fr ? { id, src: './' + fr.path, duration: fr.duration, lang: 'fr' } : null;
}
export const hasVoice = (id: string | null | undefined) => !!id && FR.has(id);

/**
 * Lecteur unique : une seule voix à la fois. Chaque nouvelle intervention
 * arrête la précédente ; une suite d'interventions (réplique puis fiche, question
 * puis réponses) est lue dans l'ordre.
 */
export class Voice {
  private el = new Audio();
  private queue: Resolved[] = [];
  private cur: Resolved | null = null;
  private startedAt = 0;
  private seq = 0;
  volume = 0.8;
  enabled = true;
  lang: Lang = 'fr';
  /** En fon : compléter les passages non enregistrés avec la voix française. */
  frFallback = true;
  /** Dernière suite lancée (pour « Réécouter »). */
  last: string[] = [];
  /** Journal des identifiants lancés (tests). */
  log: string[] = [];
  /** Historique détaillé : début, fin, fin naturelle ou interruption (tests de chevauchement). */
  hist: { id: string; start: number; end: number | null; how: 'fin' | 'coupé' | 'erreur' | null }[] = [];
  private close(how: 'fin' | 'coupé' | 'erreur') { const h = this.hist[this.hist.length - 1]; if (h && h.end === null) { h.end = performance.now(); h.how = how; } }
  onChange: (() => void) | null = null;

  constructor() {
    this.el.preload = 'auto';
    this.el.addEventListener('ended', () => { this.close('fin'); this.next(); });
    this.el.addEventListener('error', () => { if (!this.cur) return; this.close('erreur'); this.next(); });
  }
  /** Lance une suite d'interventions. `manual` : demandée par le joueur (lue même si les voix automatiques sont coupées). */
  speak(ids: (string | null | undefined)[], manual = false): boolean {
    const list = ids.filter((x): x is string => !!x);
    if (!list.length) return false;
    this.last = list;
    if (!this.enabled && !manual) { this.stop(); return false; }
    this.stop();
    this.queue = list.map((id) => resolveVoice(id, this.lang, this.frFallback)).filter((x): x is Resolved => !!x);
    this.next();
    return true;
  }
  replay() { return this.speak(this.last, true); }
  private next() {
    const r = this.queue.shift() ?? null;
    this.cur = r; const my = ++this.seq;
    if (!r) { this.onChange?.(); return; }
    this.el.src = r.src; this.el.volume = this.volume;
    this.startedAt = performance.now(); this.log.push(r.id); this.hist.push({ id: r.id, start: this.startedAt, end: null, how: null });
    this.el.play().catch(() => { if (my === this.seq) { this.cur = null; this.queue = []; this.onChange?.(); } });
    this.onChange?.();
  }
  stop() { this.close('coupé'); this.queue = []; this.cur = null; this.seq++; this.el.pause(); this.el.removeAttribute('src'); this.el.load(); this.onChange?.(); }
  pause() { if (this.cur) this.el.pause(); }
  resume() { if (this.cur && this.el.paused) this.el.play().catch(() => {}); }
  setVolume(v: number) { this.volume = Math.min(1, Math.max(0, v)); this.el.volume = this.volume; }
  setEnabled(v: boolean) { this.enabled = v; if (!v) this.stop(); }
  /** Une voix est-elle en cours (garde-fou : jamais plus que la durée prévue + 3 s) ? */
  get speaking() {
    if (!this.cur) return false;
    if (performance.now() - this.startedAt > (this.cur.duration + 3) * 1000 && !this.el.paused) return false;
    return true;
  }
  /** Secondes de voix restantes dans la suite en cours. */
  remaining() {
    if (!this.speaking || !this.cur) return 0;
    const curLeft = Math.max(0, (Number.isFinite(this.el.duration) ? this.el.duration : this.cur.duration) - this.el.currentTime);
    return curLeft + this.queue.reduce((s, r) => s + r.duration, 0);
  }
  get current() { return this.cur?.id ?? null; }
  get currentLang() { return this.cur?.lang ?? null; }
  get state() { return { id: this.current, src: this.cur?.src ?? null, paused: this.el.paused, speaking: this.speaking, queued: this.queue.map((q) => q.id), volume: this.el.volume, t: this.el.currentTime }; }
}

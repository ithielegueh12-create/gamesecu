import * as THREE from 'three';
import './style.css';
import { World } from './world';
import { SHOTS, ShotId, Shot } from './shots';
import { PICTO, ICON, TUTO_ART } from './pictos';
import { Lang, LANG_LABEL, LANG_CODE, MISSING_AUDIO, Voice, hasFon, FON_COUNT } from './audio';
import { lineVoiceId, V_CHOICES, V_CARD_06, V_CARD_07, V_CARD_08, V_QUIZ, V_FIN, V_TUTO, V_EXAMPLE } from './voice-script';
import {
  STEPS, StepId, Branch, Line, Cue, SPEAKER_LABEL, nextStep,
  LINES_01, MSG_RESPONSABLE, CUES_02, LINE_03, CHOICE_WAIT, CHOICE_GO,
  CUES_04A, END_04A, CUES_04B, END_04B,
  OPEN_05, BEFORE_REPLAY_05, CUES_REPLAY, CONCLUSION_05,
  LINE_06, STATUS_06, LINES_07, NOTE_07, LINES_08, NOTE_08, SOURCE_08,
  QUIZ, SOURCES, CREDITS, TUTO_TEXT,
} from './story';

// ─────────────────────────────────────────────────────────────
// Rendu
// ─────────────────────────────────────────────────────────────
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stage = $('stage');

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
if (!hasWebGL()) {
  const d = document.createElement('div'); d.className = 'boot';
  d.textContent = 'Votre navigateur ne prend pas en charge la 3D (WebGL). Essayez un navigateur récent.';
  document.body.appendChild(d);
  throw new Error('WebGL indisponible');
}

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.appendChild(renderer.domElement);

const world = new World();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);

let baseFov = 52;
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  baseFov = camera.aspect < 0.8 ? 70 : camera.aspect < 1.2 ? 62 : 52;
  camera.fov = baseFov;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

// ─────────────────────────────────────────────────────────────
// Préférences
// ─────────────────────────────────────────────────────────────
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let reduced = prefersReduced;
try { const s = localStorage.getItem('marina.reduced'); if (s !== null) reduced = s === '1'; } catch { /* stockage indisponible */ }
const optReduced = $<HTMLInputElement>('opt-reduced');
optReduced.checked = reduced;
function setReduced(v: boolean) {
  reduced = v; optReduced.checked = v;
  try { localStorage.setItem('marina.reduced', v ? '1' : '0'); } catch { /* ignore */ }
}
optReduced.addEventListener('change', () => setReduced(optReduced.checked));

const store = {
  get(k: string) { try { return localStorage.getItem('marina.' + k); } catch { return null; } },
  set(k: string, v: string | null) { try { if (v === null) localStorage.removeItem('marina.' + k); else localStorage.setItem('marina.' + k, v); } catch { /* stockage indisponible */ } },
};
const voice = new Voice();
let lang: Lang | null = (store.get('lang') as Lang | null);
if (lang !== 'fr' && lang !== 'fon') lang = null;
let subs = store.get('subs') !== '0';
voice.setVolume(Number(store.get('volume') ?? '80') / 100);
voice.setEnabled(store.get('voices') !== '0');
let tutoSeen = store.get('tutoSeen') === '1';

// ─────────────────────────────────────────────────────────────
// États de l'application : Menu → Tutoriel → Jeu ⇄ Pause → Fin
// ─────────────────────────────────────────────────────────────
type Mode = 'menu' | 'tuto' | 'jeu' | 'pause' | 'fin';
let mode: Mode = 'menu';
function setMode(m: Mode) {
  mode = m;
  for (const k of ['menu', 'tuto', 'jeu', 'pause', 'fin']) document.body.classList.toggle('mode-' + k, k === m);
}

// ─────────────────────────────────────────────────────────────
// État du récit
// ─────────────────────────────────────────────────────────────
interface State {
  step: StepId;
  branch: Branch | null;
  history: { step: StepId; branch: Branch | null }[];
}
const state: State = { step: '01', branch: null, history: [] };

// Lecture d'un plan
let shot: Shot = SHOTS.parked;
let shotId: ShotId = 'parked';
let shotT = 0;
let shotEnded = false;
let onShotEnd: (() => void) | null = null;
let cues: Cue[] = [];
let cueIdx = 0;
let stepToken = 0; // invalide les rappels d'une étape quittée
let frozen = false; // pause de test uniquement
let camOverride: { pos: THREE.Vector3; look: THREE.Vector3; fov?: number } | null = null; // caméra libre (captures de validation)

let currentLine: Line | null = null;
function playShot(id: ShotId, opts: { cues?: Cue[]; onEnd?: () => void } = {}) {
  shotId = id; shot = SHOTS[id]; shotT = 0; shotEnded = false;
  cues = opts.cues ?? []; cueIdx = 0;
  onShotEnd = opts.onEnd ?? null;
  clearLabels();
}

// ─────────────────────────────────────────────────────────────
// Interface
// ─────────────────────────────────────────────────────────────
const ui = {
  back: $<HTMLButtonElement>('btn-back'),
  num: $('step-num'), title: $('step-title'), clock: $('clock'),
  sub: $('subtitle'), who: $('sub-who'), text: $('sub-text'),
  actions: $('actions'), card: $('card'), phone: $('phone'),
  flash: $('flash'), labels: $('labels'), progress: $('progress'),
  dlgSources: $<HTMLDialogElement>('dlg-sources'), dlgSettings: $<HTMLDialogElement>('dlg-settings'),
};
ui.back.innerHTML = ICON.back;
document.querySelector('#btn-settings .i')!.innerHTML = ICON.settings;
document.querySelector('.fon-btn .i')!.innerHTML = ICON.speaker;
document.querySelector('#btn-pause .i')!.innerHTML = ICON.pause;
const listenBtn = $<HTMLButtonElement>('btn-listen');
/** Bouton « Écouter » du sous-titre : actif seulement si un enregistrement existe dans la langue choisie. */
const voiceBtn = $<HTMLButtonElement>('btn-voice');
voiceBtn.querySelector('.i')!.innerHTML = ICON.speaker;
voiceBtn.addEventListener('click', () => voice.replay());
function updateListen() {
  const l: Lang = lang ?? 'fr';
  listenBtn.disabled = voice.last.length === 0;
  listenBtn.classList.toggle('speaking', voice.speaking);
  voiceBtn.disabled = voice.last.length === 0; voiceBtn.classList.toggle('speaking', voice.speaking);
  voiceBtn.setAttribute('aria-label', voice.speaking ? 'Voix en cours — relancer depuis le début' : 'Réécouter la dernière intervention');
  $('listen-label').textContent = voice.speaking ? 'En cours…' : 'Réécouter';
  const cl = voice.currentLang;
  $('fon-note').textContent = l !== 'fon' ? '' : cl === 'fon' ? 'Voix fon' : cl === 'fr' ? MISSING_AUDIO.fon : (currentLine && !hasFon(lineVoiceId(currentLine)) ? 'Voix fon pas encore enregistrée' : '');
  ui.phone.classList.toggle('playing', voice.current === MSG_ID && voice.speaking);
}
voice.onChange = updateListen;
const MSG_ID = lineVoiceId(MSG_RESPONSABLE);
const phoneReplay = $<HTMLButtonElement>('phone-replay');
phoneReplay.querySelector('.i')!.innerHTML = ICON.speaker;
phoneReplay.addEventListener('click', () => voice.speak([MSG_ID], true));
/** Bouton « écouter » distinct du bouton qui valide : il ne fait que lire l'audio. */
function listenButton(id: string, label: string, cls: string) {
  return `<button type="button" class="${cls}" data-listen="${id}" aria-label="Écouter : ${label.replace(/"/g, '&quot;')}">${ICON.speaker}<span>Écouter</span></button>`;
}
function wireListen(root: HTMLElement) {
  root.querySelectorAll<HTMLButtonElement>('[data-listen]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); voice.speak([b.dataset.listen!], true); }));
}
listenBtn.addEventListener('click', () => voice.replay());
document.querySelector('.phone-head .phone-i')!.innerHTML = ICON.phone;

const PATH: StepId[] = ['01', '02', '03', '04A', '05', '06', '07', '08', '09', '10', '11'];
function renderProgress() {
  const cur = state.step === '04B' ? '04A' : state.step;
  const idx = cur === 'fin' ? PATH.length : PATH.indexOf(cur);
  ui.progress.innerHTML = PATH.map((_, i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}"></li>`).join('');
  ui.progress.setAttribute('aria-label', cur === 'fin' ? 'Parcours terminé' : `Étape ${idx + 1} sur ${PATH.length}`);
}

/** Affiche une réplique et fait parler la voix correspondante (puis `extra` : fiche, réponses…). */
function say(line: Line | null, rule = false, extra: string[] = []) {
  const same = line !== null && line === currentLine;
  currentLine = line;
  if (!line) { voice.stop(); ui.sub.hidden = true; updateListen(); return; }
  if (!same) voice.speak([lineVoiceId(line), ...extra]);
  updateListen();
  ui.sub.hidden = false;
  ui.sub.className = `subtitle ${line.who}${rule ? ' rule' : ''}`;
  ui.who.textContent = SPEAKER_LABEL[line.who];
  ui.text.textContent = line.text;
}

interface Act { label: string; kind?: 'primary' | 'secondary'; icon?: string; key?: string; run: () => void }
let primaryAction: (() => void) | null = null;
function setActions(acts: Act[], focus = true) {
  ui.actions.className = 'actions';
  ui.actions.innerHTML = '';
  primaryAction = null;
  acts.forEach((a) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${a.kind ?? 'primary'}`;
    b.innerHTML = `${a.icon ?? ''}<span>${a.label}</span>${a.key ? `<span class="k" aria-hidden="true">${a.key}</span>` : ''}`;
    b.addEventListener('click', () => a.run());
    ui.actions.appendChild(b);
    if ((a.kind ?? 'primary') === 'primary' && !primaryAction) primaryAction = a.run;
  });
  if (focus) focusPrimary();
}
function focusPrimary() {
  const b = ui.actions.querySelector<HTMLButtonElement>('.btn.primary, .choice') ?? ui.card.querySelector<HTMLButtonElement>('.opt:not(:disabled)');
  b?.focus({ preventScroll: true });
}

function showCard(html: string | null) {
  if (html === null) { ui.card.hidden = true; ui.card.innerHTML = ''; return; }
  ui.card.hidden = false; ui.card.innerHTML = html; ui.card.scrollTop = 0;
  ui.card.querySelectorAll<HTMLButtonElement>('[data-open-sources]').forEach((b) => b.addEventListener('click', openSources));
}

/** Enchaîne des répliques avec « Suivant », puis affiche les actions finales. */
function dialogue(lines: Line[], final: Act[], token: number, onLine?: (i: number) => void, extra?: (i: number) => string[]) {
  let i = 0;
  const show = () => {
    if (token !== stepToken) return;
    say(lines[i], false, extra?.(i) ?? []); onLine?.(i);
    if (i < lines.length - 1) setActions([{ label: 'Suivant', key: 'N', run: () => { i++; show(); } }]);
    else setActions(final);
  };
  show();
}

// Étiquettes projetées
const labelEls = new Map<string, HTMLElement>();
function clearLabels() { labelEls.forEach((e) => e.remove()); labelEls.clear(); }
const tmpV = new THREE.Vector3();
function updateLabels() {
  const want = shot.labels ? shot.labels(world, shotT, { reduced, branch: state.branch, portrait: camera.aspect < 0.8 }) : [];
  const seen = new Set<string>();
  for (const l of want) {
    seen.add(l.key);
    let el = labelEls.get(l.key);
    if (!el) { el = document.createElement('div'); ui.labels.appendChild(el); labelEls.set(l.key, el); }
    el.className = `lbl ${l.tone ?? 'info'}`;
    if (el.textContent !== l.text) el.textContent = l.text;
    tmpV.copy(l.at).project(camera);
    const vis = tmpV.z < 1;
    el.style.display = vis ? '' : 'none';
    // garde l'étiquette entièrement à l'écran
    const half = el.offsetWidth / 2 + 8;
    const x = Math.min(window.innerWidth - half, Math.max(half, (tmpV.x * 0.5 + 0.5) * window.innerWidth));
    const y = Math.min(window.innerHeight - 8, Math.max(el.offsetHeight + 70, (-tmpV.y * 0.5 + 0.5) * window.innerHeight));
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }
  labelEls.forEach((el, k) => { if (!seen.has(k)) { el.remove(); labelEls.delete(k); } });
}

// ─────────────────────────────────────────────────────────────
// Étapes
// ─────────────────────────────────────────────────────────────
function goTo(step: StepId, push = true) {
  if (push) state.history.push({ step: state.step, branch: state.branch });
  enter(step);
}
function goBack() {
  const prev = state.history.pop();
  if (!prev) return;
  state.branch = prev.branch;
  enter(prev.step);
}

function setClock(text: string, late = false) {
  ui.clock.hidden = !text; ui.clock.textContent = text;
  ui.clock.classList.toggle('late', late);
}

interface Save { step: StepId; branch: Branch | null; history: State['history'] }
function saveProgress() { store.set('save', JSON.stringify({ step: state.step, branch: state.branch, history: state.history } as Save)); }
function loadProgress(): Save | null {
  try { const v = JSON.parse(store.get('save') ?? 'null'); return v && STEPS[v.step as StepId] ? v : null; } catch { return null; }
}

function enter(step: StepId) {
  const token = ++stepToken;
  state.step = step;
  setMode(step === 'fin' ? 'fin' : 'jeu');
  if (step === '01' || step === '02' || step === '03') state.branch = null;
  const def = STEPS[step];
  ui.num.textContent = def.num; ui.title.textContent = def.title;
  document.title = `${def.num !== '—' ? def.num + ' · ' : ''}${def.title} — 8 h 00, le piège de la Marina`;
  setClock(def.clock);
  ui.back.disabled = state.history.length === 0;
  ui.phone.hidden = true; ui.flash.classList.remove('on');
  document.body.classList.toggle('quiz', ['09', '10', '11', 'fin'].includes(step));
  showCard(null); setActions([], false); say(null);
  renderProgress();
  saveProgress();

  switch (step) {
    case '01': {
      playShot('parked');
      ui.phone.hidden = false;
      ui.phone.querySelector('.phone-text')!.textContent = `« ${MSG_RESPONSABLE.text} »`;
      dialogue(LINES_01, [{ label: 'Ranger le téléphone et démarrer', key: 'N', run: () => goTo('02') }], token);
      break;
    }
    case '02': {
      playShot('approach', {
        cues: CUES_02,
        onEnd: () => setTimeout(() => { if (token === stepToken) goTo('03'); }, 700),
      });
      say(CUES_02[0].line);
      break;
    }
    case '03': {
      playShot('freeze');
      say(LINE_03, false, V_CHOICES);
      ui.actions.className = 'actions choices';
      ui.actions.innerHTML = `
        <div class="choice-wrap"><button type="button" class="choice wait" data-choice="A">${ICON.hand}<span>${CHOICE_WAIT}</span><span class="k" aria-hidden="true">1</span></button>${listenButton(V_CHOICES[0], CHOICE_WAIT, 'choice-listen')}</div>
        <div class="choice-wrap"><button type="button" class="choice go" data-choice="B">${ICON.go}<span>${CHOICE_GO}</span><span class="k" aria-hidden="true">2</span></button>${listenButton(V_CHOICES[1], CHOICE_GO, 'choice-listen')}</div>`;
      wireListen(ui.actions);
      ui.actions.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((b) =>
        b.addEventListener('click', () => choose(b.dataset.choice as Branch)));
      primaryAction = null;
      ui.actions.querySelector<HTMLButtonElement>('.choice')?.focus({ preventScroll: true });
      break;
    }
    case '04A': {
      state.branch = 'A';
      playShot('waitA', {
        cues: CUES_04A,
        onEnd: () => {
          setClock('8 h 04', true);
          dialogue(END_04A, [{ label: 'Continuer', key: 'N', run: () => goTo('05') }], token);
        },
      });
      say(CUES_04A[0].line);
      break;
    }
    case '04B': {
      state.branch = 'B';
      playShot('passB', {
        cues: CUES_04B,
        onEnd: () => {
          setClock('8 h 00', true);
          dialogue(END_04B, [{ label: 'Continuer', key: 'N', run: () => goTo('05') }], token);
        },
      });
      say(CUES_04B[0].line);
      break;
    }
    case '05': {
      const br: Branch = state.branch ?? 'A';
      setClock(br === 'B' ? '8 h 02' : '8 h 06', true);
      ui.title.textContent = `${def.title} · ${br === 'B' ? 'contrôle' : 'briefing prévention'}`;
      playShot('police');
      const startReplay = () => {
        if (token !== stepToken) return;
        setActions([], false);
        playShot('replay', {
          cues: CUES_REPLAY,
          onEnd: () => {
            if (token !== stepToken) return;
            say(CONCLUSION_05, true);
            setActions([
              { label: 'Continuer', key: 'N', run: () => goTo('06') },
              { label: 'Revoir le carrefour', kind: 'secondary', icon: ICON.replay, run: startReplay },
            ]);
          },
        });
        say(CUES_REPLAY[0].line);
      };
      dialogue([OPEN_05[br], BEFORE_REPLAY_05], [
        { label: 'Revoir le carrefour', key: 'N', icon: ICON.eye, run: startReplay },
      ], token);
      break;
    }
    case '06': {
      playShot('explain');
      showCard(`
        <div class="card-head"><div><span class="tag">Le policier explique · 1/3</span><h2>Le texte voté : permis et assurance moto</h2></div></div>
        <div class="pictos">${PICTO.permis}${PICTO.bouclierMoto}</div>
        <div class="card-body">
          <div class="status">
            <h3>Statut vérifié <span class="badge">au ${STATUS_06.date}</span></h3>
            <ul>${STATUS_06.facts.map((f) => `<li>${f}</li>`).join('')}</ul>
          </div>
          <p class="note">${STATUS_06.cnsr}</p>
          <p class="src"><button type="button" class="linkish" data-open-sources>Voir les sources consultées</button></p>
        </div>`);
      say(LINE_06, false, V_CARD_06);
      setActions([{ label: 'Suivant', key: 'N', run: () => goTo('07') }]);
      break;
    }
    case '07': {
      playShot('explain');
      const card = (withNote: boolean) => showCard(`
        <div class="card-head"><div><span class="tag">Le policier explique · 2/3</span><h2>L’assurance moto protège les autres</h2></div></div>
        <div class="pictos"><span class="wide">${PICTO.assurance}</span></div>
        <div class="card-body">
          <p><strong>Responsabilité civile :</strong> elle couvre notamment les dommages que tu causes à d’autres personnes.</p>
          ${withNote ? `<p class="note">${NOTE_07}</p>` : ''}
        </div>`);
      card(false);
      dialogue(LINES_07, [{ label: 'Suivant', key: 'N', run: () => goTo('08') }], token, (i) => card(i === 1),
        (i) => (i === 1 ? [...V_CARD_07.intro, ...V_CARD_07.note] : []));
      break;
    }
    case '08': {
      playShot('explain');
      const card = (withNote: boolean) => showCard(`
        <div class="card-head"><div><span class="tag">Le policier explique · 3/3</span><h2>La CNSS et l’accident de trajet</h2></div></div>
        <div class="pictos"><span class="wide">${PICTO.trajet}</span></div>
        <div class="card-body">
          <p><strong>Domicile → travail :</strong> la CNSS peut reconnaître certains accidents sur ce trajet, sous conditions.</p>
          ${withNote ? NOTE_08.map((n, k) => `<p class="note${k === 0 ? ' warn' : ''}">${n}</p>`).join('') : ''}
          <p class="src">Source : ${SOURCE_08} <button type="button" class="linkish" data-open-sources>Voir les sources</button></p>
        </div>`);
      card(false);
      dialogue(LINES_08, [{ label: 'Passer au quiz', key: 'N', run: () => goTo('09') }], token, (i) => card(i === 1),
        (i) => (i === 1 ? [...V_CARD_08.intro, ...V_CARD_08.note] : []));
      break;
    }
    case '09': case '10': case '11': {
      playShot('quiz');
      renderQuiz(QUIZ.findIndex((q) => q.step === step));
      break;
    }
    case 'fin': {
      playShot('quiz');
      const other: Branch = state.branch === 'B' ? 'A' : 'B';
      showCard(`
        <div class="card-head"><div><span class="tag">Fin du parcours</span><h2>À retenir</h2></div></div>
        <div class="card-body">
          <ol class="recap">
            <li><span><strong>Où s’arrêter :</strong> au rouge, avant la ligne d’arrêt, même si la voie semble libre.</span></li>
            <li><span><strong>Pourquoi Joseph ne voyait pas la voiture :</strong> le minibus arrêté à l’angle cachait la rue de droite.</span></li>
            <li><span><strong>Assurance moto ≠ CNSS :</strong> la responsabilité civile couvre les dommages causés aux autres ; la CNSS peut reconnaître certains accidents de trajet, selon la situation et les conditions.</span></li>
          </ol>
        </div>`);
      setActions([
        { label: `Découvrir l’autre choix (${other === 'A' ? CHOICE_WAIT.toLowerCase() : CHOICE_GO.toLowerCase()})`, icon: ICON.next, run: () => tryOther(other) },
        { label: 'Rejouer', kind: 'secondary', icon: ICON.replay, run: restart },
        { label: 'Retour au menu principal', kind: 'secondary', icon: ICON.home, run: showMenu },
        { label: 'Sources', kind: 'secondary', icon: ICON.book, run: openSources },
      ]);
      voice.speak(V_FIN); updateListen();
      break;
    }
  }
}

function choose(b: Branch) {
  state.history.push({ step: '03', branch: null });
  state.branch = b;
  enter(b === 'A' ? '04A' : '04B');
}
function restart() {
  state.history = []; state.branch = null; enter('01');
}
function tryOther(b: Branch) {
  state.history = [{ step: '01', branch: null }, { step: '02', branch: null }, { step: '03', branch: null }];
  state.branch = b;
  enter(b === 'A' ? '04A' : '04B');
}

// Quiz : une question à la fois, aucune réponse présélectionnée.
function renderQuiz(qi: number) {
  const q = QUIZ[qi];
  const pict = q.pict === 'feu' ? PICTO.feu : q.pict === 'moto' ? PICTO.moto : PICTO.trajet;
  showCard(`
    <div class="card-head"><div><span class="tag">Question ${qi + 1} sur ${QUIZ.length}</span></div></div>
    <div class="pictos"><span class="${q.pict === 'trajet' ? 'wide' : ''}">${pict}</span></div>
    <div class="card-body">
      <p class="quiz-q" id="quiz-q">${q.question}</p>
      <div class="opts" role="group" aria-labelledby="quiz-q">
        ${q.options.map((o, i) => `<div class="opt-row"><button type="button" class="opt" data-i="${i}" aria-pressed="false"><span class="mark" aria-hidden="true"></span><span>${o}</span><span class="k" aria-hidden="true">${i + 1}</span></button>${listenButton(V_QUIZ[qi].options[i], o, 'opt-listen')}</div>`).join('')}
      </div>
      <div class="fb" aria-live="assertive"></div>
    </div>`);
  const token = stepToken;
  wireListen(ui.card);
  const opts = Array.from(ui.card.querySelectorAll<HTMLButtonElement>('.opt'));
  const answer = (i: number) => {
    if (token !== stepToken || opts[0].disabled) return;
    const ok = i === q.correct;
    opts.forEach((b, k) => {
      b.disabled = true;
      if (k === i) { b.setAttribute('aria-pressed', 'true'); b.classList.add(ok ? 'right' : 'wrong'); b.querySelector('.mark')!.innerHTML = ok ? ICON.check : ICON.cross; }
    });
    ui.card.querySelector('.fb')!.innerHTML = `
      <div class="feedback ${ok ? 'right' : 'wrong'}">${ok ? ICON.check : ICON.cross}
        <div><strong>${ok ? 'Bonne réponse' : 'Pas tout à fait'}</strong>${ok ? q.ok : q.ko}
        ${!ok ? `<br><em>Réponse attendue : « ${q.options[q.correct]} ».</em>` : ''}</div>
      </div>`;
    const next: StepId = nextStep(q.step, state.branch);
    const acts: Act[] = ok
      ? [{ label: qi === QUIZ.length - 1 ? 'Terminer' : 'Question suivante', key: 'N', run: () => goTo(next) }]
      : [{ label: 'Réessayer', key: 'N', icon: ICON.replay, run: () => renderQuiz(qi) },
         { label: qi === QUIZ.length - 1 ? 'Terminer' : 'Question suivante', kind: 'secondary', run: () => goTo(next) }];
    setActions(acts);
    voice.speak([ok ? V_QUIZ[qi].ok : V_QUIZ[qi].ko]); updateListen();
    ui.card.scrollTop = ui.card.scrollHeight;
  };
  opts.forEach((b, i) => b.addEventListener('click', () => answer(i)));
  quizAnswer = answer;
  setActions([], false);
  voice.speak([V_QUIZ[qi].question, ...V_QUIZ[qi].options]); updateListen();
  opts[0].focus({ preventScroll: true });
}
let quizAnswer: ((i: number) => void) | null = null;

// ─────────────────────────────────────────────────────────────
// Fenêtres
// ─────────────────────────────────────────────────────────────
$('sources-body').innerHTML = `
  <div class="status-box">
    <strong>Statut du texte voté, vérifié le ${STATUS_06.date}</strong>
    <ul>${STATUS_06.facts.map((f) => `<li>${f}</li>`).join('')}</ul>
  </div>
  <h3>Sources consultées</h3>
  <ol>${SOURCES.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label}</a><br><span class="help">${s.note}</span></li>`).join('')}</ol>
  <h3>Crédits</h3>
  <ul>${CREDITS.map((c) => `<li>${c}</li>`).join('')}</ul>
  <p class="help">Carrefour, personnages et situations fictifs. Inspiration d’ambiance : la rue à hauteur d’yeux de Cotonou. Ce jeu informe ; il ne remplace ni un avis juridique ni l’avis de la CNSS sur une situation personnelle.</p>`;

function openSources() { ui.dlgSources.showModal(); }
const dlgPause = $<HTMLDialogElement>('dlg-pause'), dlgConfirm = $<HTMLDialogElement>('dlg-confirm');
function openSettings() { ui.dlgSettings.showModal(); }
$('btn-settings').addEventListener('click', openSettings);
document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((b) => b.addEventListener('click', () => (b.closest('dialog') as HTMLDialogElement).close()));
[ui.dlgSources, ui.dlgSettings, dlgPause, dlgConfirm].forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));
ui.back.addEventListener('click', goBack);
/** Le temps du récit s'arrête dès qu'une fenêtre est ouverte pendant la partie. */
const anyDialogOpen = () => ui.dlgSources.open || ui.dlgSettings.open || dlgPause.open || dlgConfirm.open;

// ── Langue ───────────────────────────────────────────────────
const langMsg = $('lang-msg'), langGroup = $('lang-group');
function setLang(l: Lang) {
  lang = l; store.set('lang', l); voice.lang = l;
  document.documentElement.lang = LANG_CODE[l];
  document.querySelectorAll<HTMLButtonElement>('.lang-pick').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.lang === l)));
  document.querySelectorAll<HTMLElement>('.lang-card').forEach((c) => c.classList.toggle('on', c.dataset.lang === l));
  document.querySelectorAll<HTMLButtonElement>('[data-set-lang]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.setLang === l)));
  langGroup.classList.remove('attention');
  langMsg.textContent = l === 'fon'
    ? `Fon choisi. ${FON_COUNT} passages sont dits en fon ; les autres restent en français en attendant leur enregistrement. Les textes affichés restent en français.`
    : 'Français choisi.';
  updateListen();
}
document.querySelectorAll<HTMLButtonElement>('.lang-pick, [data-set-lang]').forEach((b) =>
  b.addEventListener('click', () => setLang((b.dataset.lang ?? b.dataset.setLang) as Lang)));
// Flèches gauche/droite dans le groupe de langues (radiogroupe)
langGroup.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  e.preventDefault();
  const next: Lang = (lang ?? 'fr') === 'fr' ? 'fon' : 'fr'; setLang(next);
  document.querySelector<HTMLButtonElement>(`.lang-pick[data-lang="${next}"]`)?.focus();
});
// Exemples audio : actifs seulement si l'enregistrement existe
document.querySelectorAll<HTMLButtonElement>('.lang-listen').forEach((b) => {
  const l = b.dataset.lang as Lang;
  b.querySelector('.i')!.innerHTML = ICON.speaker;
  if (l === 'fon') {
    const ok = hasFon('menu-accueil');
    b.disabled = !ok;
    b.querySelector('.lang-listen-t')!.textContent = ok ? 'Écouter l’accueil' : 'Accueil fon à enregistrer';
    b.setAttribute('aria-label', ok ? 'Écouter l’accueil en fon' : 'Accueil fon à enregistrer');
    b.addEventListener('click', () => { const prev = voice.lang; voice.lang = 'fon'; voice.speak(['menu-accueil', hasFon('menu-securite') ? 'menu-securite' : null], true); voice.lang = prev; });
  } else {
    b.querySelector('.lang-listen-t')!.textContent = 'Écouter un exemple'; b.setAttribute('aria-label', 'Écouter un exemple de voix en français');
    b.addEventListener('click', () => { const prev = voice.lang; voice.lang = 'fr'; voice.speak([V_EXAMPLE], true); voice.lang = prev; });
  }
});

// ── Menu principal ───────────────────────────────────────────
const menuEl = $('menu');
const mStart = $<HTMLButtonElement>('m-start'), mContinue = $<HTMLButtonElement>('m-continue');
[['m-start', ICON.play], ['m-continue', ICON.play], ['m-howto', ICON.help], ['m-settings', ICON.settings], ['m-sources', ICON.book],
 ['p-resume', ICON.play], ['p-restart', ICON.replay], ['p-settings', ICON.settings], ['p-sources', ICON.book], ['p-menu', ICON.home],
 ['tuto-prev', ICON.prev], ['tuto-next', ICON.next], ['tuto-listen', ICON.speaker], ['opt-replay', ICON.ear]].forEach(([id, ic]) => {
  const el = document.querySelector(`#${id} .i`); if (el) el.innerHTML = ic;
});
function showMenu() {
  stepToken++; voice.stop();
  if (dlgPause.open) dlgPause.close();
  setMode('menu'); menuEl.hidden = false;
  showCard(null); setActions([], false); say(null); ui.phone.hidden = true; ui.flash.classList.remove('on');
  document.title = '8 h 00 — Le piège de la Marina';
  playShot('menu');
  const save = loadProgress();
  const resumable = !!save && !(save.step === '01' && save.history.length === 0);
  mContinue.hidden = !resumable;
  mStart.classList.toggle('primary', !resumable); mStart.classList.toggle('secondary', resumable);
  if (save && resumable) $('m-continue-sub').textContent = save.step === 'fin' ? 'Fin du parcours' : `Étape ${STEPS[save.step].num} · ${STEPS[save.step].title}`;
  (resumable ? mContinue : lang ? mStart : document.querySelector<HTMLButtonElement>('.lang-pick'))?.focus({ preventScroll: true });
}
function needLang(): boolean {
  if (lang) return false;
  langGroup.classList.remove('attention'); void langGroup.offsetWidth; langGroup.classList.add('attention');
  langMsg.textContent = 'Choisis d’abord ta langue : Français ou Fon.';
  document.querySelector<HTMLButtonElement>('.lang-pick')?.focus();
  return true;
}
function beginNewGame() {
  store.set('save', null);
  state.history = []; state.branch = null;
  const go = () => { menuEl.hidden = true; enter('01'); };
  if (!tutoSeen) openTuto(go); else go();
}
mStart.addEventListener('click', () => {
  if (needLang()) return;
  const save = loadProgress();
  if (save && !mContinue.hidden) {
    $('confirm-text').textContent = `Ta partie en cours (${save.step === 'fin' ? 'fin du parcours' : 'étape ' + STEPS[save.step].num}) sera remplacée par une nouvelle partie.`;
    dlgConfirm.showModal(); $('c-no').focus();
  } else beginNewGame();
});
$('c-yes').addEventListener('click', () => { dlgConfirm.close(); beginNewGame(); });
$('c-no').addEventListener('click', () => dlgConfirm.close());
mContinue.addEventListener('click', () => {
  if (needLang()) return;
  const save = loadProgress(); if (!save) return;
  state.history = save.history; state.branch = save.branch;
  menuEl.hidden = true; enter(save.step);
});
$('m-howto').addEventListener('click', () => openTuto(() => mStart.focus()));
$('m-settings').addEventListener('click', openSettings);
$('m-sources').addEventListener('click', openSources);

// ── Tutoriel (3 actions illustrées) ──────────────────────────
const TUTO = [TUTO_ART.ecouter, TUTO_ART.choisir, TUTO_ART.continuer].map((art, i) => ({ art, ...TUTO_TEXT[i], voiceId: V_TUTO[i] }));
const tutoEl = $('tuto');
let tutoIdx = 0, tutoDone: (() => void) | null = null, tutoPrevMode: Mode = 'menu';
function renderTuto() {
  const s = TUTO[tutoIdx]; const l: Lang = lang ?? 'fr';
  $('tuto-art').innerHTML = s.art; $('tuto-h').textContent = s.h; $('tuto-p').textContent = s.p;
  $('tuto-count').textContent = `${tutoIdx + 1} / ${TUTO.length}`;
  document.querySelectorAll('#tuto-dots li').forEach((d, i) => d.classList.toggle('on', i === tutoIdx));
  $('tuto-listen-t').textContent = l === 'fon' ? 'Réécouter (voix française)' : 'Réécouter';
  voice.speak([s.voiceId]);
  $<HTMLButtonElement>('tuto-prev').disabled = tutoIdx === 0;
  $('tuto-next-t').textContent = tutoIdx === TUTO.length - 1 ? 'C’est parti' : 'Suivant';
}
function openTuto(then: () => void) {
  tutoPrevMode = mode; tutoDone = then; tutoIdx = 0;
  setMode('tuto'); tutoEl.hidden = false; renderTuto();
  $<HTMLButtonElement>('tuto-next').focus();
}
function closeTuto() {
  tutoSeen = true; store.set('tutoSeen', '1'); voice.stop();
  tutoEl.hidden = true; setMode(tutoPrevMode);
  const cb = tutoDone; tutoDone = null; cb?.();
}
$('tuto-next').addEventListener('click', () => { if (tutoIdx < TUTO.length - 1) { tutoIdx++; renderTuto(); } else closeTuto(); });
$('tuto-prev').addEventListener('click', () => { if (tutoIdx > 0) { tutoIdx--; renderTuto(); $<HTMLButtonElement>('tuto-next').focus(); } });
$('tuto-skip').addEventListener('click', closeTuto);
$('tuto-listen').addEventListener('click', () => voice.speak([TUTO[tutoIdx].voiceId], true));

// ── Pause ────────────────────────────────────────────────────
function openPause() {
  if (mode !== 'jeu' && mode !== 'fin') return;
  const d = STEPS[state.step];
  $('pause-where').textContent = state.step === 'fin' ? 'Fin du parcours' : `Étape ${d.num} · ${d.title}`;
  pausedFrom = mode; setMode('pause'); voice.pause();
  dlgPause.showModal(); $('p-resume').focus();
}
let pausedFrom: Mode = 'jeu';
dlgPause.addEventListener('close', () => { if (mode === 'pause') { setMode(pausedFrom); voice.resume(); } });
$('btn-pause').addEventListener('click', openPause);
$('p-resume').addEventListener('click', () => dlgPause.close());
$('p-restart').addEventListener('click', () => { dlgPause.close(); enter(state.step); });
$('p-settings').addEventListener('click', () => { dlgPause.close(); openSettings(); });
$('p-sources').addEventListener('click', () => { dlgPause.close(); openSources(); });
$('p-menu').addEventListener('click', () => showMenu());

// ── Paramètres ───────────────────────────────────────────────
const optVol = $<HTMLInputElement>('opt-volume'), optSubs = $<HTMLInputElement>('opt-subs'), optVoices = $<HTMLInputElement>('opt-voices');
optVoices.checked = voice.enabled;
const optFb = $<HTMLInputElement>('opt-frfallback');
voice.frFallback = store.get('frfallback') !== '0'; optFb.checked = voice.frFallback;
optFb.addEventListener('change', () => { voice.frFallback = optFb.checked; store.set('frfallback', optFb.checked ? '1' : '0'); });
optVoices.addEventListener('change', () => { voice.setEnabled(optVoices.checked); store.set('voices', optVoices.checked ? '1' : '0'); updateListen(); });
optVol.value = String(Math.round(voice.volume * 100)); $('vol-out').textContent = optVol.value + ' %';
optVol.addEventListener('input', () => { voice.setVolume(Number(optVol.value) / 100); $('vol-out').textContent = optVol.value + ' %'; store.set('volume', optVol.value); });
function setSubs(v: boolean) { subs = v; optSubs.checked = v; document.body.classList.toggle('no-subs', !v); store.set('subs', v ? '1' : '0'); }
optSubs.addEventListener('change', () => setSubs(optSubs.checked));
setSubs(subs);
$('opt-replay').addEventListener('click', () => {
  const msg = $('replay-msg');
  if (mode === 'menu' || mode === 'tuto') { ui.dlgSettings.close(); openTuto(() => mStart.focus()); return; }
  if (voice.replay()) { msg.textContent = 'Lecture de la dernière consigne en cours.'; return; }
  msg.textContent = 'Aucune consigne à réécouter pour l’instant : elle reste affichée en sous-titre.';
  if (!subs) setSubs(true);
  ui.sub.classList.remove('flash-sub'); void ui.sub.offsetWidth; ui.sub.classList.add('flash-sub');
});
ui.dlgSettings.addEventListener('close', () => { $('replay-msg').textContent = ''; });

// ─────────────────────────────────────────────────────────────
// Clavier
// ─────────────────────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
  if (anyDialogOpen()) return;
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const k = e.key;
  if (mode === 'tuto') {
    if (k === 'Escape') closeTuto();
    else if (k === 'ArrowRight') $('tuto-next').click();
    else if (k === 'ArrowLeft') $('tuto-prev').click();
    return;
  }
  if (mode === 'menu') return;
  if (k === 'Escape') { e.preventDefault(); openPause(); return; }
  if (k === 'r' || k === 'R') { voice.replay(); return; }
  if (k === 'Backspace') { e.preventDefault(); goBack(); return; }
  if (k === 'm' || k === 'M') { setReduced(!reduced); return; }
  if (k === '1' || k === '2') {
    const i = Number(k) - 1;
    if (state.step === '03') { choose(i === 0 ? 'A' : 'B'); return; }
    if (['09', '10', '11'].includes(state.step) && quizAnswer) { quizAnswer(i); return; }
  }
  if ((k === 'n' || k === 'N') && primaryAction) { primaryAction(); }
});

// ─────────────────────────────────────────────────────────────
// Boucle
// ─────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
/**
 * Synchronisation voix ↔ image : pendant une séquence rythmée par des répliques,
 * si la voix en cours n'a pas fini quand la réplique suivante (ou la fin du plan)
 * approche, le temps du plan ralentit — jusqu'à attendre — pour que deux voix ne
 * se chevauchent jamais et qu'aucune phrase ne soit coupée.
 */
function voicePace(): number {
  if (!cues.length || !voice.speaking) return 1;
  let k = cueIdx; // la réplique déjà affichée (lancée à l'entrée de l'étape) ne compte pas comme « suivante »
  while (k < cues.length && cues[k].line === currentLine) k++;
  const target = k < cues.length ? cues[k].t : shot.duration;
  const left = voice.remaining();
  const room = target - shotT;
  if (left <= 0.05) return 1;
  if (room <= 0.001) return 0;
  return Math.min(1, room / left);
}
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const holdTime = frozen || mode === 'pause' || ((mode === 'jeu' || mode === 'fin') && anyDialogOpen());
  if (holdTime) { /* pause : le récit n’avance pas */ } else if (!shotEnded) {
    shotT += dt * voicePace();
    const done = shotT >= shot.duration;
    if (done) shotT = shot.duration;
    // les répliques d'abord, puis la fin du plan (qui peut afficher la conclusion)
    while (cueIdx < cues.length && shotT >= cues[cueIdx].t) { say(cues[cueIdx].line); cueIdx++; }
    if (done) { shotEnded = true; const cb = onShotEnd; onShotEnd = null; cb?.(); }
  } else if (shot.duration === Infinity) shotT += dt;

  // signal d'alerte au moment du quasi-accident (04B)
  ui.flash.classList.toggle('on', shotId === 'passB' && shotT > 1.4 && shotT < 2.9);

  const portrait = camera.aspect < 0.8;
  const pose = shot.pose(world, shotT, { reduced, branch: mode === 'menu' ? null : state.branch, portrait });
  camPos.copy(pose.pos); camLook.copy(pose.look);
  camera.up.copy(pose.up ?? UP);
  const fov = pose.fov ?? baseFov;
  if (camera.fov !== fov && !camOverride) { camera.fov = fov; camera.updateProjectionMatrix(); }
  if (portrait && (shotId === 'explain' || shotId === 'police')) {
    // en portrait, la carte occupe le haut : on cadre le policier plus bas dans l'image
    camPos.set(3.0, 2.5, -27.0); camLook.set(7.6, 2.0, -35.0);
  }
  if (pose.wide && camera.aspect < 1) {
    // en portrait, on recule les plans larges pour garder le carrefour lisible
    camPos.sub(camLook).multiplyScalar(1 + (1 - camera.aspect) * 0.9).add(camLook);
  }
  if (camOverride) { camPos.copy(camOverride.pos); camLook.copy(camOverride.look); camera.up.copy(UP); if (camOverride.fov) { camera.fov = camOverride.fov; camera.updateProjectionMatrix(); } }
  camera.position.copy(camPos); camera.lookAt(camLook);
  renderer.render(world.scene, camera);
  updateLabels();
  requestAnimationFrame(frame);
}

// Accès de test (lecture seule + avance rapide déterministe)
(window as unknown as { __marina: unknown }).__marina = {
  get step() { return state.step; }, get branch() { return state.branch; }, get mode() { return mode; },
  get t() { return shotT; }, get calls() { return renderer.info.render.calls; }, get tris() { return renderer.info.render.triangles; }, get shot() { return shotId; }, get reduced() { return reduced; },
  skip() { voice.stop(); if (Number.isFinite(shot.duration)) shotT = shot.duration - 0.01; },
  get audio() { return { ...voice.state, enabled: voice.enabled, last: voice.last, log: voice.log, hist: voice.hist }; },
  seek(t: number) { frozen = true; shotT = t; },
  /** Caméra libre, en coordonnées relatives à la moto de Joseph (null pour revenir au plan du jeu). */
  freeCam(p: number[] | null, l?: number[], fov?: number) {
    if (!p) { camOverride = null; resize(); return; }
    const m = world.joseph.root; m.updateMatrixWorld(true);
    camOverride = { pos: m.localToWorld(new THREE.Vector3(...p)), look: m.localToWorld(new THREE.Vector3(...(l ?? [0, 1, 0]))), fov };
  },
  /** Contrôles de posture de Joseph sur la moto (repère local de la moto, en mètres). */
  josephCheck() {
    const rig = world.josephRig; const F = { barY: 1.0, barZ: -0.6, gripX: 0.335, gripR: 0.021, seat: 0.79 };
    const gripDist = (h: THREE.Vector3, side: number) => {
      const along = Math.abs(h.x - side * F.gripX);
      const radial = Math.hypot(h.y - F.barY, h.z - F.barZ);
      return { horsPoignee: +Math.max(0, along - 0.06).toFixed(3), distanceAxe: +radial.toFixed(3), contact: along <= 0.06 && radial <= F.gripR + 0.05 };
    };
    const motoBoxes: Record<string, THREE.Box3> = {
      cadre: new THREE.Box3(new THREE.Vector3(-0.11, 0.42, -0.5), new THREE.Vector3(0.11, 0.68, 0.5)),
      reservoir: new THREE.Box3(new THREE.Vector3(-0.15, 0.62, -0.43), new THREE.Vector3(0.15, 0.82, -0.01)),
      roueAvant: new THREE.Box3(new THREE.Vector3(-0.08, 0, -0.97), new THREE.Vector3(0.08, 0.65, -0.27)),
      roueArriere: new THREE.Box3(new THREE.Vector3(-0.08, 0, 0.27), new THREE.Vector3(0.08, 0.65, 0.97)),
    };
    const shoes = rig.shoeBoxes();
    const inv = rig.root.matrixWorld.clone().invert();
    const knees = ['G', 'D'].map((s) => new THREE.Box3().setFromCenterAndSize(rig.parts['genou' + s].getWorldPosition(new THREE.Vector3()).applyMatrix4(inv), new THREE.Vector3(0.12, 0.12, 0.12)));
    const hits: string[] = [];
    [...shoes.map((b, i) => ['chaussure ' + (i ? 'D' : 'G'), b] as const), ...knees.map((b, i) => ['genou ' + (i ? 'D' : 'G'), b] as const)].forEach(([n, b]) => {
      for (const [k, mb] of Object.entries(motoBoxes)) if (b.intersectsBox(mb)) hits.push(n + ' × ' + k);
    });
    const pegTop = 0.36 + 0.016;
    return {
      mainGauche: gripDist(rig.contacts.handL, -1), mainDroite: gripDist(rig.contacts.handR, 1),
      bassin: { basDuBassin: +rig.contacts.pelvisBottom.toFixed(3), dessusSelle: F.seat, ecart: +(rig.contacts.pelvisBottom - F.seat).toFixed(3) },
      pieds: shoes.map((b, i) => ({ cote: i ? 'D' : 'G', semelle: +b.min.y.toFixed(3), dessusReposePied: pegTop, ecart: +(b.min.y - pegTop).toFixed(3) })),
      intersections: hits,
    };
  },
  /** Projection écran (px) d'un point du monde, avec la caméra courante. */
  project(x: number, y: number, z: number) {
    const v = new THREE.Vector3(x, y, z).project(camera);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight, inFront: v.z < 1 };
  },
  /** Part de la voiture visible depuis la caméra (lancers de rayons vers 18 points de sa carrosserie). */
  carVisibility() {
    const car = world.car; car.updateMatrixWorld(true);
    const carMeshes = new Set<THREE.Object3D>(); car.traverse((o) => carMeshes.add(o));
    const targets = world.scene.children.filter((o) => o !== car && o.visible);
    const ray = new THREE.Raycaster();
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    let seen = 0, n = 0;
    for (const dx of [-2, 0, 2]) for (const y of [0.6, 1.4]) for (const dz of [-0.9, 0, 0.9]) {
      const p = car.localToWorld(new THREE.Vector3(dx, y, dz)); n++;
      if (!frustum.containsPoint(p)) continue;
      const dir = p.clone().sub(camera.position); const dist = dir.length(); dir.normalize();
      ray.set(camera.position, dir); ray.far = dist - 0.3;
      const hit = ray.intersectObjects(targets, true).find((h) => h.object.visible && !(h.object as unknown as { isLine?: boolean }).isLine);
      if (!hit) seen++;
    }
    return seen / n;
  },
  resume() { frozen = false; },
  probe(id: ShotId, t: number, branch: Branch) {
    SHOTS[id].pose(world, t, { reduced: false, branch, portrait: false });
    const r = (v: THREE.Vector3) => [+v.x.toFixed(4), +v.z.toFixed(4)];
    return { joseph: r(world.joseph.root.position), car: r(world.car.position), main: world.lightMain.state };
  },
};

// Démarrage : toujours sur le menu principal, jamais directement dans le récit.
if (lang) setLang(lang); else { langMsg.textContent = ''; document.querySelectorAll('[data-set-lang]').forEach((b) => b.setAttribute('aria-checked', 'false')); }
showMenu();
requestAnimationFrame(frame);

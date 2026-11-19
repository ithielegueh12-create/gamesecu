import * as THREE from 'three';
import { World, JOSEPH_X, DECISION_Z, STOP_Z, CAR_LANE_Z, CAR_DECISION_X, MINIBUS, Moto } from './world';
import type { Branch } from './story';

// ─────────────────────────────────────────────────────────────
// Plans de caméra et poses : fonctions PURES du temps t.
// Une même séquence produit toujours exactement la même image
// pour un même t — les deux branches sont comparables à l'identique.
//
// Un seul carrefour, trois angles :
//   1. derrière Joseph (chase)        — feu rouge + ligne d'arrêt + minibus
//   2. depuis la rue transversale     — d'où arrive la voiture (04A et 04B)
//   3. en hauteur (replay)            — minibus, voiture et ligne ensemble
// ─────────────────────────────────────────────────────────────

export type ShotId = 'menu' | 'parked' | 'approach' | 'freeze' | 'waitA' | 'passB' | 'police' | 'explain' | 'replay' | 'quiz';

export interface CamPose { pos: THREE.Vector3; look: THREE.Vector3; wide?: boolean; up?: THREE.Vector3; fov?: number }
export interface ShotCtx { reduced: boolean; branch: Branch | null; portrait: boolean }
export interface LabelOut { key: string; text: string; at: THREE.Vector3; tone?: 'stop' | 'warn' | 'info' | 'ok' }

export interface Shot {
  duration: number;            // Infinity = plan fixe en boucle
  pose(w: World, t: number, c: ShotCtx): CamPose;
  labels?(w: World, t: number, c: ShotCtx): LabelOut[];
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

const PARK = { x: 5.4, z: 64 };
const CONTROL = { x: 5.5, z: -33.5 };
const POLICE = { x: 8.5, z: -35.3 };
const HIDDEN = 400;
const CAR_SPEED = 13;           // m/s, vitesse réelle de la voiture
const OTHER_X = 4.0;            // la moto qui passe au rouge (voie de droite, le long du minibus)

/** Voiture : x en fonction du temps relatif à l'instant du choix (tc = 0). Identique dans les deux branches. */
export const carXAt = (tc: number) => CAR_DECISION_X - CAR_SPEED * tc;

function placeMoto(m: Moto, x: number, z: number, yaw = 0) {
  m.root.position.set(x, 0, z);
  m.root.rotation.y = yaw;
  const roll = z / 0.3; // rotation des roues liée à la distance parcourue
  m.wheels.forEach((wh) => { wh.rotation.x = roll; });
}
function placeCar(w: World, x: number) { w.car.position.set(x, 0, CAR_LANE_Z); }

// ── Circulation d'arrière-plan (sens opposé, au-delà du carrefour) ──
const QUEUE_SLOTS = [[-2.6, -12.7], [-5.5, -12.9], [-2.6, -15.5], [-5.5, -15.8]];
const TRAFFIC = [ // x, place dans la file, décalage de départ, voiture ?
  { x: -5.5, slot: -21.0, start: 70, car: true },
  { x: -2.6, slot: -18.3, start: 95, car: false },
  { x: -2.6, slot: -22.6, start: 125, car: true },
  { x: -5.5, slot: -25.2, start: 150, car: false },
];
/**
 * Les zémidjans d'en face attendent leur feu ; d'autres véhicules arrivent et se rangent dans la file.
 * `release` : instant où leur feu passe au vert (seulement dans 04A), sinon null.
 */
function ambient(w: World, t: number, release: number | null) {
  const go = (k: number) => {
    if (release === null) return 0;
    const tau = t - release - 0.45 * k;
    if (tau <= 0) return 0;
    const tv = 9 / 3; return tau < tv ? 1.5 * tau * tau : 1.5 * tv * tv + 9 * (tau - tv);
  };
  w.queue.forEach((m, i) => {
    const [x, z] = QUEUE_SLOTS[i];
    placeMoto(m, x, z + go(i >> 1), Math.PI);
  });
  w.traffic.forEach((o, k) => {
    const d = TRAFFIC[k];
    const v = 10;
    const free = d.slot - d.start + v * t;
    const z = Math.min(d.slot, free) + go(2 + k);
    o.position.set(d.x, 0, z);
    o.rotation.y = d.car ? Math.PI / 2 : Math.PI;
  });
}

/** État commun réinitialisé au début de chaque pose. */
function base(w: World, c: ShotCtx) {
  w.replay.visible = false;
  w.josephRig.setPose({});
  placeMoto(w.other, OTHER_X, -HIDDEN);
  placeCar(w, HIDDEN);
  w.lightMain.set('red'); w.lightFar.set('red'); w.lightCross.set('green');
  w.briefing.visible = c.branch === 'A';
  w.police.root.position.set(POLICE.x, 0.18, POLICE.z);
  w.police.root.rotation.y = Math.atan2(POLICE.x - CONTROL.x, POLICE.z - CONTROL.z);
  w.police.armR.rotation.set(0, 0, 0.08);
  w.police.armL.rotation.set(0, 0, -0.08);
  w.police.head.rotation.set(0, 0, 0);
  placeMoto(w.policeMoto, 5.9, -41.5);
}

/** Angle 1 — derrière Joseph, à hauteur de rue : épaules, moto, chaussée, feu sur la potence. */
function chase(jx: number, jz: number, lookX = 0, reduced = false, t = 0, portrait = false): CamPose {
  const bob = reduced ? 0 : Math.sin(t * 7.3) * 0.012;
  // en portrait, le regard plonge davantage pour garder la ligne d'arrêt au-dessus des commandes
  return { pos: V(jx + 0.2, 2.45 + bob, jz + 4.3), look: V(jx + 0.5 + lookX, portrait ? -0.3 : 0.95, jz - 10) };
}

/**
 * Angle 2 — depuis la rue transversale, du côté d'où vient la voiture : la caméra est
 * dans son dos ; à gauche, l'angle de l'immeuble et le minibus, et Joseph juste derrière eux.
 */
function crossStreet(c: ShotCtx): CamPose {
  return c.portrait
    ? { pos: V(36, 4.8, -6.4), look: V(12, 0.6, 1.4) }
    : { pos: V(27, 4.0, -6.4), look: V(3, 0.6, 8.5) };
}
/** Plan moyen sur l'agent pendant son geste (réf. 07), depuis le trottoir. */
const POLICE_GESTURE: CamPose = { pos: V(9.6, 1.8, -25.5), look: V(7.4, 1.4, -35.5) };

function josephZApproach(t: number) {
  const u = clamp01((t - 1.0) / 7.4);
  return lerp(PARK.z, DECISION_Z, easeInOut(u));
}

// position de Joseph dans la branche B (accélère, freine de justesse, puis se range)
function josephB(t: number): { x: number; z: number } {
  if (t <= 0.9) return { x: JOSEPH_X, z: DECISION_Z - (4 * t + 2 * t * t) };
  const z09 = DECISION_Z - (3.6 + 1.62);
  const a = 4.39, v = 7.6, tStop = v / a; // ≈ 1,73 s de freinage
  if (t <= 0.9 + tStop) { const tau = t - 0.9; return { x: JOSEPH_X, z: z09 - (v * tau - 0.5 * a * tau * tau) }; }
  const zStop = z09 - (v * tStop - 0.5 * a * tStop * tStop);
  const u = clamp01((t - 3.4) / 5.2);
  return { x: lerp(JOSEPH_X, CONTROL.x, smooth(0.55, 1, u)), z: lerp(zStop, CONTROL.z, easeInOut(u)) };
}
export const B_STOP_Z = josephB(2.7).z;

/** La ligne entre l'œil de Joseph et la voiture traverse-t-elle le minibus ? */
export function hiddenByMinibus(eyeX: number, eyeZ: number, carX: number, carZ: number) {
  const x0 = MINIBUS.x - MINIBUS.w / 2, x1 = MINIBUS.x + MINIBUS.w / 2;
  const z0 = MINIBUS.zFront, z1 = MINIBUS.zFront + MINIBUS.len;
  let t0 = 0, t1 = 1;
  const dx = carX - eyeX, dz = carZ - eyeZ;
  const clip = (p: number, q: number) => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  return clip(-dx, eyeX - x0) && clip(dx, x1 - eyeX) && clip(-dz, eyeZ - z0) && clip(dz, z1 - eyeZ) && t0 <= t1;
}

const REPLAY_CAR = (t: number) => CAR_DECISION_X - 4.2 * t; // ralenti ≈ 0,3 × la vitesse réelle

export const SHOTS: Record<ShotId, Shot> = {
  // Menu principal : plan d'ambiance sur le décor existant (Joseph au feu rouge), sans lancer le récit.
  menu: {
    duration: Infinity,
    pose(w, t, c) {
      base(w, c); ambient(w, 30 + t * 0.6, null);
      placeMoto(w.joseph, JOSEPH_X, DECISION_Z);
      placeCar(w, HIDDEN);
      w.josephRig.setPose({ headYaw: c.reduced ? 0 : Math.sin(t * 0.35) * 0.12 });
      // Trois-quarts avant de Joseph qui attend au feu (repère local de sa moto, avant vers -Z).
      const J = V(JOSEPH_X, 0, DECISION_Z);
      const local = c.portrait ? V(-2.2, 2.0, -6.0) : V(-2.4, 1.25, -3.6);
      const look = J.clone().add(c.portrait ? V(0.3, 0.2, 0.2) : V(1.4, 1.2, 0.4));
      const a = c.reduced ? 0 : Math.sin(t * 0.09) * 0.07;              // très lente respiration de caméra
      const off = local.clone(); off.applyAxisAngle(V(0, 1, 0), a);
      return { pos: J.clone().add(off), look, fov: c.portrait ? 48 : 38 };
    },
  },
  // 01 — Joseph stationné, téléphone devant le visage
  parked: {
    duration: Infinity,
    pose(w, t, c) {
      base(w, c); ambient(w, 30 + t, null);
      placeMoto(w.joseph, PARK.x, PARK.z);
      w.josephRig.setPose({ phone: 1, headYaw: c.reduced ? 0.25 : 0.25 + Math.sin(t * 0.8) * 0.06, headPitch: 0.12 });
      return { pos: V(2.4, 1.7, PARK.z - 4.6), look: V(PARK.x + 0.2, 1.25, PARK.z + 0.6) };
    },
  },

  // 02 — trajet guidé vers le feu, une autre moto passe au rouge
  approach: {
    duration: 9,
    pose(w, t, c) {
      base(w, c); ambient(w, t, null);
      const u = clamp01((t - 1.0) / 7.4);
      const jz = josephZApproach(t);
      const jx = lerp(PARK.x, JOSEPH_X, smooth(0, 0.3, u));
      const yaw = (smooth(0, 0.15, u) - smooth(0.15, 0.3, u)) * 0.18;
      placeMoto(w.joseph, jx, jz, yaw);
      const k = smooth(0, 0.8, t);
      w.josephRig.setPose({ phone: 1 - k });
      placeMoto(w.other, OTHER_X, 48 - 11 * Math.max(0, t - 1.0));
      placeCar(w, carXAt(t - 9)); // loin à droite, derrière les immeubles
      return chase(jx, jz, 0, c.reduced, t, c.portrait);
    },
  },

  // 03 — action figée juste avant la ligne ; la voiture existe déjà, cachée par le minibus
  freeze: {
    duration: Infinity,
    pose(w, _t, c) {
      base(w, c); ambient(w, 9, null);
      placeMoto(w.joseph, JOSEPH_X, DECISION_Z);
      placeCar(w, carXAt(0));
      return chase(JOSEPH_X, DECISION_Z, 0, true, 0, c.portrait);
    },
  },

  // 04A — il attend
  waitA: {
    duration: 13,
    pose(w, t, c) {
      base(w, c); ambient(w, 9 + t, 9 + 8.4);
      let jz: number;
      const zHold = 12.75;
      if (t < 1.3) jz = lerp(DECISION_Z, zHold, 1 - Math.pow(1 - t / 1.3, 2));
      else if (t < 8.8) jz = zHold;
      else { const tau = t - 8.8, tv = 9 / 3.5; jz = zHold - (tau < tv ? 0.5 * 3.5 * tau * tau : 0.5 * 9 * tv + 9 * (tau - tv)); }
      placeMoto(w.joseph, JOSEPH_X, jz);
      placeCar(w, carXAt(t));
      w.lightCross.set(t < 6 ? 'green' : t < 7 ? 'yellow' : 'red');
      w.lightMain.set(t < 8 ? 'red' : 'green');
      w.lightFar.set(t < 8 ? 'red' : 'green');
      w.josephRig.setPose({ headYaw: -0.5 * (smooth(1.2, 1.9, t) - smooth(3.6, 4.6, t)) });
      // angle 2 : la voiture traverse pendant que Joseph reste derrière la ligne
      if (t >= 1.1 && t < 5.2) return crossStreet(c);
      return chase(JOSEPH_X, jz, 0, c.reduced, t, c.portrait);
    },
  },

  // 04B — il passe : coupe vers la rue transversale pour révéler la voiture, puis contrôle
  passB: {
    duration: 10,
    pose(w, t, c) {
      base(w, c); ambient(w, 9 + t, null);
      const p = josephB(t);
      placeMoto(w.joseph, p.x, p.z, -0.12 * (smooth(6.0, 7.2, t) - smooth(7.6, 8.6, t)));
      placeCar(w, carXAt(t));
      w.lightMain.set(t < 7.5 ? 'red' : 'green');
      w.lightFar.set(t < 7.5 ? 'red' : 'green');
      w.josephRig.setPose({ headYaw: -0.6 * (smooth(1.1, 1.6, t) - smooth(2.8, 3.6, t)), lean: -0.16 * (smooth(0.9, 1.1, t) - smooth(2.6, 3.1, t)) });
      // Geste de l'agent (réf. 07) : main levée paume vers Joseph, puis bras tendu vers le bord de la route.
      const facing = smooth(8.4, 9.2, t);
      w.police.root.rotation.y = lerp(Math.PI, Math.atan2(POLICE.x - CONTROL.x, POLICE.z - CONTROL.z), facing);
      const raise = smooth(4.0, 4.6, t) - smooth(6.0, 6.6, t);
      w.police.armR.rotation.set(2.95 * raise, 0, 0.12 * raise);
      const point = smooth(6.0, 6.6, t) - smooth(8.6, 9.2, t);
      const sweep = c.reduced ? 0 : 0.2 * Math.sin((t - 6) * 5.5);
      w.police.armL.rotation.set(0.35 * point, 0, -(1.2 + sweep) * point);
      w.police.head.rotation.y = 0.25 * point;
      if (t >= 0.7 && t < 3.4) return crossStreet(c);
      if (t >= 4.4 && t < 8.6) return POLICE_GESTURE;
      return chase(p.x, p.z, 0, c.reduced, t, c.portrait);
    },
  },

  // 05 — le policier (contrôle ou briefing selon la branche)
  police: {
    duration: Infinity,
    pose(w, t, c) {
      base(w, c); ambient(w, 40 + t, null);
      placeMoto(w.joseph, CONTROL.x, CONTROL.z);
      w.josephRig.setPose({ headYaw: -0.6 });
      if (!c.reduced) w.police.armR.rotation.set(0.5 + 0.25 * Math.sin(t * 1.3), 0, -0.2);
      return { pos: V(1.6, 1.8, -29.6), look: V(7.2, 1.3, -34.8) };
    },
  },

  // 06–08 — explications : cadrage plus serré sur le policier
  explain: {
    duration: Infinity,
    pose(w, t, c) {
      base(w, c); ambient(w, 40 + t, null);
      placeMoto(w.joseph, CONTROL.x, CONTROL.z);
      w.josephRig.setPose({ headYaw: -0.6 });
      if (!c.reduced) w.police.armR.rotation.set(0.8 + 0.3 * Math.sin(t * 1.1), 0, -0.25);
      return { pos: V(4.2, 1.75, -30.9), look: V(8.7, 1.5, -35.6) };
    },
  },

  // 05 — « Revoir le carrefour » : angle 3, vue en hauteur au ralenti, même géométrie
  replay: {
    duration: 11,
    pose(w, t, c) {
      base(w, c); ambient(w, 9, null);
      w.replay.visible = true;
      placeMoto(w.joseph, JOSEPH_X, DECISION_Z);
      const carX = REPLAY_CAR(t);
      placeCar(w, carX);
      const eye = V(JOSEPH_X, 1.6, DECISION_Z + 0.2);
      const car = V(carX - 1.4, 1.0, CAR_LANE_Z);
      w.setSight(eye, car, !hiddenByMinibus(eye.x, eye.z, car.x, car.z));
      const pulse = c.reduced ? 0.85 : 0.6 + 0.35 * Math.sin(t * 4);
      (w.stopGlow.material as THREE.MeshBasicMaterial).opacity = pulse;
      const over: CamPose = c.portrait
        ? { pos: V(-5, 25, 33), look: V(9, 0, 3) }
        : { pos: V(-12, 27, 35), look: V(11, 0, 1.5), wide: true };
      if (c.reduced) return over;
      const k = smooth(0, 2.4, t);
      if (k >= 1) return over;
      const from = chase(JOSEPH_X, DECISION_Z, 0, true, 0, c.portrait);
      return { pos: from.pos.clone().lerp(over.pos, k), look: from.look.clone().lerp(over.look, k), wide: !c.portrait && k > 0.5 };
    },
    labels(w, t) {
      const carX = REPLAY_CAR(t);
      const hidden = hiddenByMinibus(JOSEPH_X, DECISION_Z + 0.2, carX - 1.4, CAR_LANE_Z);
      const out: LabelOut[] = [];
      if (t > 0.6) out.push({ key: 'stop', text: 'Ligne d’arrêt', at: w.labelAnchors.stop, tone: 'stop' });
      if (t > 0.6) out.push({ key: 'joseph', text: 'Joseph', at: w.labelAnchors.joseph, tone: 'info' });
      if (t > 3.4) out.push({ key: 'minibus', text: 'Minibus : il cache la rue', at: w.labelAnchors.minibus, tone: 'warn' });
      if (t > 3.4) out.push({ key: 'zone', text: 'Zone invisible pour Joseph', at: w.labelAnchors.zone, tone: 'warn' });
      if (t > 2.4) out.push({ key: 'car', text: hidden ? 'Voiture (cachée)' : 'Voiture (visible trop tard)', at: V(carX, 2.4, CAR_LANE_Z), tone: hidden ? 'warn' : 'ok' });
      return out;
    },
  },

  // 09–11 et fin : plan large du carrefour
  quiz: {
    duration: Infinity,
    pose(w, t, c) {
      base(w, c); ambient(w, 40 + t, null);
      placeMoto(w.joseph, CONTROL.x, CONTROL.z);
      const drift = c.reduced ? 0 : Math.sin(t * 0.12) * 1.2;
      return { pos: V(-3.2 + drift, 2.3, 30), look: V(5, 2.0, 6), wide: true };
    },
  },
};

export { STOP_Z };

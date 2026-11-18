import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ─────────────────────────────────────────────────────────────
// Carrefour fictif inspiré du secteur de la Marina (Cotonou), un matin.
// Repère : Joseph roule vers -Z sur la voie intérieure du boulevard
// (x≈+2.6). Le boulevard a un terre-plein central planté (|x| < 1,2)
// qui s'interrompt au carrefour. La rue transversale suit l'axe X.
// Toute la géométrie utile au récit (ligne d'arrêt, minibus, voie de la
// voiture) est figée ici : les trois angles de caméra la partagent.
// Références photo = références de conception uniquement : aucun pixel
// de photo n'est intégré, tout est modélisé et texturé ici.
// ─────────────────────────────────────────────────────────────

export const ROAD_HALF = 7;          // demi-largeur des chaussées (bordure à bordure)
export const MEDIAN_HALF = 1.2;      // demi-largeur du terre-plein central
export const STOP_Z = 11.2;          // ligne d'arrêt de Joseph
export const JOSEPH_X = 2.6;
export const DECISION_Z = 13.4;      // position figée au moment du choix
export const CAR_LANE_Z = -3.2;      // voie de la voiture venant de droite
export const CAR_DECISION_X = 36;    // position de la voiture à l'instant du choix (cachée)
export const MINIBUS = { x: 5.75, zFront: 11.9, len: 6.0, w: 2.2, h: 2.65 };

const C = {
  asphalt: 0x4a4d52,
  sidewalk: 0xb98a66,
  laterite: 0xa9633f,
  curbR: 0xc8362b,
  curbW: 0xf1eee8,
  white: 0xf4f1ea,
  palmTrunk: 0x8a6f52,
  palmLeaf: 0x3f7d3a,
  grass: 0x6f9a48,
  skin: 0x5a3a26,
  helmet: 0xf2b705,
  beret: 0x22337a,
  zemShirt: 0xf2c418,
};

// Matériaux partagés (moins d'objets GPU sur téléphone)
const matCache = new Map<number, THREE.MeshLambertMaterial>();
function mat(color: number, opts?: Partial<THREE.MeshLambertMaterialParameters>) {
  if (opts) return new THREE.MeshLambertMaterial({ color, ...opts });
  let m = matCache.get(color);
  if (!m) { m = new THREE.MeshLambertMaterial({ color }); matCache.set(color, m); }
  return m;
}
function box(w: number, h: number, d: number, m: THREE.Material | THREE.Material[], shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.castShadow = shadow; mesh.receiveShadow = true;
  return mesh;
}
function cyl(rt: number, rb: number, h: number, m: THREE.Material, seg = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.castShadow = true;
  return mesh;
}
function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!; draw(ctx);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
// générateur pseudo-aléatoire à graine fixe : le décor est identique à chaque partie
function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Textures de tissus (créations originales) ───────────────
/** Wax de Joseph : fond sarcelle, motifs ocre en éventail (≠ motif de la photo). */
const waxJoseph = () => canvasTex(128, 128, (c) => {
  c.fillStyle = '#1f9a92'; c.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < 128; x += 32) {
    c.save(); c.translate(x + 16, y + 16);
    c.fillStyle = '#e0a526';
    for (let i = 0; i < 5; i++) { c.rotate(Math.PI / 5); c.beginPath(); c.ellipse(0, -7, 2.6, 7, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#123a44'; c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill();
    c.restore();
  }
});
/** Camouflage bleu générique (tons inspirés de la réf. 03, motif inventé). */
const camoBlue = () => canvasTex(128, 128, (c) => {
  const r = rng(7);
  c.fillStyle = '#5f78ab'; c.fillRect(0, 0, 128, 128);
  for (const col of ['#2b3a63', '#9fb3d9', '#1b2443', '#4a5f92']) {
    c.fillStyle = col;
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      const x = r() * 128, y = r() * 128, rx = 6 + r() * 12, ry = 3 + r() * 6;
      c.ellipse(x, y, rx, ry, r() * Math.PI, 0, Math.PI * 2); c.fill();
    }
  }
});
const waxGeneric = (bg: string, fg: string) => canvasTex(64, 64, (c) => {
  c.fillStyle = bg; c.fillRect(0, 0, 64, 64); c.fillStyle = fg;
  for (let y = 0; y < 64; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < 64; x += 16) { c.beginPath(); c.arc(x + 4, y + 4, 4, 0, Math.PI * 2); c.fill(); }
});

// ── Personnages ─────────────────────────────────────────────
export interface Person {
  root: THREE.Group;
  armR: THREE.Group;
  armL: THREE.Group;
  head: THREE.Group;
  torso: THREE.Mesh;
}

export function makePerson(o: {
  shirt: number | THREE.Texture; pants: number | THREE.Texture; helmet?: number; beret?: boolean;
  seated?: boolean; face?: boolean; headload?: number; dress?: boolean;
}): Person {
  const root = new THREE.Group();
  const skin = mat(C.skin);
  const shirtM = typeof o.shirt === 'number' ? mat(o.shirt) : new THREE.MeshLambertMaterial({ map: o.shirt });
  const pantsM = typeof o.pants === 'number' ? mat(o.pants) : new THREE.MeshLambertMaterial({ map: o.pants });
  const seated = !!o.seated;

  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    const thigh = box(0.17, 0.17, 0.48, pantsM);
    const shin = box(0.15, 0.48, 0.15, pantsM);
    const shoe = box(0.16, 0.08, 0.26, mat(0x231c18));
    if (seated) {
      thigh.position.set(0, 0, -0.22); shin.position.set(0, -0.24, -0.44); shoe.position.set(0, -0.5, -0.5);
      leg.position.set(s * 0.13, 0.74, 0);
    } else {
      thigh.rotation.x = Math.PI / 2; thigh.position.set(0, -0.2, 0);
      shin.position.set(0, -0.62, 0); shoe.position.set(0, -0.88, -0.04);
      leg.position.set(s * 0.11, 0.92, 0);
    }
    leg.add(thigh, shin, shoe); root.add(leg);
  }
  const hipY = seated ? 0.78 : 0.95;
  if (o.dress) { const skirt = cyl(0.22, 0.3, 0.8, shirtM, 10); skirt.position.y = 0.55; root.add(skirt); }
  const torso = box(0.46, 0.6, 0.26, shirtM); torso.position.y = hipY + 0.32; root.add(torso);
  // épaules arrondies (lisibles de dos, cf. réf. 01)
  for (const s of [-1, 1]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), shirtM); sh.position.set(s * 0.22, hipY + 0.58, 0); sh.castShadow = true; root.add(sh); }
  if (o.beret) { // ceinturon
    const belt = box(0.48, 0.07, 0.28, mat(0x16181c)); belt.position.y = hipY + 0.05; root.add(belt);
    const buckle = box(0.08, 0.06, 0.02, mat(0x8d8f94)); buckle.position.set(0, hipY + 0.05, -0.145); root.add(buckle);
  }
  const neck = cyl(0.07, 0.08, 0.12, skin, 8); neck.position.y = hipY + 0.66; root.add(neck);
  const head = new THREE.Group(); head.position.y = hipY + 0.8;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), skin); skull.scale.set(0.95, 1.1, 1); skull.castShadow = true;
  head.add(skull);
  if (o.face) {
    const dark = mat(0x1a1210);
    for (const s of [-1, 1]) {
      const eye = box(0.035, 0.022, 0.01, mat(0xf3efe6), false); eye.position.set(s * 0.05, 0.025, -0.142); head.add(eye);
      const pupil = box(0.016, 0.018, 0.01, dark, false); pupil.position.set(s * 0.05, 0.025, -0.148); head.add(pupil);
      const brow = box(0.05, 0.012, 0.01, dark, false); brow.position.set(s * 0.05, 0.06, -0.146); brow.rotation.z = s * -0.12; head.add(brow);
    }
    const nose = box(0.04, 0.05, 0.04, mat(0x4d3120), false); nose.position.set(0, -0.01, -0.155); head.add(nose);
    const mouth = box(0.06, 0.01, 0.01, mat(0x3a2218), false); mouth.position.set(0, -0.07, -0.147); head.add(mouth);
    const beard = box(0.14, 0.05, 0.05, dark, false); beard.position.set(0, -0.11, -0.12); head.add(beard);
  }
  if (o.helmet !== undefined) {
    const hm = new THREE.Mesh(new THREE.SphereGeometry(0.195, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(o.helmet));
    hm.position.y = 0.03; hm.castShadow = true; head.add(hm);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.018, 6, 24), mat(0x1c1c1c)); rim.rotation.x = Math.PI / 2; rim.position.y = -0.02; head.add(rim);
    const visor = box(0.3, 0.05, 0.12, mat(0x2a2a2a)); visor.position.set(0, 0.04, -0.17); head.add(visor);
  }
  if (o.beret) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.175, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), mat(C.beret));
    b.scale.set(1.05, 0.6, 1.1); b.position.set(0.03, 0.1, 0.01); b.rotation.z = -0.25; head.add(b);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.02, 6, 20), mat(0x101420)); band.rotation.x = Math.PI / 2; band.position.y = 0.08; head.add(band);
  }
  if (o.headload !== undefined) {
    const basin = cyl(0.32, 0.2, 0.14, mat(0xd9d9d9), 14); basin.position.y = 0.24; head.add(basin);
    const goods = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(o.headload)); goods.position.y = 0.3; head.add(goods);
  }
  root.add(head);

  const mkArm = (s: number) => {
    const g = new THREE.Group(); g.position.set(s * 0.29, hipY + 0.58, 0);
    const up = box(0.12, 0.34, 0.12, shirtM); up.position.y = -0.16;
    const fore = box(0.1, 0.3, 0.1, skin); fore.position.y = -0.45;
    const hand = box(0.11, 0.13, 0.05, skin); hand.position.y = -0.66;
    g.add(up, fore, hand); root.add(g); return g;
  };
  const armR = mkArm(1), armL = mkArm(-1);
  return { root, armR, armL, head, torso };
}

// ── Véhicules ───────────────────────────────────────────────
export interface Moto { root: THREE.Group; wheels: THREE.Mesh[]; rider?: Person }

export function makeMoto(body: number, rider?: Person): Moto {
  const root = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  const tyre = mat(0x161616);
  for (const z of [-0.62, 0.62]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.075, 8, 18), tyre);
    w.rotation.y = Math.PI / 2; w.position.set(0, 0.3, z); w.castShadow = true;
    root.add(w); wheels.push(w);
  }
  const frame = box(0.22, 0.26, 1.0, mat(body)); frame.position.set(0, 0.55, 0); root.add(frame);
  const tank = box(0.3, 0.2, 0.42, mat(body)); tank.position.set(0, 0.72, -0.22); root.add(tank);
  const seat = box(0.3, 0.1, 0.62, mat(0x1b1b1b)); seat.position.set(0, 0.74, 0.25); root.add(seat);
  const fork = box(0.08, 0.6, 0.08, mat(0x888888)); fork.position.set(0, 0.62, -0.6); fork.rotation.x = -0.35; root.add(fork);
  const bar = box(0.7, 0.05, 0.05, mat(0x222222)); bar.position.set(0, 0.98, -0.66); root.add(bar);
  for (const s of [-1, 1]) { const mir = box(0.08, 0.06, 0.02, mat(0x222222)); mir.position.set(s * 0.33, 1.2, -0.66); root.add(mir); }
  const lamp = box(0.18, 0.14, 0.08, mat(0xfff6d8, { emissive: 0x665f40 })); lamp.position.set(0, 0.9, -0.76); root.add(lamp);
  const tail = box(0.14, 0.06, 0.04, mat(0xc0201a, { emissive: 0x400000 })); tail.position.set(0, 0.72, 0.62); root.add(tail);
  const plate = box(0.24, 0.12, 0.01, mat(0xf2f2f2), false); plate.position.set(0, 0.6, 0.66); root.add(plate);
  if (rider) {
    rider.root.position.set(0, 0, 0.18);
    rider.root.rotation.x = -0.12;
    rider.armR.rotation.x = 1.05; rider.armL.rotation.x = 1.05;
    root.add(rider.root);
  }
  return { root, wheels, rider };
}

function makeMinibus() {
  const g = new THREE.Group();
  const { len, w, h } = MINIBUS;
  const bodyTex = canvasTex(256, 128, (c) => {
    c.fillStyle = '#f2efe6'; c.fillRect(0, 0, 256, 128);
    c.fillStyle = '#2b5fa3'; c.fillRect(0, 84, 256, 14);
    c.fillStyle = '#f2c230'; c.fillRect(0, 98, 256, 5);
    c.fillStyle = '#26323f';
    for (let i = 0; i < 5; i++) c.fillRect(14 + i * 48, 22, 38, 40);
  });
  const sideM = new THREE.MeshLambertMaterial({ map: bodyTex });
  const plain = mat(0xf2efe6);
  const rearM = new THREE.MeshLambertMaterial({ map: canvasTex(128, 128, (c) => {
    c.fillStyle = '#f2efe6'; c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#26323f'; c.fillRect(10, 12, 108, 46);
    c.fillStyle = '#2b5fa3'; c.fillRect(0, 84, 128, 14);
    c.fillStyle = '#c0201a'; c.fillRect(4, 66, 14, 10); c.fillRect(110, 66, 14, 10);
    c.fillStyle = '#f2c230'; c.fillRect(44, 104, 40, 12);
  }) });
  const frontM = new THREE.MeshLambertMaterial({ map: canvasTex(128, 128, (c) => {
    c.fillStyle = '#f2efe6'; c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#26323f'; c.fillRect(6, 8, 116, 52);
    c.fillStyle = '#fff6d8'; c.fillRect(6, 74, 18, 12); c.fillRect(104, 74, 18, 12);
  }) });
  const body = box(w, h - 0.45, len, [sideM, sideM, plain, plain, rearM, frontM]);
  body.position.y = 0.45 + (h - 0.45) / 2;
  g.add(body);
  for (const x of [-w / 2, w / 2]) for (const z of [-len / 2 + 1, len / 2 - 1]) {
    const wh = cyl(0.36, 0.36, 0.25, mat(0x161616), 14); wh.rotation.z = Math.PI / 2; wh.position.set(x, 0.36, z); g.add(wh);
  }
  const rack = box(w - 0.3, 0.12, len - 1.2, mat(0x333333)); rack.position.y = h + 0.06; g.add(rack);
  const bags = box(0.9, 0.35, 1.2, mat(0x8a4b2a)); bags.position.set(0.2, h + 0.3, 0.4); g.add(bags);
  return g;
}

export function makeCar(paint = 0x9aa3ad) {
  const g = new THREE.Group();
  const p = mat(paint);
  const lower = box(4.3, 0.7, 1.9, p); lower.position.y = 0.65; g.add(lower);
  const cabin = box(2.5, 0.65, 1.7, mat(0x2a3440)); cabin.position.set(-0.15, 1.3, 0); g.add(cabin);
  const roof = box(2.4, 0.08, 1.72, p); roof.position.set(-0.15, 1.66, 0); g.add(roof);
  for (const x of [-1.4, 1.4]) for (const z of [-0.95, 0.95]) {
    const wh = cyl(0.38, 0.38, 0.26, mat(0x151515), 14); wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.38, z); g.add(wh);
  }
  for (const z of [-0.6, 0.6]) {
    const hl = box(0.06, 0.16, 0.36, mat(0xfff7d6, { emissive: 0xbba870 })); hl.position.set(-2.16, 0.8, z); g.add(hl);
  }
  // L'avant de la voiture est vers -X.
  return g;
}

// ── Feux tricolores ─────────────────────────────────────────
export type LightState = 'red' | 'yellow' | 'green';
export interface TrafficLight { root: THREE.Group; head: THREE.Group; set(s: LightState): void; state: LightState }
const LAMP_COLORS: Record<LightState, number> = { red: 0xff2a1f, yellow: 0xffb300, green: 0x22e06b };

/** Tête de feu centrée sur l'origine, lentilles vers -Z, avec panneau à liseré jaune réfléchissant. */
function makeSignalHead() {
  const head = new THREE.Group();
  head.add(box(0.42, 1.18, 0.3, mat(0x1c1f24)));
  const board = box(0.66, 1.42, 0.03, mat(0x101114), false); board.position.z = 0.16; head.add(board);
  const rim = box(0.76, 1.52, 0.02, mat(0xf2c418, { emissive: 0x2a2000 }), false); rim.position.z = 0.18; head.add(rim);
  const lamps = {} as Record<LightState, THREE.Mesh>;
  const halos = {} as Record<LightState, THREE.Mesh>;
  (['red', 'yellow', 'green'] as LightState[]).forEach((s, i) => {
    const y = 0.37 - i * 0.37;
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), new THREE.MeshBasicMaterial({ color: 0x2a2a2a }));
    l.position.set(0, y, -0.17); l.rotation.y = Math.PI; head.add(l); lamps[s] = l;
    const halo = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshBasicMaterial({ color: LAMP_COLORS[s], transparent: true, opacity: 0.35, depthWrite: false }));
    halo.position.set(0, y, -0.165); halo.rotation.y = Math.PI; halo.visible = false; head.add(halo); halos[s] = halo;
    const hood = box(0.32, 0.04, 0.16, mat(0x1c1f24), false); hood.position.set(0, y + 0.16, -0.23); head.add(hood);
  });
  return { head, lamps, halos };
}

function makeTrafficLight(head?: ReturnType<typeof makeSignalHead>): TrafficLight {
  const root = new THREE.Group();
  const h = head ?? makeSignalHead();
  if (!head) {
    const pole = cyl(0.07, 0.08, 3.2, mat(0x2b2f36)); pole.position.y = 1.6; root.add(pole);
    for (let i = 0; i < 4; i++) {
      const b = cyl(0.085, 0.085, 0.15, mat(i % 2 ? 0x1d1f24 : 0xf2c418)); b.position.y = 0.08 + i * 0.15; root.add(b);
    }
    h.head.position.y = 3.6;
  }
  root.add(h.head);
  const tl: TrafficLight = {
    root, head: h.head, state: 'red',
    set(s) {
      tl.state = s;
      (Object.keys(h.lamps) as LightState[]).forEach((k) => {
        (h.lamps[k].material as THREE.MeshBasicMaterial).color.setHex(k === s ? LAMP_COLORS[k] : 0x2a2a2a);
        h.halos[k].visible = k === s;
      });
    },
  };
  tl.set('red');
  return tl;
}

// ── Mobilier et végétation ──────────────────────────────────
function makePalm(h: number) {
  const g = new THREE.Group();
  const segs = 6;
  for (let i = 0; i < segs; i++) {
    const s = cyl(0.17 - i * 0.012, 0.19 - i * 0.012, h / segs, mat(C.palmTrunk), 8);
    s.position.set(Math.sin(i * 0.35) * 0.12 * i * 0.25, h / segs * (i + 0.5), 0); g.add(s);
  }
  for (let i = 0; i < 8; i++) {
    const leaf = new THREE.Mesh(PALM_LEAF, PALM_LEAF_M); leaf.castShadow = true;
    const holder = new THREE.Group(); holder.position.y = h;
    holder.rotation.y = (i / 8) * Math.PI * 2;
    leaf.rotation.x = -1.0; leaf.position.set(0, 0.2, -1.0);
    holder.add(leaf); g.add(holder);
  }
  return g;
}
const PALM_LEAF = (() => {
  const g = new THREE.PlaneGeometry(0.55, 2.6, 1, 4);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let v = 0; v < pos.count; v++) { const y = pos.getY(v) + 1.3; pos.setZ(v, -0.12 * y * y); pos.setX(v, pos.getX(v) * (1 - y / 3.2)); }
  g.computeVertexNormals(); return g;
})();
const PALM_LEAF_M = new THREE.MeshLambertMaterial({ color: C.palmLeaf, side: THREE.DoubleSide });

function makeTree(h: number, color = 0x4f8a3c) {
  const g = new THREE.Group();
  const t = cyl(0.12, 0.16, h * 0.55, mat(0x6b4f3a), 7); t.position.y = h * 0.27; g.add(t);
  const r = rng(Math.round(h * 100));
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.22, 0), mat(color));
    c.position.set((r() - 0.5) * h * 0.25, h * (0.62 + i * 0.1), (r() - 0.5) * h * 0.25); c.castShadow = true; g.add(c);
  }
  return g;
}

/** Lampadaire à crosse simple ou double (réf. 02 et 05). */
function makeLamp(double: boolean) {
  const g = new THREE.Group();
  const gm = mat(0x9aa0a6);
  const pole = cyl(0.07, 0.11, 8, gm, 8); pole.position.y = 4; g.add(pole);
  for (const s of double ? [-1, 1] : [1]) {
    const arm = box(1.7, 0.07, 0.07, gm, false); arm.position.set(s * 0.85, 7.85, 0); arm.rotation.z = s * 0.12; g.add(arm);
    const head = box(0.6, 0.12, 0.28, mat(0xe9e9e4), false); head.position.set(s * 1.65, 7.95, 0); g.add(head);
  }
  return g;
}

function addShrubs(scene: THREE.Scene, pts: THREE.Vector3[], color: number, size = 0.55) {
  if (!pts.length) return;
  const geo = new THREE.IcosahedronGeometry(size, 0);
  const im = new THREE.InstancedMesh(geo, mat(color), pts.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const r = rng(pts.length * 13 + color);
  pts.forEach((p, i) => { const k = 0.7 + r() * 0.6; s.set(k * 1.3, k * 0.75, k); q.setFromEuler(new THREE.Euler(0, r() * 6, 0)); m.compose(p, q, s); im.setMatrixAt(i, m); });
  im.receiveShadow = true;
  scene.add(im);
}

function facadeTexture(base: string, accent: string, floors: number, shop?: string) {
  return canvasTex(256, 256, (c) => {
    c.fillStyle = base; c.fillRect(0, 0, 256, 256);
    const fh = 256 / floors;
    for (let f = shop ? 1 : 0; f < floors; f++) {
      for (let i = 0; i < 4; i++) {
        c.fillStyle = '#2d3a46'; c.fillRect(18 + i * 60, 256 - (f + 1) * fh + fh * 0.22, 40, fh * 0.52);
        c.fillStyle = accent; c.fillRect(14 + i * 60, 256 - (f + 1) * fh + fh * 0.74, 48, 5);
      }
    }
    if (shop) {
      c.fillStyle = accent; c.fillRect(0, 256 - fh, 256, fh * 0.28);
      c.fillStyle = '#ffffff'; c.font = `bold ${Math.round(fh * 0.18)}px system-ui, sans-serif`;
      c.textAlign = 'center'; c.fillText(shop, 128, 256 - fh + fh * 0.21);
      c.fillStyle = '#20262d'; c.fillRect(10, 256 - fh * 0.68, 236, fh * 0.68);
    }
  });
}

function makeBuilding(w: number, d: number, floors: number, base: string, accent: string, shop?: string) {
  const h = floors * 3.2;
  const tex = facadeTexture(base, accent, floors, shop);
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(Math.max(1, Math.round(w / 10)), 1);
  const texD = facadeTexture(base, accent, floors, shop);
  texD.wrapS = THREE.RepeatWrapping; texD.repeat.set(Math.max(1, Math.round(d / 10)), 1);
  const mW = new THREE.MeshLambertMaterial({ map: tex });
  const mD = new THREE.MeshLambertMaterial({ map: texD });
  const roof = mat(0x8c8a84);
  const b = box(w, h, d, [mD, mD, roof, roof, mW, mW]);
  b.position.y = h / 2;
  const g = new THREE.Group(); g.add(b);
  const parapet = box(w + 0.2, 0.5, d + 0.2, mat(0xd9d2c3)); parapet.position.y = h + 0.25; g.add(parapet);
  return g;
}

/** Rangée de boutiques basses à enseignes (réf. 05). Façades tournées vers +X. */
function makeShopRow(signs: { text: string; bg: string; fg: string }[]) {
  const g = new THREE.Group();
  signs.forEach((s, i) => {
    const front = new THREE.MeshLambertMaterial({ map: canvasTex(256, 192, (c) => {
      c.fillStyle = '#e9e3d6'; c.fillRect(0, 0, 256, 192);
      c.fillStyle = s.bg; c.fillRect(0, 18, 256, 54);
      c.fillStyle = s.fg; c.font = 'bold 30px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText(s.text, 128, 56);
      c.fillStyle = '#20262d'; c.fillRect(22, 92, 140, 100);
      c.fillStyle = '#9ec7d6'; c.fillRect(176, 100, 62, 50);
    }) });
    const plain = mat(0xe9e3d6);
    const shop = box(6, 4.2, 6, [front, plain, mat(0x8c8a84), plain, plain, plain]);
    shop.position.set(0, 2.1, i * 6.2); g.add(shop);
    const awning = box(1.4, 0.08, 5.6, mat(i % 2 ? 0x1f7a5a : 0xc8362b)); awning.position.set(3.6, 2.9, i * 6.2); awning.rotation.z = -0.25; g.add(awning);
  });
  return g;
}

/** Fresque originale : lagune au lever du soleil, pirogues et motifs wax (palette inspirée de la réf. 06). */
function muralTexture() {
  return canvasTex(1536, 256, (c) => {
    const W = 1536, H = 256;
    const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0f1f57'); sky.addColorStop(1, '#2659b8');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    const r = rng(42);
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 90; i++) { c.globalAlpha = 0.3 + r() * 0.6; c.fillRect(r() * W, r() * H * 0.55, 2, 2); }
    c.globalAlpha = 1;
    // soleil
    c.fillStyle = '#f7c21a'; c.beginPath(); c.arc(W * 0.5, H * 0.62, 92, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8501f'; c.beginPath(); c.arc(W * 0.5, H * 0.62, 60, 0, Math.PI * 2); c.fill();
    // collines en bandes wax
    const bands = [
      { col: '#d8382c', dot: '#f7c21a', y: 0.6 }, { col: '#2f9a4c', dot: '#f2efe6', y: 0.7 },
      { col: '#f2a20f', dot: '#0f1f57', y: 0.8 }, { col: '#8a2a8c', dot: '#f7c21a', y: 0.9 },
    ];
    bands.forEach((b, k) => {
      c.fillStyle = b.col; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 32) c.lineTo(x, H * b.y + Math.sin(x / 140 + k * 1.7) * 18);
      c.lineTo(W, H); c.closePath(); c.fill();
      c.fillStyle = b.dot;
      for (let x = 10; x < W; x += 26) { const y = H * b.y + Math.sin(x / 140 + k * 1.7) * 18 + 14; c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill(); }
    });
    // pirogues et pêcheurs stylisés
    c.fillStyle = '#10151f';
    for (const x of [220, 420, 1120, 1320]) {
      c.beginPath(); c.moveTo(x - 70, 150); c.quadraticCurveTo(x, 182, x + 70, 150); c.lineTo(x + 50, 160); c.quadraticCurveTo(x, 172, x - 50, 160); c.fill();
      c.fillRect(x - 3, 108, 6, 42); c.beginPath(); c.arc(x, 102, 9, 0, Math.PI * 2); c.fill();
      c.fillRect(x + 2, 116, 46, 4);
    }
    // oiseaux
    c.strokeStyle = '#f2efe6'; c.lineWidth = 4;
    for (const [x, y] of [[640, 40], [700, 62], [860, 34], [930, 58]]) { c.beginPath(); c.moveTo(x - 16, y); c.quadraticCurveTo(x - 6, y - 12, x, y); c.quadraticCurveTo(x + 6, y - 12, x + 16, y); c.stroke(); }
  });
}

/** Bâtiment aux volumes courbes (réf. 04) : coques évasées blanches à bandeaux. */
function makeCurvedHall() {
  const g = new THREE.Group();
  const tex = canvasTex(512, 128, (c) => {
    c.fillStyle = '#efe9dc'; c.fillRect(0, 0, 512, 128);
    c.fillStyle = '#cfc6b4'; for (let x = 0; x < 512; x += 16) c.fillRect(x, 0, 2, 128);
    c.fillStyle = '#3c4652'; c.fillRect(0, 96, 512, 12);
    c.fillStyle = '#d8cfbd'; c.fillRect(0, 20, 512, 6);
  });
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(4, 1);
  const shellM = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
  const shell = (r0: number, r1: number, h: number) => new THREE.Mesh(
    new THREE.LatheGeometry([new THREE.Vector2(r0, 0), new THREE.Vector2(r0 * 1.02, h * 0.4), new THREE.Vector2(r1, h)], 40), shellM);
  const a = shell(11, 14.5, 17); a.castShadow = true; a.receiveShadow = true; g.add(a);
  const capA = new THREE.Mesh(new THREE.CircleGeometry(14.5, 40), mat(0xd9d2c3)); capA.rotation.x = -Math.PI / 2; capA.position.y = 16.9; g.add(capA);
  const b = shell(7, 9.5, 11); b.position.set(-26, 0, 4); g.add(b);
  const capB = new THREE.Mesh(new THREE.CircleGeometry(9.5, 40), mat(0xd9d2c3)); capB.rotation.x = -Math.PI / 2; capB.position.set(-26, 10.9, 4); g.add(capB);
  const c2 = shell(6, 8, 7); c2.position.set(22, 0, 6); g.add(c2);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(8.4, 0.5, 6, 40), mat(0xefe9dc)); ring.rotation.x = Math.PI / 2; ring.position.set(22, 7.2, 6); g.add(ring);
  // galerie basse qui relie les volumes
  const gallery = box(46, 4, 6, mat(0xe6dfd0)); gallery.position.set(-2, 2, 12); g.add(gallery);
  const slit = box(46.2, 0.6, 6.2, mat(0x3c4652), false); slit.position.set(-2, 3.1, 12); g.add(slit);
  return g;
}

function plane(w: number, d: number, color: number, y = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color));
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; return m;
}

/** Fusionne, dans l'espace local de `root`, ses pièces rigides par matériau (véhicules d'arrière-plan). */
function bakeRigid(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const victims: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material) || (m.material as THREE.Material).transparent) return;
    let g = m.geometry.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld));
    if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) return;
    (groups.get(m.material as THREE.Material) ?? groups.set(m.material as THREE.Material, []).get(m.material as THREE.Material)!).push(g);
    victims.push(m);
  });
  for (const v of victims) v.removeFromParent();
  groups.forEach((geos, mt) => {
    const merged = mergeGeometries(geos, false); if (!merged) return;
    const mesh = new THREE.Mesh(merged, mt); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
  });
}

/** Fusionne les maillages statiques qui partagent un même matériau opaque. */
function mergeStatic(scene: THREE.Scene, roots: THREE.Object3D[]) {
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const victims: THREE.Mesh[] = [];
  for (const r of roots) r.updateMatrixWorld(true);
  for (const r of roots) r.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || Array.isArray(m.material)) return;
    const mt = m.material as THREE.Material;
    if (mt.transparent) return;
    let g = m.geometry.clone().applyMatrix4(m.matrixWorld);
    if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) return;
    (groups.get(mt) ?? groups.set(mt, []).get(mt)!).push(g);
    victims.push(m);
  });
  for (const v of victims) v.removeFromParent();
  groups.forEach((geos, mt) => {
    const merged = mergeGeometries(geos, false);
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, mt);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
  });
}

// ── Monde ───────────────────────────────────────────────────
export class World {
  scene = new THREE.Scene();
  joseph: Moto;
  josephRider: Person;
  phone: THREE.Mesh;
  other: Moto;
  minibus: THREE.Group;
  car: THREE.Group;
  police: Person;
  policeMoto: Moto;
  policeBeacon: THREE.Mesh;
  briefing: THREE.Group;
  lightMain: TrafficLight;   // poteau au droit de la ligne d'arrêt
  lightFar: TrafficLight;    // potence au-dessus de la voie de Joseph (premier élément visible)
  lightCross: TrafficLight;  // feu de la rue transversale
  queue: Moto[] = [];        // zémidjans arrêtés au feu, en face
  traffic: THREE.Object3D[] = []; // véhicules qui arrivent en face (arrière-plan)
  replay = new THREE.Group();
  stopGlow!: THREE.Mesh;
  minibusOutline!: THREE.LineSegments;
  sightVisible!: THREE.Line;
  blindZone!: THREE.Mesh;
  carPath!: THREE.Group;
  labelAnchors: Record<string, THREE.Vector3> = {};

  constructor() {
    const s = this.scene;
    s.background = canvasTex(4, 256, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, '#7fb6d9'); g.addColorStop(0.55, '#cfe3e6'); g.addColorStop(1, '#f1e4c9');
      c.fillStyle = g; c.fillRect(0, 0, 4, 256);
    });
    s.fog = new THREE.Fog(0xe9e1cc, 70, 210);

    s.add(new THREE.HemisphereLight(0xdcefff, 0xb88a62, 1.35));
    const sun = new THREE.DirectionalLight(0xfff0d2, 2.3);
    sun.position.set(40, 34, 18); // soleil du matin, à l'est
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 140;
    sun.shadow.bias = -0.0008;
    sun.target.position.set(0, 0, 4); s.add(sun, sun.target);

    const before = new Set(s.children);
    this.buildGround();
    this.buildMedians();
    this.buildBlocks();
    this.buildBackdrop();
    // Décor fixe : fusion des maillages par matériau (≈ ×4 moins d'appels de dessin sur téléphone)
    mergeStatic(s, s.children.filter((o) => !before.has(o)));

    // ── Feux de Joseph : tous tournés vers +Z (vers lui) ──
    this.lightMain = makeTrafficLight(); this.lightMain.root.position.set(ROAD_HALF + 0.9, 0, STOP_Z + 0.4);
    this.lightMain.root.rotation.y = Math.PI; s.add(this.lightMain.root);
    // Potence : la tête du feu se détache sur le ciel, dans l'axe du regard de Joseph.
    const gantryHead = makeSignalHead();
    gantryHead.head.scale.setScalar(1.35);
    gantryHead.head.position.set(-5.2, 5.0, 0);
    gantryHead.head.rotation.y = Math.PI; // lentilles vers +Z
    this.lightFar = makeTrafficLight(gantryHead);
    const g = this.lightFar.root;
    const mast = cyl(0.13, 0.17, 6.4, mat(0x2b2f36), 10); mast.position.set(0, 3.2, 0); g.add(mast);
    for (let i = 0; i < 4; i++) { const b = cyl(0.18, 0.18, 0.18, mat(i % 2 ? 0x1d1f24 : 0xf2c418)); b.position.y = 0.09 + i * 0.18; g.add(b); }
    const arm = box(6.6, 0.16, 0.16, mat(0x2b2f36)); arm.position.set(-3.1, 6.1, 0); g.add(arm);
    const hanger = box(0.08, 0.3, 0.08, mat(0x2b2f36)); hanger.position.set(-5.2, 5.95, 0); g.add(hanger);
    g.position.set(ROAD_HALF + 1.2, 0, -ROAD_HALF - 2.4); // mât sur l'angle arrière-droit, tête au-dessus de la voie de Joseph
    s.add(g);
    this.lightCross = makeTrafficLight();
    this.lightCross.root.position.set(ROAD_HALF + 2.6, 0, -ROAD_HALF - 0.6);
    this.lightCross.root.rotation.y = -Math.PI / 2; // face aux véhicules venant de +X
    s.add(this.lightCross.root);

    // ── Joseph : casque jaune, chemise wax sarcelle (identique dans toutes les scènes) ──
    this.josephRider = makePerson({ shirt: waxJoseph(), pants: 0x262b36, helmet: C.helmet, seated: true });
    this.phone = box(0.08, 0.15, 0.02, mat(0x111111, { emissive: 0x223355 }));
    this.joseph = makeMoto(0x8e1b1b, this.josephRider);
    this.josephRider.armR.add(this.phone); this.phone.position.set(0, -0.62, -0.08);
    s.add(this.joseph.root);

    // Autre moto (passe au rouge)
    const r2 = makePerson({ shirt: 0x3a7d5c, pants: 0x222222, helmet: 0xd0d0d0, seated: true });
    this.other = makeMoto(0x1f3a7a, r2); s.add(this.other.root);

    this.minibus = makeMinibus(); bakeRigid(this.minibus);
    this.minibus.position.set(MINIBUS.x, 0, MINIBUS.zFront + MINIBUS.len / 2);
    s.add(this.minibus);

    this.car = makeCar(); bakeRigid(this.car); s.add(this.car);

    // ── Policier fictif : camouflage bleu, béret, visage propre, sans nom ni décoration ──
    const camo = camoBlue();
    this.police = makePerson({ shirt: camo, pants: camo, beret: true, face: true });
    s.add(this.police.root);
    this.policeMoto = makeMoto(0xf4f4f4);
    this.policeBeacon = box(0.16, 0.12, 0.16, new THREE.MeshBasicMaterial({ color: 0x2f6bff }));
    this.policeBeacon.position.set(0, 1.25, 0.55); this.policeMoto.root.add(this.policeBeacon);
    s.add(this.policeMoto.root);

    // ── Zémidjans à l'arrêt au feu, en face (réf. 05) ──
    const helmets = [0xd0d0d0, 0x1c1c1c, 0xc8362b, 0x2b5fa3];
    for (let i = 0; i < 4; i++) {
      const rider = makePerson({ shirt: C.zemShirt, pants: 0x2a2a2a, helmet: helmets[i], seated: true });
      const m = makeMoto([0x7a1a1a, 0x1b1b1b, 0x1f3a7a, 0x7a1a1a][i], rider);
      if (i % 2 === 0) { // passager
        const p = makePerson({ shirt: waxGeneric(i ? '#8a2a8c' : '#2f9a4c', '#f7c21a'), pants: 0x333333, seated: true });
        p.root.position.set(0, 0.06, 0.62); p.root.rotation.x = -0.05; p.armR.rotation.x = 0.4; p.armL.rotation.x = 0.4; m.root.add(p.root);
      }
      bakeRigid(m.root); this.queue.push(m); s.add(m.root);
    }
    // ── Véhicules qui arrivent en face (circulation d'arrière-plan) ──
    const carA = makeCar(0xf1f1f1), carB = makeCar(0x1d2330);
    const mA = makeMoto(0x1b1b1b, makePerson({ shirt: C.zemShirt, pants: 0x2a2a2a, helmet: 0x1c1c1c, seated: true }));
    const mB = makeMoto(0x7a1a1a, makePerson({ shirt: 0xf2efe6, pants: 0x2a2a2a, helmet: 0xc8362b, seated: true }));
    for (const o of [carA, mA.root, carB, mB.root]) { bakeRigid(o); this.traffic.push(o); s.add(o); }

    // ── Stand du briefing prévention (branche A) ──
    this.briefing = new THREE.Group();
    const canopy = box(3.2, 0.12, 2.4, mat(0xf2c230)); canopy.position.y = 2.5; this.briefing.add(canopy);
    for (const x of [-1.5, 1.5]) for (const z of [-1.1, 1.1]) { const p = cyl(0.04, 0.04, 2.5, mat(0x555555), 6); p.position.set(x, 1.25, z); this.briefing.add(p); }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), new THREE.MeshLambertMaterial({
      map: canvasTex(512, 150, (c) => {
        c.fillStyle = '#13213c'; c.fillRect(0, 0, 512, 150);
        c.fillStyle = '#f2c230'; c.fillRect(0, 128, 512, 22);
        c.fillStyle = '#ffffff'; c.font = 'bold 54px system-ui, sans-serif'; c.textAlign = 'center';
        c.fillText('PRÉVENTION ROUTIÈRE', 256, 86);
      }), side: THREE.DoubleSide,
    }));
    sign.position.set(0, 2.05, 1.22); this.briefing.add(sign);
    const table = box(1.6, 0.08, 0.7, mat(0xeeeeee)); table.position.set(0, 0.8, 0); this.briefing.add(table);
    this.briefing.position.set(ROAD_HALF + 1.7, 0, -36.5); this.briefing.rotation.y = -Math.PI / 2;
    s.add(this.briefing);

    this.buildReplayHelpers();
  }

  setSight(from: THREE.Vector3, to: THREE.Vector3, visible: boolean) {
    const g = this.sightVisible.geometry as THREE.BufferGeometry;
    g.setFromPoints([from, to]);
    this.sightVisible.computeLineDistances();
    this.sightVisible.visible = visible;
  }

  private buildReplayHelpers() {
    this.stopGlow = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF - MEDIAN_HALF, 0.9), new THREE.MeshBasicMaterial({ color: 0xffd400, transparent: true, opacity: 0.85 }));
    this.stopGlow.rotation.x = -Math.PI / 2; this.stopGlow.position.set((ROAD_HALF + MEDIAN_HALF) / 2, 0.06, STOP_Z);
    this.replay.add(this.stopGlow);

    const mbBox = new THREE.Box3(
      new THREE.Vector3(MINIBUS.x - MINIBUS.w / 2 - 0.08, 0, MINIBUS.zFront - 0.08),
      new THREE.Vector3(MINIBUS.x + MINIBUS.w / 2 + 0.08, MINIBUS.h + 0.2, MINIBUS.zFront + MINIBUS.len + 0.08));
    const size = mbBox.getSize(new THREE.Vector3());
    this.minibusOutline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z)),
      new THREE.LineBasicMaterial({ color: 0xff3b30, depthTest: false }));
    this.minibusOutline.position.copy(mbBox.getCenter(new THREE.Vector3()));
    this.minibusOutline.renderOrder = 10;
    this.replay.add(this.minibusOutline);

    // zone masquée par le minibus depuis l'œil de Joseph
    const eye = new THREE.Vector2(JOSEPH_X, DECISION_Z + 0.2);
    const cA = new THREE.Vector2(MINIBUS.x - MINIBUS.w / 2, MINIBUS.zFront);
    const cB = new THREE.Vector2(MINIBUS.x - MINIBUS.w / 2, MINIBUS.zFront + MINIBUS.len);
    const dA = cA.clone().sub(eye).normalize(), dB = cB.clone().sub(eye).normalize();
    const far = 70;
    const pts = [cA, cA.clone().addScaledVector(dA, far), cB.clone().addScaledVector(dB, far), cB];
    const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, -p.y)));
    const zoneG = new THREE.ShapeGeometry(shape); zoneG.rotateX(-Math.PI / 2);
    this.blindZone = new THREE.Mesh(zoneG, new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
    this.blindZone.position.y = 0.07; this.replay.add(this.blindZone);
    this.labelAnchors.zone = new THREE.Vector3(26, 0.2, -5);

    this.carPath = new THREE.Group();
    const dashM = new THREE.MeshBasicMaterial({ color: 0x1d6cff });
    for (let x = 60; x > -24; x -= 3) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.35), dashM);
      d.rotation.x = -Math.PI / 2; d.position.set(x, 0.08, CAR_LANE_Z); this.carPath.add(d);
    }
    const arrow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 3), dashM);
    arrow.rotation.x = -Math.PI / 2; arrow.rotation.z = Math.PI; arrow.position.set(-25.5, 0.08, CAR_LANE_Z);
    this.carPath.add(arrow);
    this.replay.add(this.carPath);

    const sg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
    this.sightVisible = new THREE.Line(sg, new THREE.LineDashedMaterial({ color: 0x0a7a3c, dashSize: 0.6, gapSize: 0.35, depthTest: false }));
    this.sightVisible.renderOrder = 11;
    this.replay.add(this.sightVisible);

    this.replay.visible = false;
    this.scene.add(this.replay);

    this.labelAnchors.stop = new THREE.Vector3(1.6, 0.2, STOP_Z - 0.4);
    this.labelAnchors.minibus = new THREE.Vector3(MINIBUS.x + 0.6, MINIBUS.h + 0.4, MINIBUS.zFront + MINIBUS.len - 0.4);
    this.labelAnchors.joseph = new THREE.Vector3(JOSEPH_X - 0.6, 2.2, DECISION_Z + 2.4);
    this.labelAnchors.car = new THREE.Vector3();
  }

  private buildGround() {
    const s = this.scene;
    s.add(plane(600, 600, C.laterite, -0.02));
    s.add(plane(ROAD_HALF * 2, 300, C.asphalt, 0));
    s.add(plane(300, ROAD_HALF * 2, C.asphalt, 0.001));
    // trottoirs larges (pavés ocre) + bandes de gazon côté façades (réf. 02)
    const sw = (x: number, z: number, w: number, d: number) => {
      const m = box(w, 0.18, d, mat(C.sidewalk), false); m.position.set(x, 0.09, z); s.add(m);
    };
    const L = 140, W = 3.4;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      sw(sx * (ROAD_HALF + W / 2), sz * (ROAD_HALF + L / 2), W, L);
      sw(sx * (ROAD_HALF + L / 2), sz * (ROAD_HALF + W / 2), L, W);
      // bordures peintes rouge/blanc près de l'angle (réf. 05)
      for (let i = 0; i < 12; i++) {
        const cm = mat(i % 2 ? C.curbW : C.curbR);
        const cb = box(0.14, 0.2, 1, cm, false); cb.position.set(sx * (ROAD_HALF + 0.07), 0.1, sz * (ROAD_HALF + 0.5 + i)); s.add(cb);
        const cb2 = box(1, 0.2, 0.14, cm, false); cb2.position.set(sx * (ROAD_HALF + 0.5 + i), 0.1, sz * (ROAD_HALF + 0.07)); s.add(cb2);
      }
    }
    // marquages
    const white = mat(C.white);
    const stripe = (x: number, z: number, w: number, d: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), white); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); m.receiveShadow = true; s.add(m);
    };
    const cw = ROAD_HALF - MEDIAN_HALF, cx = (ROAD_HALF + MEDIAN_HALF) / 2;
    // lignes d'arrêt larges (0,6 m) : repère principal de la scène
    stripe(cx, STOP_Z, cw, 0.6);
    stripe(-cx, -STOP_Z, cw, 0.6);
    stripe(STOP_Z, -cx, 0.6, cw);
    stripe(-STOP_Z, cx, 0.6, cw);
    for (let i = -6; i <= 6; i++) {
      stripe(i * 1.05, ROAD_HALF + 1.9, 0.55, 2.6); stripe(i * 1.05, -ROAD_HALF - 1.9, 0.55, 2.6);
      stripe(ROAD_HALF + 1.9, i * 1.05, 2.6, 0.55); stripe(-ROAD_HALF - 1.9, i * 1.05, 2.6, 0.55);
    }
    // séparations de voies (2 voies par sens)
    const lane = (ROAD_HALF + MEDIAN_HALF) / 2;
    for (let z = STOP_Z + 4; z < 150; z += 6) { stripe(lane, z, 0.15, 3); stripe(-lane, z, 0.15, 3); }
    for (let z = -STOP_Z - 4; z > -150; z -= 6) { stripe(lane, z, 0.15, 3); stripe(-lane, z, 0.15, 3); }
    for (let x = STOP_Z + 4; x < 150; x += 6) { stripe(x, lane, 3, 0.15); stripe(x, -lane, 3, 0.15); }
    for (let x = -STOP_Z - 4; x > -150; x -= 6) { stripe(x, lane, 3, 0.15); stripe(x, -lane, 3, 0.15); }
  }

  /** Terre-pleins centraux plantés (réf. 02) : gazon, massifs rouges et verts, palmiers, lampadaires doubles. */
  private buildMedians() {
    const s = this.scene;
    const start = STOP_Z + 2.2, end = 150;
    const green: THREE.Vector3[] = [], red: THREE.Vector3[] = [];
    const seg = (cx: number, cz: number, w: number, d: number) => {
      const curb = box(w, 0.2, d, mat(0xcfc6b2), false); curb.position.set(cx, 0.1, cz); s.add(curb);
      const lawn = box(w - 0.3, 0.06, d - 0.3, mat(C.grass), false); lawn.position.set(cx, 0.23, cz); s.add(lawn);
    };
    const len = end - start, mid = (start + end) / 2;
    seg(0, mid, MEDIAN_HALF * 2, len); seg(0, -mid, MEDIAN_HALF * 2, len);
    seg(mid, 0, len, MEDIAN_HALF * 2); seg(-mid, 0, len, MEDIAN_HALF * 2);
    for (let d = start + 2; d < end; d += 2.2) {
      const list = Math.floor(d / 8.8) % 2 ? red : green;
      list.push(new THREE.Vector3(0, 0.45, d), new THREE.Vector3(0, 0.45, -d), new THREE.Vector3(d, 0.45, 0), new THREE.Vector3(-d, 0.45, 0));
    }
    addShrubs(s, green, 0x3e7a35, 0.5);
    addShrubs(s, red, 0x8f2f3a, 0.5);
    // Côté droit de la rue transversale, le terre-plein reste bas près du carrefour :
    // la caméra « rue transversale » doit voir la voiture, le minibus et Joseph sans obstacle.
    const clearX = 48;
    for (let d = start + 6; d < end; d += 14) {
      for (const [x, z] of [[0, d], [0, -d], [d, 0], [-d, 0]]) {
        if (x > 0 && x < clearX) continue;
        const p = makePalm(6.5); p.position.set(x, 0.25, z); s.add(p);
      }
    }
    for (let d = start + 13; d < end; d += 28) {
      const a = makeLamp(true); a.position.set(0, 0.2, d); s.add(a);
      const b = makeLamp(true); b.position.set(0, 0.2, -d); s.add(b);
      if (d > clearX) { const c = makeLamp(true); c.position.set(d, 0.2, 0); c.rotation.y = Math.PI / 2; s.add(c); }
      const e = makeLamp(true); e.position.set(-d, 0.2, 0); e.rotation.y = Math.PI / 2; s.add(e);
    }
  }

  private buildBlocks() {
    const s = this.scene;
    const add = (o: THREE.Object3D, x: number, z: number, ry = 0) => { o.position.set(x, 0, z); o.rotation.y = ry; s.add(o); };
    const off = ROAD_HALF + 3.4;
    // angle avant-droit : bâtiment à l'angle (masque aussi la rue de droite)
    add(makeBuilding(16, 14, 3, '#e8dcc4', '#2b5fa3', 'PHARMACIE DU PORT'), off + 8.5, off + 7.5);
    add(makeBuilding(14, 18, 2, '#d8c7a6', '#a8432b', 'ALIMENTATION'), off + 8, off + 26);
    add(makeBuilding(18, 12, 4, '#f1ece0', '#1f7a5a'), off + 30, off + 7);
    // angle avant-gauche : rangée de boutiques à enseignes (réf. 05)
    add(makeShopRow([
      { text: 'TÉLÉPHONIE', bg: '#1f9a62', fg: '#ffffff' },
      { text: 'PRESSING', bg: '#2b5fa3', fg: '#ffffff' },
      { text: 'QUINCAILLERIE', bg: '#f2c418', fg: '#13213c' },
    ]), -off - 3.2, off + 3.4);
    add(makeBuilding(12, 20, 5, '#f0e2c2', '#a8432b'), -off - 6.5, off + 30);
    add(makeBuilding(16, 12, 2, '#e5d3b3', '#2b5fa3'), -off - 30, off + 6.5);
    // arrière droit : immeubles le long du boulevard
    add(makeBuilding(14, 22, 4, '#d9e3e6', '#a8432b'), off + 7.5, -off - 34);
    for (let i = 0; i < 4; i++) {
      add(makeBuilding(14, 18, 2 + (i % 3), i % 2 ? '#e9dcc0' : '#dfe6e2', i % 2 ? '#a8432b' : '#13213c'), off + 7.5, off + 48 + i * 22);
      add(makeBuilding(14, 18, 3 + (i % 2), i % 2 ? '#e2d2b0' : '#efe8da', '#2b5fa3'), -off - 7.5, off + 52 + i * 22);
      add(makeBuilding(14, 18, 2 + (i % 2), '#e6dccb', '#1f7a5a'), off + 7.5, -off - 58 - i * 22);
    }
    // palmiers et lampadaires de trottoir
    for (const z of [26, 44, 62, -24, -46, -66]) {
      const p = makePalm(7); p.position.set(ROAD_HALF + 2.6, 0.18, z); s.add(p);
    }
    for (const z of [34, 70, -50, -72]) { const l = makeLamp(false); l.position.set(ROAD_HALF + 0.6, 0.18, z); l.rotation.y = Math.PI; s.add(l); }
    for (const z of [30, 64]) { const l = makeLamp(false); l.position.set(-ROAD_HALF - 0.6, 0.18, z); s.add(l); }
    // vendeuse sous parasol et passantes (vie de rue, réf. 01)
    const umb = new THREE.Group();
    const pole = cyl(0.03, 0.03, 2.2, mat(0x777777), 6); pole.position.y = 1.1; umb.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.5, 8, 1, true), new THREE.MeshLambertMaterial({ color: 0xd8432b, side: THREE.DoubleSide }));
    top.position.y = 2.3; umb.add(top);
    const stall = box(1.1, 0.7, 0.6, mat(0x8b5a33)); stall.position.y = 0.35; umb.add(stall);
    const vendor = makePerson({ shirt: 0xd28b1e, pants: 0x6b2f6b });
    vendor.root.position.set(0.3, 0, 0.7); umb.add(vendor.root);
    add(umb, ROAD_HALF + 2.2, 30);
    const walkers = [
      { shirt: waxGeneric('#f2c418', '#2f9a4c'), x: ROAD_HALF + 1.4, z: 24, load: 0xe8e2d0 },
      { shirt: waxGeneric('#c8362b', '#f2efe6'), x: ROAD_HALF + 2.4, z: 21.5, load: undefined },
      { shirt: waxGeneric('#2b5fa3', '#f7c21a'), x: -ROAD_HALF - 1.6, z: 20, load: 0x7fa35a },
    ];
    walkers.forEach((w, i) => {
      const p = makePerson({ shirt: w.shirt, pants: w.shirt, dress: true, headload: w.load });
      p.armL.rotation.x = 0.2; p.armR.rotation.x = -0.2;
      p.root.rotation.y = i === 2 ? Math.PI : 0;
      add(p.root, w.x, w.z, i === 2 ? Math.PI : 0); p.root.position.y = 0.18;
    });
  }

  /** Arrière-plan : esplanade plantée + bâtiment courbe à gauche, fresque à droite. */
  private buildBackdrop() {
    const s = this.scene;
    const off = ROAD_HALF + 3.4;
    // esplanade (angle arrière-gauche)
    const lawn = plane(70, 60, 0x7fa35a, 0.03); lawn.position.set(-off - 35, 0.03, -off - 30); s.add(lawn);
    const walk = plane(70, 3.2, 0xd9d3c4, 0.05); walk.position.set(-off - 35, 0.05, -off - 6); s.add(walk);
    const bed = box(26, 0.6, 2.2, mat(0xbfb8a8), false); bed.position.set(-off - 20, 0.3, -off - 14); s.add(bed);
    const bedPts: THREE.Vector3[] = [], bedRed: THREE.Vector3[] = [];
    for (let x = -off - 6; x > -off - 70; x -= 2.4) { (Math.floor(x / 7) % 2 ? bedRed : bedPts).push(new THREE.Vector3(x, 0.45, -off - 10)); }
    addShrubs(s, bedPts, 0x3e7a35, 0.6); addShrubs(s, bedRed, 0x8f2f3a, 0.55);
    for (const [x, z, h] of [[-off - 12, -off - 22, 7], [-off - 30, -off - 18, 8], [-off - 48, -off - 24, 7], [-off - 22, -off - 34, 6]]) { const t = makeTree(h); t.position.set(x, 0, z); s.add(t); }
    for (const [x, z] of [[-off - 38, -off - 30], [-off - 16, -off - 40]]) { const p = makePalm(8); p.position.set(x, 0, z); s.add(p); }
    const wall = box(70, 1.6, 0.4, mat(0xdad3c4)); wall.position.set(-off - 35, 0.8, -off - 46); s.add(wall);
    const hall = makeCurvedHall(); hall.position.set(-off - 34, 0, -off - 66); s.add(hall);

    // fresque (angle arrière-droit) : en retrait, plus basse que la potence du feu
    const mural = new THREE.Mesh(new THREE.PlaneGeometry(34, 5.4), new THREE.MeshLambertMaterial({ map: muralTexture() }));
    mural.position.set(off + 18, 2.7, -off - 1.4); s.add(mural);
    const back = box(34.4, 5.6, 0.4, mat(0xdad3c4)); back.position.set(off + 18, 2.8, -off - 1.65); s.add(back);
    // grue de chantier derrière la fresque
    const crane = new THREE.Group();
    const mastM = mat(0xe8eaee);
    const cm = box(0.8, 26, 0.8, mastM); cm.position.y = 13; crane.add(cm);
    const jib = box(22, 0.7, 0.7, mastM); jib.position.set(-6, 25.5, 0); crane.add(jib);
    const cw = box(2.4, 1.6, 1.2, mat(0x9aa0a6)); cw.position.set(4, 25, 0); crane.add(cw);
    crane.position.set(off + 32, 0, -off - 18); crane.rotation.y = 0.6; s.add(crane);
  }
}

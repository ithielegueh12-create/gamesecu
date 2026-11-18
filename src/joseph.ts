import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// ─────────────────────────────────────────────────────────────
// Joseph : modèle humain articulé, semi-réaliste, créé pour le projet.
// Squelette : bassin → colonne → épaules → bras (épaule, coude, poignet)
// et hanches → genoux → chevilles. Les bras et les jambes sont posés par
// cinématique inverse à deux segments : les mains se referment sur les
// poignées et les pieds reposent sur les repose-pieds, quel que soit le plan.
// Toutes les cotes sont en mètres, dans le repère local de la moto
// (avant de la moto vers -Z, haut vers +Y).
// ─────────────────────────────────────────────────────────────

/** Points de contact de la moto (partagés avec world.ts pour dessiner guidon, poignées, repose-pieds). */
export const MOTO_FIT = {
  seatTopY: 0.79,
  barY: 1.0, barZ: -0.6, gripX: 0.335, gripLen: 0.12, gripR: 0.021,
  pegX: 0.22, pegY: 0.36, pegZ: -0.1,
};

const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const DOWN = V3(0, -1, 0);

// ── Proportions (adulte d'environ 1,72 m) ──
const DIM = {
  pelvis: V3(0, 0.873, 0.13),   // centre du bassin, posé sur la selle
  spine: 0.5,                   // bassin → base du cou
  lean: 0.58,                   // inclinaison du buste vers le guidon (rad)
  shoulderW: 0.185,
  upperArm: 0.295, foreArm: 0.265,
  hipW: 0.098, thigh: 0.42, shin: 0.42,
};

function hash(x: number, y: number) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }

/** Carte de normales d'un tissu mat à grain fin, avec quelques plis souples (procédurale). */
function fabricNormal(folds: (u: number, v: number) => number, size = 256, grain = 0.18) {
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const twill = Math.sin((x + y) * Math.PI / 2) * 0.05;     // armure toile/sergé très fine
    h[y * size + x] = hash(x, y) * grain + twill + folds(u, v);
  }
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!; const img = ctx.createImageData(size, size);
  const k = 3.2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const xl = h[y * size + ((x - 1 + size) % size)], xr = h[y * size + ((x + 1) % size)];
    const yu = h[((y - 1 + size) % size) * size + x], yd = h[((y + 1) % size) * size + x];
    const n = V3(-(xr - xl) * k, -(yd - yu) * k, 1).normalize();
    const i = (y * size + x) * 4;
    img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** Plis : ondulations douces, plus marquées vers la taille et au creux des coudes. */
const shirtFolds = (u: number, v: number) => {
  const waist = Math.exp(-((v - 0.12) ** 2) / 0.01) * Math.sin(v * 70 + Math.sin(u * 12) * 2) * 0.55;
  const back = Math.sin(u * 18 + v * 9) * 0.12 * Math.exp(-((v - 0.55) ** 2) / 0.05);
  return waist + back;
};
const pantsFolds = (u: number, v: number) => Math.exp(-((v - 0.85) ** 2) / 0.01) * Math.sin(v * 80 + u * 6) * 0.5 + Math.sin(v * 22 + u * 4) * 0.08;

/** Wax de Joseph : fond sarcelle, motifs ocre en éventail (motif original, identique au jeu). */
function waxTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#1f9a92'; c.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 64) for (let x = (y / 64) % 2 ? 32 : 0; x < 256; x += 64) {
    c.save(); c.translate(x + 32, y + 32);
    c.fillStyle = '#e0a526';
    for (let i = 0; i < 5; i++) { c.rotate(Math.PI / 5); c.beginPath(); c.ellipse(0, -14, 5, 14, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#123a44'; c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

/** Segment de membre effilé (tour) : part de l'origine et descend le long de -Y. */
function limbGeo(len: number, r0: number, rMid: number, r1: number, seg = 14) {
  const pts: THREE.Vector2[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = t < 0.5 ? THREE.MathUtils.lerp(r0, rMid, Math.sin(t * Math.PI)) : THREE.MathUtils.lerp(r1, rMid, Math.sin(t * Math.PI));
    pts.push(new THREE.Vector2(Math.max(0.004, r), -t * len));
  }
  pts.unshift(new THREE.Vector2(0.001, 0.0)); pts.push(new THREE.Vector2(0.001, -len));
  const g = new THREE.LatheGeometry(pts, seg); g.computeVertexNormals(); return g;
}

/** Résolution analytique à deux segments : renvoie la position du coude/genou. */
function solveTwoBone(a: THREE.Vector3, target: THREE.Vector3, l1: number, l2: number, pole: THREE.Vector3) {
  const d = target.clone().sub(a);
  let dist = d.length();
  const maxR = l1 + l2 - 1e-3;
  if (dist > maxR) { d.setLength(maxR); dist = maxR; }
  const dir = d.clone().normalize();
  const x = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const bend = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const mid = a.clone().addScaledVector(dir, x).addScaledVector(bend, h);
  const end = a.clone().add(d);
  return { mid, end };
}

function orientSegment(m: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  m.position.copy(from);
  m.quaternion.setFromUnitVectors(DOWN, to.clone().sub(from).normalize());
}

export interface JosephPose { phone?: number; headYaw?: number; headPitch?: number; lean?: number }

export class JosephRig {
  root = new THREE.Group();
  phone: THREE.Mesh;
  private torso = new THREE.Group();
  private head = new THREE.Group();
  parts: Record<string, THREE.Mesh> = {};
  /** Dernières positions calculées (servent aux contrôles de contact). */
  readonly contacts = { handL: V3(0, 0, 0), handR: V3(0, 0, 0), ankleL: V3(0, 0, 0), ankleR: V3(0, 0, 0), pelvisBottom: 0, shoeBoxes: [] as THREE.Box3[] };

  constructor() {
    this.root.name = 'Joseph (modèle articulé)';
    const wax = waxTexture();
    const shirt = new THREE.MeshStandardMaterial({ map: wax, normalMap: fabricNormal(shirtFolds), normalScale: new THREE.Vector2(0.7, 0.7), roughness: 0.93, metalness: 0 });
    shirt.map!.repeat.set(4.5, 3); shirt.normalMap!.repeat.set(2, 2);
    const sleeve = shirt.clone(); sleeve.map = wax.clone(); sleeve.map.repeat.set(2, 1.1); sleeve.map.needsUpdate = true;
    const pants = new THREE.MeshStandardMaterial({ color: 0x262b36, normalMap: fabricNormal(pantsFolds, 256, 0.22), normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.9 });
    pants.normalMap!.repeat.set(2, 3);
    const skin = new THREE.MeshStandardMaterial({ color: 0x5a3a26, roughness: 0.62 });
    const shoe = new THREE.MeshStandardMaterial({ color: 0x1d1a18, roughness: 0.55 });
    const helmetM = new THREE.MeshStandardMaterial({ color: 0xf2b705, roughness: 0.38, metalness: 0.05 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5 });
    const add = (name: string, geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D = this.root) => {
      const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = true; m.receiveShadow = true; parent.add(m); this.parts[name] = m; return m;
    };

    // Bassin (posé sur la selle)
    const pelvis = add('bassin', new THREE.SphereGeometry(0.15, 24, 16), pants); pelvis.scale.set(1, 0.55, 0.95); pelvis.position.copy(DIM.pelvis);

    // Buste : tour à section elliptique (taille marquée, poitrine, épaules arrondies)
    const prof = [[0.152, -0.085], [0.158, -0.04], [0.163, 0.02], [0.152, 0.13], [0.162, 0.25], [0.183, 0.35], [0.182, 0.42], [0.155, 0.475], [0.1, 0.51], [0.06, 0.525]];
    const tg = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 32); tg.scale(1, 1, 0.68); tg.computeVertexNormals();
    add('buste', tg, shirt, this.torso);
    // col et boutonnage (dos lisse, col visible)
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.016, 8, 24), shirt); collar.rotation.x = Math.PI / 2; collar.position.y = 0.52; collar.scale.set(1, 0.8, 1); this.torso.add(collar);
    for (const s of [-1, 1]) { // deltoïdes : épaules arrondies, dans la chemise
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.063, 18, 12), shirt); d.position.set(s * DIM.shoulderW, 0.455, 0); d.scale.set(1, 0.9, 0.95); d.castShadow = true; this.torso.add(d);
    }
    this.torso.position.copy(DIM.pelvis); this.root.add(this.torso);

    // Cou et tête casquée
    const neck = new THREE.Mesh(limbGeo(0.1, 0.05, 0.052, 0.055), skin); neck.rotation.x = Math.PI; neck.position.y = 0.5; this.torso.add(neck);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), skin); skull.scale.set(0.92, 1.12, 1.02); this.head.add(skull);
    for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), skin); ear.scale.set(0.5, 1, 0.8); ear.position.set(s * 0.093, -0.005, 0.01); this.head.add(ear); }
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.135, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.6), helmetM);
    helmet.scale.set(1, 1.02, 1.1); helmet.position.set(0, 0.03, 0.005); helmet.castShadow = true; this.head.add(helmet);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.126, 0.012, 8, 40), dark); rim.rotation.x = Math.PI / 2; rim.position.y = -0.006; rim.scale.set(1, 1.1, 1); this.head.add(rim);
    const visor = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.025, 0.08, 2, 0.01), dark); visor.position.set(0, 0.035, -0.13); visor.rotation.x = -0.15; this.head.add(visor);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.006, 6, 24, Math.PI), dark); strap.rotation.set(0, Math.PI / 2, Math.PI); strap.position.y = -0.015; this.head.add(strap);
    this.torso.add(this.head); this.head.position.set(0, 0.665, -0.02);

    // Bras : manche courte, avant-bras, coude, main
    for (const s of ['G', 'D']) {
      add('bras' + s, limbGeo(DIM.upperArm, 0.056, 0.054, 0.044), skin);
      add('manche' + s, limbGeo(0.16, 0.063, 0.06, 0.056), sleeve);
      add('coude' + s, new THREE.SphereGeometry(0.044, 14, 10), skin);
      add('avantbras' + s, limbGeo(DIM.foreArm, 0.045, 0.044, 0.031), skin);
      const hand = add('main' + s, new RoundedBoxGeometry(0.085, 0.105, 0.046, 3, 0.02), skin);
      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.04, 4, 8), skin); thumb.position.set(s === 'G' ? 0.042 : -0.042, -0.035, -0.02); thumb.rotation.z = (s === 'G' ? -1 : 1) * 0.6; hand.add(thumb);
      add('cuisse' + s, limbGeo(DIM.thigh, 0.088, 0.083, 0.06), pants);
      add('genou' + s, new THREE.SphereGeometry(0.06, 14, 10), pants);
      add('tibia' + s, limbGeo(DIM.shin, 0.058, 0.05, 0.044), pants);
      add('chaussure' + s, new RoundedBoxGeometry(0.1, 0.085, 0.27, 3, 0.03), shoe);
    }
    // Téléphone (tenu dans la main droite pendant l'étape 01)
    this.phone = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.15, 0.012, 2, 0.006), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, emissive: 0x1a2a44 }));
    this.parts['mainD'].add(this.phone); this.phone.position.set(0, -0.03, -0.035);
    this.setPose({});
  }

  /** Pose complète, recalculée à chaque appel (déterministe). */
  setPose(p: JosephPose) {
    const phone = p.phone ?? 0, lean = DIM.lean + (p.lean ?? 0);
    this.torso.rotation.set(-lean, 0, 0);
    this.head.rotation.set(lean * 0.8 + (p.headPitch ?? 0), p.headYaw ?? 0, 0); // la tête reste à peu près verticale
    this.torso.updateMatrixWorld(true); this.root.updateMatrixWorld(true);
    const toRoot = (v: THREE.Vector3) => this.root.worldToLocal(this.torso.localToWorld(v.clone()));
    const headPos = toRoot(this.head.position.clone());

    for (const side of [-1, 1]) {
      const s = side < 0 ? 'G' : 'D';
      // ── bras ──
      const sh = toRoot(V3(side * DIM.shoulderW, 0.455, 0));
      const grip = V3(side * MOTO_FIT.gripX, MOTO_FIT.barY, MOTO_FIT.barZ);
      let wrist = grip.clone().add(V3(0, 0.045, 0.055));
      let pole = V3(side * 0.9, -0.5, 0.4);
      if (side > 0 && phone > 0) {
        const phoneWrist = headPos.clone().add(V3(0.12, -0.12, -0.02));
        wrist = wrist.lerp(phoneWrist, phone);
        pole = pole.lerp(V3(0.6, -1, 0.3), phone);
      }
      const arm = solveTwoBone(sh, wrist, DIM.upperArm, DIM.foreArm, pole);
      orientSegment(this.parts['bras' + s], sh, arm.mid);
      orientSegment(this.parts['manche' + s], sh.clone().add(arm.mid.clone().sub(sh).multiplyScalar(-0.04)), arm.mid);
      this.parts['coude' + s].position.copy(arm.mid);
      orientSegment(this.parts['avantbras' + s], arm.mid, arm.end);
      // main : prolonge l'avant-bras puis s'enroule autour de la poignée
      const hand = this.parts['main' + s];
      const fdir = arm.end.clone().sub(arm.mid).normalize();
      const toGrip = grip.clone().sub(arm.end).normalize();
      const hdir = fdir.clone().lerp(phone > 0 && side > 0 ? V3(0, 1, 0) : toGrip, phone > 0 && side > 0 ? 0.5 * phone : 0.75).normalize();
      hand.position.copy(arm.end).addScaledVector(hdir, 0.05);
      hand.quaternion.setFromUnitVectors(DOWN, hdir);
      hand.rotateY(side * (0.25 - 0.25 * (side > 0 ? phone : 0)));
      (side < 0 ? this.contacts.handL : this.contacts.handR).copy(hand.position);
      // ── jambes ──
      const hip = DIM.pelvis.clone().add(V3(side * DIM.hipW, -0.025, 0.0));
      const ankleT = V3(side * MOTO_FIT.pegX, MOTO_FIT.pegY + 0.075, MOTO_FIT.pegZ + 0.065);
      const leg = solveTwoBone(hip, ankleT, DIM.thigh, DIM.shin, V3(side * 0.45, 0.45, -1));
      orientSegment(this.parts['cuisse' + s], hip, leg.mid);
      this.parts['genou' + s].position.copy(leg.mid);
      orientSegment(this.parts['tibia' + s], leg.mid, leg.end);
      const sh2 = this.parts['chaussure' + s];
      sh2.position.copy(leg.end).add(V3(side * 0.01, 0.002, -0.07)); sh2.rotation.set(0.12, side * -0.08, 0);
      (side < 0 ? this.contacts.ankleL : this.contacts.ankleR).copy(leg.end);
    }
    this.contacts.pelvisBottom = DIM.pelvis.y - 0.15 * 0.55;
    this.phone.visible = phone > 0.4;
    this.root.updateMatrixWorld(true);
  }

  /** Boîtes des chaussures dans le repère de la moto (contrôle « les pieds ne traversent pas la moto »). */
  shoeBoxes(): THREE.Box3[] {
    this.root.updateMatrixWorld(true);
    const inv = this.root.matrixWorld.clone().invert();
    return ['G', 'D'].map((s) => { const m = this.parts['chaussure' + s]; m.geometry.computeBoundingBox(); return m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld).applyMatrix4(inv); });
  }
}

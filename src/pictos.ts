// Pictogrammes originaux (SVG, trait 2 px sur grille 48).
// Une seule famille : coins légèrement arrondis, encre marine, accent jaune.

const S = (vb: string, body: string, label: string) =>
  `<svg viewBox="${vb}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const motoPath = (x: number, y: number, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="6" cy="16" r="5"/><circle cx="30" cy="16" r="5"/>
    <path d="M6 16 L14 8 H22 L26 4 H31"/><path d="M14 8 L19 16 H25 L30 16"/><path d="M17 6 H24"/>
  </g>`;

const carPath = (x: number, y: number, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path d="M2 16 V11 L6 4 H26 L32 11 H36 V16"/><path d="M2 16 H36"/>
    <circle cx="9" cy="17" r="4"/><circle cx="29" cy="17" r="4"/><path d="M8 11 H32"/>
  </g>`;

export const PICTO = {
  permis: S('0 0 64 48', `
    <rect x="4" y="6" width="56" height="36" rx="4"/>
    <rect x="10" y="13" width="15" height="19" rx="2" fill="var(--accent)" stroke="currentColor"/>
    <circle cx="17.5" cy="20" r="3.4"/><path d="M12 30 C13 25 22 25 23 30"/>
    <path d="M31 15 H52"/><path d="M31 22 H48"/><path d="M31 29 H44"/><path d="M10 37 H52" stroke-dasharray="2 3"/>`,
    'Permis de conduire'),

  bouclierMoto: S('0 0 48 48', `
    <path d="M24 4 L40 10 V22 C40 33 33 40 24 44 C15 40 8 33 8 22 V10 Z" fill="var(--accent)"/>
    ${motoPath(10, 15, 0.78)}`,
    'Bouclier avec une moto : assurance moto'),

  assurance: S('0 0 120 56', `
    ${motoPath(4, 22, 1)}
    ${carPath(74, 22, 1.05)}
    <path d="M52 30 L56 25 L58 31 L63 28 L60 34 L65 37 L58 37 L57 42 L54 37" stroke="var(--danger)"/>
    <path d="M60 2 L72 6 V14 C72 21 67 25 60 28 C53 25 48 21 48 14 V6 Z" fill="var(--accent)"/>
    <path d="M55 14 L59 18 L66 10"/>`,
    'Une moto, une voiture et un bouclier : la responsabilité civile couvre les dommages causés aux autres'),

  trajet: S('0 0 140 64', `
    <path d="M6 30 L18 20 L30 30"/><path d="M10 27 V42 H26 V27"/><rect x="15" y="33" width="6" height="9"/>
    <path d="M32 38 H104" stroke-dasharray="4 4" stroke-width="2.4"/>
    <path d="M100 34 L106 38 L100 42"/>
    <rect x="110" y="16" width="22" height="26" rx="1.5"/>
    <path d="M115 22 h4 M123 22 h4 M115 29 h4 M123 29 h4 M115 36 h4 M123 36 h4"/>
    <path d="M68 38 C70 52 82 56 92 56" stroke="var(--danger)" stroke-dasharray="3 4"/>
    <circle cx="98" cy="56" r="5.5" stroke="var(--danger)"/><path d="M96 54 C96 51.5 100 51.5 100 54 C100 55.5 98 55.5 98 57.5" stroke="var(--danger)" stroke-width="1.6"/>
    <text x="40" y="12" font-size="9" fill="currentColor" stroke="none" font-family="system-ui,sans-serif" font-weight="700">maison → travail</text>`,
    'Parcours de la maison au travail ; un détour personnel peut changer la reconnaissance'),

  feu: S('0 0 48 64', `
    <rect x="14" y="4" width="20" height="44" rx="5" fill="#1b1f27" stroke="#1b1f27"/>
    <circle cx="24" cy="14" r="5" fill="#ff3b30" stroke="none"/>
    <circle cx="24" cy="26" r="5" fill="#3a3f48" stroke="none"/>
    <circle cx="24" cy="38" r="5" fill="#3a3f48" stroke="none"/>
    <path d="M24 48 V60"/>`,
    'Feu rouge'),

  moto: S('0 0 48 32', motoPath(6, 6, 1), 'Moto'),
};


/** Illustrations du tutoriel (trois actions, lisibles sans lire). */
export const TUTO_ART = {
  ecouter: S('0 0 160 120', `
    <rect x="18" y="24" width="124" height="72" rx="10" fill="#fbf8f1"/>
    <path d="M44 50 H58 L76 36 V84 L58 70 H44 Z" fill="var(--accent)"/>
    <path d="M88 48 a16 16 0 0 1 0 24"/><path d="M96 40 a28 28 0 0 1 0 40"/><path d="M104 32 a40 40 0 0 1 0 56" stroke-dasharray="3 5"/>`,
    'Un haut-parleur : appuie pour écouter la consigne'),
  choisir: S('0 0 160 120', `
    <rect x="14" y="22" width="62" height="40" rx="8" fill="#17804a" stroke="#17804a"/>
    <rect x="84" y="22" width="62" height="40" rx="8" fill="#fbf8f1"/>
    <path d="M30 42 l8 8 l16 -16" stroke="#fff" stroke-width="3"/>
    <path d="M104 34 l22 16 M126 34 l-22 16" stroke-width="2.5"/>
    <path d="M44 104 V76 a5 5 0 0 1 10 0 V90 l14 3 a6 6 0 0 1 5 7 l-2 4" fill="var(--accent)"/>
    <circle cx="49" cy="66" r="4" fill="var(--accent)" stroke="none"/>`,
    'Un doigt touche une des deux réponses'),
  continuer: S('0 0 160 120', `
    <rect x="22" y="38" width="116" height="48" rx="10" fill="var(--accent)" stroke="var(--accent)"/>
    <path d="M52 62 H104"/><path d="M92 50 L106 62 L92 74"/>
    <path d="M110 108 V92 a5 5 0 0 1 10 0" />`,
    'Une flèche : appuie pour passer à la suite'),
};

export const ICON = {
  back: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 L8 12 L15 19"/></svg>`,
  hand: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12 V6.5 a1.5 1.5 0 0 1 3 0 V11 V4.5 a1.5 1.5 0 0 1 3 0 V11 V5.5 a1.5 1.5 0 0 1 3 0 V12 V8.5 a1.5 1.5 0 0 1 3 0 V14 c0 4 -3 7 -7 7 c-3 0 -5 -1.5 -6.5 -4 L4 13.5 a1.6 1.6 0 0 1 2.6 -1.8 Z"/></svg>`,
  go: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 6 L11 12 L5 18"/><path d="M13 6 L19 12 L13 18"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7 H14 M18 7 H20 M4 17 H8 M12 17 H20"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>`,
  book: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5 a2 2 0 0 1 2 -2 H19 V18 H6 a2 2 0 0 0 -2 2 Z"/><path d="M4 20 a2 2 0 0 0 2 1 H19"/><path d="M8 7 H15 M8 10.5 H13"/></svg>`,
  replay: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12 a8 8 0 1 0 2.5 -5.8"/><path d="M4 4 V9 H9"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12 C5 6 19 6 22 12 C19 18 5 18 2 12 Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  speaker: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M4 9 H8 L13 5 V19 L8 15 H4 Z"/><path d="M16.5 9 a4 4 0 0 1 0 6"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5 H13"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 L10 17 L19 7"/></svg>`,
  cross: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>`,
  play: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M8 5.5 L19 12 L8 18.5 Z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>`,
  home: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11 L12 4 L20 11"/><path d="M6.5 9.5 V20 H17.5 V9.5"/><path d="M10 20 V14 H14 V20"/></svg>`,
  help: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5 a2.5 2.5 0 1 1 3.5 2.3 c-0.7 0.3 -1 0.9 -1 1.7 V14.5"/><path d="M12 17.5 V17.6"/></svg>`,
  next: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12 H19"/><path d="M13 6 L19 12 L13 18"/></svg>`,
  prev: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12 H5"/><path d="M11 6 L5 12 L11 18"/></svg>`,
  ear: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9 a5 5 0 1 1 10 0 c0 3 -3 4 -3 7 a3 3 0 0 1 -5.5 1.6"/><path d="M10 9.5 a2 2 0 1 1 4 0 c0 1.2 -1.2 1.6 -1.6 2.6"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12 H21"/><path d="M12 3 C8.5 7 8.5 17 12 21 C15.5 17 15.5 7 12 3 Z"/></svg>`,
};

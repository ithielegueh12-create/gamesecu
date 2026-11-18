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
};

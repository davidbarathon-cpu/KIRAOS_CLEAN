// ═══════════════════════════════════════════
//  THEME.JS — Couleurs, thèmes, constantes visuelles
// ═══════════════════════════════════════════

export const THEMES = {
  cosmos: {
    bg: '#05050f',
    surface: '#0e0e1e',
    border: 'rgba(108,99,255,0.15)',
    accent: '#6C63FF',
    name: 'Cosmos',
  },
  aurora: {
    bg: '#030e09',
    surface: '#071a11',
    border: 'rgba(67,217,173,0.15)',
    accent: '#43D9AD',
    name: 'Aurora',
  },
  sunset: {
    bg: '#0c0602',
    surface: '#180e05',
    border: 'rgba(255,140,50,0.15)',
    accent: '#FF8C32',
    name: 'Sunset',
  },
};

// Couleurs daltonien-friendly (contrastes élevés, évite rouge/vert proches)
export const PALETTE = {
  blue: '#4FC3F7',
  purple: '#6C63FF',
  pink: '#FF6584',
  orange: '#FFB347',
  teal: '#43D9AD',
  yellow: '#FBBF24',
  violet: '#A78BFA',
  magenta: '#F472B6',
  green: '#34D399',
  cyan: '#22D3EE',
  gray: '#64748B',
  white: '#e8e8f8',
  textMuted: '#666677',
  textFaint: '#444455',
};

export const KIRA_STATE_COLORS = {
  rush: '#FF6584',
  flow: '#6C63FF',
  recovery: '#43D9AD',
};

export const KIRA_STATE_LABELS = {
  rush: '⚡ Rush',
  flow: '🌊 Flow',
  recovery: '🌙 Récupération',
};

export function getTheme(themeName = 'cosmos') {
  return THEMES[themeName] || THEMES.cosmos;
}

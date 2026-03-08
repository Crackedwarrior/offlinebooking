import { ShowTime } from '@/store/bookingStore';

export type BookingAccentTheme = {
  pageBackground: string;
  surface: string;
  surfaceBorder: string;
  cardSurface: string;
  sidebarBackground: string;
  sidebarBorder: string;
  sidebarText: string;
  sidebarButton: string;
};

const DEFAULT_ACCENT: BookingAccentTheme = {
  pageBackground: '#F6FBF7',
  surface: '#FFFFFF',
  surfaceBorder: '#D1FAE5',
  cardSurface: '#FFFFFF',
  sidebarBackground: '#ECFDF5',
  sidebarBorder: '#6EE7B7',
  sidebarText: '#047857',
  sidebarButton: '#059669'
};

const ACCENT_THEMES: Record<ShowTime, BookingAccentTheme> = {
  MORNING: {
    pageBackground: '#EEF4FF',
    surface: '#FFFFFF',
    surfaceBorder: '#C7D7FF',
    cardSurface: '#F8FAFF',
    sidebarBackground: '#DBEAFE',
    sidebarBorder: '#93C5FD',
    sidebarText: '#1D4ED8',
    sidebarButton: '#1E3A8A'
  },
  MATINEE: {
    pageBackground: '#FFF8ED',
    surface: '#FFFFFF',
    surfaceBorder: '#FFE1A8',
    cardSurface: '#FFFDF5',
    sidebarBackground: '#FEF3C7',
    sidebarBorder: '#FCD34D',
    sidebarText: '#92400E',
    sidebarButton: '#B45309'
  },
  EVENING: {
    pageBackground: '#FFF3EC',
    surface: '#FFFFFF',
    surfaceBorder: '#FFD4BA',
    cardSurface: '#FFF8F2',
    sidebarBackground: '#FFE4D3',
    sidebarBorder: '#FDBA74',
    sidebarText: '#C2410C',
    sidebarButton: '#B45309'
  },
  NIGHT: {
    pageBackground: '#F3F4FF',
    surface: '#FFFFFF',
    surfaceBorder: '#CBD5F5',
    cardSurface: '#F8FAFF',
    sidebarBackground: '#E2E8F0',
    sidebarBorder: '#A5B4FC',
    sidebarText: '#1E293B',
    sidebarButton: '#0F172A'
  }
};

export const getAccentTheme = (show: ShowTime | null): BookingAccentTheme => {
  if (!show) {
    return DEFAULT_ACCENT;
  }

  return ACCENT_THEMES[show] ?? DEFAULT_ACCENT;
};


import { create } from 'zustand';

type ViewType = 'dashboard' | 'calendar' | 'scheduler' | 'resources' | 'reports';
type ThemeType = 'light' | 'dark';

interface UIState {
  currentView: ViewType;
  theme: ThemeType;
  selectedCalendarIds: string[];
  setView: (view: ViewType) => void;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
  toggleCalendarFilter: (calendarId: string) => void;
  setCalendarFilters: (calendarIds: string[]) => void;
}

export const useUIStore = create<UIState>((set: any) => ({
  currentView: 'dashboard',
  theme: (localStorage.getItem('sici_theme') as ThemeType) || 'light',
  selectedCalendarIds: [],

  setView: (view: ViewType) => set({ currentView: view }),

  toggleTheme: () => set((state: UIState) => {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('sici_theme', nextTheme);
    return { theme: nextTheme };
  }),

  setTheme: (theme: ThemeType) => {
    localStorage.setItem('sici_theme', theme);
    set({ theme });
  },

  toggleCalendarFilter: (calendarId: string) => set((state: UIState) => {
    const active = state.selectedCalendarIds.includes(calendarId);
    const nextFilters = active
      ? state.selectedCalendarIds.filter((id: string) => id !== calendarId)
      : [...state.selectedCalendarIds, calendarId];
    return { selectedCalendarIds: nextFilters };
  }),

  setCalendarFilters: (selectedCalendarIds: string[]) => set({ selectedCalendarIds }),
}));

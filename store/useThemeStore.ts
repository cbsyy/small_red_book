import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ThemeMode } from '@/types';

interface ThemeState {
  mode: ThemeMode;
  accentColor: string;

  // Actions
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setAccentColor: (color: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'light',
      accentColor: '#ff2442', // 小红书红

      setMode: (mode) => set({ mode }),

      toggleMode: () =>
        set((state) => ({
          mode: state.mode === 'light' ? 'dark' : 'light',
        })),

      setAccentColor: (color) => set({ accentColor: color }),
    }),
    {
      name: 'theme-store',
    }
  )
);

// 预设主题色
export const ACCENT_COLORS = [
  { name: '小红书红', color: '#ff2442' },
  { name: '抖音蓝', color: '#00f2ea' },
  { name: '清新绿', color: '#07c160' },
  { name: '活力橙', color: '#ff6b00' },
  { name: '优雅紫', color: '#7c3aed' },
  { name: '经典蓝', color: '#2563eb' },
];

'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { mode, accentColor } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;

    // 设置主题模式
    root.setAttribute('data-theme', mode);

    // 设置主题色
    root.style.setProperty('--accent', accentColor);

    // 计算hover颜色（稍微变暗）
    const hoverColor = adjustColor(accentColor, -10);
    root.style.setProperty('--accent-hover', hoverColor);
  }, [mode, accentColor]);

  return <>{children}</>;
}

// 调整颜色亮度
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

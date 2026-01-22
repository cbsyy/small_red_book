import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/theme/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "予露 | 让你的内容直通爆款",
  description: "让每一篇内容都拥有瞬间引爆社交媒体的魔力",
  keywords: "内容创作,爆款文案,社交媒体,AI写作",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

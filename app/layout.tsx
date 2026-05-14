import type { Metadata } from "next";
import { Inter, Noto_Sans_TC, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { AppBackground } from "@/components/AppBackground";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoTc = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-noto-tc",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoJp = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-jp",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "日文快上手｜AI 日文詞彙複習系統",
  description:
    "將零散日文單字織成一張真正記得住的知識網。每日 AI 生成詞庫、圖像記憶、Romaji 輔助、TTS 發音與舊新詞智能連結。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant" className={`${inter.variable} ${notoTc.variable} ${notoJp.variable}`}>
      <body className="font-sans antialiased">
        <AppBackground />
        {children}
      </body>
    </html>
  );
}

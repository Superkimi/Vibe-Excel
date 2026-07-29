import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vibe Excel - 对话生成可交付的表格模型",
    template: "%s | Vibe Excel",
  },
  description: "一个 Schema 先行、AI 原生的在线 Excel 工作台。手工编辑、对话建模、预览与 XLSX 导出都在一个界面里完成。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

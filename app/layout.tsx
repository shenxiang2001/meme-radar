import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "热梗雷达 · 用一句话找到表情包",
  description: "追踪近期网络热梗，用自然语言搜索此刻最对味的表情包。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}

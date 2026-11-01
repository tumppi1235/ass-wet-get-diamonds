import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trail Relics · Shared World",
  description: "Trail Relics shared world services.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

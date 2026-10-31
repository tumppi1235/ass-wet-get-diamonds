import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trail Relics · Shared Development",
  description: "Isolated shared development services for Trail Relics.",
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

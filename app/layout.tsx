import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Awareday",
  description: "Mobile-first timestamp logger foundation",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}


import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lux Interface",
  description: "A Next.js application built with Lux",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

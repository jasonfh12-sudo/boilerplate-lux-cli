import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FlowDevIndicator } from "@/components/FlowDevIndicator";

export const metadata: Metadata = {
  title: "Next.js App",
  description: "A Next.js application",
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
        <Toaster />
        <FlowDevIndicator />
      </body>
    </html>
  );
}

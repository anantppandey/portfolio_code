import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { SmoothScroll } from "@/components/SmoothScroll";
import { ClientParticleField } from "@/components/ClientParticleField";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Anant Pandey — Robotics Engineer",
  description:
    "Robotics Engineer & Embodied AI Builder. I build robots that learn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="bg-canvas text-ink min-h-screen antialiased">
        <CustomCursor />
        <SmoothScroll>
          <ClientParticleField />
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}

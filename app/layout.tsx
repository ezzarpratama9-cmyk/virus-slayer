import type { Metadata } from "next";
import { Space_Grotesk, Syne } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VIRUS_SLAYER.EXE — Brutalist Security Scanner",
  description:
    "Scan URL dan file secara instan menggunakan VirusTotal API v3. Antarmuka neo-brutalism, hasil deteksi real-time dari puluhan mesin antivirus.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${spaceGrotesk.variable} ${syne.variable} font-body dot-grid-bg text-brutal-black antialiased selection:bg-brutal-black selection:text-brutal-yellow`}
      >
        {children}
      </body>
    </html>
  );
}

// Eigenes Root-Layout für die Sprachauswahl: Diese Route liegt bewusst außerhalb
// von [locale] (noch keine Sprache gewählt), das app/layout.tsx reicht children
// nur durch. <html>/<body> liefert sonst nur das Locale-Layout — hier müssen wir
// sie selbst bereitstellen.
//
// Schriften wie im Design: Hanken Grotesk (Latein) + IBM Plex Sans Arabic (RTL).
import { Hanken_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";
import "../globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export default function LanguageLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${hanken.variable} ${ibmArabic.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

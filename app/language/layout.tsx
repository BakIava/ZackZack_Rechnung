// Eigenes Root-Layout für die Sprachauswahl: Diese Route liegt bewusst außerhalb
// von [locale] (noch keine Sprache gewählt), das app/layout.tsx reicht children
// nur durch. <html>/<body> liefert sonst nur das Locale-Layout — hier müssen wir
// sie selbst bereitstellen.
//
// Schriften wie im Design (Hanken Grotesk + IBM Plex Sans Arabic) kommen global
// aus app/layout.tsx.
import "../globals.css";

export default function LanguageLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

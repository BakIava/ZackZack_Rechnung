// Eigenes Root-Layout für die Sprachauswahl: Diese Route liegt bewusst außerhalb
// von [locale] (noch keine Sprache gewählt), das app/layout.tsx reicht children
// nur durch. <html>/<body> liefert sonst nur das Locale-Layout — hier müssen wir
// sie selbst bereitstellen.
export default function LanguageLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

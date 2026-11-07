// UI-Schriften einmal für alle Routen, selbst gehostet über Fontsource (npm):
// kein Abruf bei Google – weder im Browser noch beim Build. Die Familien stehen
// als --font-hanken / --font-plex-arabic in globals.css. Das PDF nutzt eigene
// TTF-Dateien (lib/pdf/fonts).
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/500.css";
import "@fontsource/hanken-grotesk/600.css";
import "@fontsource/hanken-grotesk/700.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

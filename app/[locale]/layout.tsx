import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Hanken_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { routing, isRtlLocale } from "@/i18n/routing";
import { NavigationLoadingOverlay } from "@/components/shared/navigation-loading-overlay";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// App-Schriften auch hier laden: das Seitenwechsel-Overlay liegt außerhalb der App-Shell.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Zack Zack Rechnung",
  description: "Rechtssichere Rechnungen und Angebote für Handwerker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zack Zack Rechnung",
  },
};

export const viewport: Viewport = {
  themeColor: "#171717",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${hanken.variable} ${plexArabic.variable} min-h-svh antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <NavigationLoadingOverlay className="zz-loading" />
          {children}
        </NextIntlClientProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}

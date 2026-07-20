import { Hanken_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";
import { setRequestLocale } from "next-intl/server";
import { LoginFlow } from "@/components/login/login-flow";
import { routing, isRtlLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getCompanyNameAndDirector } from "@/lib/repositories/companies";
import { hasUserProfile } from "@/lib/repositories/users";

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

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

// Hängt an der Live-Session (Sperrbildschirm vs. Willkommen) → immer serverseitig.
export const dynamic = "force-dynamic";

/** Initialen aus Name (max. 2 Wörter) oder E-Mail — Fallback-Avatar. */
function toInitials(owner: string, email: string): string {
  const source = owner.trim() || email.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]);
  return (letters.join("") || source.slice(0, 2) || "?").toUpperCase();
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  // Gültige Session? → Sperrbildschirm statt Willkommen.
  const user = await getCurrentUser();
  let lockUser: { owner: string; company: string; initials: string } | null = null;
  let unlockPath = "/dashboard";
  if (user) {
    const [{ name, director }, hasProfile] = await Promise.all([
      getCompanyNameAndDirector(),
      hasUserProfile(user.id),
    ]);
    const email = user.email ?? "";
    const owner = director || email.split("@")[0] || "";
    lockUser = { owner, company: name, initials: toInitials(owner, email) };
    // Ohne abgeschlossenes Onboarding führt „Entsperren" ins Setup, sonst ins Dashboard.
    unlockPath = hasProfile ? "/dashboard" : "/setup";
  }

  return (
    <div className={`${hanken.variable} ${plexArabic.variable}`}>
      <LoginFlow
        dir={dir}
        locale={locale}
        initialPhase={user ? "locked" : "welcome"}
        lockUser={lockUser}
        unlockPath={unlockPath}
      />
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

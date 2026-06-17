/** Locale-neutral fallback shown by the service worker when navigation fails offline. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold">Offline</h1>
        <p className="text-muted-foreground">
          Keine Internetverbindung. Gespeicherte Stammdaten, Katalog und Kunden
          bleiben nutzbar, sobald die App geladen war.
        </p>
        <p className="text-sm text-muted-foreground" dir="rtl">
          لا يوجد اتصال بالإنترنت. البيانات المحفوظة تبقى متاحة.
        </p>
        <p className="text-sm text-muted-foreground">
          İnternet yok. Kayıtlı veriler kullanılabilir.
        </p>
      </div>
    </main>
  );
}

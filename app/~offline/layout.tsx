import "../globals.css";

export default function OfflineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-svh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}

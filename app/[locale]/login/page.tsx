import Link from "next/link";

type Props = { params: Promise<{ locale: string }> };

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;

  return (
    <div>
      <h1>Login</h1>
      <form>
        <input type="email" placeholder="E-Mail" />
        <input type="text" placeholder="6-stelliger Code" />
        <Link href={`/${locale}/dashboard`}>
          <button type="button">Weiter</button>
        </Link>
      </form>
    </div>
  );
}

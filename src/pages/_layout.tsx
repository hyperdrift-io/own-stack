import '../styles.css';

import type { ReactNode } from 'react';
import { Footer } from '../components/footer';
import { Header } from '../components/header';

type RootLayoutProps = { children: ReactNode };

export default async function RootLayout({ children }: RootLayoutProps) {
  const data = await getData();

  return (
    <>
      <meta name="description" content={data.description} />
      <link rel="icon" type="image/png" href={data.icon} />
      {/* Installable web app: manifest + theme + iOS add-to-home-screen hints. */}
      <link rel="manifest" href="/manifest.webmanifest" />
      <meta name="theme-color" content="#091017" />
      <link rel="apple-touch-icon" href="/images/icon-192.png" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="own-stack" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      {/* Type via <link>, not a package — the "5 dependencies" count stays honest. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=Space+Mono:wght@400;700&display=swap"
      />
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}

const getData = async () => {
  return {
    description: 'A server-rendered React stack you own — no Next.js.',
    icon: '/images/favicon.png',
  };
};

export const getConfig = async () => {
  return {
    render: 'static',
  } as const;
};

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

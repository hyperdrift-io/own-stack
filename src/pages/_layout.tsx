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

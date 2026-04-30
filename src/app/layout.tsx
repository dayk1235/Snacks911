import type { Metadata } from 'next';
import { Inter, Bebas_Neue } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const bebas = Bebas_Neue({
  variable: '--font-bebas',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  fallback: ['Impact', 'Arial Narrow', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'Snacks 911 — Antojo de Emergencia 🚨',
  description:
    'Alitas, Boneless y Papas que te van a dejar sin palabras. Pide ahora y recibe en 30 minutos.',
  keywords: ['alitas', 'boneless', 'papas', 'snacks', 'delivery', 'comida'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth" className={`${inter.variable} ${bebas.variable} h-full`}>
      <head>
        <link rel="preload" as="image" href="/images/hero.webp" fetchPriority="high" />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}

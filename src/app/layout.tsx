import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
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
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

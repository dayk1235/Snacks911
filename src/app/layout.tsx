import type { Metadata } from 'next';
import { Inter, Bebas_Neue, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import BackgroundSystem from '@/components/layout/BackgroundSystem';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

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

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin'],
  display: 'swap',
  fallback: ['Inter', 'system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://snacks911-lro4.vercel.app'),
  title: 'Snacks 911 — Tu antojo en 30 min 🚨',
  description: 'Alitas, boneless y snacks con salsas 100% caseras. Entrega a domicilio en Iztapalapa. Pide por WhatsApp.',

  openGraph: {
    title: 'Snacks 911 🚨 — Antojo de Emergencia',
    description: 'Alitas, boneless, papas loaded. Salsas caseras. 30 minutos a tu puerta.',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://snacks911-lro4.vercel.app',
    siteName: 'Snacks 911',
    images: [{
      url: '/images/og-cover.webp',
      width: 1200,
      height: 630,
      alt: 'Snacks 911 — Alitas y Boneless a domicilio en Iztapalapa',
    }],
    locale: 'es_MX',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth" className={`${inter.variable} ${bebas.variable} ${plusJakarta.variable} h-full`}>
      <head>
        <link rel="preload" as="image" href="/images/hero.webp" fetchPriority="high" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FoodEstablishment",
              "name": "Snacks 911",
              "description": "Alitas, boneless y snacks con salsas caseras. Delivery en Iztapalapa.",
              "url": process.env.NEXT_PUBLIC_SITE_URL || "https://snacks911-lro4.vercel.app",
              "telephone": `+${process.env.NEXT_PUBLIC_WA_NUMBER || '5215500000000'}`,
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "Ejército Constitucionalista",
                "addressLocality": "Iztapalapa",
                "postalCode": "09220",
                "addressCountry": "MX"
              },
              "openingHours": "Mo-Su 14:00-23:00",
              "servesCuisine": ["Alitas", "Boneless", "Snacks"],
              "priceRange": "$$"
            })
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <BackgroundSystem />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

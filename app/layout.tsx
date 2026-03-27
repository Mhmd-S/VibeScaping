import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from "@vercel/analytics/next"
import './globals.css';

import Providers from './providers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibescaping.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "VibeScaping - AI Sketch to Image | Whiteboard AI with Nano Banana Editor",
    template: "%s | VibeScaping"
  },
  description: "Transform your AI sketches into stunning images with VibeScaping's intelligent whiteboard AI. Draw, refine, and create with our AI sketch to image tool powered by Nano Banana Editor (NBP).",
  keywords: [
    'AI sketch to image',
    'whiteboard AI',
    'Nano Banana Editor',
    'NBP',
    'AI drawing tool',
    'sketch to image converter',
    'AI design tool',
    'creative AI',
    'whiteboard drawing',
    'AI image generation',
    'neural backpropagation',
    'BYOK',
    'bring your own key',
    'local AI',
    'privacy-first AI',
  ],
  authors: [{ name: 'VibeScaping' }],
  creator: 'VibeScaping',
  publisher: 'VibeScaping',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/vibescape_logo_rounded.png', sizes: 'any', type: 'image/png' },
    ],
    shortcut: '/favicon-32x32.png',
    apple: '/vibescape_logo_rounded.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'VibeScaping',
    title: 'VibeScaping - AI Sketch to Image | Whiteboard AI with Nano Banana Editor',
    description: 'Transform your AI sketches into stunning images with VibeScaping\'s intelligent whiteboard AI. Draw, refine, and create with our AI sketch to image tool powered by Nano Banana Editor (NBP).',
    images: [
      {
        url: '/vibescape_logo_rounded.png',
        width: 1200,
        height: 630,
        alt: 'VibeScaping - AI Sketch to Image Whiteboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VibeScaping - AI Sketch to Image | Whiteboard AI',
    description: 'Transform your AI sketches into stunning images with intelligent whiteboard AI powered by Nano Banana Editor (NBP).',
    images: ['/vibescape_logo_rounded.png'],
    creator: '@vibescaping',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibescaping.com';

    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'VibeScaping',
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Web',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
        description: 'Transform your AI sketches into stunning images with VibeScaping\'s intelligent whiteboard AI. Draw, refine, and create with our AI sketch to image tool powered by Nano Banana Editor (NBP).',
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            ratingCount: '150',
        },
        featureList: [
            'AI sketch to image conversion',
            'Intelligent whiteboard AI',
            'Nano Banana Editor (NBP) integration',
            'Local storage and privacy',
            'Bring your own API key',
        ],
    };

    const organizationData = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'VibeScaping',
        url: siteUrl,
        logo: `${siteUrl}/vibescape_logo_rounded.png`,
        description: 'AI-powered whiteboard tool for transforming sketches into images',
        sameAs: [],
    };

    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
                />
                <Providers>
                    {children}
                </Providers>
                <Analytics />
            </body>
        </html>
    );
}

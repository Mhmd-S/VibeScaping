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
  title: "VibeScaping - AI Sketch to Image | Whiteboard AI",
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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'VibeScaping',
    title: "VibeScaping - AI Sketch to Image | Whiteboard AI",
    description: "Transform your AI sketches into stunning images with VibeScaping's intelligent whiteboard AI. Draw, refine, and create with our AI sketch to image tool powered by Nano Banana Editor (NBP).",
    images: [
      {
        url: `${siteUrl}/vibescape_logo.png`,
        width: 1200,
        height: 630,
        alt: 'VibeScaping - AI Sketch to Image | Whiteboard AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "VibeScaping - AI Sketch to Image | Whiteboard AI",
    description: "Transform your AI sketches into stunning images with VibeScaping's intelligent whiteboard AI. Draw, refine, and create with our AI sketch to image tool powered by Nano Banana Editor (NBP).",
    images: [`${siteUrl}/vibescape_logo.png`],
  },
  alternates: {
    canonical: siteUrl,
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
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <Providers>
                    {children}
                </Providers>
                <Analytics />
            </body>
        </html>
    );
}

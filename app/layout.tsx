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

export const metadata: Metadata = {
  title: "Vibescaping - An Intilligent whiteboard for your ideas",
  description: "Use a whiteboard to brainstorm your ideas with the power of AI. Draw, describe, and watch your ideas come to life.",
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/vibescape_logo_rounded.png', sizes: 'any', type: 'image/png' },
    ],
    shortcut: '/favicon-32x32.png',
    apple: '/vibescape_logo_rounded.png',
  },
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

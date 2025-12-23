import type { Metadata } from 'next';
import ChatLayoutClient from '@/app/components/chat/ChatLayoutClient';
import { getSession } from '@/app/utils/auth';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vibescaping.com';

export const metadata: Metadata = {
    title: 'AI Sketch to Image Converter | Whiteboard AI Tool',
    description: 'Convert your AI sketches to stunning images with our intelligent whiteboard AI. Draw on the whiteboard and watch your sketches transform into detailed images using Nano Banana Editor (NBP) technology.',
    openGraph: {
        title: 'AI Sketch to Image Converter | Whiteboard AI Tool',
        description: 'Convert your AI sketches to stunning images with our intelligent whiteboard AI. Draw and transform your sketches into detailed images.',
        url: `${siteUrl}/chat`,
        images: [
            {
                url: '/vibescape_logo_rounded.png',
                width: 1200,
                height: 630,
                alt: 'VibeScaping - AI Sketch to Image Converter',
            },
        ],
    },
    twitter: {
        title: 'AI Sketch to Image Converter | Whiteboard AI',
        description: 'Convert your AI sketches to stunning images with intelligent whiteboard AI powered by Nano Banana Editor.',
    },
    alternates: {
        canonical: `${siteUrl}/chat`,
    },
};

const ChatLayout = async ({ children }: { children: React.ReactNode }) => {
    const session = await getSession();
    
    const webAppData = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'VibeScaping - AI Sketch to Image Converter',
        description: 'Convert your AI sketches to stunning images with our intelligent whiteboard AI tool.',
        url: `${siteUrl}/chat`,
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Web',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
        featureList: [
            'AI sketch to image conversion',
            'Interactive whiteboard AI',
            'Real-time image generation',
            'Nano Banana Editor (NBP) integration',
        ],
    };
    
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppData) }}
            />
            <ChatLayoutClient
                userName={session?.user?.name || 'User'}
                userEmail={session?.user?.email || ''}
                userId={session?.user?.id || null}
            >
                {children}
            </ChatLayoutClient>
        </>
    );
};

export default ChatLayout;

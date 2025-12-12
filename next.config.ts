import type { NextConfig } from 'next';

const getPublicUrl = () =>
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL;

const buildRemotePatterns = () => {
    const publicUrl = getPublicUrl();

    if (!publicUrl) {
        return [];
    }

    try {
        const url = new URL(publicUrl);
        const pathname = url.pathname === '/' ? '/**' : `${url.pathname.replace(/\/$/, '')}/**`;

        return [
            {
                protocol: url.protocol.replace(':', ''),
                hostname: url.hostname,
                pathname,
            },
        ];
    } catch (error) {
        console.warn('Invalid CLOUDFLARE_R2_PUBLIC_URL; skipping remote pattern', error);
        return [];
    }
};

const nextConfig: NextConfig = {
    images: {
        remotePatterns: buildRemotePatterns(),
    },
    env: {
        CLOUDFLARE_R2_PUBLIC_URL: getPublicUrl(),
    },
};

export default nextConfig;

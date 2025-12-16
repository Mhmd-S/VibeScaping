export const formatDate = (value: string) => {
    const date = new Date(value);
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const buildPlaceholderName = () => {
    const now = new Date();
    const formatted = now.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    return `Workspace ${formatted}`;
};

const publicImageBaseUrl =
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL;

export const toPublicImageUrl = (originalUrl?: string | null) => {
    if (!originalUrl) return undefined;
    if (!publicImageBaseUrl) return originalUrl;

    try {
        const parsed = new URL(originalUrl);
        const segments = parsed.pathname.split('/').filter(Boolean);

        if (segments.length === 0) return originalUrl;

        // Keep leading "workspaces" prefix; otherwise drop only a bucket segment
        const keyPath = segments[0] === 'workspaces' ? segments.join('/') : segments.slice(1).join('/') || segments[0];
        const normalizedBase = publicImageBaseUrl.replace(/\/$/, '');

        return `${normalizedBase}/${keyPath}`;
    } catch (error) {
        console.warn('Failed to build public image URL, falling back to original', error);
        return originalUrl;
    }
};


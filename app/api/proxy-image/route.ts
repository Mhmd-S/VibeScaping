import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy route to fetch images from R2 and serve them with proper CORS headers
 * This allows images to be used in canvas operations without CORS errors
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        // Validate that the URL is from an allowed domain (R2 or public URL)
        const url = new URL(imageUrl);
        const allowedHosts = [
            'r2.dev',
            'cloudflarestorage.com',
            process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL 
                ? new URL(process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL).hostname 
                : null,
        ].filter(Boolean);

        const isAllowed = allowedHosts.some(host => 
            url.hostname === host || url.hostname.endsWith(`.${host}`)
        );

        if (!isAllowed) {
            return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
        }

        // Fetch the image
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch image: ${response.status}` },
                { status: response.status }
            );
        }

        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Return the image with CORS headers
        return new NextResponse(imageBuffer, {
            headers: {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error proxying image:', error);
        return NextResponse.json(
            { error: 'Failed to proxy image' },
            { status: 500 }
        );
    }
}





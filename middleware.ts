import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Public routes - no auth required
    const publicPaths = ['/', '/auth/signin', '/auth/signup'];
    if (publicPaths.includes(pathname)) {
        return NextResponse.next();
    }

    // API auth routes are public
    if (pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    // Stripe webhook must be public
    if (pathname === '/api/stripe/webhook') {
        return NextResponse.next();
    }

    // Check JWT token (doesn't need database access)
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        const signInUrl = new URL('/auth/signin', req.url);
        signInUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon|vibescape|demos|.*\\.png$|.*\\.ico$|.*\\.svg$|.*\\.mp4$).*)',
    ],
};

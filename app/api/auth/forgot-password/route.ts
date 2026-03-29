import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Check if user exists in our database
        const { data: user } = await supabase
            .from('users')
            .select('id, password')
            .eq('email', email)
            .single();

        // If user doesn't exist or is an OAuth-only user (no password), return success anyway
        // to avoid leaking whether an account exists
        if (!user || !user.password) {
            return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
        }

        // Send password reset email via Supabase Auth
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${baseUrl}/auth/reset-password`,
        });

        if (resetError) {
            console.error('[forgot-password] Supabase reset error:', resetError);
            // Don't expose internal errors — still return success
        }

        return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
    } catch (error) {
        console.error('[forgot-password] Error:', error);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}

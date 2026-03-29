import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { access_token } = await request.json();

        if (!access_token) {
            return NextResponse.json(
                { error: 'Missing access token' },
                { status: 400 }
            );
        }

        // Validate the token with Supabase Auth to get the verified user's email
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(access_token);

        if (authError || !authUser?.email) {
            console.error('[verify-email] Supabase auth.getUser error:', authError);
            return NextResponse.json(
                { error: 'Invalid or expired verification link.' },
                { status: 400 }
            );
        }

        // Check that the Supabase Auth user's email is confirmed
        if (!authUser.email_confirmed_at) {
            return NextResponse.json(
                { error: 'Email has not been confirmed yet.' },
                { status: 400 }
            );
        }

        // Update our users table to mark email as verified
        const { error: updateError } = await supabase
            .from('users')
            .update({ email_verified: new Date().toISOString() })
            .eq('email', authUser.email);

        if (updateError) {
            console.error('[verify-email] Update user error:', updateError);
            return NextResponse.json(
                { error: 'Failed to verify email. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('[verify-email] Error:', error);
        return NextResponse.json(
            { error: 'Verification failed' },
            { status: 500 }
        );
    }
}

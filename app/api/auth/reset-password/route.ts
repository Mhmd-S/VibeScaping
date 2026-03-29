import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hash } from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { access_token, password } = await request.json();

        if (!access_token || !password) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            );
        }

        // Validate the token with Supabase Auth to get the user's email
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(access_token);

        if (authError || !authUser?.email) {
            console.error('[reset-password] Supabase auth.getUser error:', authError);
            return NextResponse.json(
                { error: 'Invalid or expired reset link. Please request a new one.' },
                { status: 400 }
            );
        }

        // Hash the new password
        const hashedPassword = await hash(password, 12);

        // Update password in our users table
        const { error: updateError } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('email', authUser.email);

        if (updateError) {
            console.error('[reset-password] Update password error:', updateError);
            return NextResponse.json(
                { error: 'Failed to reset password. Please try again.' },
                { status: 500 }
            );
        }

        // Also update the Supabase Auth user's password to keep them in sync
        await supabase.auth.admin.updateUserById(authUser.id, { password });

        // If user hadn't verified email yet, mark as verified now (they confirmed email ownership via the reset link)
        await supabase
            .from('users')
            .update({ email_verified: new Date().toISOString() })
            .eq('email', authUser.email)
            .is('email_verified', null);

        return NextResponse.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('[reset-password] Error:', error);
        return NextResponse.json(
            { error: 'Something went wrong. Please try again.' },
            { status: 500 }
        );
    }
}

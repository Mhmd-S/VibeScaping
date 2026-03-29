import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hash } from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, name } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return NextResponse.json(
                { error: 'User already exists' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await hash(password, 12);

        // Create user (email_verified is null until verified)
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({
                email,
                name,
                password: hashedPassword,
            })
            .select()
            .single();

        if (userError || !user) {
            throw userError ?? new Error('Failed to create user');
        }

        // Create credit balance for new user
        await supabase.from('credit_balances').insert({
            user_id: user.id,
            balance: 0,
        });

        // Create Supabase Auth user to trigger verification email
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const { error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${baseUrl}/auth/verify-email`,
            },
        });

        if (authError) {
            console.error('[signup] Supabase Auth signUp error:', authError);
            // Don't fail the whole signup — user was created, they can resend verification later
        }

        return NextResponse.json(
            { message: 'User created successfully. Please check your email to verify your account.', userId: user.id },
            { status: 201 }
        );
    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
}

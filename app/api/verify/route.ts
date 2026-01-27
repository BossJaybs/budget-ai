import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email, code, password } = await request.json();

    if (!email || !code || !password) {
      return NextResponse.json(
        { error: 'Email, code, and password are required' },
        { status: 400 }
      );
    }

    // Check if code exists and is valid in Supabase
    console.log('🔍 Checking verification code for:', email);

    const { data: storedData, error: fetchError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError || !storedData) {
      console.log('❌ No verification code found for:', email, 'Error:', fetchError);
      return NextResponse.json(
        { error: 'No verification code found. Please request a new one.' },
        { status: 400 }
      );
    }

    console.log('✅ Found verification code for:', email, 'Code:', storedData.code);
    console.log('⏰ Stored expiry:', storedData.expires_at);
    console.log('⏰ Current time:', new Date().toISOString());
    console.log('⏰ Stored expiry date object:', new Date(storedData.expires_at));
    console.log('⏰ Current date object:', new Date());
    console.log('⏰ Is expired?', new Date() > new Date(storedData.expires_at));

    // Compare times in UTC to avoid timezone issues
    const now = new Date();
    const expiryTime = new Date(storedData.expires_at + (storedData.expires_at.endsWith('Z') ? '' : 'Z'));

    console.log('⏰ Comparison details:');
    console.log('  Now (UTC):', now.toISOString());
    console.log('  Expiry (parsed):', expiryTime.toISOString());
    console.log('  Time difference (ms):', expiryTime.getTime() - now.getTime());
    console.log('  Is expired?', now > expiryTime);

    if (now > expiryTime) {
      // Clean up expired code
      await supabase.from('email_verifications').delete().eq('email', email);
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (storedData.code !== code) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Code is valid, create user account with Supabase Admin API
    console.log('👤 Creating user account with Supabase Admin API...');
    console.log('Email:', email);

    // Use service role for admin operations
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Email is already verified
      user_metadata: {
        email_verified: true
      }
    });

    console.log('Admin auth response:', { data, error });

    if (error) {
      console.error('❌ Supabase admin signup error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: `Failed to create account: ${error.message}` },
        { status: 400 }
      );
    }

    console.log('✅ User account created successfully with confirmed email');

    // Create user record in the users table for foreign key relationships
    try {
      const { error: userInsertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || null,
          image: data.user.user_metadata?.avatar_url || null,
        });

      if (userInsertError) {
        console.error('Error creating user record:', userInsertError);
        // Don't fail the entire signup if this fails, but log it
      } else {
        console.log('✅ User record created in users table');
      }
    } catch (userError) {
      console.error('Error creating user record:', userError);
      // Continue with signup even if user record creation fails
    }

    // Clean up the verification code
    await supabase.from('email_verifications').delete().eq('email', email);

    console.log(`✅ User account created for ${email}`);

    return NextResponse.json({
      message: 'Account created successfully',
      user: data.user
    });

  } catch (error: any) {
    console.error('Verification API error:', error);
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
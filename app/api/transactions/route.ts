import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Get the session token from the request
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Set the auth token for this request
    supabase.auth.setSession({
      access_token: token,
      refresh_token: token,
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('userId', user.id);

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/transactions called'); // Debug log

    // Get the session token from the request
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Set the auth token for this request
    supabase.auth.setSession({
      access_token: token,
      refresh_token: token,
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('User check:', { user: user?.id, error: userError }); // Debug log

    if (!user) {
      console.log('No user found, returning 401'); // Debug log
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user exists in users table for foreign key constraint
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (userCheckError && userCheckError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking user existence:', userCheckError);
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 });
    }

    if (!existingUser) {
      // Insert user into users table if not exists
      const { error: insertUserError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || null,
          image: user.user_metadata?.avatar_url || null,
        });

      if (insertUserError) {
        console.error('Error creating user record:', insertUserError);
        return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 });
      }

      console.log('User record created in users table');
    }

    const body = await request.json();
    console.log('Request body:', body); // Debug log
    const { amount, description, category, type, date } = body;

    if (!amount || !description || !category || !type) {
      console.log('Missing required fields:', { amount, description, category, type }); // Debug log
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const transactionData = {
      userId: user.id,
      amount: parseFloat(amount),
      description,
      category,
      type,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
    };
    console.log('Inserting transaction:', transactionData); // Debug log

    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      return NextResponse.json({ error: 'Failed to create transaction', details: error }, { status: 500 });
    }

    console.log('Transaction created successfully:', data); // Debug log
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/transactions:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}
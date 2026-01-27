import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminSupabase = createAdminSupabaseClient();
    const userId = params.id;
    const { role } = await request.json();

    if (!role || !['USER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const { error } = await adminSupabase
      .from('users')
      .update({ role })
      .eq('id', userId);

    if (error) {
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin user update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminSupabase = createAdminSupabaseClient();
    const userId = params.id;

    // Get user details
    const { data: user, error: userError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user transactions
    const { data: transactions, error: transError } = await adminSupabase
      .from('transactions')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    if (transError) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return NextResponse.json({
      user,
      transactions: transactions || []
    });
  } catch (error) {
    console.error('Admin user details API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
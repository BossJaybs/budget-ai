import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminSupabaseClient();

    // Get all transactions from all users
    const { data: transactions, error } = await adminSupabase
      .from('transactions')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return NextResponse.json(transactions || []);
  } catch (error) {
    console.error('Error in GET /api/admin/transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
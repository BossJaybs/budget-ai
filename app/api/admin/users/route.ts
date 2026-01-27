import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminSupabaseClient();

    // Get all users with their transaction summaries
    const { data: users, error: usersError } = await adminSupabase
      .from('users')
      .select('*')
      .order('createdAt', { ascending: false });

    if (usersError) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get transaction summaries for each user
    const usersWithStats = await Promise.all(
      users.map(async (user: any) => {
        const { data: transactions, error: transError } = await adminSupabase
          .from('transactions')
          .select('amount, type')
          .eq('userId', user.id);

        if (transError) {
          console.error('Error fetching transactions for user', user.id, transError);
          return { ...user, totalIncome: 0, totalExpenses: 0 };
        }

        const totalIncome = transactions
          ?.filter((t: any) => t.type === 'income')
          .reduce((sum: number, t: any) => sum + t.amount, 0) || 0;

        const totalExpenses = Math.abs(
          transactions
            ?.filter((t: any) => t.type === 'expense')
            .reduce((sum: number, t: any) => sum + t.amount, 0) || 0
        );

        return {
          ...user,
          totalIncome,
          totalExpenses
        };
      })
    );

    return NextResponse.json({ users: usersWithStats });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
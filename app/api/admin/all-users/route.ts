import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminSupabaseClient();

    // Get all auth users
    const { data: authData, error: authError } = await adminSupabase.auth.admin.listUsers();

    if (authError) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get users table data
    const { data: usersData, error: usersError } = await adminSupabase
      .from('users')
      .select('*');

    if (usersError) {
      console.error('Error fetching users data:', usersError);
    }

    const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

    // Combine auth users with users table data
    const allUsers = authData.users.map(authUser => {
      const userData = usersMap.get(authUser.id);
      return {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || userData?.name || null,
        role: userData?.role || 'USER',
        createdAt: authUser.created_at,
        status: authUser.email_confirmed_at ? 'active' : 'unverified',
        totalIncome: 0,
        totalExpenses: 0,
        ...userData
      };
    });

    // Get transaction summaries for verified users
    const usersWithStats = await Promise.all(
      allUsers.map(async (user: any) => {
        if (user.status === 'unverified') {
          return user; // No transactions for unverified users
        }

        const { data: transactions, error: transError } = await adminSupabase
          .from('transactions')
          .select('amount, type')
          .eq('userId', user.id);

        if (transError) {
          console.error('Error fetching transactions for user', user.id, transError);
          return user;
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

    // Calculate totals
    const verifiedUsers = usersWithStats.filter(u => u.status === 'active');
    const totalUsers = usersWithStats.length;
    const totalIncome = verifiedUsers.reduce((sum, user) => sum + user.totalIncome, 0);
    const totalExpenses = verifiedUsers.reduce((sum, user) => sum + user.totalExpenses, 0);
    const netBalance = totalIncome - totalExpenses;

    // Get recent transactions
    const { data: allTransactions, error: transError } = await adminSupabase
      .from('transactions')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(10);

    if (transError) {
      console.error('Error fetching recent transactions:', transError);
    }

    return NextResponse.json({
      users: usersWithStats,
      stats: {
        totalUsers,
        totalIncome,
        totalExpenses,
        netBalance,
        recentTransactions: allTransactions || []
      }
    });
  } catch (error) {
    console.error('Admin all users API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
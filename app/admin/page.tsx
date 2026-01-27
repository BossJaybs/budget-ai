'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  recentTransactions: any[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
    fetchDashboardStats();
  }, []);

  const checkAdminAccess = async () => {
    // Temporarily disabled for testing
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) {
    //   router.push('/login');
    //   return;
    // }

    // const { data: userData } = await supabase
    //   .from('users')
    //   .select('role')
    //   .eq('id', user.id)
    //   .single();

    // if (!userData || userData.role !== 'ADMIN') {
    //   router.push('/dashboard');
    //   return;
    // }
  };

  const fetchDashboardStats = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get all transactions for calculations
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('*');

      if (allTransactions) {
        const totalIncome = allTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = Math.abs(allTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0));

        const netBalance = totalIncome - totalExpenses;

        // Get recent transactions (last 10)
        const recentTransactions = allTransactions
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);

        setStats({
          totalUsers: totalUsers || 0,
          totalIncome,
          totalExpenses,
          netBalance,
          recentTransactions
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!stats) {
    return <div className="text-center">Error loading dashboard</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₱{stats.totalIncome.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₱{stats.totalExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₱{stats.netBalance.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-muted-foreground">{transaction.category}</p>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'}₱{Math.abs(transaction.amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
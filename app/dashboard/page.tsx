'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, TrendingUp, TrendingDown, Plus, Wallet, PieChart, MessageSquare, Brain, Loader2, Sun, Moon, Menu, User, Users, DollarSign, Activity } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Cell } from 'recharts';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: string;
  date: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();
    const [user, setUser] = useState<any>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentView, setCurrentView] = useState('overview');
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminStats, setAdminStats] = useState<any>(null);
    const channelRef = useRef<any>(null);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const currentDay = currentDate.getDate();

  const fetchAdminStats = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get all transactions
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

        const recentTransactions = allTransactions
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);

        setAdminStats({
          totalUsers: totalUsers || 0,
          totalIncome,
          totalExpenses,
          netBalance,
          recentTransactions
        });
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  const checkUser = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log('Dashboard checkUser - session:', session, 'user:', session?.user, 'error:', error);
    if (!session?.user) {
      console.log('No session/user found, redirecting to login');
      router.push('/login');
      return;
    }
    setUser(session.user);

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (userData && userData.role === 'ADMIN') {
      setIsAdmin(true);
      setCurrentView('admin');
      fetchAdminStats();
    }
  };

  const fetchTransactions = async () => {
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No session token available');
        setTransactions([]);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/transactions', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      } else {
        console.error('Failed to fetch transactions');
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  useEffect(() => {
    checkUser();
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (user) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      channelRef.current = supabase
        .channel('transactions_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `userId=eq.${user.id}`,
        }, (payload) => {
          console.log('Transaction change:', payload);
          fetchTransactions();
        })
        .subscribe();
    }
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [user]);

  // Currency conversion
  const USD_TO_PHP = 56.5;

  // Format currency with comma separators
  const formatCurrency = (amount: number): string => {
    const symbol = '₱';
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    return `${symbol}${formatted}`;
  };

  // Format USD currency
  const formatCurrencyUSD = (amount: number): string => {
    const symbol = '$';
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${symbol}${formatted}`;
  };

  // Calculate totals for current month transactions (amounts stored in USD, convert to PHP)
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) * USD_TO_PHP;
  const totalExpenses = Math.abs(filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)) * USD_TO_PHP;
  const totalBalance = totalIncome - totalExpenses;

  // Calculate daily net for current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthDays: string[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(currentYear, currentMonth, i);
    monthDays.push(d.toISOString().split('T')[0]);
  }

  const dailyNet = monthDays.map(date => {
    const dayTransactions = transactions.filter(t => t.date.startsWith(date));
    const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) * USD_TO_PHP;
    const expenses = Math.abs(dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)) * USD_TO_PHP;
    return income - expenses;
  });

  const maxAbsNet = Math.max(...dailyNet.map(Math.abs));
  const chartHeights = dailyNet.map(net => maxAbsNet === 0 ? 0 : (Math.abs(net) / maxAbsNet) * 100);

  const chartData = monthDays.map((date, i) => {
    const day = i + 1;
    const net = dailyNet[i];
    return { day, net };
  });

  const chartConfig = {
    net: {
      label: "Net Amount",
    },
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Wallet className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">BudgetAI Dashboard</h1>
            </div>
            <div className="hidden md:flex items-center space-x-4">
               <button
                 onClick={toggleTheme}
                 className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
               >
                 {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
               </button>
               <span className="text-sm text-gray-600 dark:text-gray-300">Welcome, {user?.email}</span>
               <Button variant="outline" asChild>
                 <Link href="/dashboard/profile">
                   <User className="h-4 w-4 mr-2" />
                   Profile
                 </Link>
               </Button>
               <AlertDialog>
                 <AlertDialogTrigger asChild>
                   <Button variant="outline">Sign Out</Button>
                 </AlertDialogTrigger>
                 <AlertDialogContent>
                   <AlertDialogHeader>
                     <AlertDialogTitle>Sign Out</AlertDialogTitle>
                     <AlertDialogDescription>
                       Are you sure you want to sign out of your BudgetAI account?
                     </AlertDialogDescription>
                   </AlertDialogHeader>
                   <AlertDialogFooter>
                     <AlertDialogCancel>Cancel</AlertDialogCancel>
                     <AlertDialogAction onClick={handleSignOut}>
                       Sign Out
                     </AlertDialogAction>
                   </AlertDialogFooter>
                 </AlertDialogContent>
               </AlertDialog>
             </div>
             <button
               className="md:hidden p-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
               onClick={() => setIsMobileMenuOpen(true)}
             >
               <Menu size={24} />
             </button>
          </div>
          </div>
        </header>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Welcome, {user?.email}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-2">
              <Button onClick={toggleTheme} variant="outline" className="w-full">
                {theme === 'light' ? <Moon className="h-4 w-4 mr-2" /> : <Sun className="h-4 w-4 mr-2" />}
                Toggle Theme
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/dashboard/profile">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Sign Out
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign Out</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to sign out of your BudgetAI account?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSignOut}>
                      Sign Out
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </SheetContent>
        </Sheet>

        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-wrap gap-2 sm:gap-4 py-4">
                {isAdmin ? (
                  <Button variant={currentView === 'admin' ? 'default' : 'outline'} onClick={() => setCurrentView('admin')} className="flex-1 sm:flex-none">
                    Admin Panel
                  </Button>
                ) : (
                  <>
                    <Button variant={currentView === 'overview' ? 'default' : 'outline'} onClick={() => setCurrentView('overview')} className="flex-1 sm:flex-none">
                      Overview
                    </Button>
                    <Button variant={currentView === 'transactions' ? 'default' : 'outline'} onClick={() => setCurrentView('transactions')} className="flex-1 sm:flex-none">
                      Transactions
                    </Button>
                    <Button variant={currentView === 'reports' ? 'default' : 'outline'} onClick={() => setCurrentView('reports')} className="flex-1 sm:flex-none">
                      Reports
                    </Button>
                    <Button variant={currentView === 'insights' ? 'default' : 'outline'} onClick={() => setCurrentView('insights')} className="flex-1 sm:flex-none">
                      AI Insights
                    </Button>
                    <Button variant={currentView === 'chat' ? 'default' : 'outline'} onClick={() => setCurrentView('chat')} className="flex-1 sm:flex-none">
                      Ask AI
                    </Button>
                  </>
                )}
              </div>
            </div>
          </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentView === 'overview' && (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
              <div className="text-sm text-muted-foreground">{formatCurrencyUSD(totalBalance / USD_TO_PHP)}</div>
              <p className="text-xs text-muted-foreground">This Month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
              <div className="text-sm text-muted-foreground">{formatCurrencyUSD(totalIncome / USD_TO_PHP)}</div>
              <p className="text-xs text-muted-foreground">This Month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
              <div className="text-sm text-muted-foreground">{formatCurrencyUSD(totalExpenses / USD_TO_PHP)}</div>
              <p className="text-xs text-muted-foreground">This Month</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Chart */}
         <Card className="mb-8">
           <CardHeader>
             <CardTitle>Monthly Overview</CardTitle>
           </CardHeader>
           <CardContent>
             <ChartContainer config={chartConfig} className="h-64 w-full">
               <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis
                   dataKey="day"
                   tick={{ fontSize: 12 }}
                   interval={0}
                   angle={-45}
                   textAnchor="end"
                   height={60}
                 />
                 <YAxis
                   tick={{ fontSize: 12 }}
                   tickFormatter={(value) => formatCurrency(value)}
                 />
                 <ChartTooltip
                   content={
                     <ChartTooltipContent
                       formatter={(value) => [formatCurrency(value as number), "Net Amount"]}
                       labelFormatter={(label) => `Day ${label}`}
                     />
                   }
                 />
                 <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
                 <ReferenceLine x={currentDay} stroke="#000" strokeDasharray="2 2" />
                 <Bar dataKey="net" radius={[2, 2, 0, 0]}>
                   {chartData.map((entry, index) => (
                     <Cell
                       key={`cell-${index}`}
                       fill={entry.net >= 0 ? '#10b981' : '#ef4444'}
                     />
                   ))}
                 </Bar>
               </BarChart>
             </ChartContainer>
             <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
               {(() => {
                 const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                 const monthName = monthNames[currentMonth];
                 const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                 return `${monthName} ${currentYear} - ${daysInMonth} days`;
               })()}
             </div>
           </CardContent>
         </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Button onClick={() => router.push('/dashboard/transactions')} className="h-20 flex flex-col items-center justify-center space-y-2">
            <Plus className="h-6 w-6" />
            <span>Add Transaction</span>
          </Button>
          <Button onClick={() => router.push('/dashboard/reports')} variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
            <BarChart3 className="h-6 w-6" />
            <span>View Reports</span>
          </Button>
          <Button onClick={() => router.push('/dashboard/insights')} variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
            <Brain className="h-6 w-6" />
            <span>AI Insights</span>
          </Button>
          <Button onClick={() => router.push('/dashboard/chat')} variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
            <MessageSquare className="h-6 w-6" />
            <span>Ask AI</span>
          </Button>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {transaction.type === 'income' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{transaction.description}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount) * USD_TO_PHP)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(transaction.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </>
          )}

          {currentView === 'admin' && adminStats && (
            <div>
              <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{adminStats.totalUsers}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">₱{adminStats.totalIncome.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">₱{adminStats.totalExpenses.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${adminStats.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₱{adminStats.netBalance.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {adminStats.recentTransactions.map((transaction: any) => (
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
          )}
        </div>
    </div>
  );
}

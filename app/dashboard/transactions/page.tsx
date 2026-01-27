'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useTheme } from '@/lib/theme-context';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: string;
  date: string;
}

import { predefinedCategories } from '@/lib/categories';

const expenseCategories = ['Food & Dining', 'Transportation', 'Housing', 'Utilities', 'Healthcare', 'Entertainment', 'Shopping', 'Education', 'Travel', 'Personal Care', 'Insurance', 'Debt Payments', 'Other'];
const incomeCategories = ['Income', 'Investments', 'Savings', 'Other'];

export default function TransactionsPage() {
   const router = useRouter();
   const { theme } = useTheme();
   const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'PHP'>('USD');
  const [defaultCurrency, setDefaultCurrency] = useState<'USD' | 'PHP'>('PHP');
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    type: 'expense',
    date: new Date().toISOString().split('T')[0]
  });

  const availableCategories = formData.type === 'income' ? incomeCategories : expenseCategories;

  // Currency conversion rates (approximate)
  const USD_TO_PHP = 56.5; // 1 USD = 56.5 PHP
  const PHP_TO_USD = 1 / USD_TO_PHP; // 1 PHP = 0.0177 USD

  const convertAmount = (amount: number, fromCurrency: 'USD' | 'PHP', toCurrency: 'USD' | 'PHP'): number => {
    if (fromCurrency === toCurrency) return amount;
    if (fromCurrency === 'USD' && toCurrency === 'PHP') return amount * USD_TO_PHP;
    if (fromCurrency === 'PHP' && toCurrency === 'USD') return amount * PHP_TO_USD;
    return amount;
  };


  const formatCurrency = (amount: number, currencyType: 'USD' | 'PHP'): string => {
    const symbol = currencyType === 'USD' ? '$' : '₱';
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: currencyType === 'PHP' ? 0 : 2,
      maximumFractionDigits: currencyType === 'PHP' ? 0 : 2
    });
    return `${symbol}${formatted}`;
  };

  useEffect(() => {
    checkUser();
    fetchTransactions();
  }, []);

  // Set default currency based on first transaction or user preference
  useEffect(() => {
    if (transactions.length > 0) {
      const firstTransaction = transactions[0] as any;
      if (firstTransaction.currency) {
        setDefaultCurrency(firstTransaction.currency);
        setCurrency(firstTransaction.currency);
      }
    }
  }, [transactions]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
  };

  const fetchTransactions = async () => {
    try {
      console.log('Fetching transactions...'); // Debug log

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
      console.log('Fetch response status:', response.status); // Debug log
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched transactions:', data); // Debug log
        setTransactions(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch transactions:', response.status, errorText);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if user is authenticated
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      // Convert amount to USD for storage (standardize on USD)
      const amountInUSD = currency === 'PHP'
        ? convertAmount(parseFloat(formData.amount), 'PHP', 'USD')
        : parseFloat(formData.amount);

      const transactionData = {
        amount: amountInUSD,
        description: formData.description,
        category: formData.category,
        type: formData.type,
        date: formData.date,
        currency: currency // Store original currency for display
      };

      console.log('Submitting transaction data:', transactionData); // Debug log

      if (editingTransaction) {
        // Update existing transaction
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No session token available');
        }

        const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...transactionData,
            amount: formData.type === 'expense' ? -Math.abs(transactionData.amount) : Math.abs(transactionData.amount)
          }),
        });

        console.log('Update response status:', response.status); // Debug log

        if (response.ok) {
          const updatedTransaction = await response.json();
          console.log('Updated transaction:', updatedTransaction); // Debug log
          setTransactions(prev => prev.map(t => t.id === editingTransaction.id ? updatedTransaction : t));
          // Refresh data to ensure consistency
          await fetchTransactions();
        } else {
          const errorText = await response.text();
          console.error('Failed to update transaction:', response.status, errorText);
        }
      } else {
        // Create new transaction
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No session token available');
        }

        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...transactionData,
            amount: formData.type === 'expense' ? -Math.abs(transactionData.amount) : Math.abs(transactionData.amount)
          }),
        });

        console.log('Create response status:', response.status); // Debug log

        if (response.ok) {
          const newTransaction = await response.json();
          console.log('Created transaction:', newTransaction); // Debug log
          // Refresh data to ensure consistency
          await fetchTransactions();
        } else {
          const errorText = await response.text();
          console.error('Failed to create transaction:', response.status, errorText);
        }
      }

      setIsDialogOpen(false);
      setEditingTransaction(null);
      resetForm();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    // Check if user is authenticated before editing
    if (!user) {
      console.error('User not authenticated');
      return;
    }
    setEditingTransaction(transaction);
    setFormData({
      amount: Math.abs(transaction.amount).toString(),
      description: transaction.description,
      category: transaction.category,
      type: transaction.type,
      date: transaction.date
    });
    // Set currency based on transaction data or default to USD
    setCurrency((transaction as any).currency || 'USD');
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    // Check if user is authenticated
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No session token available');
      }

      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        // Refresh data to ensure consistency
        fetchTransactions();
      } else {
        console.error('Failed to delete transaction');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      category: '',
      type: 'expense',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const openAddDialog = () => {
    // Check if user is authenticated before opening dialog
    if (!user) {
      console.error('User not authenticated');
      return;
    }
    setEditingTransaction(null);
    resetForm();
    // For new transactions, use the default currency (from first transaction or USD)
    setCurrency(defaultCurrency);
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            {user && (
              <Button onClick={openAddDialog} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               {transactions.map((transaction) => (
                 <div key={transaction.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                   <div className="flex items-center space-x-4 flex-1">
                     <div className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                       {transaction.type === 'income' ? (
                         <TrendingUp className="h-4 w-4 text-green-600" />
                       ) : (
                         <TrendingDown className="h-4 w-4 text-red-600" />
                       )}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="font-medium truncate text-gray-900 dark:text-white">{transaction.description}</p>
                       <div className="flex flex-wrap items-center gap-2 mt-1">
                         <Badge variant="secondary" className="text-xs">{transaction.category}</Badge>
                         <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(transaction.date).toLocaleDateString()}</span>
                       </div>
                     </div>
                   </div>
                   <div className="flex items-center justify-between sm:justify-end gap-4">
                     <div className="text-left sm:text-right">
                       <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                         {transaction.type === 'income' ? '+' : ''}{formatCurrency(convertAmount(Math.abs(transaction.amount), 'USD', 'PHP'), 'PHP')} PHP
                       </p>
                       <p className="text-xs text-gray-500">
                         {formatCurrency(Math.abs(transaction.amount), 'USD')} USD
                       </p>
                     </div>
                     {user && (
                       <div className="flex gap-2">
                         <Button variant="outline" size="sm" onClick={() => handleEdit(transaction)}>
                           <Edit className="h-4 w-4" />
                         </Button>
                         <AlertDialog>
                           <AlertDialogTrigger asChild>
                             <Button variant="outline" size="sm">
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                               <AlertDialogDescription>
                                 Are you sure you want to delete this transaction? This action cannot be undone.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Cancel</AlertDialogCancel>
                               <AlertDialogAction onClick={() => handleDelete(transaction.id)}>
                                 Delete
                               </AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>
                       </div>
                     )}
                   </div>
                 </div>
               ))}
             </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent aria-describedby="transaction-form-description">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
            </DialogHeader>
            <div id="transaction-form-description" className="sr-only">
              {editingTransaction ? 'Edit the selected transaction details' : 'Add a new transaction to your budget tracker'}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value, category: '' }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={(value: 'USD' | 'PHP') => setCurrency(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHP">PHP (₱)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>      
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount ({currency === 'USD' ? '$' : '₱'})</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
                {formData.amount && (
                  <p className="text-sm text-gray-500 mt-1">
                    {currency === 'USD'
                      ? `${formatCurrency(convertAmount(parseFloat(formData.amount), 'USD', 'PHP'), 'PHP')} in PHP`
                      : `${formatCurrency(convertAmount(parseFloat(formData.amount), 'PHP', 'USD'), 'USD')} in USD`
                    }
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTransaction ? 'Update' : 'Add'} Transaction
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
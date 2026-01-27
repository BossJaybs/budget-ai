'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/theme-context';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: string;
  date: string;
}

// Default budgets for categories (monthly)
const DEFAULT_BUDGETS: Record<string, number> = {
  'Food & Dining': 400,
  'Transportation': 200,
  'Entertainment': 150,
  'Shopping': 200,
  'Healthcare': 100,
  'Travel': 300,
  'Personal Care': 50,
  'Other': 100,
};

// Thresholds for insights
const THRESHOLDS = {
  FOOD_SPENDING_RATIO: 0.3,
  ENTERTAINMENT_SPENDING_RATIO: 0.15,
  HIGH_CATEGORY_RATIO: 0.2,
  SAVINGS_RATE_HIGH: 20,
  SAVINGS_RATE_LOW: 10,
  RECURRING_EXPENSES_RATIO: 0.6,
};

export default function InsightsPage() {
   const router = useRouter();
   const { theme } = useTheme();
   const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    fetchTransactions();
  }, []);

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

  const [aiInsights, setAiInsights] = useState<any>({ insights: [], recommendations: [] });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchAiInsights = async () => {
    if (transactions.length === 0) return;

    setAiLoading(true);
    setAiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setAiError('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactions }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiInsights(data);
      } else {
        setAiError('Failed to generate AI insights. Please try again later.');
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      setAiError('Unable to connect to AI service. Check your internet connection.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (transactions.length > 0) {
      fetchAiInsights();
    }
  }, [transactions]);

  const insights = useMemo(() => {
    if (transactions.length === 0) return [];

    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0));

    if (totalExpenses === 0) return [];

    const foodExpenses = expenses
      .filter(t => t.category === 'Food & Dining')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const entertainmentExpenses = expenses
      .filter(t => t.category === 'Entertainment')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const insights = [];

    // Food spending insight
    if (foodExpenses > totalExpenses * THRESHOLDS.FOOD_SPENDING_RATIO) {
      insights.push({
        type: 'warning',
        title: 'High Food Spending',
        message: `Your food expenses ($${foodExpenses.toFixed(2)}, ${((foodExpenses / totalExpenses) * 100).toFixed(1)}% of total spending) are quite high. Consider meal prepping to save money.`,
        icon: AlertTriangle,
        color: 'text-yellow-600'
      });
    }

    // Check for other categories from predefined categories
    const highSpendingCategories = expenses
      .filter(t => !['Food & Dining', 'Housing', 'Transportation'].includes(t.category))
      .reduce((acc, t) => {
        const category = t.category;
        acc[category] = (acc[category] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>);

    Object.entries(highSpendingCategories).forEach(([category, amount]) => {
      if (amount > totalExpenses * THRESHOLDS.HIGH_CATEGORY_RATIO) {
        insights.push({
          type: 'info',
          title: `High ${category} Spending`,
          message: `${category} represents $${amount.toFixed(2)} (${((amount / totalExpenses) * 100).toFixed(1)}% of your expenses). Consider reviewing your ${category.toLowerCase()} habits.`,
          icon: Lightbulb,
          color: 'text-blue-600'
        });
      }
    });

    // Entertainment insight
    if (entertainmentExpenses > totalExpenses * THRESHOLDS.ENTERTAINMENT_SPENDING_RATIO) {
      insights.push({
        type: 'info',
        title: 'Entertainment Budget',
        message: 'You\'re spending more on entertainment than average. Look for free or low-cost alternatives.',
        icon: Lightbulb,
        color: 'text-blue-600'
      });
    }

    // Savings rate insight
    if (income > 0) {
      const savingsRate = ((income - totalExpenses) / income) * 100;
      if (savingsRate > THRESHOLDS.SAVINGS_RATE_HIGH) {
        insights.push({
          type: 'success',
          title: 'Great Savings Rate!',
          message: `You're saving ${savingsRate.toFixed(1)}% of your $${income.toFixed(2)} income. Keep up the excellent work!`,
          icon: TrendingUp,
          color: 'text-green-600'
        });
      } else if (savingsRate < THRESHOLDS.SAVINGS_RATE_LOW) {
        insights.push({
          type: 'warning',
          title: 'Low Savings Rate',
          message: `You're only saving ${savingsRate.toFixed(1)}% of your $${income.toFixed(2)} income. Consider cutting back on non-essential expenses.`,
          icon: AlertTriangle,
          color: 'text-red-600'
        });
      }
    }

    // Recurring expenses insight
    const recurringCategories = ['Housing', 'Utilities', 'Transportation'];
    const recurringTotal = expenses
      .filter(t => recurringCategories.includes(t.category))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (recurringTotal > totalExpenses * THRESHOLDS.RECURRING_EXPENSES_RATIO) {
      insights.push({
        type: 'info',
        title: 'Fixed Expenses Analysis',
        message: `$${recurringTotal.toFixed(2)} (${((recurringTotal / totalExpenses) * 100).toFixed(1)}% of your expenses) are fixed costs. Focus on optimizing variable expenses.`,
        icon: Brain,
        color: 'text-purple-600'
      });
    }

    return insights;
  }, [transactions]);

  const allInsights = [...insights, ...aiInsights.insights];

  const budgetAlerts = useMemo(() => {
    if (transactions.length === 0) return [];

    const expenses = transactions.filter(t => t.type === 'expense');
    const alerts: any[] = [];

    // Calculate spending by category
    const categorySpending = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

    // Check against budgets
    Object.entries(DEFAULT_BUDGETS).forEach(([category, budget]) => {
      const spent = categorySpending[category] || 0;
      if (spent > budget) {
        const overBy = ((spent - budget) / budget * 100).toFixed(1);
        alerts.push({
          type: 'warning',
          title: `Budget Exceeded: ${category}`,
          message: `You've exceeded your ${category} budget by ${overBy}%. Spent $${spent.toFixed(2)} of $${budget}.`,
          icon: AlertTriangle,
        });
      } else if (spent > budget * 0.8) {
        const percent = ((spent / budget) * 100).toFixed(1);
        alerts.push({
          type: 'info',
          title: `Approaching ${category} Budget`,
          message: `You're at ${percent}% of your ${category} budget. Spent $${spent.toFixed(2)} of $${budget}.`,
          icon: TrendingUp,
        });
      }
    });

    return alerts;
  }, [transactions]);

  const fallbackRecommendations = useMemo(() => {
    if (transactions.length === 0) return [];

    const expenses = transactions.filter(t => t.type === 'expense');
    const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0));

    const recommendations: any[] = [];

    if (totalExpenses === 0) return recommendations;

    const foodExpenses = expenses
      .filter(t => t.category === 'Food & Dining')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (foodExpenses > totalExpenses * THRESHOLDS.FOOD_SPENDING_RATIO) {
      recommendations.push({
        title: 'Meal Planning',
        description: `Based on your food spending (${((foodExpenses / totalExpenses) * 100).toFixed(1)}% of expenses), implementing a weekly meal plan could save you approximately $${(foodExpenses * 0.2).toFixed(0)} per month.`,
        potentialSavings: `₱${(foodExpenses * 0.2).toFixed(0)}/month`
      });
    }

    const entertainmentExpenses = expenses
      .filter(t => t.category === 'Entertainment')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    if (entertainmentExpenses > totalExpenses * THRESHOLDS.ENTERTAINMENT_SPENDING_RATIO) {
      recommendations.push({
        title: 'Entertainment Alternatives',
        description: 'Consider free or low-cost entertainment options like community events, libraries, or home activities.',
        potentialSavings: `${entertainmentExpenses.toFixed(0)}/month potential`
      });
    }

    if (income > 0 && ((income - totalExpenses) / income) * 100 < THRESHOLDS.SAVINGS_RATE_LOW) {
      recommendations.push({
        title: 'Savings Goal',
        description: 'Set up automatic transfers to a savings account to build an emergency fund.',
        potentialSavings: 'Ongoing'
      });
    }

    // Default if no specific recommendations
    if (recommendations.length === 0) {
      recommendations.push({
        title: 'Review Budget',
        description: 'Consider reviewing your spending patterns for optimization opportunities.',
        potentialSavings: 'TBD'
      });
    }

    return recommendations;
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4 mb-8">
            <Brain className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Spending Insights</h1>
          </div>
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
                <p className="text-gray-500">Add some transactions to get personalized AI insights and recommendations.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
         <div className="mb-8">
           <Button variant="outline" onClick={() => router.push('/dashboard')} className="mb-4">
             <ArrowLeft className="h-4 w-4 mr-2" />
             Back to Dashboard
           </Button>
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
             <div className="flex items-center space-x-4">
               <Brain className="h-8 w-8 text-indigo-600" />
               <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">AI Spending Insights</h1>
             </div>
             {aiLoading && <span className="text-sm text-gray-500 dark:text-gray-400">(Generating AI insights...)</span>}
           </div>
         </div>

        {aiError && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{aiError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {allInsights.map((insight, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {insight.icon && typeof insight.icon === 'string' ? (
                    insight.icon === 'AlertTriangle' ? <AlertTriangle className={`h-5 w-5 ${insight.color}`} /> :
                    insight.icon === 'Lightbulb' ? <Lightbulb className={`h-5 w-5 ${insight.color}`} /> :
                    insight.icon === 'TrendingUp' ? <TrendingUp className={`h-5 w-5 ${insight.color}`} /> :
                    <Brain className={`h-5 w-5 ${insight.color}`} />
                  ) : (
                    <insight.icon className={`h-5 w-5 ${insight.color}`} />
                  )}
                  <span>{insight.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{insight.message}</p>
                <Badge variant="secondary" className="mt-2">
                  {insight.type}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Budget Alerts */}
        {budgetAlerts.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Budget Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgetAlerts.map((alert, index) => (
                  <Alert key={index}>
                    <alert.icon className="h-4 w-4" />
                    <AlertDescription>
                      {alert.message}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personalized Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Personalized Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            {(aiInsights.recommendations && aiInsights.recommendations.length > 0) ? (
              <div className="space-y-4">
                {aiInsights.recommendations.map((rec: any, index: number) => (
                  <div key={index} className={`p-4 rounded-lg ${
                    index % 3 === 0 ? 'bg-blue-50' :
                    index % 3 === 1 ? 'bg-green-50' : 'bg-purple-50'
                  }`}>
                    <h4 className="font-semibold mb-2" style={{
                      color: index % 3 === 0 ? '#1e40af' :
                             index % 3 === 1 ? '#166534' : '#7c3aed'
                    }}>
                      {rec.title}
                    </h4>
                    <p className="text-sm" style={{
                      color: index % 3 === 0 ? '#1d4ed8' :
                             index % 3 === 1 ? '#15803d' : '#9333ea'
                    }}>
                      {rec.description}
                      {rec.potentialSavings && (
                        <span className="block mt-1 font-medium">
                          Potential savings: {rec.potentialSavings}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {fallbackRecommendations.map((rec, index) => (
                  <div key={index} className={`p-4 rounded-lg ${
                    index % 3 === 0 ? 'bg-blue-50' :
                    index % 3 === 1 ? 'bg-green-50' : 'bg-purple-50'
                  }`}>
                    <h4 className="font-semibold mb-2" style={{
                      color: index % 3 === 0 ? '#1e40af' :
                             index % 3 === 1 ? '#166534' : '#7c3aed'
                    }}>
                      {rec.title}
                    </h4>
                    <p className="text-sm" style={{
                      color: index % 3 === 0 ? '#1d4ed8' :
                             index % 3 === 1 ? '#15803d' : '#9333ea'
                    }}>
                      {rec.description}
                      {rec.potentialSavings && (
                        <span className="block mt-1 font-medium">
                          Potential savings: {rec.potentialSavings}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
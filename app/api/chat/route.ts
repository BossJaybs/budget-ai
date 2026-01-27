import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    console.log('Raw request body:', body);

    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({ response: 'Invalid request format.' }, { status: 400 });
    }

    const { message, transactions } = parsedBody;
    console.log('Parsed message:', message);
    console.log('Parsed transactions count:', transactions?.length || 0);

    // Always respond to any message about finances or user records
    console.log('Processing message:', message);

    // Prepare transaction data for context
    const expenses = transactions.filter((t: any) => t.type === 'expense');
    const income = transactions.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + t.amount, 0);
    const totalExpenses = Math.abs(expenses.reduce((sum: number, t: any) => sum + t.amount, 0));

    const categoryBreakdown = expenses.reduce((acc: Record<string, number>, t: any) => {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryBreakdown)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([cat, amt]) => `${cat}: $${(amt as number).toFixed(2)}`)
      .join(', ');

    const context = `
      User transaction data:
      - Total income: $${income.toFixed(2)}
      - Total expenses: $${totalExpenses.toFixed(2)}
      - Number of expense transactions: ${expenses.length}
      - Top categories: ${topCategories}
    `;

    // System prompt for financial focus and records
    const systemPrompt = `
      You are a helpful AI financial assistant for the BudgetAI System. Analyze the user's transaction data and provide personalized, accurate financial advice.
      You can also help users view, understand, and discuss their financial records and activities within the system.
      Always include a disclaimer: "This is not professional financial advice. Consult a qualified advisor for personalized recommendations."
      Answer any questions about finances, budgeting, spending, or the user's financial records and activities.
    `;

    // Use Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768', // Groq model for financial analysis
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${context}\n\nUser question: ${message}` }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      })
    });

    console.log('Groq API response status:', groqResponse.status);

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error response:', errorText);
      throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
    }

    const groqData = await groqResponse.json();
    console.log('Groq API response data:', JSON.stringify(groqData, null, 2));

    const response = groqData.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';
    console.log('Extracted response:', response);

    if (!response || response.trim() === '') {
      console.error('Empty response from Groq API');
      return NextResponse.json({ response: 'I apologize, but I\'m having trouble generating a response right now. Please try again.' });
    }

    return NextResponse.json({ response });

    // Response is already returned above in the fallback section
  } catch (error) {
    console.error('Groq API error:', error);
    // Return error message
    return NextResponse.json({ response: 'I apologize, but I\'m experiencing technical difficulties. Please check your API configuration or try again later.' }, { status: 200 });
  }
}
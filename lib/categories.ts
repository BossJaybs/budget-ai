export const predefinedCategories = [
  'Food & Dining',
  'Transportation',
  'Housing',
  'Utilities',
  'Healthcare',
  'Entertainment',
  'Shopping',
  'Education',
  'Travel',
  'Personal Care',
  'Insurance',
  'Debt Payments',
  'Savings',
  'Investments',
  'Income',
  'Other'
];

export const smartCategorize = (description: string): string => {
  const desc = description.toLowerCase();

  if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('food')) {
    return 'Food & Dining';
  }
  if (desc.includes('gas') || desc.includes('fuel') || desc.includes('uber') || desc.includes('taxi')) {
    return 'Transportation';
  }
  if (desc.includes('rent') || desc.includes('mortgage')) {
    return 'Housing';
  }
  if (desc.includes('electric') || desc.includes('water') || desc.includes('internet') || desc.includes('phone')) {
    return 'Utilities';
  }
  if (desc.includes('doctor') || desc.includes('pharmacy') || desc.includes('medical')) {
    return 'Healthcare';
  }
  if (desc.includes('movie') || desc.includes('cinema') || desc.includes('netflix') || desc.includes('spotify')) {
    return 'Entertainment';
  }
  if (desc.includes('amazon') || desc.includes('shopping') || desc.includes('store')) {
    return 'Shopping';
  }
  if (desc.includes('school') || desc.includes('tuition') || desc.includes('book')) {
    return 'Education';
  }
  if (desc.includes('hotel') || desc.includes('flight') || desc.includes('vacation')) {
    return 'Travel';
  }
  if (desc.includes('salary') || desc.includes('payroll') || desc.includes('income')) {
    return 'Income';
  }

  return 'Other';
};
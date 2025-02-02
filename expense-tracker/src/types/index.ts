export interface CategoryBalance {
  דלק: number;
  מסעדות: number;
  חופשות: number;
  בילויים: number;
  בגדים: number;
  חברים: number; 
  מעיין: number; 
  "טיפוח והנעלה": number; 
  "סופר": number; 
}

export interface Expense {
  category: keyof CategoryBalance;
  amount: number;
  date: string;
  note?: string;
  displayAmount: string; 
}

export const INITIAL_BALANCE: CategoryBalance = {
  דלק: 1200,
  מסעדות: 550,
  חופשות: 400,
  בילויים: 350,
  בגדים: 400,
  חברים: 300,
  מעיין: 120,  
  "טיפוח והנעלה": 150, 
  "סופר": 1300, 
};

export const COLORS = {
  דלק: '#FF6B6B',
  מסעדות: '#4ECDC4',
  חופשות: '#45B7D1',
  בילויים: '#FFD700',
  בגדים: '#FF8C00',
  חברים: '#7B68EE',
  מעיין: '#FF5733',  
  "טיפוח והנעלה": '#FF1493', 
  "סופר": '#32CD32', 
};

export type MonthlyReport = {
  month: string;
  balances: CategoryBalance;
  expenses: Expense[];
};

export interface CategoryBalance {
    דלק: number;
    מסעדות: number;
    חופשות: number;
    בילויים: number;
    בגדים: number;
  }
  
  export interface Expense {
    category: keyof CategoryBalance;
    amount: number;
    date: string;
    note?: string;
  }
  
  export const INITIAL_BALANCE: CategoryBalance = {
    דלק: 1200,
    מסעדות: 550,
    חופשות: 400,
    בילויים: 350,
    בגדים: 400,
  };
  
  export const COLORS = {
    דלק: '#FF6B6B',
    מסעדות: '#4ECDC4',
    חופשות: '#45B7D1',
    בילויים: '#FFD700',
    בגדים: '#FF8C00',
  };
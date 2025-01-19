import React from 'react';
import { CategoryBalance, INITIAL_BALANCE, COLORS, Expense } from '../../types';
import './styles.css';

interface BalanceListProps {
  balances: CategoryBalance;
  setBalances: (balances: CategoryBalance) => void;
  expenses: Expense[];
  updateExpenseData: (balances: CategoryBalance, expenses: Expense[]) => Promise<void>;
}

export const BalanceList: React.FC<BalanceListProps> = ({
  balances,
  setBalances,
  expenses,
  updateExpenseData,
}) => {
  const handleReset = async (category: keyof CategoryBalance) => {
    const updatedBalances = {
      ...balances,
      [category]: INITIAL_BALANCE[category],
    };
    
    const updatedExpenses = expenses.filter(expense => expense.category !== category);
    
    setBalances(updatedBalances);
    await updateExpenseData(updatedBalances, updatedExpenses);
  };

  const getProgressBarWidth = (balance: number, initialBalance: number) => {
    if (balance <= 0) return 0;
    const percentage = (balance / initialBalance) * 100;
    return Math.min(percentage, 100);
  };

  const formatBalance = (balance: number) => {
    const formattedNumber = Math.abs(balance).toLocaleString();
    return balance < 0 ? `-₪${formattedNumber}` : `₪${formattedNumber}`;
  };

  return (
    <div className="balance-list">
      {Object.entries(balances).map(([category, balance]) => {
        const initialBalance = INITIAL_BALANCE[category as keyof CategoryBalance];
        const progressWidth = getProgressBarWidth(balance, initialBalance);
        
        return (
          <div key={category} className="balance-item">
            <span 
              className={`category-balance ${balance < 0 ? 'negative-balance' : ''}`}
              style={{ 
                color: balance < 0 ? '#ff0000' : COLORS[category as keyof typeof COLORS]
              }}
            >
              {category}: {formatBalance(balance)}
            </span>
            <div className="progress-bar-bg">
              <div
                className="progress-bar"
                style={{
                  width: `${progressWidth}%`,
                  backgroundColor: COLORS[category as keyof typeof COLORS]
                }}
              />
            </div>
            <button
              className="reset-button"
              onClick={() => handleReset(category as keyof CategoryBalance)}
            >
              איפוס
            </button>
          </div>
        );
      })}
    </div>
  );
};
import React from 'react';
import { CategoryBalance, INITIAL_BALANCE, COLORS, Expense } from '../../types';
import './styles.css';

interface BalanceListProps {
  balances: CategoryBalance;
  setBalances: React.Dispatch<React.SetStateAction<CategoryBalance>>;
  expenses: Expense[];
  updateExpenseData: (balances: CategoryBalance, expenses: Expense[]) => Promise<void>;
}

export const BalanceList: React.FC<BalanceListProps> = ({
  balances,
  setBalances,
  expenses,
  updateExpenseData,
}) => {
  const handleResetCategory = async (category: keyof CategoryBalance) => {
    const updatedBalances = {
      ...balances,
      [category]: INITIAL_BALANCE[category],
    };

    setBalances(updatedBalances);
    await updateExpenseData(updatedBalances, expenses);
  };

  return (
    <div className="balance-list">
      {Object.entries(balances).map(([category, balance]) => {
        const total = INITIAL_BALANCE[category as keyof CategoryBalance];
        const progress = (balance / total) * 100;

        return (
          <div key={category} className="balance-item">
            <span
              className="category-balance"
              style={{
                color: COLORS[category as keyof CategoryBalance],
              }}
            >
              {category}: ₪{balance}
              {balance !== total && ` (תקציב חודשי: ₪${total})`}
            </span>
            <div className="progress-bar-bg">
              <div
                className="progress-bar"
                style={{
                  width: `${progress}%`,
                  backgroundColor: COLORS[category as keyof CategoryBalance],
                }}
              />
            </div>
            <button
              onClick={() => handleResetCategory(category as keyof CategoryBalance)}
              className="reset-button"
            >
              איפוס
            </button>
          </div>
        );
      })}
    </div>
  );
};
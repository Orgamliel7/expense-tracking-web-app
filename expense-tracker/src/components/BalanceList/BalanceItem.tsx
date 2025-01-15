import React from 'react';
import { CategoryBalance, INITIAL_BALANCE, COLORS } from '../../types';

interface BalanceItemProps {
  category: keyof CategoryBalance;
  balance: number;
  onReset: (category: keyof CategoryBalance) => void;
}

export const BalanceItem: React.FC<BalanceItemProps> = ({ category, balance, onReset }) => {
  const total = INITIAL_BALANCE[category];
  const progress = (balance / total) * 100;

  return (
    <div className="balance-item">
      <span
        className="category-balance"
        style={{
          color: COLORS[category],
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
            backgroundColor: COLORS[category],
          }}
        />
      </div>
      <button
        onClick={() => onReset(category)}
        className="reset-button"
      >
        איפוס
      </button>
    </div>
  );
};
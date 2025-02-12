import React, { useMemo } from 'react';
import { Expense, INITIAL_BALANCE } from '../../types';
import './styles.css';

interface SmallCashProps {
  expenses: Expense[];
  actionBtnClicked: boolean;
  onClose: () => void;
}

const SmallCash: React.FC<SmallCashProps> = ({ expenses, actionBtnClicked, onClose }) => {
  const calculateMonthlyData = useMemo(() => {
    const totalInitialBudget = Object.values(INITIAL_BALANCE).reduce((a, b) => a + b, 0);
    const monthlyData: Record<string, { saved: number }> = {};

    expenses.forEach(expense => {
      const date = new Date(expense.date);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${expense.date}`);
        return;
      }

      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { saved: totalInitialBudget };
      }

      monthlyData[monthKey].saved -= expense.amount;
    });

    return monthlyData;
  }, [expenses]);

  const smallCashAmount = useMemo(() => {
    const totalSaved = Object.values(calculateMonthlyData).reduce((acc, { saved }) => acc + saved, 0);
    return totalSaved * 0.3;
  }, [calculateMonthlyData]);

  if (!actionBtnClicked) return null;

  return (
    <div className="small-cash-container">
      <div className="small-cash-content">
        <button onClick={onClose} className="close-btn">x</button>
        <h3>קופה קטנה</h3>
        <div className="small-cash-amount">
          ₪{smallCashAmount.toFixed(2)}
        </div>
      </div>
    </div>
  );
};

export default SmallCash;
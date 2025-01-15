import React from 'react';
import { CategoryBalance, Expense } from '../../types';
import './styles.css';

interface ReportModalProps {
  expenses: Expense[];
  balances: CategoryBalance;
  setBalances: React.Dispatch<React.SetStateAction<CategoryBalance>>;
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  onClose: () => void;
  updateExpenseData: (balances: CategoryBalance, expenses: Expense[]) => Promise<void>;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  expenses,
  balances,
  setBalances,
  setExpenses,
  onClose,
  updateExpenseData,
}) => {
  const handleDeleteExpense = async (index: number) => {
    const expenseToDelete = expenses[index];
    const updatedBalances = {
      ...balances,
      [expenseToDelete.category]: balances[expenseToDelete.category] + expenseToDelete.amount,
    };
    const updatedExpenses = expenses.filter((_, i) => i !== index);

    setBalances(updatedBalances);
    setExpenses(updatedExpenses);
    await updateExpenseData(updatedBalances, updatedExpenses);
  };

  const handleClearExpenses = async () => {
    const restoredBalances = expenses.reduce((acc, expense) => {
      acc[expense.category] += expense.amount;
      return acc;
    }, { ...balances });

    setBalances(restoredBalances);
    setExpenses([]);
    await updateExpenseData(restoredBalances, []);
  };

  return (
    <div className="report-modal">
      <h2>דו"ח הוצאות</h2>
      {expenses.length > 0 ? (
        <>
          <ul className="expense-list">
            {expenses.map((expense, index) => (
              <li key={index} className="expense-item">
                {expense.date} - {expense.category} - ₪{expense.amount}
                {expense.note && <span className="expense-note"> - הערה: {expense.note}</span>}
                <button
                  onClick={() => handleDeleteExpense(index)}
                  className="delete-expense-button"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
          <button onClick={handleClearExpenses} className="clear-report-button">
            נקה דו"ח
          </button>
        </>
      ) : (
        <p>אין הוצאות עדיין</p>
      )}
      <button onClick={onClose} className="close-button">
        סגור דו"ח
      </button>
    </div>
  );
};
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
  const handleDeleteExpense = async (expenseToDelete: Expense) => {
    const updatedBalances = {
      ...balances,
      [expenseToDelete.category]: balances[expenseToDelete.category] - expenseToDelete.amount // Subtract negative amount (which adds it back)
    };

    const updatedExpenses = expenses.filter((expense) => expense !== expenseToDelete);
    
    setBalances(updatedBalances);
    setExpenses(updatedExpenses);
    await updateExpenseData(updatedBalances, updatedExpenses);
  };

  const handleClearExpenses = async () => {
    const restoredBalances = expenses.reduce((acc, expense) => {
      // Subtract the negative amount (which adds it back)
      acc[expense.category] = acc[expense.category] - expense.amount;
      return acc;
    }, { ...balances });
    
    setBalances(restoredBalances);
    setExpenses([]);
    await updateExpenseData(restoredBalances, []);
  };

  const formatAmount = (amount: number) => {
    const absValue = Math.abs(amount);
    return `${absValue.toLocaleString('he-IL')}₪`;  // Fixed string interpolation
  };

  const formatDate = (date: string | number | Date) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        throw new Error('Invalid date');
      }
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;  // Fixed string interpolation
    } catch (e) {
      console.error('Date formatting error:', e);
      return String(date);
    }
  };

  const groupExpensesByDate = (expenses: Expense[]) => {
    return expenses.reduce((groups, expense) => {
      const date = formatDate(expense.date);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(expense);
      return groups;
    }, {} as Record<string, Expense[]>);
  };

  const sortedExpenses = [...expenses].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const groupedExpenses = groupExpensesByDate(sortedExpenses);

  return (
    <div className="report-modal">
      <h2>דו"ח הוצאות</h2>
      {sortedExpenses.length > 0 ? (
        <>
          <ul className="expense-list">
            {Object.entries(groupedExpenses).map(([date, dateExpenses]) => (
              <li key={date} className="date-group">
                <div className="date-header">{date}</div>
                {dateExpenses.map((expense, index) => (
                  <div key={`${date}-${index}`} className="expense-item">
                    <div className="expense-item-details">
                      <span className="expense-category">{expense.category}</span>
                      <span className="expense-amount negative">{formatAmount(expense.amount)}</span>
                      {expense.note && (
                        <span className="expense-note">הערה: {expense.note}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteExpense(expense)} 
                      className="delete-expense-button"
                      aria-label="מחק הוצאה"
                    >
                      &times;
                    </button>
                  </div>
                ))}
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

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
    // Correct the balance by adding back the amount (because we're removing the expense)
    const updatedBalances = {
      ...balances,
      [expenseToDelete.category]: balances[expenseToDelete.category] + expenseToDelete.amount,  // Add the amount back to the balance
    };
  
    // Remove the expense from the expenses array
    const updatedExpenses = expenses.filter((expense) => expense !== expenseToDelete);
    
    // Update the state with new balances and expenses
    setBalances(updatedBalances);
    setExpenses(updatedExpenses);
  
    // Update the backend with the new state
    await updateExpenseData(updatedBalances, updatedExpenses);
  };

  const handleClearExpenses = async () => {
    // Create a copy of the current balances to avoid direct mutations
    const restoredBalances = { ...balances };
  
    // Add back the amounts of cleared expenses to their corresponding categories
    expenses.forEach((expense) => {
      restoredBalances[expense.category] += expense.amount; // Add the amount back to the balance
    });
  
    // Update the states with the restored balances and clear the expenses list
    setBalances(restoredBalances);
    setExpenses([]); // Clear the list of expenses
  
    // Update the backend data accordingly
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

import React, { useEffect, useState } from 'react';
import { CategoryBalance, Expense, INITIAL_BALANCE} from '../../types';
import { useBackButtonClose } from "../../hooks/useBackButtonClose";   
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
  const [currentMonthExpenses, setCurrentMonthExpenses] = useState<Expense[]>([]);
  useBackButtonClose({ onClose });

  useEffect(() => {
    // Filter expenses to only include those from the current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const filtered = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && 
             expenseDate.getFullYear() === currentYear;
    });
    
    setCurrentMonthExpenses(filtered);
  }, [expenses]);

  const handleDeleteExpense = async (expenseToDelete: Expense) => {
    // Create a copy of current balances
    const updatedBalances = { ...balances };
    
    // Only add back the amount if current balance is less than or equal to initial balance
    if (balances[expenseToDelete.category] <= INITIAL_BALANCE[expenseToDelete.category]) {
      updatedBalances[expenseToDelete.category] = balances[expenseToDelete.category] + expenseToDelete.amount;
    }
  
    // Remove the expense from the expenses array
    const updatedExpenses = expenses.filter((expense) => expense !== expenseToDelete);
    
    // Update the state with new balances and expenses
    setBalances(updatedBalances);
    setExpenses(updatedExpenses);
  
    // Update the backend with the new state
    await updateExpenseData(updatedBalances, updatedExpenses);
  };

  const handleClearExpenses = async () => {
    // Get all expenses that are NOT from the current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const nonCurrentMonthExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() !== currentMonth || 
             expenseDate.getFullYear() !== currentYear;
    });
    
    // Create a copy of the current balances to avoid direct mutations
    const restoredBalances = { ...balances };
  
    // Add back the amounts of only current month expenses to their corresponding categories
    currentMonthExpenses.forEach((expense) => {
      restoredBalances[expense.category] += expense.amount; // Add the amount back to the balance
    });
  
    // Update the states with the restored balances and keep only non-current month expenses
    setBalances(restoredBalances);
    setExpenses(nonCurrentMonthExpenses); // Keep expenses that are not from current month
  
    // Update the backend data accordingly
    await updateExpenseData(restoredBalances, nonCurrentMonthExpenses);
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

  const sortedExpenses = [...currentMonthExpenses].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const groupedExpenses = groupExpensesByDate(sortedExpenses);

  // Get current month name in Hebrew
  const getCurrentMonthName = () => {
    const now = new Date();
    const monthNames = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    return monthNames[now.getMonth()];
  };

  return (
    <div className="report-modal">
      <h2>דו"ח הוצאות - {getCurrentMonthName()} {new Date().getFullYear()}</h2>
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
          
          {/*For now, remove the dangerous button that clears all monthly expenses.
           <button onClick={handleClearExpenses} className="clear-report-button"> 
            נקה דו"ח
          </button> */}
        </>
      ) : (
        <p>אין הוצאות בחודש הנוכחי</p>
      )}
      <button onClick={onClose} className="close-button">
        סגור דו"ח
      </button>
    </div>
  );
};
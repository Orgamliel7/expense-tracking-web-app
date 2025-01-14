import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { FaFileExcel } from 'react-icons/fa';
import { CategoryBalance, Expense, INITIAL_BALANCE, COLORS } from './types';
import Analytics from './Analytics';
import './styles.css';

function App() {
  const [balances, setBalances] = useState<CategoryBalance>(INITIAL_BALANCE);
  const [selectedCategory, setSelectedCategory] = useState<keyof CategoryBalance | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const docRef = doc(db, 'balances', 'expenseData');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.balances) setBalances(data.balances as CategoryBalance);
        if (data.expenses) setExpenses(data.expenses as Expense[]);
      }
    };

    fetchData();
  }, []);

  const updateDataInFirestore = async (updatedBalances: CategoryBalance, updatedExpenses: Expense[]) => {
    // Sanitize data: replace undefined values with defaults
    const sanitizedBalances = Object.fromEntries(
      Object.entries(updatedBalances).map(([key, value]) => [key, value ?? 0])
    );
  
    const sanitizedExpenses = updatedExpenses.map(({ category, amount, date, note }) => ({
      category,
      amount: amount ?? 0,
      date,
      note: note ?? '',
    }));
  
    const docRef = doc(db, 'balances', 'expenseData');
  
    try {
      await setDoc(docRef, {
        balances: sanitizedBalances,
        expenses: sanitizedExpenses,
      });
      console.log('Document successfully updated');
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  const handleCategorySelect = (category: keyof CategoryBalance) => {
    setSelectedCategory(category);
  };

  const handleAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategory && amount) {
      const newAmount = Number(amount);
      if (!isNaN(newAmount) && newAmount > 0) {
        const newBalances = {
          ...balances,
          [selectedCategory]: Math.max(0, balances[selectedCategory] - newAmount),
        };

        const now = new Date();
        const formattedDate = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`;

        const newExpense: Expense = {
          category: selectedCategory,
          amount: newAmount,
          date: formattedDate,
          note: note.trim() || undefined,
        };

        const updatedExpenses = [...expenses, newExpense];

        setBalances(newBalances);
        setExpenses(updatedExpenses);
        await updateDataInFirestore(newBalances, updatedExpenses);

        setAmount('');
        setNote('');
        setSelectedCategory(null);
      }
    }
  };


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevents default form submission behavior
        
        const activeElement = document.activeElement as HTMLElement;
  
        // Check if the user is inside the amount or note input
        if (activeElement && (activeElement.classList.contains('amount-input') || activeElement.classList.contains('note-input'))) {
          if (selectedCategory && amount) {
            handleAmountSubmit(e as unknown as React.FormEvent);
          }
        }
      }
  
      if (e.key === 'Escape') {
        // Hide report and reset when Escape is pressed
        setShowReport(false);
        setShowAnalytics(false);
        setSelectedCategory(null);
        setAmount('');
        setNote('');
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCategory, amount, note]);

  const handleDeleteExpense = async (index: number) => {
    const expenseToDelete = expenses[index];
    const updatedBalances = {
      ...balances,
      [expenseToDelete.category]: balances[expenseToDelete.category] + expenseToDelete.amount,
    };
    const updatedExpenses = expenses.filter((_, i) => i !== index);

    setBalances(updatedBalances);
    setExpenses(updatedExpenses);
    await updateDataInFirestore(updatedBalances, updatedExpenses);
  };

  const handleClearExpenses = async () => {
    const restoredBalances = expenses.reduce((acc, expense) => {
      acc[expense.category] += expense.amount;
      return acc;
    }, { ...balances });

    setBalances(restoredBalances);
    setExpenses([]);
    await updateDataInFirestore(restoredBalances, []);
  };

  const handleResetCategory = async (category: keyof CategoryBalance) => {
    const updatedBalances = {
      ...balances,
      [category]: INITIAL_BALANCE[category],
    };

    setBalances(updatedBalances);
    await updateDataInFirestore(updatedBalances, expenses);
  };

  const handleDownloadExcel = () => {
    if (expenses.length === 0) {
      alert('אין הוצאות להורדה');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(expenses);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
    XLSX.writeFile(workbook, 'Expense_Report.xlsx');
  };

  return (
    <div className="App">
      <h1 className="app-title">מעקב הוצאות</h1>

      <div className="category-buttons">
        {Object.keys(balances).map((category) => (
          <button
            key={category}
            onClick={() => handleCategorySelect(category as keyof CategoryBalance)}
            className={`category-button ${selectedCategory === category ? 'selected' : ''}`}
            style={{
              backgroundColor: selectedCategory === category ? COLORS[category as keyof CategoryBalance] : '#E8E8E8',
            }}
          >
            {category}
          </button>
        ))}
      </div>

      <form onSubmit={handleAmountSubmit} className="expense-form">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="הזן סכום"
          className="amount-input"
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="הערה (לא חובה)"
          className="note-input"
        />
        <button type="submit" disabled={!selectedCategory || !amount} className="submit-button">
          אישור
        </button>
      </form>

      <div className="balance-list">
        {Object.entries(balances).map(([category, balance]) => {
          const total = INITIAL_BALANCE[category as keyof CategoryBalance]; // Get initial value
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
                {balance !== total && ` (תקציב חודשי: ₪${total})`} {/* Display initial value only if there's a change */}
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
              <button onClick={() => handleResetCategory(category as keyof CategoryBalance)} className="reset-button">
                איפוס
              </button>
            </div>
          );
        })}
      </div>

      <div className="report-buttons">
        <button onClick={() => setShowReport(true)} className="report-button">
          דו"ח הוצאות
        </button>
        <button onClick={() => setShowAnalytics(true)} className="report-button">
          אנליזות
        </button>
        <button onClick={handleDownloadExcel} className="excel-button">
          <FaFileExcel />
          Excel הורד כקובץ
        </button>
      </div>

      {showReport && (
        <div className="report-modal">
          <h2>דו"ח הוצאות</h2>
          {expenses.length > 0 ? (
            <>
              <ul className="expense-list">
                {expenses.map((expense, index) => (
                  <li key={index} className="expense-item">
                    {expense.date} - {expense.category} - ₪{expense.amount}
                    {expense.note && <span className="expense-note"> - הערה: {expense.note}</span>}
                    <button onClick={() => handleDeleteExpense(index)} className="delete-expense-button">
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
          <button onClick={() => setShowReport(false)} className="close-button">
            סגור דו"ח
          </button>
        </div>
      )}

      {showAnalytics && (
        <Analytics expenses={expenses} balances={balances} onClose={() => setShowAnalytics(false)} />
      )}
    </div>
  );
}

export default App;

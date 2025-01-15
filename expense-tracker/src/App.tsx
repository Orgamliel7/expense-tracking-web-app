import React, { useState, useEffect } from 'react';
import { CategoryButtons } from './components/CategoryButtons/CategoryButtons';
import { ExpenseForm } from './components/ExpenseForm/ExpenseForm';
import { BalanceList } from './components/BalanceList/BalanceList';
import { ReportModal } from './components/ReportModal/ReportModal';
import { ActionButtons } from './components/ActionButtons/ActionButtons';
import Analytics from "./components/Analytics/Analytics"
import { db } from './services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLoading } from './hooks/useLoading';
import { CategoryBalance, Expense, INITIAL_BALANCE } from './types';
import './styles.css';

function App() {
  const [balances, setBalances] = useState<CategoryBalance>(INITIAL_BALANCE);
  const [selectedCategory, setSelectedCategory] = useState<keyof CategoryBalance | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  const { isLoading, error, withLoading } = useLoading();

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
      throw new Error('Failed to update expense data');
    }
  };

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

    withLoading(fetchData);
  }, []);

  const handleExpenseSubmit = async (amount: number, note: string) => {
    if (selectedCategory) {
      await withLoading(async () => {
        const newBalances = {
          ...balances,
          [selectedCategory]: Math.max(0, balances[selectedCategory] - amount),
        };

        const now = new Date();
        const formattedDate = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`;

        const newExpense: Expense = {
          category: selectedCategory,
          amount,
          date: formattedDate,
          note: note.trim() || undefined,
        };

        const updatedExpenses = [...expenses, newExpense];

        setBalances(newBalances);
        setExpenses(updatedExpenses);
        await updateDataInFirestore(newBalances, updatedExpenses);
        setSelectedCategory(null);
      });
    }
  };

  const handleEscape = () => {
    setShowReport(false);
    setShowAnalytics(false);
    setSelectedCategory(null);
  };

  useKeyboardShortcuts({
    onEscape: handleEscape
  });

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  return (
    <div className="App">
      <h1 className="app-title">מעקב הוצאות</h1>

      {isLoading ? (
        <div className="loading-spinner">Loading...</div>
      ) : (
        <>
          <CategoryButtons
            balances={balances}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />

          <ExpenseForm
            selectedCategory={selectedCategory}
            onSubmit={handleExpenseSubmit}
          />

          <BalanceList
            balances={balances}
            setBalances={setBalances}
            expenses={expenses}
            updateExpenseData={updateDataInFirestore}
          />

          <ActionButtons
            expenses={expenses}
            onShowReport={() => setShowReport(true)}
            onShowAnalytics={() => setShowAnalytics(true)}
          />

          {showReport && (
            <ReportModal
              expenses={expenses}
              balances={balances}
              setBalances={setBalances}
              setExpenses={setExpenses}
              onClose={() => setShowReport(false)}
              updateExpenseData={updateDataInFirestore}
            />
          )}

          {showAnalytics && (
            <Analytics
              expenses={expenses}
              balances={balances}
              onClose={() => setShowAnalytics(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
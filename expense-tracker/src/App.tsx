import React, { useState, useEffect } from 'react';
import { CategoryButtons } from './components/CategoryButtons/CategoryButtons';
import { ExpenseForm } from './components/ExpenseForm/ExpenseForm';
import { BalanceList } from './components/BalanceList/BalanceList';
import { ReportModal } from './components/ReportModal/ReportModal';
import Analytics from "./components/Analytics/Analytics";
import { PastReportsModal } from './components/PastReports/PastReports';
import { db } from './services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLoading } from './hooks/useLoading';
import { CategoryBalance, Expense, INITIAL_BALANCE, MonthlyReport } from './types';
import { JerusalemClock } from './components/JerusalemClock/JerusalemClock';
import AdminPanel from './components/AdminPanel/AdminPanel';
import { ExpenseUploader } from './components/ExpenseUploader/ExpenseUploader';
import { ActionButtons } from './components/ActionButtons/ActionButtons';
import SmallCash from './components/SmallCash/SmallCash';


import './styles.css';

function App() {
  const [balances, setBalances] = useState<CategoryBalance>(INITIAL_BALANCE);
  const [selectedCategory, setSelectedCategory] = useState<keyof CategoryBalance | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPastReports, setShowPastReports] = useState(false);
  const [pastReports, setPastReports] = useState<MonthlyReport[]>([]);
  const [showSmallCash, setShowSmallCash] = useState(false);

  
  const { isLoading, error, withLoading } = useLoading();

  const updateDataInFirestore = async (updatedBalances: CategoryBalance, updatedExpenses: Expense[]) => {
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

  const createInitialPastReport = async () => {
    if (pastReports.length === 0 && expenses.length > 0) {
      const now = new Date();
      const monthYear = now.toLocaleString('he-IL', { month: 'long', year: 'numeric' });
      
      const initialMonthlyReport: MonthlyReport = {
        month: monthYear,
        balances: { ...balances },
        expenses: [...expenses],
      };

      const docRef = doc(db, 'balances', 'pastReports');
      const updatedPastReports = [initialMonthlyReport];
      
      try {
        await setDoc(docRef, { reports: updatedPastReports });
        setPastReports(updatedPastReports);
      } catch (error) {
        console.error('Error creating initial past report:', error);
      }
    }
  };

  const checkMonthlyReset = async () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (today.getTime() === firstDayOfMonth.getTime()) {
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthYear = previousMonth.toLocaleString('he-IL', { month: 'long', year: 'numeric' });
      
      const monthlyReport: MonthlyReport = {
        month: monthYear,
        balances: { ...balances },
        expenses: [...expenses],
      };

      const docRef = doc(db, 'balances', 'pastReports');
      const updatedPastReports = [...pastReports, monthlyReport];
      await setDoc(docRef, { reports: updatedPastReports });
      setPastReports(updatedPastReports);

      setBalances(INITIAL_BALANCE);
      setExpenses([]);
      await updateDataInFirestore(INITIAL_BALANCE, []);
    }
  };

  useEffect(() => {
    const fetchPastReports = async () => {
      const docRef = doc(db, 'balances', 'pastReports');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.reports) {
          setPastReports(data.reports as MonthlyReport[]);
        }
      }
    };

    const initializeApp = async () => {
      await fetchPastReports();
      const mainDocRef = doc(db, 'balances', 'expenseData');
      const mainDocSnap = await getDoc(mainDocRef);

      if (mainDocSnap.exists()) {
        const data = mainDocSnap.data();
        if (data.balances) setBalances(data.balances as CategoryBalance);
        if (data.expenses) setExpenses(data.expenses as Expense[]);

        await createInitialPastReport();
      }
    };

    withLoading(initializeApp);
  }, []);

  const handleExpenseSubmit = async (amount: number, note: string) => {
    if (selectedCategory) {
      await withLoading(async () => {
        const newBalances = {
          ...balances,
          [selectedCategory]: balances[selectedCategory] - amount,
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
          displayAmount: ''
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
    setShowPastReports(false);
    setShowSmallCash(false);
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
      <JerusalemClock />
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

          <div className="excel-import-container">
            <ExpenseUploader
              expenses={expenses}
              balances={balances}
              setBalances={setBalances}
              setExpenses={setExpenses}
              updateExpenseData={updateDataInFirestore}
            />
            <label className="excel-import-label" htmlFor="file-upload">
              יבא הוצאות מקובץ אקסל
            </label>
          </div>

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
            onShowPastReports={() => setShowPastReports(true)}  
            onShowSmallCash={() => setShowSmallCash(true)}
          />

          <SmallCash 
            expenses={expenses}
            actionBtnClicked={showSmallCash}
            onClose={() => setShowSmallCash(false)}
          />

          {showPastReports && (
            <PastReportsModal
              // Filter out current month from pastReports before passing
              pastReports={pastReports.filter(report => {
                const currentMonthStr = new Date().toLocaleString('he-IL', { 
                  month: 'long', 
                  year: 'numeric' 
                });
                return report.month !== currentMonthStr;
              })}
              currentMonth={{
                expenses: expenses,
                balances: balances
              }}
              onClose={() => setShowPastReports(false)}
            />
          )}

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
      <AdminPanel />
    </div>
  );
}

export default App;

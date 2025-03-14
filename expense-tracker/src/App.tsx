import React, { useState, useEffect, useMemo } from 'react';
import { CategoryButtons } from './components/CategoryButtons/CategoryButtons';
import { ExpenseForm } from './components/ExpenseForm/ExpenseForm';
import { BalanceList } from './components/BalanceList/BalanceList';
import { ReportModal } from './components/ReportModal/ReportModal';
import Analytics from "./components/Analytics/Analytics";
import AllTimeAnalytics from './components/Analytics/AllTimeAnalytics';
import { PastReportsModal } from './components/PastReports/PastReports';
import { db } from './services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useLoading } from './hooks/useLoading';
import { CategoryBalance, Expense, INITIAL_BALANCE, MonthlyReport, fetchInitialBalance } from './types';
import AdminPanel from './components/AdminPanel/AdminPanel';
import { ActionButtons } from './components/ActionButtons/ActionButtons';
import SmallCash from './components/SmallCash/SmallCash';
import General from './components/GeneralBalance/GeneralBalance';

import './styles.css';

function App() {
  const [isExcelOptionsOpen, setIsExcelOptionsOpen] = useState(false);
  const [balances, setBalances] = useState<CategoryBalance>(INITIAL_BALANCE);
  const [selectedCategory, setSelectedCategory] = useState<keyof CategoryBalance | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAllTimeAnalytics, setShowAllTimeAnalytics] = useState(false);
  const [showPastReports, setShowPastReports] = useState(false);
  const [pastReports, setPastReports] = useState<MonthlyReport[]>([]);
  const [showSmallCash, setShowSmallCash] = useState(false);
  const [showGeneral, setShowGeneral] = useState(false);
  
  const { isLoading, error, withLoading } = useLoading();

  // Filter expenses to only include current month
  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && 
             expenseDate.getFullYear() === currentYear;
    });
  }, [expenses]);

  // Calculate current month balances based on initial balances and current month expenses
  const currentMonthBalances = useMemo(() => {
    // Start with initial balances
    const calculatedBalances = { ...INITIAL_BALANCE };
    
    // Subtract only current month expenses
    currentMonthExpenses.forEach(expense => {
      calculatedBalances[expense.category] -= expense.amount;
    });
    
    return calculatedBalances;
  }, [currentMonthExpenses]);

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
    // Check for reset when app loads
    withLoading(checkMonthlyReset);
    
    // Set up a daily check at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const midnightTimer = setTimeout(() => {
      withLoading(checkMonthlyReset);
    }, timeUntilMidnight);
    
    return () => clearTimeout(midnightTimer);
  }, []);

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
      await fetchInitialBalance();
      await fetchPastReports();
      const mainDocRef = doc(db, 'balances', 'expenseData');
      const mainDocSnap = await getDoc(mainDocRef);

      if (mainDocSnap.exists()) {
        const data = mainDocSnap.data();
        if (data.balances) setBalances(data.balances as CategoryBalance);
        if (data.expenses) setExpenses(data.expenses as Expense[]);

        await createInitialPastReport();
        await checkMonthlyReset();
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
        const formattedDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
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
    setShowAllTimeAnalytics(false);
    setShowPastReports(false);
    setShowSmallCash(false);
    setShowGeneral(false); 
    setIsExcelOptionsOpen(false);
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
            balances={currentMonthBalances}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />

          <ExpenseForm
            selectedCategory={selectedCategory}
            onSubmit={handleExpenseSubmit}
            onCategorySelect={setSelectedCategory}
          />

          <BalanceList
            balances={currentMonthBalances}
            setBalances={setBalances}
            expenses={currentMonthExpenses}
            updateExpenseData={updateDataInFirestore}
          />

          <ActionButtons
            expenses={currentMonthExpenses}
            onShowReport={() => setShowReport(true)}
            onShowAnalytics={() => setShowAnalytics(true)}
            onShowPastReports={() => setShowPastReports(true)}  
            onShowSmallCash={() => setShowSmallCash(true)}
            onShowGeneral={() => setShowGeneral(true)}
            onShowExcelOptions={() => setIsExcelOptionsOpen(true)}
          />

          <General 
            expenses={currentMonthExpenses}
            balances={currentMonthBalances}
            actionBtnClicked={showGeneral}
            onClose={() => setShowGeneral(false)}
          />

          <SmallCash 
            expenses={currentMonthExpenses}
            actionBtnClicked={showSmallCash}
            onClose={() => setShowSmallCash(false)}
          />

          {showPastReports && (
            <PastReportsModal
              pastReports={pastReports.filter(report => {
                const currentMonthStr = new Date().toLocaleString('he-IL', { 
                  month: 'long', 
                  year: 'numeric' 
                });
                return report.month !== currentMonthStr;
              })}
              currentMonth={{
                expenses: currentMonthExpenses,
                balances: currentMonthBalances
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
              expenses={currentMonthExpenses}
              balances={currentMonthBalances}
              onClose={() => setShowAnalytics(false)}
              onShowAllTimeAnalytics={() => {
                setShowAllTimeAnalytics(true);
                setShowAnalytics(false);
              }}
            />
          )}
          
          {showAllTimeAnalytics && (
            <AllTimeAnalytics
              expenses={expenses}
              balances={balances}
              onClose={() => {
                setShowAllTimeAnalytics(false);
                setShowAnalytics(true);
              }}
            />
          )}

          {isExcelOptionsOpen && (
            <AdminPanel
              expenses={expenses}
              balances={balances}
              setBalances={setBalances}
              setExpenses={setExpenses}
              updateExpenseData={updateDataInFirestore}
              onClose={() => setIsExcelOptionsOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
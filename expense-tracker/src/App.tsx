import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  
  // Use refs to prevent infinite loops
  const isInitialized = useRef(false);
  const isProcessingMonthlyReset = useRef(false);
  const lastFirestoreUpdate = useRef<string | null>(null);
  
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

  // Calculate current month balances
  const currentMonthBalances = useMemo(() => {
    // Start with initial balances
    const calculatedBalances = { ...INITIAL_BALANCE };
    
    // Subtract only current month expenses
    currentMonthExpenses.forEach(expense => {
      calculatedBalances[expense.category] -= expense.amount;
    });
    
    return calculatedBalances;
  }, [currentMonthExpenses]);

  const updateDataInFirestore = useCallback(async (updatedBalances: CategoryBalance, updatedExpenses: Expense[]): Promise<void> => {
    // Prevent duplicate updates
    const updateSignature = JSON.stringify({ 
      balances: updatedBalances, 
      expensesLength: updatedExpenses.length 
    });
    
    if (updateSignature === lastFirestoreUpdate.current) {
      console.log('Skipping duplicate Firestore update');
      return;
    }
    
    const docRef = doc(db, 'balances', 'expenseData');
    
    try {
      // Make sure expenses are properly structured for Firestore
      const sanitizedExpenses = updatedExpenses.map(expense => ({
        ...expense,
        amount: Number(expense.amount) || 0,
        date: expense.date || new Date().toISOString(),
        displayAmount: expense.displayAmount || '',
        note: expense.note || '',
      }));
      
      await setDoc(docRef, {
        balances: updatedBalances,
        expenses: sanitizedExpenses,
        lastUpdated: new Date().toISOString()
      });
      
      // Save update signature to prevent duplicates
      lastFirestoreUpdate.current = updateSignature;
      console.log('Document successfully updated');
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }, []);

  const verifyUpdate = useCallback(async (lastExpense: Expense): Promise<boolean> => {
    const docRef = doc(db, 'balances', 'expenseData');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Check if our new expense is actually in the database
      const foundInDb = data.expenses.some((e: Expense) => 
        e.date === lastExpense.date && 
        Math.abs(e.amount - lastExpense.amount) < 0.01 && 
        e.category === lastExpense.category
      );
      
      if (!foundInDb) {
        console.error("Expense was not properly saved to Firestore!");
        return false;
      }
      return true;
    }
    return false;
  }, []);

  const createInitialPastReport = useCallback(async () => {
    // Prevent running multiple times
    if (isProcessingMonthlyReset.current) return;
    
    if (pastReports.length === 0 && expenses.length > 0) {
      isProcessingMonthlyReset.current = true;
      
      try {
        const now = new Date();
        const monthYear = now.toLocaleString('he-IL', { month: 'long', year: 'numeric' });
        
        const initialMonthlyReport: MonthlyReport = {
          month: monthYear,
          balances: { ...balances },
          expenses: [...expenses],
        };

        const docRef = doc(db, 'balances', 'pastReports');
        const updatedPastReports = [initialMonthlyReport];
        
        await setDoc(docRef, { reports: updatedPastReports });
        setPastReports(updatedPastReports);
      } catch (error) {
        console.error('Error creating initial past report:', error);
      } finally {
        isProcessingMonthlyReset.current = false;
      }
    }
  }, [pastReports.length, expenses, balances]);

  const checkMonthlyReset = useCallback(async () => {
    // Prevent running multiple times
    if (isProcessingMonthlyReset.current) return;
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (today.getTime() === firstDayOfMonth.getTime()) {
      isProcessingMonthlyReset.current = true;
      
      try {
        // Get previous month
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const monthYear = previousMonth.toLocaleString('he-IL', { month: 'long', year: 'numeric' });
        
        // Filter expenses for the previous month only
        const previousMonthExpenses = expenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate.getMonth() === previousMonth.getMonth() && 
                expenseDate.getFullYear() === previousMonth.getFullYear();
        });
        
        // Create monthly report with only previous month's expenses
        const monthlyReport = {
          month: monthYear,
          balances,
          expenses: previousMonthExpenses
        };
        
        // Check if we already have this report
        const existingReportIndex = pastReports.findIndex(r => r.month === monthYear);
        let updatedPastReports = [...pastReports];
        
        if (existingReportIndex >= 0) {
          // Update existing report
          updatedPastReports[existingReportIndex] = monthlyReport;
        } else {
          // Add new report
          updatedPastReports = [...pastReports, monthlyReport];
        }

        // Update past reports in Firebase
        const docRef = doc(db, 'balances', 'pastReports');
        await setDoc(docRef, { reports: updatedPastReports });
        setPastReports(updatedPastReports);

        // Reset balances to initial values
        setBalances(INITIAL_BALANCE);
        
        // Keep expenses data in Firebase
        await updateDataInFirestore(INITIAL_BALANCE, expenses);
      } catch (error) {
        console.error('Error during monthly reset:', error);
      } finally {
        isProcessingMonthlyReset.current = false;
      }
    }
  }, [expenses, balances, pastReports, updateDataInFirestore]);

  // Initialize the app once on mount
  useEffect(() => {
    if (isInitialized.current) return;

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
      try {
        await fetchInitialBalance();
        await fetchPastReports();
        
        const mainDocRef = doc(db, 'balances', 'expenseData');
        const mainDocSnap = await getDoc(mainDocRef);

        if (mainDocSnap.exists()) {
          const data = mainDocSnap.data();
          if (data.balances) setBalances(data.balances as CategoryBalance);
          if (data.expenses) setExpenses(data.expenses as Expense[]);
          
          // Save the initial data signature to prevent immediate re-writes
          lastFirestoreUpdate.current = JSON.stringify({ 
            balances: data.balances, 
            expensesLength: data.expenses?.length || 0 
          });
        }
        
        isInitialized.current = true;
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    withLoading(initializeApp);
  }, [withLoading]);

  // Run monthly check/initialization only after data is loaded and once per session
  useEffect(() => {
    if (!isInitialized.current) return;
    
    const setupInitialStuff = async () => {
      // Only run these once after initialization
      if (expenses.length > 0 && !isProcessingMonthlyReset.current) {
        await createInitialPastReport();
        await checkMonthlyReset();
      }
    };
    
    setupInitialStuff();
    
    // Set up a midnight check (runs once per day)
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    tomorrow.setHours(0, 1, 0, 0); // 00:01 to avoid exactly midnight
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const midnightTimer = setTimeout(() => {
      checkMonthlyReset();
    }, timeUntilMidnight);
    
    return () => clearTimeout(midnightTimer);
  }, [expenses.length, createInitialPastReport, checkMonthlyReset]);

  const handleExpenseSubmit = useCallback(async (amount: number, note: string) => {
    if (selectedCategory) {
      try {
        await withLoading(async () => {
          const newBalances = {
            ...balances,
            [selectedCategory]: balances[selectedCategory] - amount,
          };
          
          const now = new Date();
          const formattedDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          
          const newExpense: Expense = {
            category: selectedCategory,
            amount: Number(amount),
            date: formattedDate,
            note: note.trim() || '',
            displayAmount: '',
          };
          
          const updatedExpenses: Expense[] = [...expenses, newExpense];
          
          // Update Firestore FIRST
          await updateDataInFirestore(newBalances, updatedExpenses);
          
          // Verify update succeeded
          const verified = await verifyUpdate(newExpense);
          if (!verified) {
            throw new Error("Failed to verify expense was saved to Firestore");
          }
          
          // Only update local state AFTER successful Firestore update
          setBalances(newBalances);
          setExpenses(updatedExpenses);
          setSelectedCategory(null);
        });
      } catch (err) {
        console.error("Failed to save expense:", err);
        alert("Failed to save expense. Please try again.");
      }
    }
  }, [selectedCategory, balances, expenses, updateDataInFirestore, verifyUpdate, withLoading]);

  const handleEscape = useCallback(() => {
    setShowReport(false);
    setShowAnalytics(false);
    setShowAllTimeAnalytics(false);
    setShowPastReports(false);
    setShowSmallCash(false);
    setShowGeneral(false); 
    setIsExcelOptionsOpen(false);
    setSelectedCategory(null);
  }, []);

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
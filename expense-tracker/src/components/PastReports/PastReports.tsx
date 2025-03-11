import React, { useState, useEffect } from 'react';
import { MonthlyReport, COLORS, CategoryBalance, Expense } from '../../types';
import { db } from '../../services/firebase'; 
import { doc, getDoc } from 'firebase/firestore';
import { useBackButtonClose } from "../../hooks/useBackButtonClose";
import { CategorySearchModal } from './CategorySearchModal';
import { Search } from 'lucide-react';
import './styles.css';

interface PastReportsModalProps {
  pastReports: MonthlyReport[];
  currentMonth: {
    expenses: Array<{
      category: string;
      amount: number;
      note?: string;
      date: string;
    }>;
    balances: CategoryBalance;
  };
  onClose: () => void;
}

export const PastReportsModal: React.FC<PastReportsModalProps> = ({ 
  pastReports, 
  currentMonth, 
  onClose 
}) => {
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [monthlySortedExpenses, setMonthlySortedExpenses] = useState<Record<string, Expense[]>>({});
  const [monthlyBalances, setMonthlyBalances] = useState<Record<string, CategoryBalance>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');
  const [showCategorySearch, setShowCategorySearch] = useState<boolean>(false);
  useBackButtonClose({ onClose });

  const formatAmount = (amount: number) => {
    const absValue = Math.abs(amount).toLocaleString();
    return amount < 0 ? `-₪${absValue}` : `₪${absValue}`;
  };

  const currentMonthStr = new Date().toLocaleString('he-IL', { 
    month: 'long', 
    year: 'numeric' 
  });

  // Check if month is January
  const isJanuary = (month: string) => {
    return month.includes('ינואר');
  };

  // Fetch expenses data from Firebase - using the correct path as in Analytics
  useEffect(() => {
    const fetchAllExpenses = async () => {
      try {
        setIsLoading(true);
        
        // Get expenses data from Firestore - using the exact same path as Analytics
        const docRef = doc(db, 'balances', 'expenseData');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const firestoreExpenses: Expense[] = data.expenses || [];
          const balanceData = data.monthlyBalances || {};
          
          // Group expenses by month (February, March, etc.)
          const groupedExpenses: Record<string, Expense[]> = {};
          const groupedBalances: Record<string, CategoryBalance> = { ...balanceData };
          
          firestoreExpenses.forEach(expense => {
            try {
              const expenseDate = new Date(expense.date);
              if (isNaN(expenseDate.getTime())) {
                console.warn(`Invalid date: ${expense.date}`);
                return;
              }
              
              // Create month key in Hebrew format
              const monthYear = expenseDate.toLocaleString('he-IL', {
                month: 'long',
                year: 'numeric'
              });
              
              // Skip January expenses
              if (isJanuary(monthYear)) {
                return;
              }
              
              if (!groupedExpenses[monthYear]) {
                groupedExpenses[monthYear] = [];
              }
              
              groupedExpenses[monthYear].push({
                ...expense,
                amount: typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount
              });
            } catch (error) {
              console.error("Error processing expense:", error, expense);
            }
          });
          
          // Set February balances if available
          const febMonthKey = 'פברואר 2025';
          if (!groupedBalances[febMonthKey] && groupedExpenses[febMonthKey]) {
            // Calculate February balances based on expenses
            const febExpenses = groupedExpenses[febMonthKey];
            const febBalances = { ...currentMonth.balances };
            
            // Update balances based on expenses
            febExpenses.forEach(exp => {
              if (febBalances[exp.category]) {
                febBalances[exp.category] -= exp.amount;
              }
            });
            
            groupedBalances[febMonthKey] = febBalances;
          }
          
          // Add current month's expenses from props
          if (currentMonth.expenses && currentMonth.expenses.length > 0) {
            if (!groupedExpenses[currentMonthStr]) {
              groupedExpenses[currentMonthStr] = [];
            }
            
            // Merge with any existing expenses for current month
            // Fix: Add displayAmount property to meet Expense type requirements
            groupedExpenses[currentMonthStr] = [
              ...groupedExpenses[currentMonthStr],
              ...currentMonth.expenses
                .filter(exp =>
                  !groupedExpenses[currentMonthStr].some(existing =>
                    existing.date === exp.date &&
                    existing.amount === exp.amount &&
                    existing.category === exp.category
                  )
                )
                .map(exp => ({
                  ...exp,
                  category: exp.category as keyof CategoryBalance, // Ensure it's a valid key
                  displayAmount: formatAmount(exp.amount)
                }))
            ];
          }
          
          // Ensure current month balances are set
          groupedBalances[currentMonthStr] = currentMonth.balances;
          
          // Sort expenses within each month by date (newest first)
          Object.keys(groupedExpenses).forEach(month => {
            groupedExpenses[month].sort((a, b) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
          });
          
          setMonthlySortedExpenses(groupedExpenses);
          setMonthlyBalances(groupedBalances);
        } else {
          console.log("No expense data found!");
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching expenses data:", error);
        setMessage('שגיאה בטעינת הנתונים');
        setIsLoading(false);
      }
    };
    
    fetchAllExpenses();
  }, [currentMonth.expenses, currentMonth.balances, currentMonthStr]);

  // Process and prepare reports for display
  const prepareReports = () => {
    // Create a set of months we already have from pastReports
    const existingMonths = new Set(pastReports.map(report => report.month));
    
    // Get all months from our fetched expenses that aren't in pastReports
    const additionalMonths = Object.keys(monthlySortedExpenses)
      .filter(month => !existingMonths.has(month) && !isJanuary(month));
    
    // Create reports for these additional months
    const additionalReports = additionalMonths.map(month => ({
      month,
      balances: monthlyBalances[month] || { ...currentMonth.balances },
      expenses: monthlySortedExpenses[month] || []
    }));
    
    // Merge existing reports with new ones, but filter out January
    const allReportsUnsorted = [
      // Current month (always first)
      {
        month: currentMonthStr,
        balances: currentMonth.balances,
        expenses: monthlySortedExpenses[currentMonthStr] || []
      },
      // Past reports (with updated expenses if available)
      ...pastReports
        .filter(report => !isJanuary(report.month))
        .map(report => ({
          ...report,
          balances: monthlyBalances[report.month] || report.balances,
          expenses: monthlySortedExpenses[report.month] || report.expenses || []
        })),
      // Additional reports from expenses data
      ...additionalReports.filter(report => report.month !== currentMonthStr)
    ];
    
    // Remove duplicates (based on month)
    const uniqueReports: Record<string, MonthlyReport> = {};
    allReportsUnsorted.forEach(report => {
      uniqueReports[report.month] = report;
    });
    
    return Object.values(uniqueReports);
  };

  // Sort reports by date (newest first)
  const sortReports = (reports: MonthlyReport[]) => {
    return [...reports].sort((a, b) => {
      const hebrewMonths = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
      ];

      const getMonthNumber = (monthString: string) => {
        for (let i = 0; i < hebrewMonths.length; i++) {
          if (monthString.includes(hebrewMonths[i])) {
            return i;
          }
        }
        return -1;
      };

      const getYearNumber = (monthString: string) => {
        const yearMatch = monthString.match(/\d{4}/);
        return yearMatch ? parseInt(yearMatch[0]) : 0;
      };

      const aYear = getYearNumber(a.month);
      const bYear = getYearNumber(b.month);

      if (aYear !== bYear) return bYear - aYear;

      const aMonth = getMonthNumber(a.month);
      const bMonth = getMonthNumber(b.month);

      return bMonth - aMonth;
    });
  };

  const toggleReport = (month: string) => {
    setExpandedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(month)) {
        newSet.delete(month);
      } else {
        newSet.add(month);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // If the date is invalid, return as is
      }
      return date.toLocaleString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleCategorySearchClick = () => {
    setShowCategorySearch(true);
  };

  const handleCategorySearchClose = () => {
    setShowCategorySearch(false);
  };

  const allReports = sortReports(prepareReports())
    .filter(report => !isJanuary(report.month)); // Extra filter to ensure no January reports

  return (
    <>
      <div className="past-reports-modal">
        <div className="past-reports-content">
          <div className="past-reports-header">
            <h2>דו"חות עבר</h2>
            <div className="header-actions">
              <button 
                onClick={handleCategorySearchClick} 
                className="category-search-btn"
                title="חיפוש לפי קטגוריה"
              >
                <Search size={20} />
              </button>
              <button onClick={onClose} className="close-btn">×</button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="loading-container">
              <p>טוען נתונים...</p>
            </div>
          ) : message ? (
            <div className="error-message">
              <p>{message}</p>
            </div>
          ) : (
            <div className="past-reports-list"> 
              {allReports.length === 0 ? (
                <div className="no-reports">
                  <p>אין דו"חות קודמים</p>
                  <p>ההוצאות שלך יופיעו כאן בסוף כל חודש</p>
                </div>
              ) : (
                allReports.map((report, index) => (
                  <div key={report.month} className="report-card">
                    <div 
                      className={`report-header ${expandedReports.has(report.month) ? 'expanded' : ''} ${report.month === currentMonthStr ? 'current-month' : ''}`}
                      onClick={() => toggleReport(report.month)}
                    >
                      <h3>
                        {report.month}
                        {report.month === currentMonthStr && (
                          <span className="current-tag">חודש נוכחי</span>
                        )}
                      </h3>
                      <span className="toggle-icon">
                        {expandedReports.has(report.month) ? '▲' : '▼'}
                      </span>
                    </div>
                    
                    {expandedReports.has(report.month) && (
                      <div className="report-details">
                        <div className="balances-section">
                          <h4>יתרות סופיות:</h4>
                          {Object.entries(report.balances).map(([category, amount]) => {
                            // Convert amount to number if it's a string
                            const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
                            
                            return (
                              <div 
                                key={category} 
                                className="balance-item"
                                style={{ 
                                  color: COLORS[category as keyof typeof COLORS],
                                  fontWeight: 'bold'
                                }}
                              >
                                <span>{category}</span>
                                <span>{formatAmount(numAmount)}</span>
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="expenses-section">
                          <h4>הוצאות:</h4>
                          {(!report.expenses || report.expenses.length === 0) ? (
                            <p>לא בוצעו הוצאות החודש</p>
                          ) : (
                            <div className="expenses-list">
                              {report.expenses.map((expense, idx) => (
                                <div 
                                  key={`${report.month}-${idx}-${expense.date}`}
                                  className="expense-item"
                                  style={{ 
                                    borderLeft: `4px solid ${COLORS[expense.category as keyof typeof COLORS]}` 
                                  }}
                                >
                                  <div className="expense-category">
                                    {expense.category}
                                  </div>
                                  <div className="expense-amount">
                                    {expense.displayAmount || formatAmount(parseFloat(expense.amount.toString()))}
                                  </div>
                                  {expense.note && (
                                    <div className="expense-note">
                                      <i>{expense.note}</i>
                                    </div>
                                  )}
                                  <div className="expense-date">
                                    {formatDate(expense.date)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      
      {showCategorySearch && (
        <CategorySearchModal 
          allExpenses={monthlySortedExpenses}
          onClose={handleCategorySearchClose}
        />
      )}
    </>
  );
};
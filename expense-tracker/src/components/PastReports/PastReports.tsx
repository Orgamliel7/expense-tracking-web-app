import React, { useState, useEffect } from 'react';
import { MonthlyReport, COLORS, CategoryBalance, Expense } from '../../types';
import { db } from '../../services/firebase'; 
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
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
  const [filteredReports, setFilteredReports] = useState<MonthlyReport[]>([]);
  const [message, setMessage] = useState<string>('');
  const [expensesData, setExpensesData] = useState<Expense[]>([]); // To store fetched expenses

  const formatAmount = (amount: number) => `₪${Math.abs(amount).toLocaleString()}`;

  const currentMonthStr = new Date().toLocaleString('he-IL', { 
    month: 'long', 
    year: 'numeric' 
  });

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        // Fetch expenses from Firebase (adjust collection and path as necessary)
        const expensesSnapshot = await getDocs(collection(db, 'expenses'));
        const expensesList: Expense[] = [];
        expensesSnapshot.forEach((doc) => {
          const data = doc.data() as Expense;
          
          // Parse data
          const parsedExpense: Expense = {
            category: data.category,
            amount: parseFloat(data.amount) || 0, // Ensure amount is a number
            note: data.note || '', // If no note, set to empty string
            date: new Date(data.date).toISOString() // Parse date
          };
          
          expensesList.push(parsedExpense);
        });
    
        setExpensesData(expensesList);  // Set expenses data from Firebase
      } catch (error) {
        setMessage('Error fetching expenses');
        console.error('Error fetching expenses:', error);
      }
    };

    fetchExpenses();
  }, []);

  useEffect(() => {
    const nonEmptyReports = pastReports.filter(report => 
      report.expenses && report.expenses.length > 0
    );
  
    const februaryExists = nonEmptyReports.some(report => 
      report.month.includes('פברואר') && report.month.includes('2025')
    );
  
    if (!februaryExists) {
      const februaryReport: MonthlyReport = {
        month: 'פברואר 2025',
        balances: { ...currentMonth.balances },
        expenses: [] 
      };
      setFilteredReports([...nonEmptyReports, februaryReport]);
    } else {
      setFilteredReports(nonEmptyReports);
    }
  
    // Parsing balance values to ensure they are numbers
    const parsedReports = nonEmptyReports.map(report => ({
      ...report,
      balances: Object.fromEntries(
        Object.entries(report.balances).map(([category, amount]) => [
          category, 
          parseFloat(amount) || 0  // Ensure balances are numbers
        ])
      ),
    }));
  
    setFilteredReports(parsedReports); // Update filtered reports
  }, [pastReports, currentMonth.balances]);
  

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

  const sortedReports = [...filteredReports].sort((a, b) => {
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

  const allReports = [
    {
      month: currentMonthStr,
      ...currentMonth
    },
    ...sortedReports
  ];
  
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
  

  return (
    <div className="past-reports-modal">
      <div className="past-reports-content">
        <div className="past-reports-header">
          <h2>דו"חות עבר</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
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
                  className={`report-header ${expandedReports.has(report.month) ? 'expanded' : ''} ${index === 0 ? 'current-month' : ''}`}
                  onClick={() => toggleReport(report.month)}
                >
                  <h3>
                    {report.month}
                    {index === 0 && (
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
                      {Object.entries(report.balances).map(([category, amount]) => (
                        <div 
                          key={category} 
                          className="balance-item"
                          style={{ 
                            color: COLORS[category as keyof typeof COLORS],
                            fontWeight: 'bold'
                          }}
                        >
                          <span>{category}</span>
                          <span>{formatAmount(amount)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="expenses-section">
                      <h4>הוצאות:</h4>
                      {(!report.expenses || report.expenses.length === 0) ? (
                        <p>לא בוצעו הוצאות החודש</p>
                      ) : (
                        <div className="expenses-list">
                          {[...report.expenses, ...expensesData]
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((expense, idx) => (
                              <div 
                                key={`${report.month}-${idx}`}
                                className="expense-item"
                                style={{ 
                                  borderLeft: `4px solid ${COLORS[expense.category as keyof typeof COLORS]}` 
                                }}
                              >
                                <div className="expense-category">
                                  {expense.category}
                                </div>
                                <div className="expense-amount">
                                  {formatAmount(expense.amount)}
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
      </div>
    </div>
  );
};

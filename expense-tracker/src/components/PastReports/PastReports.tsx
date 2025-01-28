import React, { useState } from 'react';
import { MonthlyReport, COLORS, CategoryBalance } from '../../types';
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
    balances: CategoryBalance;  // Changed from Record<string, number> to CategoryBalance
  };
  onClose: () => void;
}

export const PastReportsModal: React.FC<PastReportsModalProps> = ({ 
  pastReports, 
  currentMonth, 
  onClose 
}) => {
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  
  const formatAmount = (amount: number) => `₪${Math.abs(amount).toLocaleString()}`;
  
  const currentMonthStr = new Date().toLocaleString('he-IL', { 
    month: 'long', 
    year: 'numeric' 
  });

  const allReports = [
    {
      month: currentMonthStr,
      ...currentMonth
    },
    ...pastReports
  ];

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
                  className={`report-header ${
                    expandedReports.has(report.month) ? 'expanded' : ''
                  } ${index === 0 ? 'current-month' : ''}`}
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
                      {report.expenses.length === 0 ? (
                        <p>לא בוצעו הוצאות החודש</p>
                      ) : (
                        <div className="expenses-list">
                          {report.expenses.map((expense, idx) => (
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
                                {expense.date}
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
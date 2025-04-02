import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { CategoryBalance, Expense, COLORS, INITIAL_BALANCE } from '../../types';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useBackButtonClose } from "../../hooks/useBackButtonClose";  
import './styles.css';

interface AllTimeAnalyticsProps {
  expenses: Expense[];
  balances: CategoryBalance;
  onClose: () => void;
}

interface CategoryAnalysis {
  name: string;
  initialBudget: number;
  spent: number;
  saved: number;
  percentage: number;
  color: string;
}

const AllTimeAnalytics: React.FC<AllTimeAnalyticsProps> = ({ expenses, balances, onClose }) => {
  const [allExpenses, setAllExpenses] = useState<Expense[]>(expenses);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'categories'>('overview');
  useBackButtonClose({ onClose });

  // Fetch all expenses from Firestore
  useEffect(() => {
    const fetchAllExpenses = async () => {
      try {
        setIsLoading(true);
        
        // Get expenses data from Firestore
        const docRef = doc(db, 'balances', 'expenseData');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const firestoreExpenses = data.expenses || [];
          setAllExpenses(firestoreExpenses);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching expenses data:", error);
        setIsLoading(false);
      }
    };
    
    fetchAllExpenses();
  }, []);

  // Find earliest month with data
  const startDate = useMemo(() => {
    if (allExpenses.length === 0) {
      // Default to current month if no expenses
      return new Date();
    }

    // Find the earliest date in expenses
    const dates = allExpenses
      .map(expense => new Date(expense.date))
      .filter(date => !isNaN(date.getTime())); // Filter out invalid dates
    
    if (dates.length === 0) {
      return new Date(); // Default to current month if no valid dates
    }
    
    // Get the earliest date
    const earliestDate = new Date(Math.min(...dates.map(date => date.getTime())));
    // Set to the first day of that month
    return new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
  }, [allExpenses]);

  // Calculate how many months have passed since start date
  const monthsElapsed = useMemo(() => {
    const currentDate = new Date();
    
    return (
      (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
      (currentDate.getMonth() - startDate.getMonth()) + 1
    );
  }, [startDate]);

  // Format the start date for display
  const formattedStartDate = useMemo(() => {
    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    return `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;
  }, [startDate]);

  // Calculate all-time data for each category
  const categoryAnalysis = useMemo((): CategoryAnalysis[] => {
    // Calculate total budget allocated across all months
    const categoryBudgets = Object.entries(INITIAL_BALANCE).map(([category, budget]) => {
      // Total amount allocated to this category since start date
      const initialBudget = budget * monthsElapsed;
      
      // Total amount spent in this category
      const spent = allExpenses
        .filter(expense => expense.category === category)
        .reduce((sum, expense) => sum + expense.amount, 0);
      
      // Calculate savings (total budget minus spent)
      const saved = initialBudget - spent;
      
      // Calculate savings percentage relative to initial budget
      const percentage = initialBudget > 0 ? (saved / initialBudget) * 100 : 0;
      
      return {
        name: category,
        initialBudget,
        spent,
        saved,
        percentage,
        color: COLORS[category as keyof CategoryBalance]
      };
    });
    
    return categoryBudgets;
  }, [allExpenses, monthsElapsed]);

  // Data for pie chart - distribution of spending
  const spendingDistribution = useMemo(() => {
    return categoryAnalysis.map(category => ({
      name: category.name,
      value: category.spent,
      percentage: (category.spent / categoryAnalysis.reduce((sum, cat) => sum + cat.spent, 0)) * 100,
      color: category.color
    }));
  }, [categoryAnalysis]);

  // Data for pie chart - distribution of savings
  const savingsDistribution = useMemo(() => {
    return categoryAnalysis.map(category => ({
      name: category.name,
      value: category.saved > 0 ? category.saved : 0, // Only include positive savings
      percentage: category.saved > 0 
        ? (category.saved / categoryAnalysis.reduce((sum, cat) => sum + Math.max(0, cat.saved), 0)) * 100 
        : 0,
      color: category.color
    }));
  }, [categoryAnalysis]);

  // Calculate monthly spending trend
  const monthlySpendingTrend = useMemo(() => {
    // Find unique months from expense data
    const uniqueMonths = new Set<string>();
    
    // Add months from expense data
    allExpenses.forEach(expense => {
      const expDate = new Date(expense.date);
      if (isNaN(expDate.getTime())) {
        return;
      }
      
      const monthKey = `${String(expDate.getMonth() + 1).padStart(2, '0')}/${expDate.getFullYear()}`;
      uniqueMonths.add(monthKey);
    });
    
    // Add current month if not already in the set
    const currentDate = new Date();
    const currentMonthKey = `${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
    uniqueMonths.add(currentMonthKey);
    
    // Create a map of all collected months
    const months: Record<string, { month: string, totalSpent: number, displayName: string }> = {};
    
    // Initialize months with zero values
    uniqueMonths.forEach(monthKey => {
      const [monthStr, yearStr] = monthKey.split('/');
      const month = parseInt(monthStr) - 1;
      const year = parseInt(yearStr);
      const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
      
      months[monthKey] = {
        month: monthKey,
        totalSpent: 0,
        displayName: `${monthNames[month]} ${year}`
      };
    });
    
    // Add spending data to each month
    allExpenses.forEach(expense => {
      const expDate = new Date(expense.date);
      if (isNaN(expDate.getTime())) {
        return;
      }
      
      const monthKey = `${String(expDate.getMonth() + 1).padStart(2, '0')}/${expDate.getFullYear()}`;
      if (months[monthKey]) {
        months[monthKey].totalSpent += expense.amount;
      }
    });
    
    // Convert to array and sort chronologically
    return Object.values(months).sort((a, b) => {
      const [aMonth, aYear] = a.month.split('/');
      const [bMonth, bYear] = b.month.split('/');
      const dateA = new Date(parseInt(aYear), parseInt(aMonth) - 1);
      const dateB = new Date(parseInt(bYear), parseInt(bMonth) - 1);
      return dateA.getTime() - dateB.getTime();
    });
  }, [allExpenses]);

  // Calculate overall budget metrics
  const overallMetrics = useMemo(() => {
    const totalBudget = Object.values(INITIAL_BALANCE).reduce((sum, budget) => sum + budget, 0) * monthsElapsed;
    const totalSpent = allExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalSaved = totalBudget - totalSpent;
    const savingsPercentage = totalBudget > 0 ? (totalSaved / totalBudget) * 100 : 0;
    
    return {
      totalBudget,
      totalSpent,
      totalSaved,
      savingsPercentage
    };
  }, [allExpenses, monthsElapsed]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="analytics-modal">
        <div className="analytics-content">
          <h2>ניתוח כולל</h2>
          <div className="loading">טוען נתונים...</div>
          <button onClick={onClose} className="close-button">
            סגור
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-modal all-time-analytics">
      <div className="analytics-content">
        <h2>ניתוח הוצאות כולל</h2>
        <p className="all-time-subtitle">מאז {formattedStartDate} ועד היום ({monthsElapsed} חודשים)</p>
        
        <div className="all-time-summary">
          <div className="summary-item total-budget">
            <div className="item-value">{formatCurrency(overallMetrics.totalBudget)}</div>
            <div className="item-label">תקציב כולל</div>
          </div>
          <div className="summary-item total-spent">
            <div className="item-value">{formatCurrency(overallMetrics.totalSpent)}</div>
            <div className="item-label">סה"כ הוצאות</div>
          </div>
          <div className="summary-item total-saved">
            <div className="item-value">{formatCurrency(overallMetrics.totalSaved)}</div>
            <div className="item-label">סה"כ חסכון</div>
            <div className="savings-percentage">
              {overallMetrics.savingsPercentage.toFixed(1)}% מהתקציב
            </div>
          </div>
        </div>
        
        <div className="analytics-tabs">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            סקירה כללית
          </button>
          <button 
            className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            פירוט קטגוריות
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="chart-container">
              <h3>התפלגות הוצאות לפי קטגוריה</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={spendingDistribution.filter(entry => entry.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                  >
                    {spendingDistribution
                      .filter(entry => entry.value > 0)
                      .map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                        />
                      ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${formatCurrency(Number(value))} (${props.payload.percentage.toFixed(1)}%)`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3>התפלגות חסכונות לפי קטגוריה</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={savingsDistribution.filter(entry => entry.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                  >
                    {savingsDistribution
                      .filter(entry => entry.value > 0)
                      .map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                        />
                      ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${formatCurrency(Number(value))} (${props.payload.percentage.toFixed(1)}%)`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container">
              <h3>מגמת הוצאות לאורך זמן</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={monthlySpendingTrend}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="displayName"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${formatCurrency(Number(value))}`, 'סה"כ הוצאות']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar 
                    dataKey="totalSpent" 
                    fill="#f56565" 
                    name="הוצאות חודשיות" 
                    radius={[10, 10, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {activeTab === 'categories' && (
          <div className="category-details">
            {categoryAnalysis.map(category => (
              <div key={category.name} className="category-card" style={{ borderColor: category.color }}>
                <div className="category-header" style={{ backgroundColor: category.color }}>
                  <h3>{category.name}</h3>
                </div>
                <div className="category-metrics">
                  <div className="metric">
                    <div className="metric-label">תקציב מקורי (לכל התקופה)</div>
                    <div className="metric-value">{formatCurrency(category.initialBudget)}</div>
                  </div>
                  <div className="metric">
                    <div className="metric-label">סה"כ הוצאות</div>
                    <div className="metric-value">{formatCurrency(category.spent)}</div>
                  </div>
                  <div className="metric">
                    <div className="metric-label">חסכון</div>
                    <div className="metric-value" style={{ 
                      color: category.saved >= 0 ? '#38a169' : '#e53e3e' 
                    }}>
                      {formatCurrency(category.saved)}
                      <span className="percentage">
                        {category.saved >= 0 
                          ? `(חסכת ${category.percentage.toFixed(1)}%)` 
                          : `(חריגה של ${Math.abs(category.percentage).toFixed(1)}%)`
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={onClose} className="close-button">
          סגור
        </button>
      </div>
    </div>
  );
};

export default AllTimeAnalytics;
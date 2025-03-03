import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CategoryBalance, Expense, COLORS, INITIAL_BALANCE } from '../../types';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import './styles.css';

interface AnalyticsProps {
  expenses: Expense[];
  balances: CategoryBalance;
  onClose: () => void;
  onShowAllTimeAnalytics: () => void; // New prop for showing all-time analytics
}

interface MonthlyData {
  month: string;
  saved: number;
  totalSpent: number;
  categorySpending: {
    [key: string]: {
      spent: number;
      percentage: number;
    };
  };
}

const Analytics: React.FC<AnalyticsProps> = ({ expenses, balances, onClose, onShowAllTimeAnalytics }) => {
  const [allExpenses, setAllExpenses] = useState<Expense[]>(expenses);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all expenses from Firestore including February
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

  // Calculate monthly data from all expenses
  const calculateMonthlyData = useMemo((): Record<string, MonthlyData> => {
    const totalInitialBudget = Object.values(INITIAL_BALANCE).reduce((a, b) => a + b, 0);
    const monthlyData: Record<string, MonthlyData> = {};

    // Initialize data for February and March 2025
    const months = [
      { month: 2, year: 2025, key: '02/2025' },
      { month: 3, year: 2025, key: '03/2025' }
    ];
    
    months.forEach(({ month, year, key }) => {
      monthlyData[key] = {
        month: key,
        saved: totalInitialBudget,
        totalSpent: 0,
        categorySpending: Object.keys(INITIAL_BALANCE).reduce((acc, category) => ({
          ...acc,
          [category]: { spent: 0, percentage: 0 }
        }), {})
      };
    });
    
    // Process all expenses and assign to proper month
    allExpenses.forEach(expense => {
      // Parse date from expense
      const expDate = new Date(expense.date);
      if (isNaN(expDate.getTime())) {
        console.warn(`Invalid date: ${expense.date}`);
        return;
      }

      const monthKey = `${String(expDate.getMonth() + 1).padStart(2, '0')}/${expDate.getFullYear()}`;
      
      // Skip if not February or March 2025
      if (monthKey !== '02/2025' && monthKey !== '03/2025') {
        return;
      }
      
      // Initialize month data if not exists
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          saved: totalInitialBudget,
          totalSpent: 0,
          categorySpending: Object.keys(INITIAL_BALANCE).reduce((acc, category) => ({
            ...acc,
            [category]: { spent: 0, percentage: 0 }
          }), {})
        };
      }

      // Update month data
      monthlyData[monthKey].totalSpent += expense.amount;
      monthlyData[monthKey].saved = totalInitialBudget - monthlyData[monthKey].totalSpent;
      
      // Update category spending
      if (monthlyData[monthKey].categorySpending[expense.category]) {
        monthlyData[monthKey].categorySpending[expense.category].spent += expense.amount;
      }
    });

    // Calculate percentages for each month
    Object.values(monthlyData).forEach(monthData => {
      Object.keys(monthData.categorySpending).forEach(category => {
        monthData.categorySpending[category].percentage = 
          monthData.totalSpent > 0 
            ? (monthData.categorySpending[category].spent / monthData.totalSpent) * 100 
            : 0;
      });
    });

    return monthlyData;
  }, [allExpenses]);


  // Convert monthly data to array and sort
  const monthlySavings = useMemo(() => {
    return Object.values(calculateMonthlyData)
      .map(data => ({
        month: data.month.replace(/(\d{2})\/(\d{4})/, '$1/' + data.month.slice(-2)),
        saved: data.saved,
        totalSpent: data.totalSpent,
        rawMonth: data.month
      }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split('/');
        const [bMonth, bYear] = b.month.split('/');
        const dateA = new Date(parseInt('20' + aYear), parseInt(aMonth) - 1);
        const dateB = new Date(parseInt('20' + bYear), parseInt(bMonth) - 1);
        return dateA.getTime() - dateB.getTime(); // Sort ascending by date
      });
  }, [calculateMonthlyData]);

  // Set default selected month to current month (March)
  useEffect(() => {
    if (!selectedMonth && monthlySavings.length > 0) {
      const today = new Date();
      const currentMonthKey = `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      setSelectedMonth(currentMonthKey);
    }
  }, [monthlySavings, selectedMonth]);

  // Get selected month's category spending for pie chart
  const categorySpending = useMemo(() => {
    const monthData = calculateMonthlyData[selectedMonth];
    if (!monthData) {
      // Default to current month if selected month not found
      const today = new Date();
      const currentMonthKey = `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      const currentMonthData = calculateMonthlyData[currentMonthKey];
      
      if (!currentMonthData) return [];
      
      return Object.entries(currentMonthData.categorySpending).map(([category, data]) => ({
        name: category,
        value: data.percentage,
        amount: data.spent
      }));
    }

    return Object.entries(monthData.categorySpending).map(([category, data]) => ({
      name: category,
      value: data.percentage,
      amount: data.spent
    }));
  }, [calculateMonthlyData, selectedMonth]);

  // Handle bar click to change selected month
  const handleBarClick = (data) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedItem = data.activePayload[0].payload;
      if (clickedItem.rawMonth) {
        setSelectedMonth(clickedItem.rawMonth);
      }
    }
  };

  const formatMonth = (monthKey: string): string => {
    const [month, year] = monthKey.split('/');
    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  if (isLoading) {
    return (
      <div className="analytics-modal">
        <div className="analytics-content">
          <h2>אנליזות</h2>
          <div className="loading">טוען נתונים...</div>
          <button onClick={onClose} className="close-button">
            סגור
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-modal">
      <div className="analytics-content">
        <h2>אנליזות</h2>
        
        <div className="view-options">
          <button className="all-time-button" onClick={onShowAllTimeAnalytics}>
            הצג ניתוח כולל
          </button>
        </div>
        
        <div className="chart-container">
          <h3>חסכונות חודשיים</h3>
          <p className="click-instruction">לחץ על עמודה כדי לראות פרטים של חודש ספציפי</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={monthlySavings}
              onClick={handleBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => (value !== 0 ? `₪${Number(value).toFixed(2)}` : "No data yet")} />
              <Legend />
              <Bar 
                dataKey="saved" 
                fill="#82ca9d" 
                name="חסכון" 
                barSize={15}
                radius={[10, 10, 0, 0]} 
              />
              <Bar 
                dataKey="totalSpent" 
                fill="#f56565" 
                name="הוצאות" 
                barSize={15}
                radius={[10, 10, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="month-selector">
          <h3>מציג נתונים עבור: {selectedMonth ? formatMonth(selectedMonth) : 'בחר חודש'}</h3>
        </div>

        <div className="chart-container">
          <h3>התפלגות הוצאות לפי קטגוריה</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categorySpending.filter((entry) => entry.value > 0)}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name} (${Number(value).toFixed(1)}%)`}
              >
                {categorySpending
                  .filter((entry) => entry.value > 0)
                  .map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.name as keyof CategoryBalance]}
                    />
                  ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="analytics-details">
          <h3>פירוט הוצאות</h3>
          <ul>
            {categorySpending.map((category) => (
              <li key={category.name} style={{ color: COLORS[category.name as keyof CategoryBalance] }}>
                {category.name}: ₪{Number(category.amount).toFixed(2)} ({Number(category.value).toFixed(1)}%)
              </li>
            ))}
          </ul>
        </div>

        <button onClick={onClose} className="close-button">
          סגור
        </button>
      </div>
    </div>
  );
};

export default Analytics;
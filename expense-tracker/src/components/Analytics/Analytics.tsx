import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CategoryBalance, Expense, COLORS, INITIAL_BALANCE } from '../../types';
import './styles.css';

interface AnalyticsProps {
  expenses: Expense[];
  balances: CategoryBalance;
  onClose: () => void;
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

interface FutureMonthlyData extends MonthlyData {
  future: number;
}

const Analytics: React.FC<AnalyticsProps> = ({ expenses, balances, onClose }) => {
  // Calculate monthly data with categories
  const calculateMonthlyData = useMemo((): Record<string, MonthlyData> => {
    const totalInitialBudget = Object.values(INITIAL_BALANCE).reduce((a, b) => a + b, 0);
    const monthlyData: Record<string, MonthlyData> = {};

    // Initialize current month
    const today = new Date();
    const currentMonthKey = `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    
    // Process all expenses
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${expense.date}`);
        return;
      }

      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      
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

    // Ensure current month exists
    if (!monthlyData[currentMonthKey]) {
      monthlyData[currentMonthKey] = {
        month: currentMonthKey,
        saved: totalInitialBudget,
        totalSpent: 0,
        categorySpending: Object.keys(INITIAL_BALANCE).reduce((acc, category) => ({
          ...acc,
          [category]: { spent: 0, percentage: 0 }
        }), {})
      };
    }

    return monthlyData;
  }, [expenses]);

  const generateFutureMonths = (): FutureMonthlyData[] => {
    const today = new Date();
    const futureMonths: FutureMonthlyData[] = [];
    const futureCount = 6;

    for (let i = 1; i <= futureCount; i++) {
      const futureDate = new Date(today.getFullYear(), today.getMonth() + i);
      const monthKey = `${String(futureDate.getMonth() + 1).padStart(2, '0')}/${String(futureDate.getFullYear()).slice(-2)}`;
      futureMonths.push({
        month: monthKey,
        saved: 0,
        totalSpent: 0,
        categorySpending: {},
        future: 1
      });
    }

    return futureMonths;
  };

  // Convert monthly data to array and sort
  const monthlySavings = useMemo(() => {
    return Object.values(calculateMonthlyData)
      .map(data => ({
        month: data.month.replace(/(\d{2})\/(\d{4})/, '$1/' + data.month.slice(-2)),
        saved: data.saved
      }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split('/');
        const [bMonth, bYear] = b.month.split('/');
        const dateA = new Date(parseInt('20' + aYear), parseInt(aMonth) - 1);
        const dateB = new Date(parseInt('20' + bYear), parseInt(bMonth) - 1);
        return dateB.getTime() - dateA.getTime();
      });
  }, [calculateMonthlyData]);

  // Get current month's category spending for pie chart
  const currentMonthKey = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
  const categorySpending = useMemo(() => {
    const currentMonthData = calculateMonthlyData[currentMonthKey];
    if (!currentMonthData) return [];

    return Object.entries(currentMonthData.categorySpending).map(([category, data]) => ({
      name: category,
      value: data.percentage,
      amount: data.spent
    }));
  }, [calculateMonthlyData, currentMonthKey]);

  return (
    <div className="analytics-modal">
      <div className="analytics-content">
        <h2>אנליזות</h2>
        
        <div className="chart-container">
          <h3>חסכונות חודשיים</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[...monthlySavings, ...generateFutureMonths()]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => (value !== 0 ? `₪${Number(value).toFixed(2)}` : "No data yet")} />
              <Legend />
              <Bar 
                dataKey="saved" 
                fill="#82ca9d" 
                name="חסכון חודשי" 
                barSize={15}
                radius={[10, 10, 0, 0]} 
              />
              <Bar 
                dataKey="future" 
                fill="lightgray"
                name="חודשים עתידיים" 
                barSize={15} 
                radius={[10, 10, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
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
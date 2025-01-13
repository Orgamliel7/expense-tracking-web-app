import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CategoryBalance, Expense, COLORS, INITIAL_BALANCE } from './types';
import './Analytics.css';

interface AnalyticsProps {
  expenses: Expense[];
  balances: CategoryBalance;
  onClose: () => void;
}

interface MonthlyData {
  month: string;
  saved: number;
}

const Analytics: React.FC<AnalyticsProps> = ({ expenses, balances, onClose }) => {
  // Helper function to format date as DD/MM/YYYY
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Calculate monthly savings
  const calculateMonthlySavings = (): MonthlyData[] => {
    const monthlyExpenses = expenses.reduce((acc, expense) => {
      const date = new Date(expense.date);

      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${expense.date}`);
        return acc;
      }

      // Create a key for the first day of the month
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthStart = new Date(year, month, 1);
      const monthKey = monthStart.toISOString().slice(0, 7); // YYYY-MM format
      
      acc[monthKey] = (acc[monthKey] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const totalBudget = Object.values(INITIAL_BALANCE).reduce((a, b) => a + b, 0);

    // Convert ISO date format to display format and calculate savings
    return Object.entries(monthlyExpenses)
      .map(([monthKey, spent]) => {
        const [year, month] = monthKey.split('-');
        return {
          month: `${month}/${year.slice(2)}`, // Format as MM/YY
          saved: totalBudget - spent,
        };
      })
      .sort((a, b) => {
        // Sort by date
        const [aMonth, aYear] = a.month.split('/');
        const [bMonth, bYear] = b.month.split('/');
        const aDate = new Date(2000 + parseInt(aYear), parseInt(aMonth) - 1);
        const bDate = new Date(2000 + parseInt(bYear), parseInt(bMonth) - 1);
        return aDate.getTime() - bDate.getTime();
      })
      // Group expenses by month and combine their amounts
      .reduce((acc: MonthlyData[], current) => {
        const existingMonth = acc.find(item => item.month === current.month);
        if (existingMonth) {
          existingMonth.saved = Math.min(existingMonth.saved, current.saved);
        } else {
          acc.push(current);
        }
        return acc;
      }, []);
  };

  // Calculate spending by category
  const calculateCategorySpending = () => {
    const totalSpent = Object.values(balances).reduce(
      (acc, current, index) => {
        const category = Object.keys(INITIAL_BALANCE)[index];
        const initialAmount = INITIAL_BALANCE[category as keyof CategoryBalance];
        const spent = initialAmount - current;
        return acc + spent;
      },
      0
    );

    return Object.entries(balances).map(([category, balance]) => {
      const initialAmount = INITIAL_BALANCE[category as keyof CategoryBalance];
      const spent = initialAmount - balance;
      return {
        name: category,
        value: totalSpent > 0 ? (spent / totalSpent) * 100 : 0,
        amount: spent,
      };
    });
  };

  const monthlySavings = calculateMonthlySavings();
  const categorySpending = calculateCategorySpending();

  return (
    <div className="analytics-modal">
      <div className="analytics-content">
        <h2>אנליזות</h2>
        
        <div className="chart-container">
          <h3>חסכונות חודשיים</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlySavings}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `₪${Number(value).toFixed(2)}`} />
              <Legend />
              <Bar dataKey="saved" fill="#82ca9d" name="חסכון חודשי" />
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
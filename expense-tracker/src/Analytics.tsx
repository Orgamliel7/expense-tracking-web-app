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

interface FutureMonthlyData extends MonthlyData {
  future: number;
}

const Analytics: React.FC<AnalyticsProps> = ({ expenses, balances, onClose }) => {
  // Calculate monthly savings
  const calculateMonthlySavings = (): MonthlyData[] => {
    // Calculate total initial budget
    const totalInitialBudget = Object.values(INITIAL_BALANCE).reduce((a, b) => a + b, 0);

    // Group expenses by month
    const monthlyExpenses = expenses.reduce((acc, expense) => {
      const date = new Date(expense.date);
      
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${expense.date}`);
        return acc;
      }

      // Create month key in MM/YYYY format
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          total: 0,
          month: monthKey
        };
      }
      
      acc[monthKey].total += expense.amount;
      return acc;
    }, {} as Record<string, { total: number; month: string }>);

    // Convert to array and calculate savings
    const savings = Object.values(monthlyExpenses)
      .map(({ month, total }) => ({
        month: month,
        saved: totalInitialBudget - total
      }))
      .sort((a, b) => {
        // Sort by date
        const [aMonth, aYear] = a.month.split('/');
        const [bMonth, bYear] = b.month.split('/');
        const dateA = new Date(parseInt(aYear), parseInt(aMonth) - 1);
        const dateB = new Date(parseInt(bYear), parseInt(bMonth) - 1);
        return dateB.getTime() - dateA.getTime(); // Reverse chronological order
      });

    // Add current month if it's not in the list
    const today = new Date();
    const currentMonthKey = `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    
    if (!savings.find(s => s.month === currentMonthKey)) {
      savings.unshift({
        month: currentMonthKey,
        saved: totalInitialBudget // For current month, start with full budget if no expenses
      });
    }

    // Format month display as MM/YY
    return savings.map(item => ({
      month: item.month.replace(/(\d{2})\/(\d{4})/, '$1/' + item.month.slice(-2)),
      saved: item.saved
    }));
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
        future: 1, // Indicate this is a future placeholder
      });
    }

    return futureMonths;
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
                barSize={15} // Make bars thinner
                radius={[10, 10, 0, 0]} 
              />
              <Bar 
                dataKey="future" 
                fill="lightgray" // Shallow gray for future months
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

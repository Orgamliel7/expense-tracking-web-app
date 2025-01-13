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
  // Calculate monthly savings
  const calculateMonthlySavings = (): MonthlyData[] => {
    const monthlyExpenses = expenses.reduce((acc, expense) => {
      const date = new Date(expense.date);
      const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`;
      acc[monthKey] = (acc[monthKey] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    // Calculate total initial budget
    const totalBudget = Object.values(INITIAL_BALANCE).reduce((a, b) => a + b, 0);

    return Object.entries(monthlyExpenses).map(([month, spent]) => ({
      month,
      saved: totalBudget - spent,
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
        value: (spent / totalSpent) * 100,
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
                data={categorySpending.filter((entry) => entry.value > 0)} // Filter out entries with 0% value
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name} (${Number(value).toFixed(1)}%)`}
                >
                {categorySpending
                    .filter((entry) => entry.value > 0) // Apply the same filter here
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

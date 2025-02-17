import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Expense, CategoryBalance, COLORS, INITIAL_BALANCE } from '../../types';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import generalBalance from '../../values';
import './styles.css';

interface GeneralProps {
  expenses: Expense[];
  balances: CategoryBalance;
  actionBtnClicked: boolean;
  onClose: () => void;
}

interface CustomExpense extends Expense {
  id: string;
  amount: number;
  category: keyof CategoryBalance;
  date: string;
  description: string;
  displayAmount: string;
}

interface MonthlyData {
  month: string;
  expenses: CustomExpense[];
  incomes: {
    id: string;
    amount: number;
    date: string;
    description: string;
  }[];
}

const General: React.FC<GeneralProps> = ({ expenses, balances, actionBtnClicked, onClose }) => {
  const [customExpenses, setCustomExpenses] = useState<CustomExpense[]>([]);
  const [incomes, setIncomes] = useState<MonthlyData['incomes']>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: '' as keyof CategoryBalance,
    date: '',
    description: ''
  });
  const [newIncome, setNewIncome] = useState({
    amount: '',
    date: '',
    description: ''
  });

  // Set default date and selected month on component mount
  useEffect(() => {
    const jerusalemDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
    const dateObj = new Date(jerusalemDate);
    const monthKey = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
    setSelectedMonth(monthKey);
    setNewExpense(prev => ({ ...prev, date: dateObj.toISOString().split('T')[0] }));
    setNewIncome(prev => ({ ...prev, date: dateObj.toISOString().split('T')[0] }));
  }, []);

  // Fetch custom data from Firestore
  useEffect(() => {
    const fetchCustomData = async () => {
      const docRef = doc(db, 'customData', 'generalData');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setCustomExpenses(data.expenses || []);
        setIncomes(data.incomes || []);
      }
    };

    fetchCustomData();
  }, []);

  // Update Firestore
  const updateFirestore = async (newExpenses: CustomExpense[], newIncomes: MonthlyData['incomes']) => {
    const docRef = doc(db, 'customData', 'generalData');
    try {
      await setDoc(docRef, {
        expenses: newExpenses,
        incomes: newIncomes
      });
    } catch (error) {
      console.error('Error updating general data:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    const data: Record<string, MonthlyData> = {};

    // Process regular expenses
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

      if (!data[monthKey]) {
        data[monthKey] = {
          month: monthKey,
          expenses: [],
          incomes: []
        };
      }
    });

    // Process custom expenses
    customExpenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

      if (!data[monthKey]) {
        data[monthKey] = {
          month: monthKey,
          expenses: [],
          incomes: []
        };
      }
      data[monthKey].expenses.push(expense);
    });

    // Process incomes
    incomes.forEach(income => {
      const date = new Date(income.date);
      const monthKey = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

      if (!data[monthKey]) {
        data[monthKey] = {
          month: monthKey,
          expenses: [],
          incomes: []
        };
      }
      data[monthKey].incomes.push(income);
    });

    return data;
  }, [expenses, customExpenses, incomes]);

  // Handle adding new expense
  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.date || !newExpense.category) {
      alert('Please fill in all required fields');
      return;
    }

    const expense: CustomExpense = {
      id: Date.now().toString(),
      amount: parseFloat(newExpense.amount),
      category: newExpense.category,
      date: newExpense.date,
      description: newExpense.description,
      displayAmount: newExpense.amount
    };

    const newExpenses = [...customExpenses, expense];
    setCustomExpenses(newExpenses);
    await updateFirestore(newExpenses, incomes);
    setNewExpense({
      amount: '',
      category: '' as keyof CategoryBalance,
      date: newExpense.date,
      description: ''
    });
  };

  // Handle adding new income
  const handleAddIncome = async () => {
    if (!newIncome.amount || !newIncome.date) {
      alert('Please fill in all required fields');
      return;
    }

    const income = {
      id: Date.now().toString(),
      amount: parseFloat(newIncome.amount),
      date: newIncome.date,
      description: newIncome.description
    };

    const newIncomes = [...incomes, income];
    setIncomes(newIncomes);
    await updateFirestore(customExpenses, newIncomes);
    setNewIncome({
      amount: '',
      date: newIncome.date,
      description: ''
    });
  };

  // Handle deleting expense
  const handleDeleteExpense = async (id: string) => {
    const newExpenses = customExpenses.filter(expense => expense.id !== id);
    setCustomExpenses(newExpenses);
    await updateFirestore(newExpenses, incomes);
  };

  // Handle deleting income
  const handleDeleteIncome = async (id: string) => {
    const newIncomes = incomes.filter(income => income.id !== id);
    setIncomes(newIncomes);
    await updateFirestore(customExpenses, newIncomes);
  };

  // Get chart data for selected month
  const chartData = useMemo(() => {
    const selectedData = monthlyData[selectedMonth];
    if (!selectedData) return [];

    const totalExpenses = selectedData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncomes = selectedData.incomes.reduce((sum, inc) => sum + inc.amount, 0);

    return [
      { name: 'הוצאות', amount: totalExpenses },
      { name: 'הכנסות', amount: totalIncomes },
      { name: 'מאזן', amount: totalIncomes - totalExpenses }
    ];
  }, [monthlyData, selectedMonth]);

  if (!actionBtnClicked) return null;

  return (
    <div className="general-container">
      <div className="general-content">
        <button onClick={onClose} className="close-btn">x</button>
        <h2>כללי</h2>

        <div className="month-selector">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="month-select"
          >
            {Object.keys(monthlyData).map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>

        <div className="chart-section">
          <h3>מאזן חודשי</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `₪${Number(value).toFixed(2)}`} />
              <Legend />
              <Bar
                dataKey="amount"
                fill="#f56565"
                barSize={30}
                radius={[10, 10, 0, 0]}
              />
              <Bar
                dataKey="amount"
                fill="#82ca9d"
                barSize={30}
                radius={[10, 10, 0, 0]}
              />
              <Bar
                dataKey="amount"
                fill="#6b7280"
                barSize={30}
                radius={[10, 10, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="expense-section">
          <h3>הוספת הוצאה</h3>
          <div className="input-group">
            <input
              type="number"
              placeholder="סכום"
              value={newExpense.amount}
              onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
            />
            <select
              value={newExpense.category}
              onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value as keyof CategoryBalance }))}
            >
              {Object.keys(balances).map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="תיאור"
              value={newExpense.description}
              onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
            />
            <button onClick={handleAddExpense}>הוסף הוצאה</button>
          </div>
        </div>

        <div className="income-section">
          <h3>הוספת הכנסה</h3>
          <div className="input-group">
            <input
              type="number"
              placeholder="סכום"
              value={newIncome.amount}
              onChange={(e) => setNewIncome(prev => ({ ...prev, amount: e.target.value }))}
            />
            <input
              type="text"
              placeholder="תיאור"
              value={newIncome.description}
              onChange={(e) => setNewIncome(prev => ({ ...prev, description: e.target.value }))}
            />
            <button onClick={handleAddIncome}>הוסף הכנסה</button>
          </div>
        </div>

        <div className="existing-data">
          <h3>הוצאות קיימות</h3>
          <ul>
            {customExpenses.map((expense) => (
              <li key={expense.id}>
                <span>{expense.date}: {expense.amount}₪ ({expense.category})</span>
                <button onClick={() => handleDeleteExpense(expense.id)}>מחק</button>
              </li>
            ))}
          </ul>

          <h3>הכנסות קיימות</h3>
          <ul>
            {incomes.map((income) => (
              <li key={income.id}>
                <span>{income.date}: {income.amount}₪ ({income.description})</span>
                <button onClick={() => handleDeleteIncome(income.id)}>מחק</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default General;
